# Case: n8n Version Breaking Change

**Type:** Case file  
**Domain:** infra  
**Labels:** `infra.version-breaking-change`, `expression.null-ref` (surface), `workflow.config-or-expression` (surface)  
**Actions:** notify-human (always), escalate-engineer when scope is wide  
**Updated:** 2026-05-07

---

## Overview

n8n releases updates that sometimes change node output schemas, expression variable names, or built-in node behavior between versions. These changes cause workflows that ran correctly for months to silently fail or produce wrong data after an upgrade. The failure surface looks like a generic expression error — but the root cause is a version mismatch, not a workflow bug.

This case is loaded when:
- The failure-diagnosis tree reaches `expression.null-ref` or `workflow.config-or-expression`
- AND `external_signals.n8n_upgraded_at` is recent (within the last 7 days)
- AND the workflow's last successful execution was before the upgrade

**Critical distinction:** expression errors that predate an upgrade are genuine expression bugs. Expression errors that start immediately after an upgrade are version-breaking-change candidates.

---

## Detection Signals

| Signal | Pattern | Confidence |
|---|---|---|
| `error.name` | `ExpressionError` or `NodeOperationError` | — |
| `error.message` | `/Cannot read properties of undefined|is not defined|\$json\.\w+ is undefined/` | — |
| `n8n_upgraded_at` | within 7 days of `error_first_occurred_at` | High if correlation < 24h |
| `workflow_last_successful_at` | before `n8n_upgraded_at` | High |
| `other_workflows_failing_same_node_type` | > 0 | Escalate scope |
| `n8n_version_before` / `n8n_version_after` | in external_signals | Confirms |
| Error appears on multiple workflows simultaneously | true | Critical — systemic |

**The key timestamp check:**
```
error_first_occurred_at - n8n_upgraded_at < 48 hours
AND
workflow_last_successful_at < n8n_upgraded_at
```
Both must be true to classify as version-breaking-change with high confidence.

---

## Sub-Diagnoses

| Subtype | Pattern | Typical cause |
|---|---|---|
| `node-output-schema-changed` | `$json.fieldName` returns `undefined` after upgrade | A node's output shape changed — field was renamed, nested differently, or removed |
| `expression-variable-renamed` | `$execution.id` → `$execution.id` (old) vs `$runIndex` (new) | Built-in n8n expression variables renamed between major versions |
| `node-parameter-deprecated` | Workflow definition has a parameter that the new node version ignores silently | Node internals changed; old parameter key no longer read |
| `credential-type-renamed` | Credential type string changed; n8n can't map the old credential to the new node | Node was renamed (e.g., "Airtable" → "Airtable V2") |
| `behavior-change-silent` | No error — output shape changed silently | Downstream workflows or data warehouses receive unexpected data shape |

---

## Signal Cross-Check

When tree routes here, verify each signal before finalizing the sub-diagnosis:

**1. Confirm the timestamp correlation**
```
Is n8n_upgraded_at within 7 days before error_first_occurred_at?  YES → proceed
Did the workflow succeed at least once after n8n_upgraded_at?       YES → not version-breaking, real expression bug
```

**2. Identify which node type is failing**
- Get `error.node` from execution data
- Check what n8n changed for that node type in the version delta (if release notes are available via external_signals)
- Common nodes with breaking changes between versions: HubSpot, Airtable, Google Sheets, HTTP Request (v2→v3), Set (v1→v2 Edit Fields)

**3. Measure scope — how many workflows are affected?**
```sql
-- Run via query_n8n_db if DB access is configured
SELECT DISTINCT workflow_id
FROM execution_entity
WHERE status = 'error'
  AND started_at > :n8n_upgraded_at
  AND data->>'lastNodeExecuted' = :failing_node_type
LIMIT 100;
```
- 1 workflow affected → `notify-human`, severity MEDIUM
- 2–5 workflows → `notify-human`, severity HIGH
- 6+ workflows → `notify-human` + `escalate-engineer`, severity CRITICAL

**4. Check for silent behavior change (no error)**
If the workflow shows `status=success` but output data changed shape after the upgrade:
- Compare `execution_data.runData.<NodeName>[-1].data` from before vs after the upgrade
- If field names, nesting depth, or value types differ → `behavior-change-silent`

---

## Recovery Actions

**All sub-diagnoses → `notify-human`**

No auto-action is safe for version breaking changes. The engineer must:
1. Read the n8n changelog for the version delta
2. Audit all affected workflows for the same node type
3. Fix expressions or parameter names
4. Test in a staging environment before re-enabling

**Severity escalation table:**

| Condition | Action | Severity |
|---|---|---|
| 1 workflow failing, no revenue tag | notify-human | MEDIUM |
| revenue:true workflow failing | notify-human | HIGH |
| 3+ workflows failing same node type | notify-human | HIGH |
| 6+ workflows or customer-facing:true | notify-human + escalate-engineer | CRITICAL |
| Silent behavior change (success but wrong data) | notify-human | HIGH — data corruption |

**Forbidden actions:**
- `auto-retry` — the workflow will fail identically after the retry
- `auto-cancel-replay` — replay produces the same error
- Attempting to "fix" the expression inside the incident — that requires workflow editor access

---

## Alert Composition

The human alert for a version breaking change must include:

