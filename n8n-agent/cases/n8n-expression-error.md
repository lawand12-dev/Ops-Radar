# Case: n8n expression error

**Type:** Labeled failure case
**Diagnosis label:** `expression.null-ref` / `expression.undefined-field` / `expression.type-coercion` / `expression.node-ref-broken` / `expression.binary-access`
**Routes from:** `decision-trees/failure-diagnosis` → `workflow.config-or-expression` leaf (WorkflowOperationError) or any error.message matching `/\$json\.|ExpressionError|Cannot read prop|undefined is not|null is not|not a function|is not defined/i`
**Auto-handle safety:** Never auto-retry. Expression errors require a code or config change; the exact same failure will recur on every retry attempt. Always notify-human.
**Updated:** 2026-05-07

## Overview

n8n evaluates expressions at runtime — inside node parameters, the Set node's value fields, IF node conditions, HTTP Request headers and body, and the Code node. An expression like `{{ $json.contact.email }}` is compiled and executed against the data flowing into that node. If the data doesn't match what the expression assumes — a null value, a missing field, a renamed node, a type mismatch — n8n throws an ExpressionError and the execution fails.

Expression errors are distinct from API errors: `httpCode` is null (the failure is local to n8n, not from an upstream service). They are also distinct from workflow configuration errors that fail at activation time — an expression error is a runtime failure, often caused by upstream data changing shape rather than the workflow itself being misconfigured. A workflow that ran successfully for weeks can start throwing expression errors the day an upstream API adds a new response format or omits a field that was previously always present.

## Input — what the error looks like

```jsonc
{
  "name": "WorkflowOperationError",   /* sometimes "ExpressionError" directly */
  "message": "Expression Error: Cannot read properties of null (reading 'email')",
  "httpCode": null,                   /* always null — this is not an HTTP failure */
  "node": "Set",                      /* the node whose parameter contained the expression */
  "description": "{{ $json.contact.email }} [line 1, col 3]"
}
```

Variants the agent must also catch:

- `"TypeError: Cannot read properties of undefined (reading 'hubspot_id')"` — field missing entirely from `$json`
- `"ReferenceError: $node is not defined"` — expression uses `$node["Name"]` syntax inside a Code node where the context API is different
- `"ExpressionError: Referenced node 'Old Node Name' does not exist"` — node was renamed after the expression was written
- `"TypeError: $json.created_at.toISOString is not a function"` — type mismatch; the field arrived as a string, not a Date object
- `"Error: Binary data not available for this item"` — expression accesses `$binary` but binary mode is not configured

In all cases: `error.httpCode` is null and `error.name` is not `NodeApiError`.

## Detection signals

The agent should trigger expression-error classification when **any** of these are true:

1. `error.name = "ExpressionError"` — n8n's dedicated expression error class (thrown from the tmpl engine)
2. `error.name = "WorkflowOperationError"` AND `error.message` matches `/\$json\.|Cannot read prop|undefined is not|null is not|not a function|is not defined|\$node\[/i`
3. `error.httpCode` is null (not an API error) AND `lastNodeExecuted` is an intermediate node — not a trigger or a final output node
4. `error.description` contains an expression literal (starts with `{{` or contains `$json`, `$node`, `$item`, `$binary`)

The most reliable single signal is `error.httpCode = null` combined with a node type that commonly contains expressions: `n8n-nodes-base.set`, `n8n-nodes-base.if`, `n8n-nodes-base.switch`, `n8n-nodes-base.code`, `n8n-nodes-base.httpRequest` (when the expression is in a header or body field).

## Sub-diagnoses

| Label | Description | Most common trigger |
|---|---|---|
| `expression.null-ref` | Accessing a property on a value that is `null` or `undefined`. e.g. `{{ $json.contact.email }}` when `contact` is `null`. | Upstream API returns `null` for an optional object when the record is empty or not found |
| `expression.undefined-field` | The top-level field itself does not exist on `$json`. e.g. `{{ $json.hubspot_id }}` when the API changed the field name to `hs_object_id`. | Upstream API breaking change or response key rename |
| `expression.type-coercion` | Calling a method on a value of the wrong type. e.g. `.toISOString()` on a string, `.length` on a number, `.split()` on null. | Data arrives as a different type than the expression author expected |
| `expression.node-ref-broken` | `{{ $node["Old Node Name"].json.value }}` when the node was renamed or deleted. The reference becomes a dead pointer. | Engineer renamed a node in the editor without updating all downstream expressions |
| `expression.binary-access` | Accessing `$binary.data` or `$binary.mimeType` in an expression when the binary data was not stored as a file (requires `binaryDataMode: filesystem` or `s3`) or when the item has no binary attachment | Workflow moved from a local filesystem instance to one without binary data configured |

