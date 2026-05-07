# Case: Postgres connections exhausted

**Type:** Labeled failure case
**Diagnosis label:** `infra.db-connections-exhausted`
**Routes from:** `decision-trees/failure-diagnosis` for messages matching `/sorry, too many clients already|remaining connection slots are reserved|FATAL.*too many connections|connection terminated unexpectedly/`
**Auto-handle safety:** No auto-fix. The agent must `escalate-engineer` — increasing pool size or killing connections has instance-wide effects and requires authorization. Auto-retry on this category creates a stampede that worsens the outage.
**Updated:** 2026-05-07

## Input — what the error looks like

Three error shapes the agent must catch — they all map to the same root cause:

**(a) On n8n's own DB (n8n can't talk to its own Postgres):**
```
QueryFailedError: sorry, too many clients already
```
Typically appears in the worker's stderr; the execution row may not even get written. Cascading symptom: the agent's polling against `execution_entity` returns stale data.

**(b) On a customer-data Postgres (an n8n Postgres node fails):**
```jsonc
{
  "name": "NodeApiError",
  "node": "Postgres",
  "httpCode": null,
  "message": "remaining connection slots are reserved for non-replication superuser connections"
}
```

**(c) On Supabase (which uses its own pool layer):**
```
ECONNREFUSED — pgbouncer connection pool exhausted
FATAL: max_client_conn reached
```

When the n8n instance itself loses its DB, the agent sees: `/healthz/readiness` returning 503, no new `execution_entity` rows being written, and existing `running` rows hanging. **This is one of the few outages where the agent's own observability degrades** — plan accordingly.

## Signals — what to check

1. **Active connection count vs Postgres limit.** From `pg_stat_activity`:
   ```sql
   SELECT COUNT(*), state, application_name, usename
   FROM pg_stat_activity
   GROUP BY state, application_name, usename
   ORDER BY 1 DESC;
   ```
   Compare to `SHOW max_connections;`. Healthy: `count < 0.8 * max_connections`.
2. **Long-idle connections.** Connections with `state='idle in transaction'` for > 5 min hold connection slots without doing work. Common offenders: dashboards (Metabase, Hex), forgotten BI exports, n8n Code nodes that opened a `pg` client and never released.
3. **n8n's own pool size.** Env `DB_POSTGRESDB_POOL_SIZE` (default 2 per main + per worker in 1.x). With 1 main + 5 workers + concurrency 10, n8n alone can hold `(1 + 5) * 2 * (workers can spike during high concurrency) = 12+` connections. On a Supabase Free tier (60 connections), n8n + customer-DB queries + dashboards saturate fast.
4. **External BI tools.** Metabase, Looker, Hex, Retool — check their pool config. Dashboards that auto-refresh every 30 s with `pool_size=10` consume 10 connections continuously, idle or not.
5. **Long-running queries.** A single 10-minute analytics query holds its connection for 10 minutes. `pg_stat_activity.query_start` plus `state='active'` reveals offenders.
6. **Connection mode (Supabase specifically).** Port `5432` is **session pooling**: each connection sticks for the session's duration. Port `6543` is **transaction pooling** via pgBouncer: connections are released between transactions. n8n / many ORMs default to `5432`; that's wrong for high-concurrency workloads.
7. **Subset breakdown by application_name.** If 80% of `pg_stat_activity` rows are `application_name='n8n'`, n8n's pool is the main consumer. If it's evenly split with `metabase` and `psql`, dashboards/users matter too.

## Correct diagnosis — what it actually is

Disambiguate before escalating:

| Sub-diagnosis | Identifier | Engineering action |
|---|---|---|
| **n8n pool too large for shared DB** | n8n is dominant in `pg_stat_activity`; Supabase / managed-Postgres DB | Lower `DB_POSTGRESDB_POOL_SIZE`; switch to pgBouncer |
| **Dashboard saturation** | Metabase/Looker/Hex dominant | Configure their pool sizes; share read replica |
| **Long-running analytics** | Single query holding connection for minutes | Move to read replica; add timeout |
| **Idle in transaction leaks** | Many `idle in transaction` rows | Engineering audit — likely unreleased `pg` clients in Code nodes |
| **Supabase free-tier ceiling** | `max_connections=60` and consistent saturation | Upgrade tier or use pgBouncer |
| **Genuine traffic spike** | All connections active and short-lived | Capacity decision (scale DB or shed load) |

