# n8n Node: Filter

**Category:** Flow
**Node Type:** `n8n-nodes-base.filter`
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Filter node passes items downstream only if they meet specified conditions. Items that fail the filter are permanently discarded — they do not go to an error output, a false branch, or anywhere else. This silent discard behavior is the dominant source of "workflow ran but nothing happened" bugs in n8n. When rejected items need to be handled, use the IF node instead.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

Filter evaluates each input item against one or more conditions. Items that match the conditions pass through to the output. Items that do not match are dropped silently. The node produces zero items if nothing matches — downstream nodes then receive no input and typically do nothing, also without error.

---

## Authentication

None — no credentials required.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conditions` | object | Yes | Condition groups with individual condition rules |
| `combineOperation` | options | Yes | `all` (AND — all conditions must be true) or `any` (OR — at least one must be true) |
| `options.looseTypeValidation` | boolean | No | When `true`, performs type coercion before comparison (`"1" == 1` is true). When `false` (default), types must match exactly. |

### Condition Structure

Each condition in `conditions`:

| Field | Type | Description |
|-------|------|-------------|
| `leftValue` | any | The value or expression to test (usually `{{ $json.fieldName }}`) |
| `operation` | string | Comparison operator (see table below) |
| `rightValue` | any | The value to compare against (can be a static value or expression) |
| `type` | string | Data type for comparison: `string`, `number`, `boolean`, `dateTime`, `array`, `object` |

### Available Operators by Type

**String:**
| Operator | Meaning |
|----------|---------|
| `equals` | Exact match (case-sensitive) |
| `notEquals` | Not an exact match |
| `contains` | Substring match |
| `notContains` | Does not contain substring |
| `startsWith` | Starts with string |
| `endsWith` | Ends with string |
| `regex` | Matches regular expression |
| `isEmpty` | String is empty string or null |
| `isNotEmpty` | String is not empty and not null |
| `exists` | Field is present and not null/undefined |
| `notExists` | Field is absent, null, or undefined |

**Number:**
| Operator | Meaning |
|----------|---------|
| `equals` | Equal to |
| `notEquals` | Not equal to |
| `gt` | Greater than |
| `gte` | Greater than or equal to |
| `lt` | Less than |
| `lte` | Less than or equal to |

**Boolean:**
| Operator | Meaning |
|----------|---------|
| `equals` | Equal to `true` or `false` |

**DateTime:**
| Operator | Meaning |
|----------|---------|
| `equals` | Same date-time |
| `after` | Later than |
| `before` | Earlier than |
| `afterOrEquals` | Same or later |
| `beforeOrEquals` | Same or earlier |

**Array:**
| Operator | Meaning |
|----------|---------|
| `contains` | Array includes the value |
| `notContains` | Array does not include the value |
| `lengthEquals` | Array has exactly N items |
| `lengthGt` | Array has more than N items |
| `isEmpty` | Array has 0 items |

---

## CRITICAL: Filtered Items Are Silently Dropped

**Items that do not pass the filter are permanently discarded.** There is no false output, no error output, no log entry. The n8n execution graph shows the Filter node with a count of how many items passed, but gives no indication of how many were dropped.

**When this becomes a problem**:
- A webhook receives 100 events; the filter is misconfigured and drops all 100 — the workflow appears to run successfully but does nothing.
- A data sync filters out records that should be updated — they are silently skipped.
- A notification filter drops all alerts — no notifications are sent, no error is raised.

**When to use Filter vs IF**:

| Situation | Use |
|-----------|-----|
| Rejected items should be ignored entirely | Filter |
| Rejected items should trigger a different action (log, notify, redirect) | IF node |
| You need to count how many items were rejected | IF node (count false branch) |

---

## Empty vs Null: A Common Trap

The Filter node treats empty strings and null differently:

| Value | `exists` | `notExists` | `isEmpty` | `isNotEmpty` |
|-------|----------|-------------|-----------|--------------|
| `"hello"` | true | false | false | true |
| `""` (empty string) | true | false | true | false |
| `null` | false | true | true | false |
| `undefined` | false | true | true | false |

**Critical behavior**: `exists` does NOT catch empty strings. A field with value `""` passes the `exists` check. This means a Filter that checks `email exists` will pass through records with `email = ""` — these will likely cause failures in subsequent nodes that try to send to that email address.

**Safe pattern for "has a value"**:
- Use `isNotEmpty` instead of `exists` for string fields that should have content.
- Or combine: `AND(exists, isNotEmpty)` using two conditions with `combineOperation=all`.

---

## Type Coercion and `looseTypeValidation`

By default, `looseTypeValidation=false` — types must match exactly:
- `"1"` (string) does NOT equal `1` (number) — condition fails
- `true` (boolean) does NOT equal `"true"` (string) — condition fails

With `looseTypeValidation=true`:
- `"1"` == `1` → true
- `"true"` == `true` → true
- `null` == `undefined` → true

**When to use loose validation**: when data comes from systems that inconsistently type their fields (e.g. CSV imports where numbers are strings, webhooks where booleans arrive as strings `"true"`/`"false"`).

**Risk of loose validation**: it can pass items through that should be filtered. `"0"` == `0` is true in loose mode — if your condition checks for `amount equals 0` to filter out zero-amount transactions, string `"0"` values also pass through.

---

## Expressions in Conditions

Both `leftValue` and `rightValue` support n8n expressions:

```javascript
// Compare field against a dynamic value:
leftValue:  {{ $json.createdAt }}
operation:  after
rightValue: {{ $now.minus({ days: 7 }).toISO() }}

