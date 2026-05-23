# Recovery Routing Tree

**Type:** Decision tree (machine-readable)
**Audience:** n8n monitoring agent
**Inputs:** A category label from `error-classification` (or a leaf from `failure-diagnosis`) plus execution context
**Outputs:** One of five recovery actions: `auto-retry`, `auto-refresh`, `auto-cancel-replay`, `notify-human`, `escalate-engineer`
**Updated:** 2026-05-07

## Recovery actions defined

| Action | Side effects | Who confirms |
|---|---|---|
| `auto-retry` | Calls n8n's retry endpoint or re-fires the trigger; safe only if **idempotent** | Agent (with idempotency check) |
| `auto-refresh` | Refreshes credential via the OAuth refresh flow exposed by the credential type | Agent |
| `auto-cancel-replay` | `POST /executions/:id/stop` then re-fire trigger; safe only if no side-effects have already shipped | Agent (with side-effect probe) |
| `notify-human` | Posts to the customer's alert channel; no n8n state change | Agent |
| `escalate-engineer` | Pages the on-call engineer at the agency; includes a packaged diagnostic | Agent |

## Routing rules

```
INPUT: category, subtype, workflow.idempotent (bool, from workflow tag), retry_count

CASE category:

  auth:
    IF subtype = "refresh-expired"  AND  credential.type ∈ refreshable_set
        → auto-refresh ; on-failure → notify-human
    ELSE IF subtype IN {"revoked", "scope-insufficient", "apikey-rotated", "mfa-required"}
        → notify-human  (must be a person; never auto-fix)
    ELSE
        → notify-human

  ratelimit:
    backoff_seconds = exponential(retry_count, base=30, cap=900) + jitter(0..15)
    IF retry_count < 5
        → auto-retry  (after backoff_seconds)
    ELSE
        → notify-human

  timeout:
    IF subtype = "upstream-slow"  AND  workflow.idempotent  AND  retry_count < 3
        → auto-retry  (with smaller payload if pageable)
    ELSE IF subtype = "gateway"
        → auto-retry  (after 60s)  IF retry_count < 3
    ELSE
        → notify-human

  data:
    IF subtype = "duplicate"  AND  workflow has upsert variant
        → notify-human  (recommend switch to upsert)
    IF subtype IN {"validation", "schema-drift"}
        → escalate-engineer  (workflow needs a code change)
    IF subtype = "unknown-field"
        → escalate-engineer  (likely upstream API breaking change)
    ELSE
        → notify-human

  network:
    IF retry_count < 3
        → auto-retry  (with 10s, 30s, 90s backoff)
    ELSE
        → notify-human

  infra:
    IF subtype = "worker-oom"
        → auto-cancel-replay  IF workflow.idempotent  ELSE notify-human
    IF subtype IN {"worker-died", "redis-disconnect"}
        → auto-cancel-replay  IF workflow.idempotent  ELSE notify-human
    IF subtype IN {"disk-full", "db-lock"}
        → escalate-engineer  (instance-level, not workflow-level)

  workflow:
    → escalate-engineer   (always; engineering owns this)

  unknown:
    → escalate-engineer
```

## Idempotency check (required before any auto-retry / auto-cancel-replay)

The agent must never replay a workflow that may have already produced a side effect. The check, in order:

1. **Workflow tag:** if the workflow has tag `idempotent:true` set by the engineer, trust it. (Agencies should adopt this convention.)
2. **Last-node check:** if `lastNodeExecuted` is read-only (e.g. `If`, `Set`, `Switch`, an HTTP `GET`), retry is safe.
3. **Side-effect probe:** if the workflow's recent successful run produced a deterministic output and the failed run reached an identifiable point, the agent can fingerprint the partial result against an idempotency key in the upstream system (e.g. checking Stripe for an existing PaymentIntent with the customer's idempotency key).
4. **Default:** if none of the above hold, **do not auto-retry**. Notify-human.

## Backoff schedule (for `auto-retry`)

```
attempt n  →  delay  =  min( base * 2^n + random(0, jitter_max),  cap )

defaults: base = 30 s, cap = 900 s (15 min), jitter_max = 15 s
ratelimit category: same defaults
timeout category:    base = 60 s, cap = 600 s
network category:    base = 10 s, cap = 300 s
```

After three retries hit the cap with no success, **always** escalate; do not loop.

## Stop conditions (kill the agent's auto-handler)

The agent must stop auto-handling and force `escalate-engineer` if any of these are true within a 10-minute window:

- More than 5 distinct workflows in the same instance hit the same category. (Probably an instance-level problem, not workflow-level.)
- Auto-retry count for one workflow exceeds 5 within an hour.
- Two consecutive `auto-refresh` attempts fail. (Don't fight a permanently broken credential.)
- Any `infra.disk-full` or `infra.db-lock` is detected. (These never self-resolve via retry.)

## Reporting hook

Every recovery action — even silent ones — must be logged to the customer's incident timeline with:

```jsonc
{
  "ts": "2026-05-07T12:34:56Z",
  "execution_id": "...",
  "workflow_id": "...",
  "category": "ratelimit",
  "subtype": "account-tier",
  "action": "auto-retry",
  "attempt": 2,
  "outcome": "pending",
  "next_check": "2026-05-07T12:36:26Z"
}
```

The customer report (`playbooks/report-to-agency`) reads from this stream.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` · `playbooks/recover-from-api-error` · `playbooks/report-to-agency`