## Signal cross-check — identify the sub-diagnosis

Walk these checks in order; stop at the first match:

| Check | Matches → label |
|---|---|
| `error.message` contains `"Cannot read properties of null"` OR `"null is not an object"` | → `expression.null-ref` |
| `error.message` contains `"Cannot read properties of undefined"` AND the failing property is a nested accessor (e.g. `.email` after `.contact`) | → `expression.null-ref` (the parent object is undefined, not the leaf) |
| `error.message` contains `"is not defined"` OR `"undefined"` AND `error.description` references a top-level `$json` key | → `expression.undefined-field` (check: did the same workflow run successfully last week?) |
| `error.message` contains `"is not a function"` OR `"is not a constructor"` | → `expression.type-coercion` |
| `error.message` contains `"does not exist"` AND `error.description` contains `$node["` | → `expression.node-ref-broken` |
| `error.message` contains `"Binary data"` OR `error.description` contains `$binary` | → `expression.binary-access` |
| None of the above | → classify as `expression.null-ref` tentatively but report low confidence; emit all raw signals in the human alert |

**Locating the bad expression:** In `execution_data.data.resultData.runData`, find the last key that has a populated result (last successfully executed node). The node listed immediately **after** it in the workflow's `connections` graph is the one whose expression failed — `lastNodeExecuted` may or may not match, depending on when n8n flushes the run data. Check both.

**Distinguish from a config error:** if the same workflow has **never** run successfully (zero successful executions in `execution_entity`), this may be a first-time misconfiguration rather than a data-drift problem. The fix path is the same, but the diagnosis context differs — flag it in the alert.

## Recovery actions

> **Safety:** Expression errors require a human to edit the workflow. There is no safe automatic fix. Do not attempt to patch the workflow JSON automatically — expression strings are context-sensitive and an automated substitution can silently corrupt the workflow logic.

### `expression.null-ref`

1. `notify-human`. Include: workflow name, node name, node type, the exact failing expression from `error.description`, the last-successfully-executed node name, and a sample of the actual `$json` data at the failing node (from `execution_data.data.resultData.runData.<lastNode>[0].data.main[0]`).
2. Do NOT auto-retry. The same data will flow through the same expression and fail identically.
3. Fix guidance to include in the alert: add optional chaining to guard the null access, or add an IF node upstream to filter out items where the field is null.

### `expression.undefined-field`

1. `notify-human`. Include: the missing field name (from `error.description`), the actual keys present in `$json` at the failing node (extracted from run data), and the last successful execution timestamp for this workflow.
2. The key diagnostic question: compare the actual `$json` keys against the expected field name in the expression. If they differ, the upstream API changed its response schema. This is a breaking API change, not a transient error.
3. Do NOT auto-retry.

### `expression.type-coercion`

1. `notify-human`. Include: the method that was called (from `error.message`), the actual type of the value (from run data), and the expression that produced the call.
2. Fix guidance: the engineer must add an explicit type conversion or change the expression to match the actual data type.
3. Do NOT auto-retry.

### `expression.node-ref-broken`

1. `notify-human` with severity HIGH regardless of workflow tags. A broken node reference means the workflow's internal logic is structurally incorrect — it may have been broken for multiple prior runs if the rename happened before the current failure was first noticed.
2. Check `execution_entity` for prior failures on this workflow in the last 7 days. If there were successful runs after the node rename, the reference was silently not evaluated on those runs (possible if the node reference was in a branch not taken). Include this in the alert.
3. The workflow must be opened in the n8n editor and the expression updated to use the new node name.
4. Do NOT auto-retry.

### `expression.binary-access`

1. `notify-human`. Include: the binary node type that produced the data (look two nodes upstream of the failing expression in the connections graph), the instance's `N8N_DEFAULT_BINARY_DATA_MODE` environment variable value (if accessible), and whether the workflow was recently migrated between n8n instances.
2. Do NOT auto-retry.

### All sub-diagnoses — common rules

- **Never auto-retry.** The expression will fail on the exact same data. Auto-retry creates noise (repeated failure alerts) without any possibility of success.
- **Pause the workflow** if it is trigger-based and fires more than once per 15 minutes. `POST /api/v1/workflows/:id/deactivate`. Record the pause for resumption.
- **Log the action** to the incident timeline per `recovery-routing` reporting hook, with `action: "notify-human"` and `auto_retry: false`.

## Stop conditions

