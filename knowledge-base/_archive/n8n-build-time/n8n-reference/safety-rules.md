# Tool Safety Rules

**Type:** Cross-cutting policy (read alongside every tool definition)
**Audience:** the agent runtime AND the LLM
**Updated:** 2026-05-07

## Purpose

`agent-tools.md` says what each tool *does*. This file says what the agent and the runtime must check **before each call** and what's never permitted regardless of policy. Safety lives at two layers:

1. **The LLM** decides whether the action it wants is allowed.
2. **The runtime** enforces — even if the LLM picks the wrong tool, the runtime must refuse the call.

Defense in depth. Either layer alone is insufficient.

## Hard prohibitions (runtime refuses, no override)

The runtime rejects any call that matches:

- `query_n8n_db.sql` not starting with `SELECT` (case-insensitive after whitespace strip)
- `query_n8n_db.sql` referencing a table not in the allowlist (`execution_entity`, `execution_data`, `execution_metadata`, `workflow_entity`, `credentials_entity`, `pg_stat_activity`)
- Any tool call with `customer_id` outside the agent's authorized customer set
- `replay_workflow` on a workflow not tagged `idempotent:true` AND lacking a runtime-verified read-only last node
- Any tool that would decrypt or surface a credential `data` field
- More than 5 `stop_execution` + `replay_workflow` pairs on the same workflow within an hour (stampede protection)
- Any call when the global stop conditions from `decision-trees/recovery-routing` are tripped

These are non-negotiable. They protect against LLM mistakes that policy/prompting alone cannot.

## Per-call gates

Before issuing a tool call, the agent verifies (and the runtime re-verifies):

| Tool | Gate |
|---|---|
| `get_execution` (`include_data=true`) | Only when diagnosing a specific incident — never in sweeps |
| `list_executions` | Always paginate to completion or to a stated cap; never silently truncate |
| `query_n8n_db` | Must include a stated purpose in the call's `reason` field for audit |
| `stop_execution` | Confirm the row is non-terminal first via `get_execution` |
| `set_workflow_active` (`active=false`) | Workflow's revenue-impact tag must be checked; revenue-impacting workflows require human-in-the-loop |
| `set_workflow_active` (`active=true`) | Only as the back-half of a previous deactivate; the agent doesn't proactively activate |
| `replay_workflow` | Idempotency gate (`decision-trees/recovery-routing`); runtime double-checks |
| `post_alert` (`severity=critical`) | Must include execution_id + workflow_id + plain-English summary; runtime rejects empty body |

## Authorization model

Every customer has a config record:

```jsonc
{
  "customer_id": "cust_...",
  "n8n_url": "https://...",
  "n8n_api_key": "<vault ref, never plaintext>",
  "db_connection": "<vault ref, read-only DB user>",
  "policy": {
    "auto_recovery": true,                      // false = every action is notify-human
    "max_auto_retries_per_hour": 5,
    "max_auto_deactivate_per_day": 3,
    "revenue_workflow_tag": "revenue:true",
    "alert_channel": "slack",
    "alert_severity_threshold": "high"          // below this, only digest
  }
}
```

The runtime:
- Loads this config per call.
- Refuses any tool call whose effect would exceed the customer's stated limits.
- Never allows the LLM to read or modify another customer's config.

## Per-action audit log

Every soft-write tool call is logged regardless of outcome. The audit row:

```jsonc
{
  "ts": "2026-05-07T12:34:56Z",
  "customer_id": "cust_...",
  "agent_session_id": "...",
  "tool": "stop_execution",
  "input_hash": "...",          // hash of full input for dedup
  "input_redacted": { ... },    // input with credentials stripped
  "outcome": "ok",
  "latency_ms": 142,
  "decision_chain": [
    "decision-trees/failure-diagnosis → label: stuck.timeout-exceeded",
    "decision-trees/recovery-routing → action: auto-cancel-replay",
    "playbooks/detect-stuck-execution → step 7"
  ]
}
```

`decision_chain` is what makes the agent debuggable. When the engineer asks "why did the agent stop my workflow?", the answer is structurally available, not buried in a chat transcript.

## What the LLM is NOT allowed to do

Even though the LLM can read this whole KB, the runtime denies these patterns:

- **Self-modify policy.** The LLM cannot raise `max_auto_retries_per_hour` mid-incident even if it "thinks" the situation warrants it.
- **Tool not in catalog.** If the LLM asks for `update_credential` or `restart_worker`, the runtime returns `tool_not_available` and the LLM must escalate.
- **Bypass idempotency.** The LLM cannot tag a workflow `idempotent:true` to enable `replay_workflow`. Tags are engineer-set.
- **Loop without progress.** If the LLM issues the same tool call with the same input three times in a row with no intervening successful result, the runtime breaks the loop and forces escalation.
- **Construct SQL with user input concatenation.** The runtime accepts only parameterized queries. Inline string interpolation is rejected by the SQL guard.

## Failure modes of the safety system itself

What if a runtime guard malfunctions?

- All write tool outcomes are mirrored to the customer's incident store. If the runtime had a bug that allowed a forbidden action, it shows up in the incident timeline immediately.
- The runtime is itself versioned and tagged in every audit row. A regression is identifiable to the runtime version.
- A separate sentinel job (not the agent) compares write-tool counts against per-customer limits and pages on overages — the agent monitoring the agent.

## Cross-references

`tools/agent-tools` · `decision-trees/recovery-routing` · `playbooks/recover-from-api-error` · `playbooks/report-to-agency`
