# n8n Workflow Patterns

**Category:** Patterns  
**Source:** n8n-skills workflow-patterns skill + n8n template analysis  
**Updated:** 2026-04-30

## Overview

Five proven architectural patterns covering 90%+ of n8n automation use cases, with node selection guides, data flow diagrams, and real examples from the 2,709-template library.

## Related Notes

[[research-16]] · [[n8n-nodes]] · [[n8n-api]] · [[n8n-best-practices]] · [[n8n-common-failures]] · [[research-15]]

---

## Pattern Selection Guide

| Pattern | Trigger Type | When to Use |
|---------|-------------|-------------|
| Webhook Processing | HTTP event | Receiving data from external systems; Stripe webhooks, form submissions, Slack commands |
| HTTP API Integration | Manual/Schedule/Webhook | Fetching from REST APIs; syncing third-party services; data pipelines |
| Database Operations | Schedule | ETL; DB-to-DB sync; backup; scheduled queries |
| AI Agent Workflow | Webhook/Chat | Conversational AI; AI with tool access; multi-step reasoning |
| Scheduled Tasks | Cron | Reports; periodic fetching; maintenance tasks |

---

## 1. Webhook Processing (Most Common — 35% of triggers)

**Pattern**: Webhook → Validate → Transform → Respond/Notify

```
Webhook (POST /path)
  → IF (validate payload)
    → [True] Set (map fields)
        → Action (Slack / DB / API)
        → Respond to Webhook
    → [False] Respond to Webhook (400 error)
```

**Node chain**:
1. `n8n-nodes-base.webhook` — path: "form-submit", httpMethod: "POST"
2. `n8n-nodes-base.if` — validate required fields
3. `n8n-nodes-base.set` — map/transform fields
4. Action node (Slack, Postgres, HTTP Request)
5. `n8n-nodes-base.respondToWebhook` — send response

**Critical**: Webhook data is under `$json.body`, not at root.
```javascript
{{$json.body.email}}    // ✅ Correct
{{$json.email}}         // ❌ Always undefined
```

**Real example — Slack command handler**:
```
Webhook → Set (extract command text from $json.body.text) → IF (command type)
  → [slack] Slack (post reply)
  → [other] HTTP Request (call API) → Slack (post result)
  → Respond to Webhook (immediate 200)
```

---

## 2. HTTP API Integration

**Pattern**: Trigger → HTTP Request → Transform → Action → Error Handler

```
Trigger (Manual / Schedule / Webhook)
  → HTTP Request (GET/POST external API)
  → IF (check response valid)
    → [True] Set / Code (transform data)
        → Action (DB write / notification / another API)
    → [False] Slack (alert) / Stop and Error
  → Error Trigger → Slack/Email (failure notification)
```

**Node chain**:
1. `n8n-nodes-base.manualTrigger` or `n8n-nodes-base.scheduleTrigger`
2. `n8n-nodes-base.httpRequest` — method, url, auth, body
3. `n8n-nodes-base.if` — check status code / data existence
4. `n8n-nodes-base.set` or `n8n-nodes-base.code` — transform
5. Output action node

**Pagination pattern** (large datasets):
```
Schedule → HTTP Request (page 1)
  → Code (extract items + check hasNextPage)
  → Split In Batches → Process items
  → IF (has more pages) → HTTP Request (page N) → loop
```

**Authentication options** (httpRequest node):
- `predefinedCredentialType` + `nodeCredentialType: "httpHeaderAuth"` — header-based
- `oAuth2Api` — OAuth 2.0 flows
- `basicAuth` — basic username/password

---

## 3. Database Operations

**Pattern**: Schedule → Query → Transform → Write → Verify

```
Schedule (every 15 min)
  → Postgres (query new records WHERE synced_at IS NULL)
  → IF (records found)
    → [True] Set (transform fields)
        → MySQL (upsert records)
        → Postgres (UPDATE synced_at = NOW())
    → [False] Stop (no-op)
```

**Node chain**:
1. `n8n-nodes-base.scheduleTrigger`
2. Source database node (Postgres/MySQL/MongoDB)
3. `n8n-nodes-base.if` — check if data exists
4. `n8n-nodes-base.set` or `n8n-nodes-base.code` — transform
5. Target database node
6. Update sync timestamp

**Batch processing** (large tables):
```
Schedule → Postgres (query IDs)
  → Split In Batches (100 at a time)
  → Process → Write
  → IF (more batches) → loop
```

---

## 4. AI Agent Workflow

**Pattern**: Trigger → AI Agent (Model + Tools + Memory) → Output

```
Webhook (chat message)
  → AI Agent
    ├─ OpenAI Chat Model (ai_languageModel)
    ├─ HTTP Request Tool (ai_tool) — search docs
    ├─ Postgres Tool (ai_tool) — query data
    └─ Window Buffer Memory (ai_memory)
  → Respond to Webhook (AI reply)
```

