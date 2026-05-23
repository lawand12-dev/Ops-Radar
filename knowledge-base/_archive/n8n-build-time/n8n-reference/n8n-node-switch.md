# n8n Node: Switch

**Category:** Tools
**Node Type:** `n8n-nodes-base.switch`
**Version:** 3.4 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Switch`
**Updated:** 2026-04-30

## Overview

Routes items to one of N outputs based on rules or a single expression value. The multi-branch version of the If node — use Switch when you have three or more distinct cases. Items that match no case go to a fallthrough output.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Evaluates each item against a list of cases and sends the item to the output index that matches. Switch has two operating modes:

- **Rules mode**: Define multiple conditions (similar to If conditions), each routing to its own output. A fallthrough output (always the last output) receives items that match no rule.
- **Expression mode**: Evaluate a single expression; each case defines a value that the expression is compared against.

The number of outputs equals the number of defined cases plus one (the fallthrough). Connect downstream nodes to each output by index.

Unlike If (exactly 2 outputs), Switch supports any number of branches. Use If for binary splits and Switch for anything with 3+ paths.

## Authentication

None — no credentials required.

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | options | Yes | `rules` (condition-based) or `expression` (value-based) |
| `rules` | array | Yes (rules mode) | List of rule objects, each with conditions and an output index |
| `value` | string | Yes (expression mode) | The expression to evaluate (e.g. `{{$json.status}}`) |
| `cases` | array | Yes (expression mode) | List of case objects: `{value, output}` pairs |
| `fallbackOutput` | options | No | What to do with items matching no case: `none` (drop) or `extra` (send to extra output). Default: `extra` |

### Rules Mode Case Structure

Each rule in rules mode:

| Field | Description |
|-------|-------------|
| `conditions` | Condition array (same typed operators as If node) |
| `renameOutput` | Optional label for the output pin |
| `outputKey` | Integer — which output index this case maps to |

### Expression Mode Case Structure

| Field | Description |
|-------|-------------|
| `value` | The literal value to match against the evaluated expression |
| `outputKey` | Integer — which output index this case maps to |

## Common Errors & Fixes

- **Items disappearing**: They matched no case and `fallbackOutput` is `none`. Add an extra case for the fallback or change to `extra` to route unmatched items.
- **Wrong output connected**: Output indices (0, 1, 2…) must match the case order. If you reorder cases in the UI, downstream connections may shift. Verify by checking which output pin each downstream node is connected to.
- **Expression mode strict equality**: Expression mode uses strict string comparison. `"3"` does not equal `3`. Cast numbers to strings in the expression or in a Set node upstream.
- **All items going to same output**: In rules mode, a condition that is always true will catch everything. Check rule order — conditions are evaluated top to bottom, first match wins.
- **Regex in rules mode**: Same JavaScript regex rules as the If node — no surrounding slashes, pattern string only.

## Typical Workflow Pattern

```
Webhook (support ticket incoming)
  → Switch (mode: expression, value: {{$json.body.priority}})
    → [Output 0] "critical" → PagerDuty (create incident)
    → [Output 1] "high"     → Slack (#support-urgent)
    → [Output 2] "normal"   → HubSpot (create ticket)
    → [Fallthrough] unknown → Slack (#ops-alerts: unhandled priority)
```

## Agency Use Cases

- **Multi-tier client routing**: Route incoming requests based on `plan` field to different Notion databases, Slack channels, or email sequences
- **Event type handling**: Stripe webhook with `event.type` — switch across `payment_intent.succeeded`, `customer.subscription.deleted`, `invoice.payment_failed`, etc.
- **Status-driven pipeline**: CRM deal stage changes trigger different follow-up actions per stage
- **Language/region routing**: Route content by locale to different translation or delivery nodes
