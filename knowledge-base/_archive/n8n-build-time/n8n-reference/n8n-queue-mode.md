# n8n Queue Mode

**Category:** Tools
**Source:** https://docs.n8n.io/hosting/scaling/queue-mode/, https://docs.n8n.io/manage-cloud/cloud-data-management/, https://docs.n8n.io/workflows/executions/, https://docs.n8n.io/hosting/securing/security-audit/
**Updated:** 2026-05-01

## Overview
Queue mode separates main, worker, Redis, and database responsibilities for scalable production execution.

## Related Notes
[[n8n-performance]] · [[database-connection-pool]] · [[workflow-execution-timeouts]]

---


## Operating Model
Queue mode separates main, worker, Redis, and database responsibilities for scalable production execution. Treat this as an instance-level operating practice, not just a workflow-canvas concern.

## Configuration
- Record current n8n version, deployment type, database, Redis, binary mode, and encryption-key ownership.
- Keep production and staging separated, with workflow export/import as the promotion boundary.
- Document environment variables and secrets in a private runbook.
- Set retention and pruning deliberately so execution data supports debugging without uncontrolled storage growth.

Configuration belongs in environment variables, version-controlled workflow JSON, or documented instance settings. Avoid one-off UI toggles without a change log; they are almost impossible to reconstruct during disaster recovery.

## Failure Modes
- Credential values become unrecoverable after restore because the encryption key was lost.
- Queue workers scale up and exhaust database connections.
- Manual execution succeeds but production execution fails due to different data, timeout, or credential context.
- A webhook endpoint is public, unauthenticated, and abused.

## Monitoring
- Track success rate, error rate, p95 execution duration, queue depth, memory, and webhook response time.
- Alert on repeated 401/403, 429, timeout, and binary-size errors.
- Review n8n audit output after upgrades and monthly.
- Send workflow failures to a central Slack channel with owner and client ID.

## Recovery / Change Procedure
- Export workflows before changes and after successful releases.
- Test restore into staging before claiming backups are valid.
- Rotate/re-enter credentials after restore when encrypted values cannot be recovered.
- Rollback by redeploying previous image/version and importing previous workflow JSON.

## n8n Implementation Notes
Prefer smaller sub-workflows with explicit input/output contracts. Large monolithic canvases make upgrades, testing, and incident recovery slower because a local edit can change unrelated production behavior.

```bash
    # Example self-hosted operational check
    n8n export:workflow --all --output=/backups/workflows.json
    n8n audit
```

Treat n8n as production infrastructure. The workflow canvas is only one layer; the database, Redis queue, encryption key, external secrets, binary storage, and reverse proxy configuration are part of the same reliability boundary.

## Field Checklist
Before enabling this in production, confirm the credential owner, account or workspace identifier, rate-limit budget, retry policy, and dead-letter path are written into the workflow notes. Run one backfill with a deliberately small date range or batch size, record the expected count, and compare it with the destination count before widening scope. For client-facing or money-touching actions, keep the final node disabled until a human approves the sample payload and the rollback path.

In n8n, pin a representative success item and a representative error item. Validate the expressions that read nested webhook bodies, add null checks before every ID lookup, and store upstream request IDs in execution data so support can correlate incidents with vendor logs. Any workflow that mutates external state should emit an audit row with `workflow_id`, `execution_id`, source object ID, destination object ID, before/after summary, and the chosen retry count.

Keep a small operator runbook beside the workflow. It should name the owner, normal execution cadence, expected record counts, known vendor delay, escalation channel, and the exact switch that disables external side effects. That runbook is what lets an AM or engineer pause safely during a client incident instead of editing nodes under pressure.

The final launch check is a dry run with production-shaped data and harmless destinations. Compare the normalized output to the source system, then enable one external side effect at a time. This catches wrong IDs, stale credentials, hidden timezone conversions, and missing approval policy before the workflow has client-visible impact.
