# Paid Media Client Onboarding Workflow

**Category:** Patterns
**Source:** https://docs.n8n.io/workflows/, https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/, https://docs.n8n.io/hosting/configuration/environment-variables/, https://platform.openai.com/docs/guides/structured-outputs
**Updated:** 2026-05-01
**Complexity:** High — 14-20 hours


## Overview
Contract signature launches project setup, access requests, kickoff scheduling, Slack channel, and first follow-up.

## Related Notes
[[n8n-workflow-patterns]] · [[n8n-best-practices]] · [[approval-human-decision-framework]] · [[webhook-reliability]]

---


## Tools Required
- PandaDoc/DocuSign
- Asana/ClickUp
- Google Drive
- Google Ads
- Meta
- HubSpot
- Slack
- Calendly

Keep credentials owned by service accounts wherever possible. Human-owned OAuth connections are acceptable for prototypes, but production workflows need a named owner, rotation calendar, and a fallback notification path.

## Architecture (ASCII diagram)
```text
    Contract Signed -> Project -> Folders -> Access Requests -> Kickoff -> Questionnaire -> Slack
```

## Trigger
Contract signed webhook or deal stage `Closed Won`.

The trigger should write an intake row before doing expensive work. That row becomes the replay control, approval state, and audit trail if the workflow times out after partial progress.

## Node Chain (step-by-step)
1. Trigger receives event and writes an intake/audit row with source ID and client ID.
2. Fetch client configuration: timezone, owner, approval thresholds, and enabled channels.
3. Deduplicate against the audit table using the source event or business object ID.
4. Fetch required source records with paginated HTTP Request or native nodes.
5. Normalize fields into canonical IDs, dates, currency units, owner IDs, and status values.
6. Run business rules in IF/Switch nodes and send ambiguous cases to a review queue.
7. Generate drafts, summaries, or recommendations only after deterministic data is complete.
8. Create/update destination records in batch-safe chunks with retry metadata.
9. Pause at approval gates for client-facing, financial, or irreversible actions.
10. Post final notifications and update the audit row with outcome and external links.

## Error Handling
- Retry `429`, `408`, and `5xx` with exponential backoff and jitter.
- Abort on missing client config, missing owner, or invalid approval threshold.
- Send malformed source payloads to a dead-letter table with raw JSON.
- Alert the AM when a partial report or partial mutation is produced.

Use an Error Trigger workflow that receives `workflow_id`, `execution_id`, client ID, and current stage. Route recoverable vendor errors to retry queues, and route ambiguous business data to Slack or the PM tool rather than guessing.

## Approval Points
- AM approval before any client-facing message or portal update.
- Finance/director approval for money-touching outputs.
- Specialist approval when AI classification confidence is below threshold.
- Auto-expire approvals after 24 hours and escalate.

## Common Failure Modes
- Duplicate webhook creates duplicate downstream records.
- Source API outage creates an incomplete but polished-looking output.
- Wrong timezone or currency config changes totals.
- Approval Wait node expires without durable status update.

## n8n Implementation Notes
Keep the workflow modular: one intake workflow, one normalization sub-workflow, and one delivery sub-workflow. This makes retries safe because failed delivery does not repeat expensive source collection.

```json
    {
      "client_id": "{{$json.client_id}}",
      "workflow_stage": "approval",
      "idempotency_key": "{{$json.source_event_id}}",
      "dry_run": true
    }
```

## Variants
- SMB: more automation, fewer approval stages, summarized Slack notifications.
- Enterprise: director approval, per-brand routing, stricter audit logging.
- White-label: replace visible sender, portal logo, and report namespace from client config.

## Field Checklist
Before enabling this in production, confirm the credential owner, account or workspace identifier, rate-limit budget, retry policy, and dead-letter path are written into the workflow notes. Run one backfill with a deliberately small date range or batch size, record the expected count, and compare it with the destination count before widening scope. For client-facing or money-touching actions, keep the final node disabled until a human approves the sample payload and the rollback path.

In n8n, pin a representative success item and a representative error item. Validate the expressions that read nested webhook bodies, add null checks before every ID lookup, and store upstream request IDs in execution data so support can correlate incidents with vendor logs. Any workflow that mutates external state should emit an audit row with `workflow_id`, `execution_id`, source object ID, destination object ID, before/after summary, and the chosen retry count.

Keep a small operator runbook beside the workflow. It should name the owner, normal execution cadence, expected record counts, known vendor delay, escalation channel, and the exact switch that disables external side effects. That runbook is what lets an AM or engineer pause safely during a client incident instead of editing nodes under pressure.
