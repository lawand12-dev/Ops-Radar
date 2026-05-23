# n8n Node: Loop Over Items (Split In Batches)

**Category:** Flow
**Node Type:** `n8n-nodes-base.splitInBatches`
**UI Label:** "Loop Over Items" (renamed from "Split In Batches" in n8n v1.x)
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Loop Over Items node (internally `splitInBatches`) divides a large set of input items into smaller batches and processes each batch in sequence. It is the primary tool for preventing memory exhaustion on large datasets, throttling API calls to respect rate limits, and implementing controlled bulk operations. The most common failure modes are missing the "done" connection (workflow hangs after the last batch) and absent rate-limit Wait nodes (batch operations trigger 429 errors).

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

On first execution, Loop Over Items splits all input items into chunks of `batchSize`. It outputs the first batch through the `output` connection. Downstream nodes process that batch. The loop then feeds the next batch through `output` on each subsequent iteration. When all batches have been processed, the `done` connection fires once with all items combined.

The loop creates an implicit loop in the workflow graph — the processing nodes send data back to Loop Over Items to trigger the next iteration. This is represented visually in the n8n editor as the processing chain connecting back to the Loop Over Items node.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `batchSize` | number | Yes | Number of items per batch. Default `10`. |
| `options.reset` | boolean | No | If `true`, resets the loop counter to 0 and starts over from the first batch. Useful in nested or conditional loops. |

---

## How the Loop Works — Connections

Loop Over Items has two output connections:

| Output | When It Fires | Purpose |
|--------|--------------|---------|
| `output` (top) | After each batch | Connect to the processing nodes for this batch |
| `done` (bottom) | After all batches complete | Connect to what should happen after the loop finishes |

**CRITICAL: the `done` connection is mandatory.** If it is not connected, the workflow terminates silently after the last batch — no error is thrown, but nothing after the loop executes. This is the most common Loop Over Items misconfiguration.

**Correct connection pattern:**
```
Loop Over Items
  → [output] → HTTP Request → Loop Over Items  (loops back)
  → [done]   → Google Sheets (write summary)
```

**Wrong — missing done connection:**
```
Loop Over Items
  → [output] → HTTP Request → Loop Over Items  (loops back)
  (done not connected — workflow silently ends after last batch)
```

---

## Loop Counter

The current loop iteration is accessible via `$runIndex` (0-based integer):

```javascript
// In a Code node inside the loop:
const iterationNumber = $runIndex;      // 0 for first batch, 1 for second, etc.
const itemOffset = $runIndex * batchSize;

// In an expression:
{{ $runIndex }}
{{ `Batch ${$runIndex + 1} of N` }}
```

`$runIndex` resets to 0 when the loop starts over (if `options.reset=true` is used).

---

## Recommended Batch Sizes

Batch size should balance memory usage against throughput:

| Operation Type | Recommended Batch Size |
|----------------|------------------------|
| Lightweight API calls (no large payload) | 50–100 |
| API calls with medium payload (CRM updates) | 10–25 |
| Heavy processing (PDF generation, AI calls) | 1–5 |
| Database bulk inserts | 100–500 |
| Airtable API (rate-limited to 5 req/s) | 5 |
| Google Sheets append | 50 |

Very large batch sizes do not eliminate memory pressure — each item is still held in memory. For very large datasets (100,000+ items), consider processing in time-windowed chunks using the source query rather than loading everything at once.

---

## Rate Limiting Pattern

To avoid hitting API rate limits, add a Wait node after the processing step and before the loop feeds back:

```
Loop Over Items (batchSize: 5)
  → [output] Airtable (Create Record)
  → Wait (1 second)          ← rate limit throttle
  → [feeds back to Loop Over Items]
  → [done] Set (mark complete)
```

**Where to place the Wait**: after the API call, before the loop-back connection. Placing Wait before the API call also works but wastes time on the first batch.

Do NOT place the Wait node after the `done` connection — it will only delay the post-loop step, not throttle the iterations.

---

## Nested Loops

n8n supports nested Loop Over Items nodes (a loop inside a loop). Important constraints:

- The outer loop's `$runIndex` is NOT accessible inside the inner loop — it is shadowed by the inner loop's own `$runIndex`.
- To pass outer loop context into the inner loop, store it in a Set node before entering the inner loop:

```javascript
// Before the inner loop (Set node):
outerIndex: {{ $runIndex }}

// Inside the inner loop (Code node):
const outerIndex = $json.outerIndex;  // preserved through Set
const innerIndex = $runIndex;
```

- The `done` output of the inner loop should connect to the loop-back of the outer loop to continue outer iteration.

---

## Per-Item Error Handling

By default, if any item in a batch produces an error, the **entire batch** fails and the loop stops. To handle errors per item:

1. Enable **"Continue On Error"** in the node settings of the processing node (not the Loop node itself).
2. Connect the error output of the processing node to an error-handling branch.

```
Loop Over Items (batchSize: 10)
  → [output] HTTP Request (Continue On Error: true)
    → [Success] → loop back
    → [Error]   → Set (mark item as failed) → loop back
  → [done] → summarize
```

