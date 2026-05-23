# Error Classification Tree

**Type:** Decision tree (machine-readable)
**Audience:** n8n monitoring agent
**Used after:** `decision-trees/failure-diagnosis` produces a non-leaf label or hits `DEFAULT`
**Outputs:** A category label (one of the seven below) used to route to the correct recovery strategy
**Updated:** 2026-05-07

## Why a separate tree

`failure-diagnosis` matches on the obvious top-level shape (status, error.name, httpCode). When that tree falls through to `DEFAULT`, the agent needs a coarser classification before it can reach for `recovery-routing`. This page is the bridge.

## The seven categories

| Category | One-liner | Auto-handle? |
|---|---|---|
| `auth` | Credential, scope, or token problem | Sometimes (refresh) |
| `ratelimit` | Quota or throttling response from upstream | Yes (backoff) |
| `timeout` | Upstream did not respond in time, or our client timed out | Yes (retry with cap) |
| `data` | Upstream rejected the payload, duplicates, validation, schema | No (needs human or workflow change) |
| `network` | Transport-level failure | Yes (retry) |
| `infra` | n8n itself: OOM, worker death, DB lock, disk full | No (alert; some auto if isolated) |
| `workflow` | Bug in the workflow: bad expression, missing field, logic error | No (engineering fix) |

The agent emits exactly one category per failure. When two would apply (e.g. an expired token detected via a 5xx body), the **higher-precedence** category wins, in this order: `infra > auth > data > ratelimit > timeout > network > workflow`.

## Classification rules (evaluate top-down)

```
RULE 1 — infra
   error.message MATCHES /ENOMEM|heap out of memory|EMFILE|ENOSPC/
   OR status = "crashed"
   OR error.message MATCHES /database is locked|deadlock detected|connection terminated/
   → infra

RULE 2 — auth
   error.httpCode IN {401, 403}
   OR error.message MATCHES /invalid_grant|invalid_token|token has expired|unauthorized|insufficient.*scope|access_denied/i
   OR error.name = "NodeApiError" AND error.message MATCHES /api.?key|signature|hmac/i
   → auth

RULE 3 — data
   error.httpCode IN {400, 409, 422, 415}
   OR error.message MATCHES /already exists|duplicate|conflict|validation failed|invalid.*field|schema/i
   OR (error.name = "NodeOperationError" AND error.message MATCHES /required field|missing|null/i)
   → data

RULE 4 — ratelimit
   error.httpCode = 429
   OR error.message MATCHES /rate.?limit|too many requests|quota.*exceeded|throttle/i
   OR (error.node CONTAINS "facebook"|"meta" AND error.message MATCHES /\(#(4|17|32|613)\)/)
   → ratelimit

RULE 5 — timeout
   error.httpCode IN {408, 504, 524, 522}
   OR error.message MATCHES /timeout|timed out|deadline.*exceeded|request aborted/i
   → timeout

RULE 6 — network
   error.message MATCHES /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|socket hang up/
   OR error.httpCode IN {502, 503}
   → network

RULE 7 — workflow
   error.name IN {"NodeOperationError", "WorkflowOperationError", "ExpressionError"}
   OR error.message MATCHES /cannot read propert|undefined is not|Unexpected token/i
   → workflow

RULE FALLBACK
   → unknown   (escalate; do not auto-handle)
```

## Sub-classifications worth recording

The agent should record the category **and** a subtype for the customer report. The subtypes:

| Category | Subtypes |
|---|---|
| `auth` | `refresh-expired`, `revoked`, `scope-insufficient`, `apikey-rotated`, `signature-invalid`, `mfa-required` |
| `data` | `duplicate`, `validation`, `schema-drift`, `unknown-field`, `payload-too-large` |
| `ratelimit` | `account-tier`, `app-tier`, `object-tier`, `concurrency`, `daily-quota` |
| `timeout` | `upstream-slow`, `our-client-timeout`, `gateway` |
| `network` | `dns`, `refused`, `reset`, `transient` |
| `infra` | `worker-oom`, `worker-died`, `db-lock`, `disk-full`, `redis-disconnect` |
| `workflow` | `expression-error`, `missing-field`, `bad-loop`, `unhandled-branch` |

Subtype heuristics live in the matching `cases/` file when the diagnosis is precise; otherwise the agent records the closest one and notes `confidence: medium`.

## Schema-drift heuristic (special case)

Schema drift hides inside the `data` category and is the most expensive class of failure to miss. A failure is `data.schema-drift` (not just `data.validation`) when **all three** are true:

1. The same workflow + node + httpCode pair has been `success` in the trailing 7 days **and** is now failing on the same payload shape.
2. The error message references a specific field (regex `/(field|property|key) ['"][\w.]+['"]/`).
3. The upstream API has had a published version change in the last 30 days (the agent maintains a per-platform changelog feed).

When all three hold, mark `data.schema-drift` and route to `escalate.upstream-changed` with the field name in the alert.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/recovery-routing` · all `cases/`
