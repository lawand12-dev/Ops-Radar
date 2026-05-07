# Playbook: Recover from an API error

**Type:** Procedure (the executor for `auto-retry`, `auto-refresh`, `auto-cancel-replay` actions decided by `decision-trees/recovery-routing`)
**When to run:** After `playbooks/diagnose-workflow-failure` has produced a diagnosis with `next_action ∈ {auto-retry, auto-refresh, auto-cancel-replay}`
**Inputs:** the diagnosis record (label, subtype, confidence, evidence), the original execution row
**Outputs:** an attempt record (success / failure / pending) appended to the incident timeline; a possibly-recovered workflow execution
**Updated:** 2026-05-07

## Step 0 — Pre-flight checks (gate, in order)

Refuse to proceed if any of these are true:

1. `confidence != "high"` AND the action is `auto-cancel-replay`. Replay is the most dangerous action — never on medium / low.
2. The case file's `Auto-handle safety` does not list the proposed action as allowed.
3. Any global stop condition from `decision-trees/recovery-routing` is currently tripped (rate of failures across the customer's instance, two consecutive auto-refresh failures on the same credential, etc.).
4. The workflow has been auto-handled by this playbook 5+ times in the past hour with no terminal success.
5. The customer has the global flag `auto_recovery: false` (some agencies want every alert to go through a human).

If any check fails, demote `next_action` to `notify-human` and exit.

## Step 1 — Compute the schedule

Backoff schedule by category (see `decision-trees/recovery-routing`):

| Category | base | cap | jitter |
|---|---|---|---|
| `ratelimit` | 30 s | 900 s | 0–15 s |
| `timeout` | 60 s | 600 s | 0–30 s |
| `network` | 10 s | 300 s | 0–10 s |
| `auth` | n/a (single refresh, not retry) | — | — |
| `infra` (cancel-replay) | 30 s after cancel confirmed | — | 0–15 s |

For `ratelimit.meta-buc`, prefer the explicit `estimated_time_to_regain_access` value from headers (case `meta-api-rate-limit`) over the formula.

`delay = min(base * 2^attempt + random(0, jitter), cap)`.

## Step 2a — Action: `auto-retry`

1. Wait the computed `delay`.
2. Re-fire the workflow's trigger:
   - **Schedule:** `POST /api/v1/workflows/:id/run` with the original input fingerprint if the trigger node accepts an input. Many schedule triggers don't — replay simply re-executes from the trigger.
   - **Webhook:** synthesize the original payload from `execution_data.data.executionData.contextData["$node"]["<webhook-node>"]` and POST to the workflow's webhook URL with the original headers preserved (especially signing headers — Stripe, Shopify, GitHub all verify HMAC).
   - **Polling / Interval:** do not retry; wait for the next natural fire.
3. Tag the new execution with `executionMetadata` key `retry_of = <original_execution_id>` (n8n supports `retryOf` natively when retrying via UI, but not via the public API in 1.x — use `execution_metadata` instead).
4. Watch the new execution to terminal state. If it succeeds → close the incident. If it fails with the same label → increment `attempt` and re-enter Step 1, until the cap or the per-hour stop condition.

## Step 2b — Action: `auto-refresh`

Only valid for `category = auth` and `subtype = refresh-expired`, and only when the credential type's refresh flow is intact (Google OAuth2, Microsoft OAuth2, HubSpot OAuth2, Slack OAuth2 are refreshable; static API keys are not).

1. Re-execute the failed node, which forces n8n to attempt a token refresh on the next call. The simplest path:
   `POST /api/v1/executions/:id/retry` (when available on the deployed n8n version) — this re-runs from the failed node onward.
   Fallback: re-fire the trigger as in Step 2a.
2. Within 60 s, query `credentials_entity.updatedAt` for the affected credential (resolve credential ID from the workflow node's `credentials` field).
3. **Confirm refresh:** `updatedAt` must have advanced. If not advanced after the retry: refresh failed — the refresh token itself is dead. Demote to `notify-human` and exit.
4. **Confirm via execution:** the new execution must reach `status = success`. If it again fails with `auth.refresh-expired`, the refresh likely succeeded but the new token still lacks scope, or the credential is intermittently broken. Notify-human.
5. Two consecutive refresh failures on the same credential within 24 h triggers `escalate-engineer` regardless of confidence.

## Step 2c — Action: `auto-cancel-replay`

Only valid when:

- workflow has `idempotent:true` tag, OR
- last-executed node is read-only (`If`, `Set`, `Switch`, `Function` with no side-effects, or an HTTP `GET`-only call)

Steps:

1. **Cancel:** `POST /api/v1/executions/:id/stop`. If `200`, proceed. If `404`, the row already finalized — re-diagnose; this is no longer the same case.
2. **Idempotency probe** (mandatory before replay):
   - For workflows that produce external side effects via known idempotency keys (Stripe `Idempotency-Key`, HubSpot `email` upsert, Shopify `webhook_id`), check the upstream system for an existing record matching the in-flight key. If found → the original execution did partially succeed — record this in the incident and demote to `notify-human` rather than replay.
   - For workflows without idempotency keys → demote to `notify-human`. Tagging is the customer's responsibility.
3. **Replay:** as in Step 2a.

## Step 3 — Outcome handling

Three possible terminal states for an attempt:

| Outcome | Action |
|---|---|
| Replay succeeded | Mark incident `resolved`. Append to incident timeline. Include in the customer's daily digest. |
| Replay failed with same label | Re-enter Step 1 with `attempt += 1` until per-category cap (5 retries default). |
| Replay failed with **different** label | Treat as a new failure — feed into `playbooks/diagnose-workflow-failure`. The original incident is marked `superseded`. |

Never silently retry forever. The cap is a feature, not a limitation.

## Step 4 — Logging the attempt

```jsonc
{
  "ts": "2026-05-07T12:34:56Z",
  "incident_id": "...",
  "execution_id": "<original>",
  "replay_execution_id": "<new>",
  "action": "auto-retry|auto-refresh|auto-cancel-replay",
  "attempt": 1,
  "delay_seconds": 30,
  "outcome": "success|same-failure|different-failure|pending",
  "next_check_at": "..."
}
```

Every attempt — even successful ones — is reflected in the customer's incident timeline. `playbooks/report-to-agency` summarizes these in the daily digest.

## Step 5 — Failure mode of this playbook itself

If the agent's API call to n8n fails (network or 5xx from the customer's instance), the agent must:

1. Treat this as `infra.unreachable` for the customer's instance.
2. Suspend further attempts on that instance for 5 minutes.
3. Surface the unreachability immediately — a customer's n8n that the agent can't talk to is a higher-severity outage than any single workflow failure.
4. Resume attempts after the suspension window only after `/healthz/readiness` returns 200.

## Cross-references

`decision-trees/recovery-routing` · `decision-trees/error-classification` · `playbooks/diagnose-workflow-failure` · `playbooks/detect-stuck-execution` · `playbooks/report-to-agency` · all `cases/`