Without "Continue On Error", a single bad item in a batch of 10 halts the entire loop at that batch, leaving remaining items unprocessed.

---

## Memory Behavior

Loop Over Items does not reduce the total memory required to load the input dataset — all input items are loaded before the loop starts splitting. The batching only controls how many items are passed to downstream nodes per iteration.

For truly memory-efficient processing:
- Limit the upstream query to fetch items in pages (e.g. SQL `LIMIT 1000 OFFSET 0`, run in separate workflow triggers)
- Use a Schedule Trigger + cursor-based state (stored in a database or Airtable) to process the dataset in segments across multiple workflow executions

---

## Common Failure Modes

**Workflow ends after last batch with no further steps executing**
- Cause: `done` connection is not wired.
- Detection: execution graph shows Loop Over Items with no node connected to the `done` (bottom) output. Execution ends successfully but without the expected downstream steps.
- Fix: connect the `done` output to the next step (summary, notification, final write).

**Rate limit errors on bulk API operations (429)**
- Cause: no Wait node between batches.
- Detection: `error.httpCode=429` on the API call node inside the loop. Errors typically start appearing after the first few batches.
- Fix: add Wait node (duration appropriate to the API's rate limit) between the API call and the loop-back.

**`$runIndex` is always 0 inside the loop**
- Cause: accessing `$runIndex` in the wrong node context — it only increments for the Loop Over Items node's own re-executions. If the loop-back is broken, the loop re-executes from scratch each time.
- Detection: the iteration count is always the same regardless of how many items were processed.

**All items processed as one batch (loop appears to not split)**
- Cause: `batchSize` was not set, defaulting to 10, but there are fewer than 10 items — so only one batch fires and `done` fires immediately. This is correct behavior, not a bug.

**Nested loop processes wrong items**
- Cause: the inner loop's input is the outer batch, but the inner loop input connection was accidentally wired to a node several steps up, pulling all items instead of just the current outer batch.

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| `lastNodeExecuted = "splitInBatches"` (stuck execution) | Likely waiting for the current batch to complete, OR the loop-back connection is broken |
| Execution runs for >10× expected duration on a known dataset | Missing Wait node causing rate-limit retries inside the loop |
| Zero items reaching post-loop nodes | `done` connection is not wired |
| `status=error` with error from an API node at a consistent batch index | One bad item in that batch — enable "Continue On Error" on the API node |
| Very high memory usage on n8n worker | `batchSize` too large, or upstream query loading too many items before the loop |

---

## Expression Patterns

```javascript
// Current batch index (0-based):
{{ $runIndex }}

// Total items in the current batch:
{{ $input.all().length }}

// Access a specific item in the current batch:
{{ $input.item(0).json.id }}

// Check if this is the first batch:
{{ $runIndex === 0 }}

// Access items from the node that fed the loop (not just current batch):
{{ $('Previous Node').all().length }}
```

---

## Typical Workflow Patterns

**Throttled bulk create (Airtable):**
```
HTTP Request (GET all contacts from CRM, 2000 records)
  → Loop Over Items (batchSize: 5)
    → [output] Airtable (Create Record)
    → Wait (1 second)
  → [done] Slack (notify: "Sync complete, 2000 records created")
```

**Paginated processing with error isolation:**
```
Postgres (SELECT 500 records WHERE status = 'unprocessed')
  → Loop Over Items (batchSize: 25)
    → [output] HTTP Request (external enrichment API, Continue On Error: true)
      → [success] Postgres (UPDATE status = 'done')
      → [error]   Postgres (UPDATE status = 'failed', error = {{ $json.error }})
      → [both]    loop back
  → [done] Send Email (summary report)
```

**Nested loop (process users × their orders):**
```
Airtable (List Users)
  → Loop Over Items (batchSize: 1, outer loop)
    → [output] Set (userId = {{ $json.id }})
               → Airtable (List Orders, filterByFormula: {UserId} = "{{ $json.userId }}")
               → Loop Over Items (batchSize: 10, inner loop)
                 → [output] HTTP Request (process order)
                 → loop back (inner)
               → [done (inner)] loop back (outer)
  → [done (outer)] Set (all done)
```

---

## Important Gotchas

1. **The loop-back connection in the n8n UI is implicit**: When you connect the processing chain back to Loop Over Items, you are wiring the feedback. If you accidentally delete that connection, the node only processes the first batch and exits.
2. **`done` fires once, with all items**: The `done` output passes all items that were processed across all batches combined (depending on n8n version and merge behavior). Do not assume `done` only carries the last batch.
3. **Pausing the loop**: There is no native "pause loop" mechanism. To pause, add a Wait node inside the loop. To stop early based on a condition, route the conditional false branch to the `done` output by passing data to a Merge node connected to `done`.
4. **Loop Over Items vs Code node loops**: For in-memory transformations of small datasets, a Code node with a `for` loop is simpler and faster. Loop Over Items is appropriate when batches need to interact with external services (APIs, databases) between iterations.