**AI connection types** (connect sub-nodes to main agent):
- `ai_languageModel` — required: one LLM (OpenAI, Claude, Gemini)
- `ai_tool` — optional: any node as a callable tool (HTTP Request, Code, database)
- `ai_memory` — optional: Window Buffer, Redis, Postgres memory
- `ai_vectorStore` — optional: Pinecone, Qdrant, Supabase
- `ai_embedding` — optional: for vector operations
- `ai_document` / `ai_textSplitter` / `ai_outputParser` — optional pipeline nodes

**Key**: ANY n8n node can be an AI tool — not just nodes explicitly marked as AI tools.

**Common AI pattern for agency use**:
```
Chat Webhook
  → AI Agent (GPT-4o)
    ├─ HTTP Request Tool (search knowledge base)
    ├─ Postgres Tool (lookup client data)
    └─ Window Buffer Memory (conversation context)
  → Respond to Webhook
```

---

## 5. Scheduled Tasks

**Pattern**: Schedule → Fetch → Process → Deliver → Log

```
Schedule (daily 9 AM)
  → HTTP Request (fetch analytics API)
  → Code (aggregate: totals, averages, trends)
  → Gmail / Slack (send formatted report)
  → Postgres (log run timestamp + metrics)
  → Error Trigger → Slack (failure alert)
```

**Common cron patterns**:
- Hourly: `0 * * * *`
- Daily 9 AM: `0 9 * * *`
- Weekly Monday 8 AM: `0 8 * * 1`
- Every 15 min: `*/15 * * * *`

---

## Common Workflow Components

### Triggers (Activation methods)
| Trigger | Pattern | Latency |
|---------|---------|---------|
| Webhook | Event-driven | Instant |
| Schedule | Cron | ±1 min |
| Manual | Click | On-demand |
| Error Trigger | Failure handler | Instant |
| Execute Workflow Trigger | Sub-workflow | Sync |

### Data Transformation Nodes
| Node | Use When |
|------|---------|
| `set` | Map/rename fields, add computed values |
| `code` | Complex multi-step logic, aggregation |
| `if` | Binary routing (true/false) |
| `switch` | Multi-case routing (3+ paths) |
| `merge` | Combine two data streams |
| `splitInBatches` | Process large datasets in chunks |

### Error Handling (Required for Production)
```
Error Trigger (separate workflow)
  → Set (format error details)
  → Slack (alert #ops-alerts channel)
  → Postgres (log error with context)
```

Or per-node: set `continueOnFail: true` + `retryOnFail: true, maxTries: 3`.

---

## Data Flow Patterns

### Linear
```
Trigger → Transform → Action → End
```

### Branching
```
Trigger → IF → [True Path]
              → [False Path]
```

### Parallel Processing (run both branches simultaneously)
```
Trigger → [Branch 1: Slack notify] → Merge
       └→ [Branch 2: DB write]     ↗
```

### Loop / Batch
```
Trigger → Split In Batches (100) → Process → [Has More?] → loop back
```

### Sub-workflow
```
Main Workflow → Execute Workflow (call "Notify Team" sub-workflow)
```

---

## Workflow Creation Checklist

**Planning**
- [ ] Identify pattern (webhook / API / DB / AI / scheduled)
- [ ] List required nodes via `search_nodes`
- [ ] Plan data flow: input → transform → output
- [ ] Define error handling strategy

**Implementation**
- [ ] Create workflow with correct trigger
- [ ] Add and configure each node
- [ ] Use `{{$json.body.field}}` for webhook data
- [ ] Add IF/Switch for error conditions
- [ ] Add error handling on output nodes

**Validation**
- [ ] `validate_node` each node (`profile: "runtime"`)
- [ ] `validate_workflow` complete structure
- [ ] Test with sample payload
- [ ] Handle edge cases (empty data, API errors)

**Deployment**
- [ ] `n8n_validate_workflow` post-build check
- [ ] `activateWorkflow` operation
- [ ] Monitor first 5 executions
- [ ] Document in workflow notes field

---

## Pattern Statistics (from template analysis)

**Trigger distribution**:
- Webhook: 35%
- Schedule: 28%
- Manual: 22%
- Service triggers: 15%

**Transformation usage**:
- Set (field mapping): 68%
- Code (custom logic): 42%
- IF (conditional): 38%
- Switch (multi-condition): 18%

**Output distribution**:
- HTTP Request (APIs): 45%
- Slack: 32%
- Database writes: 28%
- Email: 24%

**Workflow complexity**:
- Simple (3-5 nodes): 42%
- Medium (6-10 nodes): 38%
- Complex (11+ nodes): 20%
