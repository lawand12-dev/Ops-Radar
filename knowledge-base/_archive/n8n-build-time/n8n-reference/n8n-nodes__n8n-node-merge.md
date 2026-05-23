# n8n Node: Merge

**Category:** Tools
**Node Type:** `n8n-nodes-base.merge`
**Version:** 3.2 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Merge`
**Updated:** 2026-04-30

## Overview

Combines items from two or more upstream branches into a single stream. Used to re-join split workflows, combine results from parallel API calls, or join datasets by a shared key. Essential for any workflow that fans out to multiple paths and needs to collect results.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

The Merge node has two inputs (Input 1 and Input 2) and waits until data arrives on both before executing. It supports several merge strategies, from simple concatenation to SQL-style joins by matching key values.

In n8n's execution model, branches run sequentially. The Merge node buffers the first branch's output and waits for the second branch before processing. This is the only standard way to synchronize two parallel paths.

## Authentication

None — no credentials required.

## Merge Modes

| Mode | Behaviour |
|------|-----------|
| **Append** | Concatenate all items from Input 1 followed by all items from Input 2. No joining — just stacks them. |
| **Combine — Merge By Fields** | Join items where a key field matches (like SQL INNER JOIN). Specify the key field name from each input. |
| **Combine — Multiplex** | Cartesian product — every item from Input 1 paired with every item from Input 2. |
| **Combine — By Position** | Pair items positionally: item[0] with item[0], item[1] with item[1], etc. |
| **Keep Key Matches** | Keep only Input 1 items that have a matching key in Input 2 (INNER JOIN, keeps Input 1 fields). |
| **Remove Key Matches** | Keep only Input 1 items that have NO matching key in Input 2 (LEFT EXCLUDING JOIN). |
| **Combine — All** | Merge all fields from matched pairs into one item (similar to Merge By Fields but includes all fields from both sides). |

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | options | Yes | The merge strategy (see table above) |
| `joinMode` | options | Conditional | For Combine modes: how to handle unmatched items (`keepMatches`, `keepNonMatches`, `keepEverything`) |
| `mergeByFields` | array | Conditional (By Fields / Keep / Remove) | Pairs of field names to match on: `{{inputField1, inputField2}}` |
| `outputDataFrom` | options | No | For Append mode: which input to output from if both are empty |
| `clashHandling` | object | No | How to handle conflicting field names from both inputs when combining |
| `includeUnpaired` | boolean | No | Whether to include unmatched items from either side (outer join behaviour) |

## Common Errors & Fixes

- **Workflow hangs / never completes**: The Merge node waits for both inputs. If one branch never produces output (e.g. If node routes all items to false branch), Merge waits forever. Add a No-Op node or ensure both branches always produce at least one item.
- **Items doubled in Append mode**: The workflow is routing items through both branches AND appending. Review the branching logic — use If or Switch to send items to only one branch.
- **Key match returning empty**: The field names in `mergeByFields` don't match between inputs (case-sensitive). Also check that the key field exists in every item on both sides — missing keys are not matched.
- **Wrong item count in Multiplex**: Multiplex creates M×N items. 10 items × 10 items = 100 items. Can cause unexpected downstream behaviour in bulk operations (rate limits, API quotas).
- **Input 1 vs Input 2 order matters**: For positional merge and key-match modes, which branch is connected to Input 1 vs Input 2 changes the output structure. The Merge node UI shows two connection points — check which is which.

## Typical Workflow Pattern

```
Webhook (order received)
  → [Branch A] HTTP Request (GET product details from inventory API)
  → [Branch B] HTTP Request (GET customer details from CRM)
  → Merge (mode: Combine By Position, join items into one record)
  → Code (build order confirmation payload)
  → Gmail (send order confirmation email)
```

## Agency Use Cases

- **Parallel API enrichment**: Fetch customer data from two sources → Merge → build combined profile
- **Report assembly**: Pull metrics from GA4 and HubSpot in parallel → Append → format report → send
- **Data reconciliation**: Compare two data sources with Keep/Remove Key Matches to find discrepancies
- **Fan-out/fan-in**: Process items through different paths based on Switch, then Append results back into one stream for unified output