// Filter items where amount is above a threshold from env:
leftValue:  {{ $json.amount }}
operation:  gt
rightValue: {{ Number($env.MIN_AMOUNT) }}

// Filter items where tag matches any item in an array:
leftValue:  {{ $json.tags }}
operation:  contains
rightValue: {{ "vip" }}
```

---

## All Items Filtered: The Silent Nothing

If every item fails the filter, the downstream nodes receive **0 items** and typically execute zero times without error. This is the most common source of "workflow ran successfully but produced no output" reports.

**Example scenario**:
- Workflow reads 50 CRM contacts daily and filters to those modified in the last 24 hours.
- The CRM's `modifiedAt` field is in a different timezone than the filter's `$now` reference.
- All 50 records are "older than 24 hours" in the comparison, even though some were genuinely modified today.
- Result: 0 items pass the filter, 0 records are synced, no error is thrown.

**Detection pattern for monitoring**:
```javascript
// In a Code node AFTER the filter (if it runs):
// Check if item count dropped dramatically vs expected
if ($input.all().length === 0) {
  // No items passed the filter — may be a misconfiguration
}
```

A better approach: add a monitoring branch using an IF node to catch 0-item outputs from critical filters.

---

## Common Failure Modes

**All items filtered out (silent miss)**
- Cause: filter condition is too strict or references a field that doesn't exist.
- Detection: execution shows 0 items after the Filter node; downstream nodes run 0 times.
- Fix: use the n8n debugger to inspect item data before the filter and verify the condition logic manually.

**Null/empty values passing through unexpectedly**
- Cause: using `exists` instead of `isNotEmpty` for string fields.
- Detection: downstream nodes receive items with empty string values and fail on those.
- Fix: use `isNotEmpty` or combine `exists + isNotEmpty` conditions.

**Type mismatch filtering out valid items**
- Cause: `looseTypeValidation=false` (default) and comparing a string number against a number constant.
- Detection: items that should pass the filter are being dropped; the field value is a string (`"123"`) but the condition compares as number.
- Fix: enable `looseTypeValidation=true` OR cast the value in `leftValue` expression: `{{ Number($json.amount) }}`.

**Case-sensitive string match dropping valid items**
- Cause: `equals` on strings is case-sensitive. `"Active"` != `"active"`.
- Fix: use `{{ $json.status.toLowerCase() }}` in `leftValue` and a lowercase `rightValue`.

**DateTime comparison timezone mismatch**
- Cause: comparing a datetime string from an API (e.g. `"2026-05-07T14:00:00+05:00"`) against `$now` which is UTC.
- Fix: normalize both sides to UTC: `{{ DateTime.fromISO($json.createdAt).toUTC().toISO() }}` and compare against `{{ $now.toUTC().toISO() }}`.

---

## Expression Patterns

```javascript
// Filter by status (case-insensitive):
leftValue:  {{ $json.status.toLowerCase() }}
operation:  equals
rightValue: "active"