```
SUBJECT: [OpsRadar] n8n upgrade broke {N} workflow(s) — action required

SUMMARY:
n8n was upgraded from {version_before} to {version_after} on {n8n_upgraded_at}.
{N} workflow(s) started failing within {hours} hours of the upgrade.
Root cause: {node_type} node output schema changed in this version.

AFFECTED WORKFLOWS:
{list of workflow names and IDs}

ERROR PATTERN:
Node: {error.node}
Error: {error.message}
First failure: {error_first_occurred_at}

WHAT CHANGED:
{n8n changelog entry if available, else: "Check https://github.com/n8n-io/n8n/releases for version {version_after} changes to {node_type} node"}

REQUIRED ACTION:
1. Check the n8n changelog for {version_after}
2. Audit all workflows using {node_type} nodes
3. Update expressions from old to new field names
4. Test in staging before re-activating

DORMANT RISK:
{M} other workflows use {node_type} nodes but have not failed yet.
These may fail on their next scheduled run. Audit proactively.

PREVENTION:
- Test major n8n upgrades in a staging environment first
- Pin the n8n version in production (Docker image tag, not 'latest')
- Run the eval suite against the new version before upgrading production
```

---

## Known Breaking Changes by Node (Reference)

These are the most common inter-version breaks seen in production:

| Version range | Node | What changed | Old pattern | New pattern |
|---|---|---|---|---|
| <1.0 → 1.x | HTTP Request | v1→v2: response body moved | `$json.body` | `$json` (body is top-level) |
| 0.x → 1.x | Set | v1→v2 Edit Fields: field access | `$node["Set"].json.field` | `$json.field` (context-aware) |
| 1.28 → 1.35 | HubSpot | Contact ID field rename | `$json.id` | `$json.hs_object_id` |
| 0.x → 1.x | Airtable | Node renamed to Airtable V2 | credential type: `airtableApi` | `airtableTokenApi` |
| Various | Google Sheets | Resource Mapper added | positional column access | header-name mapped access |
| 1.x | Split In Batches | `done` output renamed | `"done"` branch | `"Done"` (capitalized) |

When the exact version delta is not in this table, check `external_signals.n8n_release_notes_url` or `https://github.com/n8n-io/n8n/releases/tag/n8n@{version_after}`.

---

## Stop Conditions

- Do not continue diagnosing as a simple expression error once the timestamp correlation is confirmed
- Do not auto-retry more than once — the first retry confirms the pattern, the second wastes a tool call
- Once scope > 6 workflows, stop individual-workflow analysis and escalate the systemic issue

---

## Prevention

Tell the customer in the alert:

1. **Pin Docker image tags** — never use `n8n:latest` in production. Use `n8n:1.35.0`.
2. **Maintain a staging environment** — upgrade staging first, run the workflow eval suite, wait 24h, then upgrade production.
3. **Read the changelog before upgrading** — https://github.com/n8n-io/n8n/releases — search for nodes your workflows use.
4. **Tag workflows by node type** — makes it easy to find all workflows using a specific node before an upgrade.
5. **Run the OpsRadar eval suite post-upgrade** — the eval scenarios in `evals/` catch common breaking changes before customers notice.

---

## Field Checklist

The evidence object for this case must contain:

- [ ] `error.name` and `error.message`
- [ ] `error.node` (which node type is failing)
- [ ] `lastNodeExecuted`
- [ ] `n8n_version_before` and `n8n_version_after`
- [ ] `n8n_upgraded_at` (timestamp)
- [ ] `error_first_occurred_at` (timestamp)
- [ ] `workflow_last_successful_at` (timestamp — confirms pre-upgrade success)
- [ ] `affected_workflow_count` (from scope query)
- [ ] `dormant_risk_count` (workflows using same node type, not yet failed)
- [ ] `subtype` (which sub-diagnosis was confirmed)
- [ ] `confidence` (high if timestamp correlation < 24h; medium if 1-7 days)

---

## External References (Authoritative Sources)

When the Known Breaking Changes table above does not cover the version delta, go to these sources in order:

| Need | URL |
|---|---|
| Full release notes for a specific version | `https://github.com/n8n-io/n8n/releases/tag/n8n@{version_after}` |
| All releases (scan visually for the version range) | `https://github.com/n8n-io/n8n/releases` |
| Raw CHANGELOG (all versions in one file) | `https://github.com/n8n-io/n8n/blob/master/CHANGELOG.md` |
| Source code for a specific built-in node | `https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/{NodeName}/` |
| Node output type definitions | `https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/{NodeName}/{NodeName}.node.ts` |

**How to use the node source URL:** When the error mentions a field name that no longer exists, load the `.node.ts` file for that node at the `n8n@{version_after}` tag. Search for `execute()` → look at what keys the node returns in its output items. That tells you the exact new field names to use in the patched expression.

Example:
```
https://github.com/n8n-io/n8n/blob/n8n@1.35.0/packages/nodes-base/nodes/HubSpot/HubSpot.node.ts
```

Do not clone the full n8n repository. Fetch only the specific file needed.

---

## Cross-References

`cases/n8n-expression-error.md` — for expression errors that are genuine bugs, not version changes  
`decision-trees/failure-diagnosis.md` — `expression.null-ref` leaf routes here when upgrade correlation is found  
`evals/scenario-n8n-version-breaking-change.md` — graded scenario for this case  
`playbooks/improve-from-feedback.md` — add new breaking change patterns here as they are discovered