- **Never auto-retry** an expression error for any reason. There is no retry count threshold after which retry becomes acceptable — the expression will fail every time until the workflow is edited.
- If the same expression error fires 3+ times in a row (same node, same error message, same workflow): do not send 3 separate alerts. Deduplicate into one alert with a `recurrence_count` field and silence further alerts for this workflow for 30 minutes.
- If the agent cannot extract the failing expression from `error.description` (it is null or empty): include this gap explicitly in the alert. Do not guess the expression.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Use optional chaining for every nested property access.** The expression `{{ $json.contact?.email }}` never throws if `contact` is null — it returns `undefined`, which n8n renders as an empty string. Compare against the dangerous pattern below.
- **Always provide a fallback with the nullish coalescing operator.** `{{ $json.value ?? 'default' }}` prevents downstream failures when a field is missing or null.
- **Add an IF or Filter node before any node that uses expressions on optional fields.** If a field might legitimately be absent, filter items where it's absent before reaching the expression. This converts a runtime crash into a deliberate no-op.
- **Never reference nodes by string name in expressions.** `{{ $node["My Node"].json.value }}` breaks silently when "My Node" is renamed. Prefer `{{ $('My Node').item.json.value }}` (same issue) — or better, restructure the workflow to use a Set node that explicitly maps the data forward, so downstream nodes always use `$json` rather than cross-node references.
- **When upstream APIs change, update expressions immediately.** Expression errors from field renames are always avoidable — they only occur because there is no automated check that expressions still match the API response shape. A canary run against the API's staging environment after any API version bump catches this class of error before production.
- **Test expressions with the n8n expression editor** before activating a workflow. The editor evaluates the expression against pinned sample data and shows the output — this catches null-ref and type-coercion errors at design time.

## Code snippets

### Dangerous vs. defensive expression patterns

```javascript
// DANGEROUS — throws if $json.contact is null or if $json.contact.email is undefined
{{ $json.contact.email }}

// SAFE — returns undefined (empty string in n8n) if contact is null
{{ $json.contact?.email }}

// SAFE WITH FALLBACK — returns 'unknown@example.com' if contact or email is absent
{{ $json.contact?.email ?? 'unknown@example.com' }}

// DANGEROUS — throws TypeError if $json.created_at is a string, not a Date object
{{ $json.created_at.toISOString() }}

// SAFE — parse explicitly before calling Date methods
{{ new Date($json.created_at).toISOString() }}

// DANGEROUS — throws if $json.tags is null or not an array
{{ $json.tags.join(', ') }}

// SAFE — guard the type before calling array methods
{{ Array.isArray($json.tags) ? $json.tags.join(', ') : '' }}

// DANGEROUS — dead reference if "Enrich Contact" node is renamed
{{ $node["Enrich Contact"].json.email }}

// SAFER — still uses node name, but at least the intent is documented inline
// No truly safe pattern exists for cross-node references; restructure to pass
// data forward via Set nodes so downstream nodes only use $json.
```

### Checking that a required field exists before processing (IF node condition)

```javascript
// In an IF node condition (expression mode):
// Route items to the "true" branch only if the required field is present and non-null
{{ $json.contact !== null && $json.contact !== undefined && $json.contact.email !== undefined }}

// In a Filter node (n8n-nodes-base.filter), same logic as a condition:
// Keep only items where contact.email is a non-empty string
{{ typeof $json.contact?.email === 'string' && $json.contact.email.length > 0 }}
```

## Field checklist — what the human alert must include

```
[ ] execution_id              — UUID; direct link to n8n UI
[ ] workflow_id               — for cross-referencing
[ ] workflow_name             — human-readable
[ ] sub_diagnosis_label       — expression.null-ref / undefined-field / type-coercion / node-ref-broken / binary-access
[ ] agent_confidence          — high / medium / low
[ ] failing_node_name         — the node that threw the error
[ ] failing_node_type         — e.g. n8n-nodes-base.set
[ ] failing_expression        — the exact expression string from error.description
[ ] last_successful_node      — the node that ran successfully just before the failure
[ ] actual_json_keys          — the actual keys present in $json at the failing node (from run data)
[ ] prior_failures_7d         — count of same error on same workflow in last 7 days
[ ] workflow_paused           — true/false; agent must resume on incident close
[ ] auto_retry                — always false for this case; include explicitly
[ ] fix_guidance              — the sub-diagnosis-specific guidance from Recovery Actions above
```

## Cross-references

`decision-trees/failure-diagnosis` (WorkflowOperationError leaf) · `decision-trees/recovery-routing` (workflow → escalate-engineer / notify-human) · `cases/unknown-failure` (if sub-diagnosis cannot be determined) · `playbooks/report-to-agency`
