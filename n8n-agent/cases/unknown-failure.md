# Case: Unknown / unclassified failure

**Type:** Fallback escalation case (not a diagnosis)
**Diagnosis label:** `error.unclassified` / `escalate.unknown`
**Routes from:** `decision-trees/failure-diagnosis` → DEFAULT leaf (no prior branch matched), OR any branch that reached a label with confidence < medium
**Auto-handle safety:** NO auto-handling of any kind. This case is a structured hand-off to a human. The agent's only actions are safe reads + notify-human.
**Updated:** 2026-05-07

## When this case loads

The failure-diagnosis tree reached the final `DEFAULT` leaf — meaning none of the following matched:

- `status` in {running, waiting, crashed} with a timing condition
- `error.name` in {NodeApiError, NodeOperationError, WorkflowOperationError}
- `error.message` matching any network, OOM, or known-API pattern
- `error.httpCode` matching any of the classified codes

This case also loads when the tree returned a label but confidence is **low** (matched only on a DEFAULT sub-branch or a loose regex against a generic field). In either case the agent does NOT know what caused the failure.

**Critically:** this case instructs the agent not to guess, not to assign a label, and not to take any action that modifies n8n state. The engineer decides everything.

## Input — what the error might look like

The error signature is undefined by definition, but collect exactly this structure before acting:

```jsonc
{
  "execution_id": "<string>",
  "workflow_id": "<string>",
  "workflow_name": "<string>",
  "status": "<error|crashed|running|...>",
  "mode": "<trigger|manual|webhook|...>",
  "started_at": "<ISO8601>",
  "stopped_at": "<ISO8601 or null>",
  "last_node_executed": "<string or null>",
  "error": {
    "name": "<string — may be null>",
    "message": "<string — full text, untruncated>",
    "httpCode": "<string or null>",
    "node": "<string or null>",
    "stack": "<string — first 10 lines>"
  },
  "workflow_tags": ["<tag1>", "<tag2>"]
}
```

If any field above is null, record it explicitly as `null` — do not omit it. Absent fields in the alert are harder to debug than null ones.

## Evidence collection — mandatory before alerting

The agent must run the following reads in order before emitting the alert. No writes until engineering responds.

1. **Full execution row.** `GET /api/v1/executions/:id` — capture `status`, `mode`, `startedAt`, `stoppedAt`, `retryOf`, `retrySuccessId`. If `retryOf` is populated, this is a retry of a prior failure — fetch the parent execution too.

2. **Full error object.** From `execution_data.data.resultData.error` — the full object, not just `message`. Include `name`, `httpCode`, `description`, `context`, `stack` (first 10 lines). Do not summarize or truncate.

3. **`lastNodeExecuted`.** From `execution_data.data.resultData.lastNodeExecuted`. Cross-reference against the workflow's node list to get the node type (`node.type`, e.g. `n8n-nodes-base.httpRequest`). The type matters — an unknown failure on an `n8n-nodes-base.executeWorkflow` node is different from one on a custom `@n8n-community/nodes-*` node.

4. **Workflow tags.** `GET /api/v1/workflows/:id` → `tags`. Check for `revenue:true`, `idempotent:true`, `customer-facing:true`, `env:production`. These drive severity.

5. **Prior failures for this workflow in the last 24 h.** Query `execution_entity` where `workflowId = :id AND status = 'error' AND startedAt > NOW() - INTERVAL '24 hours'`. Count them. If count ≥ 3, this is a recurring pattern — say so explicitly in the alert.

6. **Blast-radius check.** Count how many distinct workflows in the same n8n instance hit `status='error'` in the same 5-minute window as this execution. If ≥ 3 others, this may be an instance-level problem. Flag it.

7. **Workflow node types.** From the workflow's `nodes` array, extract the unique `type` values. If the list includes any community or custom nodes (prefix does not start with `n8n-nodes-base.` or `@n8n/n8n-nodes-langchain.`), note them — unknown failures on community nodes are a frequent cause and can't be classified by the tree.

## Severity assignment

The agent determines severity from tags — no guessing from error content.

| Condition | Severity |
|---|---|
| Tag `revenue:true` present | **HIGH** |
| Tag `customer-facing:true` present | **HIGH** |
| Tag `env:production` present AND prior failures ≥ 3 in 24 h | **HIGH** |
| Tag `env:production` present, no other escalating tag | **MEDIUM** |
| No production tag or unknown environment | **MEDIUM** |
| Tag `env:staging` or `env:dev` | **LOW** |

The agent does not upgrade severity based on guessing that the error "looks serious." Tags are ground truth.

## Signal cross-check — help the engineer narrow the cause

The agent must include this section verbatim in the alert, populated with the actual error text. It does not conclude a diagnosis — it surfaces discriminators.

| Signal | If present | What it suggests (not a diagnosis) |
|---|---|---|
| `error.message` contains `ECONNREFUSED` | Yes / No | Network: target host refused the TCP connection. Check if the upstream service is reachable from n8n's network segment. |
| `error.message` contains `ECONNRESET` or `ETIMEDOUT` or `ENOTFOUND` | Yes / No | Network: transient connectivity or DNS failure. Check n8n host's outbound connectivity. |
| `error.message` contains `JSON` or `Unexpected token` or `SyntaxError` | Yes / No | Data parsing: a response body or expression was not valid JSON. Check the upstream API's actual response. |
| `error.message` contains `timeout` (case-insensitive) | Yes / No | Timeout: either n8n's own execution timeout or an HTTP node's per-request timeout. Check `settings.executionTimeout` and HTTP node `options.timeout`. |
| `error.message` contains `401` or `403` or `Unauthorized` or `Forbidden` | Yes / No | Auth: credential likely expired or lacks permission. Even if the tree didn't classify it, check credentials for the last-executed node. |
| `error.message` contains `signature` or `hmac` or `invalid payload` | Yes / No | Webhook signature: possible mismatch — see `cases/webhook-signature-validation`. |
| `error.message` contains `ExpressionError` or `$json.` or `Cannot read prop` | Yes / No | Expression error — see `cases/n8n-expression-error`. |
| `lastNodeExecuted` is a community node | Yes / No | Community node failure: the tree cannot classify these. Check the node's own error output and its npm package changelog for breaking changes. |
| ≥ 3 other workflows failed in the same 5-min window | Yes / No | Instance-level event: network outage, Postgres hiccup, or Redis disconnect. Individual workflow triage may be a dead end. |
| None of the above match | — | Genuinely unknown. Engineer must read the full stack trace and execution data. |