## Fix — exact steps to resolve

> **Safety:** No auto-fix. The agent's job here is observability + escalation, not action. All steps below require the engineer's hand.

1. **Capture the connection census.** Run:
   ```sql
   SELECT pid, usename, application_name, client_addr, state,
          NOW() - query_start AS query_age,
          NOW() - state_change AS state_age,
          LEFT(query, 120) AS query_snippet
   FROM pg_stat_activity
   WHERE pid <> pg_backend_pid()
   ORDER BY state_age DESC NULLS LAST;
   ```
   Snapshot to the agent's incident store. Required for the engineer.
2. **Surface the top offenders.** Compose alert with: total connections, `max_connections`, top 5 `application_name`s by count, top 3 `idle in transaction` connections by `state_age`, longest-running active query.
3. **Pause non-critical n8n workflows.** `POST /api/v1/workflows/:id/deactivate` for any workflow tagged `priority:low`. This frees connections without dropping critical traffic.
4. **Kill specific zombies (engineer-approved only).** Idle-in-transaction > 30 min = safe to kill:
   ```sql
   SELECT pg_cancel_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction' AND state_change < NOW() - INTERVAL '30 minutes';
   ```
   If `cancel` doesn't work after 30 s, escalate to `pg_terminate_backend(pid)`. **Do not** auto-execute these — kill list must be reviewed.
5. **Engineering: lower `DB_POSTGRESDB_POOL_SIZE`** if n8n is the dominant consumer. Default 2 is low; some customers raise to 10 thoughtlessly. Right-size via: `worker_count * concurrency_limit / DB_capacity_for_n8n`.
6. **Engineering: switch to pgBouncer transaction pooling** for Supabase / managed Postgres. Update connection string from `:5432/postgres` to `:6543/postgres?pgbouncer=true`. Note that **session-level features break** under transaction pooling (LISTEN/NOTIFY, prepared statements, advisory locks across statements). The Postgres node usually works; verify.
7. **Engineering: add read replica** for dashboards. Metabase / Looker connections move off the primary; n8n keeps the primary for writes.
8. **Resume normal operation only after** total connections drop below 70% of `max_connections` and stay there for 5 min.

## Prevention — how to avoid next time

- **Right-size `DB_POSTGRESDB_POOL_SIZE`.** Total n8n DB connections = `(main + workers) × pool_size + spikes`. On Supabase Free (60 cap), keep n8n's total under 25 to leave room for everything else.
- **Use pgBouncer / transaction pooling** for any production deployment. Session pooling on Postgres for high-concurrency workloads is a misuse.
- **Set `statement_timeout`** at the database role level for n8n's user: `ALTER ROLE n8n_user SET statement_timeout = '60s';`. Caps individual query duration; one bad workflow can no longer hold a connection for 10 min.
- **Set `idle_in_transaction_session_timeout`** at the same role: `'5min'`. Auto-kills leaks that escape Code-node review.
- **Move dashboards to a read replica.** Metabase / Looker / Hex traffic does not belong on the same pool as n8n's transactional writes.
- **Tag workflows by `db-pressure`** (`db:heavy` / `db:light`). The agent can apply different concurrency limits and faster pause-on-pressure for heavy workflows.
- **Alert at 70% pool utilization**, not at exhaustion. Outage is a lagging indicator; 70% sustained is the leading one.
- **Never run a Code node that creates its own `pg` Pool**. n8n's Postgres node uses the shared pool; bespoke `new pg.Pool()` inside Code creates connections that escape n8n's accounting.

## Cross-references

`decision-trees/failure-diagnosis` (label `infra.db-connections-exhausted`) · `decision-trees/recovery-routing` (always `escalate-engineer`) · `cases/stuck-execution` · `reference/n8n-production/n8n-queue-mode` · `reference/n8n-production/n8n-monitoring`
