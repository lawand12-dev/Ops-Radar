# n8n Node: If

**Category:** Tools
**Node Type:** `n8n-nodes-base.if`
**Version:** 2.3 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/If`
**Updated:** 2026-04-30

## Overview

Evaluates conditions against each input item and routes it to one of two branches: true (output 0) or false (output 1). The primary branching node for binary logic in n8n workflows — use it when you have a yes/no decision point.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Takes each item from its single input and evaluates one or more conditions. Items where all conditions pass go to the **true** output (output index 0); items that fail go to the **false** output (output index 1). Both outputs carry items further downstream — connect each branch to whatever the workflow should do next.

Unlike Switch (which has N outputs for N cases), If always has exactly two outputs. Use If for simple boolean splits; use Switch when you have 3+ distinct cases.

## Authentication

None — no credentials required.

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conditions` | collection | Yes | One or more condition rules — all must pass (AND logic by default) |
| `combineOperation` | options | No | `all` (AND) or `any` (OR) — how multiple conditions are combined; default `all` |
| `looseTypeValidation` | boolean | No | If true, coerces types before comparison (e.g. number `"3"` equals number `3`) |

### Condition Structure

Each condition specifies:

| Field | Description |
|-------|-------------|
| `leftValue` | The value to test — usually an expression like `{{$json.status}}` |
| `operator.type` | Value type: `string`, `number`, `boolean`, `dateTime`, `array`, `object` |
| `operator.operation` | The comparison to apply (see table below) |
| `rightValue` | The value to compare against |

### Operators by Type

| Type | Operations |
|------|-----------|
| `string` | `equals`, `notEquals`, `contains`, `notContains`, `startsWith`, `endsWith`, `regex`, `notRegex`, `isEmpty`, `isNotEmpty` |
| `number` | `equals`, `notEquals`, `gt` (>), `lt` (<), `gte` (≥), `lte` (≤), `isEmpty`, `isNotEmpty` |
| `boolean` | `equals`, `notEquals`, `isEmpty` |
| `dateTime` | `equals`, `notEquals`, `before`, `after`, `afterOrEquals`, `beforeOrEquals`, `isEmpty` |
| `array` | `contains`, `notContains`, `lengthEquals`, `lengthNotEquals`, `lengthGt`, `lengthLt`, `isEmpty`, `isNotEmpty` |
| `object` | `isEmpty`, `isNotEmpty` |

## Common Errors & Fixes

- **All items going to false branch**: The condition expression is wrong or the field doesn't exist. Check the field path — e.g. if the webhook sends `{"body": {"status": "active"}}`, use `{{$json.body.status}}`, not `{{$json.status}}`.
- **Type mismatch**: Comparing a string `"3"` with operator type `number` and right value `3` fails without `looseTypeValidation`. Enable loose type validation or cast in a Code node first.
- **Regex not matching**: n8n uses JavaScript regex syntax. The `regex` operator does not require wrapping in `/slashes/` — pass the pattern string directly (e.g. `^\d{4}-\d{2}$`).
- **AND vs OR confusion**: By default all conditions must pass (AND). For OR logic, set `combineOperation` to `any`.
- **Downstream node only receives true items**: The false output is simply not connected. Connect both outputs or accept that unmatched items are dropped.

## Typical Workflow Pattern

```
Webhook (form submission)
  → If ({{$json.body.plan}} equals "enterprise")
    → [True, output 0] Slack (#enterprise-leads channel)
    → [False, output 1] HubSpot (add to standard nurture list)
```

## Agency Use Cases

- **Lead routing**: Score or tag conditions route high-value leads to Slack alerts vs standard CRM entry
- **Error handling**: Check if HTTP Response code is 200 → true continues, false triggers an alert
- **Conditional email**: Send different email content based on client tier, plan, or flag
- **Data validation**: If required fields are present → continue, else → reply with error webhook response