// Filter by age (records updated in last 24 hours):
leftValue:  {{ $json.updatedAt }}
operation:  after
rightValue: {{ $now.minus({ hours: 24 }).toISO() }}

// Filter by numeric threshold:
leftValue:  {{ Number($json.score) }}
operation:  gte
rightValue: 80

// Filter by array membership:
leftValue:  {{ $json.tags }}
operation:  contains
rightValue: "priority"

// Filter where a nested field exists and is not empty:
leftValue:  {{ $json.contact?.email ?? "" }}
operation:  isNotEmpty
```

---

## Typical Workflow Patterns

**Event filtering (only process specific event types):**
```
Webhook (all Stripe events)
  → Filter (type equals "payment_intent.succeeded")
  → Postgres (record payment)
```

**Age-based filtering (only recent records):**
```
Schedule Trigger (every hour)
  → Postgres (SELECT all open tickets)
  → Filter (createdAt after {{ $now.minus({ hours: 1 }).toISO() }})
  → HTTP Request (trigger escalation for recent tickets only)
```

**Multi-condition filter (AND):**
```
Airtable (List Records)
  → Filter
      conditions:
        - status equals "approved"
        - budget gte 1000
        - assignee isNotEmpty
      combineOperation: all
  → Send Email (notify team of qualifying records)
```

**Using IF instead of Filter when rejected items need handling:**
```
HTTP Request (fetch contacts)
  → IF (email isNotEmpty)
    → [True]  Email Node (send welcome)
    → [False] Slack (alert: "Contact missing email: {{ $json.id }}")
```

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| 0 items downstream from Filter in a workflow that regularly processes data | All items filtered out — likely misconfigured condition or data format change |
| Execution completes successfully with no output artifacts | Silent filter drop — check item count at Filter node in execution details |
| Downstream API call node runs 0 times | Check for upstream Filter with 0 pass-through |
| Inconsistent workflow output (some runs produce data, others don't) | Intermittent filter condition matching — often a date/time comparison drifting around a boundary |

---

## Important Gotchas

1. **Filter is terminal for rejected items**: unlike IF, there is no way to route filtered-out items anywhere. If you discover mid-implementation that you need to handle rejections, you must replace the Filter node with an IF node.
2. **Filter with 0 items does not error**: The execution succeeds. No alert is triggered. Silent data loss is the risk. Add explicit monitoring (e.g. a Code node that checks `$input.all().length > 0` and alerts if not) for critical filters.
3. **Multiple Filter nodes in sequence (AND logic)**: Two Filter nodes in a row with different conditions is equivalent to a single Filter with `combineOperation=all`. The first filter drops items, then the second filters the remainder.
4. **OR logic across groups**: `combineOperation=any` applies across all conditions in the node. If you need mixed AND/OR logic (e.g. "(A AND B) OR C"), use two separate Filter nodes in parallel merged with a Merge node.
5. **`regex` operator is JavaScript regex**: The pattern is evaluated as a JavaScript regular expression. Flags (case-insensitive, multiline) must be specified inline: `(?i)pattern` does not work — use `(?:pattern)` with `.toLowerCase()` in the left-value expression instead.
