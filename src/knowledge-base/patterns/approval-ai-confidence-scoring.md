# AI Confidence Approval Rules

**Category:** Patterns
**Source:** https://docs.n8n.io/workflows/, https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/, https://docs.n8n.io/hosting/configuration/environment-variables/, https://owasp.org/www-project-application-security-verification-standard/, https://docs.stripe.com/api/idempotent_requests
**Updated:** 2026-05-01

## Overview
Use confidence, calibration, and validation to route AI outputs between automation and human review.

## Related Notes
[[ai-confidence-scoring]] · [[ai-structured-output]] · [[ai-hallucination-prevention]]

---


## Decision Framework
Use confidence, calibration, and validation to route AI outputs between automation and human review. The decision should be stored as policy data so each client can tune thresholds without editing workflow logic.

| Decision type | Default route | Reason |
| --- | --- | --- |
| Low blast / reversible | Auto proceed with log | Fast operations with easy rollback. |
| Client-facing | Human approval | Reputation and trust impact. |
| Money/data deletion | Dual approval | Irreversible or regulated outcome. |
| Low AI confidence | Review queue | Model uncertainty is business risk. |

## Threshold Rules
- 1-10 records: auto if reversible and validated.
- 11-100 records: proceed with audit log and Slack notice.
- 101-1000 records: notify owner and allow abort window.
- 1001+ records, money movement, hard deletion, or public posting: require approval.
- Any anomaly above client-specific threshold routes to review even if volume is small.

Thresholds must be client-configurable. A $500 ad-budget change is trivial for one enterprise account and material for a local business. Store limits in Airtable, Supabase, or the CRM account record rather than hardcoding them into IF nodes.

## Examples
- Retrying a timed-out GET request is auto-safe.
- Sending an invoice, refunding a charge, or changing an ad budget requires approval.
- Deleting 25 stale CRM test records requires manager approval and export backup.
- AI-generated client email is a draft until an AM approves it.

## Implementation in n8n
Implement policy as a Code node or config-table lookup that outputs `requires_approval`, `approval_level`, and `risk_reason`. Use Wait nodes with unique approval tokens and write every status transition to Supabase/Postgres before continuing.

```json
    {
      "action": "{{$json.action}}",
      "risk_score": "{{$json.risk_score}}",
      "requires_approval": "{{$json.risk_score >= 70}}",
      "approval_timeout_hours": 24
    }
```

Every approval workflow needs a terminal state for approved, rejected, expired, and canceled. Do not leave a Wait node as the only state record; write status changes to durable storage before and after the Wait node so operators can inspect stalled approvals without opening the execution graph.

## Field Checklist
Before enabling this in production, confirm the credential owner, account or workspace identifier, rate-limit budget, retry policy, and dead-letter path are written into the workflow notes. Run one backfill with a deliberately small date range or batch size, record the expected count, and compare it with the destination count before widening scope. For client-facing or money-touching actions, keep the final node disabled until a human approves the sample payload and the rollback path.

In n8n, pin a representative success item and a representative error item. Validate the expressions that read nested webhook bodies, add null checks before every ID lookup, and store upstream request IDs in execution data so support can correlate incidents with vendor logs. Any workflow that mutates external state should emit an audit row with `workflow_id`, `execution_id`, source object ID, destination object ID, before/after summary, and the chosen retry count.

Keep a small operator runbook beside the workflow. It should name the owner, normal execution cadence, expected record counts, known vendor delay, escalation channel, and the exact switch that disables external side effects. That runbook is what lets an AM or engineer pause safely during a client incident instead of editing nodes under pressure.

The final launch check is a dry run with production-shaped data and harmless destinations. Compare the normalized output to the source system, then enable one external side effect at a time. This catches wrong IDs, stale credentials, hidden timezone conversions, and missing approval policy before the workflow has client-visible impact.

## Launch Guardrail
Before launch, run a dry execution with production-shaped data, compare source and destination counts, verify the owner and escalation channel, and keep external side effects disabled until the sample output is approved. This prevents a technically successful workflow from creating client-visible drift.