**Important:** the agent populates Yes/No in each row based on actual error content. It does not choose a diagnosis from this table. The table is a reading aid for the engineer, not a classification.

## Recovery actions

**Only safe reads are permitted. No writes. No retries. No replays.**

1. Run the evidence collection in order (section above).
2. Determine severity from tags.
3. Populate the signal cross-check table with actual Yes/No values.
4. **Pause the workflow** if it fires on a short interval (≤ 15 min) and would spam failures before the engineer can respond. `POST /api/v1/workflows/:id/deactivate`. Record this pause — the agent must resume the workflow when the engineer closes the incident, and must alert if it forgets.
5. Emit `notify-human` with the full alert payload (see Field Checklist below).
6. Log the action to the incident timeline per `recovery-routing` reporting hook.
7. **Stop.** Do not attempt auto-retry, auto-refresh, or auto-cancel-replay. Do not re-diagnose. Do not call the failure-diagnosis tree again for this execution — it already ran and reached this case.

If the blast-radius check found ≥ 3 concurrent workflow failures: emit `escalate-engineer` in addition to `notify-human`. The agency's on-call engineer needs a pager-level alert, not just a Slack message.

## Stop conditions

The agent must NOT loop on this case. Specifically:

- **Do not** re-run the failure-diagnosis tree hoping a different branch matches. The tree already ran; repeating it produces the same result.
- **Do not** auto-retry even if the error looks transient. "Looks transient" is a guess. This case exists precisely because the tree cannot classify the error; retrying on an unclassified error can produce duplicate side effects.
- **Do not** replay a webhook or trigger. The original payload is evidence; replaying it may corrupt downstream state.
- **Do not** reassign the confidence from low to medium to justify acting. Emit what the tree returned.
- If the same workflow hits this case three times within an hour: raise severity to HIGH regardless of tags, include the repeat count in the alert, and add the workflow to a temporary suppress-and-escalate list for 30 minutes.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Wire error output connections on every node.** In n8n, a node with no "On Error" output connection fails silently to the execution level — the failure-diagnosis tree gets a generic error with no node-level context. Wiring error outputs to a dedicated error-handler sub-flow (a Set node that captures `{{ $json.error }}` plus a Slack/email notifier) makes failures visible and classifiable immediately.
- **Set a catch-all error workflow at the instance level.** `N8N_ERROR_WORKFLOW=<workflow_id>` ensures every unhandled failure routes to a known handler. The error workflow has access to the full execution context, including the node name and error message, and can do more specific routing than the agent's external view.
- **Tag every production workflow.** Without `env:production`, `revenue:true`, or `customer-facing:true` tags, the agent cannot assign accurate severity. Untagged workflows default to MEDIUM, which may miss a revenue-critical failure.
- **Add a description field to every workflow.** n8n's workflow `description` is indexed and surfaced in the API. An agent that can read "This workflow invoices the client via Stripe on the 1st of each month" can produce a better alert than one that cannot.
- **Avoid community nodes in production critical paths** unless the node is actively maintained and pinned to a specific version. Community nodes can fail in ways that produce no structured error — just a JavaScript runtime crash — which lands in this fallback case every time.
- **Pin n8n to a specific version in production.** Unplanned n8n upgrades can change internal behavior and produce errors the tree has never seen. Pin the version, test upgrades in staging first.

## Field checklist — what the human alert must include

The engineer receiving this alert needs to debug cold, without any prior context. Every field below must be present.

```
[ ] execution_id           — the UUID; links directly to the n8n UI
[ ] workflow_id            — for cross-referencing other executions
[ ] workflow_name          — human-readable; not everyone knows IDs
[ ] workflow_tags          — full list; used to assess blast radius
[ ] severity               — HIGH / MEDIUM / LOW with the tag-rule that produced it
[ ] status                 — the exact value from execution_entity.status
[ ] mode                   — trigger / manual / webhook / etc.
[ ] started_at             — ISO8601
[ ] stopped_at             — ISO8601 or "still running"
[ ] last_node_executed     — node name AND node type
[ ] error.name             — exact string, null if absent
[ ] error.message          — full text, untruncated
[ ] error.httpCode         — exact value, null if absent
[ ] error.stack            — first 10 lines
[ ] prior_failures_24h     — count of other error executions for this workflow in last 24 h
[ ] blast_radius           — count of other workflows that errored in the same 5-min window
[ ] signal_cross_check     — the populated Yes/No table from Signal Cross-check section
[ ] workflow_paused        — true/false; if true, the agent must resume on incident close
[ ] agent_confidence       — always "low" for this case; include it explicitly
[ ] agent_action           — "notify-human (no auto-handling)" — include it explicitly
```

## Cross-references

`decision-trees/failure-diagnosis` (DEFAULT leaf) · `decision-trees/recovery-routing` (unknown → escalate-engineer) · `cases/n8n-expression-error` · `cases/webhook-signature-validation` · `playbooks/report-to-agency`
