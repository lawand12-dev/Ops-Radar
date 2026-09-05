# Agency Cash Flow Patterns

**Category:** Agency Profiles
**Source:** https://www.hubspot.com/partners, https://stripe.com/resources/more/what-is-revenue-recognition, https://www.pmi.org/learning/library/project-retainer-model-service-delivery-8365
**Updated:** 2026-05-01

## Overview
Cash timing drives ops priorities: dunning, hiring, automation investment, and renewal-risk management.

## Related Notes
[[workflow-invoicing-retainer]] · [[performance-pricing-ops]] · [[client-tier-patterns]]

---


## Operating Model
Cash timing drives ops priorities: dunning, hiring, automation investment, and renewal-risk management. The automation design should mirror how the agency sells, staffs, bills, and reports the work rather than forcing all clients into one generic pipeline.

Agency operations fail when the workflow assumes one operating model while the business sells another. Retainers, projects, white-label work, referrals, and performance pricing all need different approval paths, revenue recognition, reporting cadence, and client communication rules.

## Signals
- Different clients require different SLAs or approval layers.
- Reporting, billing, and owner assignment depend on brand, partner, or contract model.
- Finance reconciliation uses terms not visible in the PM tool.
- Client success teams ask for exceptions that are really tier rules.

## Automation Pattern
Create a commercial configuration record per client or partner. Workflows should read that record before routing leads, reports, invoices, approvals, or escalations.

| Object | Recommended fields | Why |
| --- | --- | --- |
| Client config | `tier`, `model`, `sla`, `approval_policy` | Routes operational decisions. |
| Billing config | `currency`, `terms`, `entity`, `pricing_model` | Prevents finance mismatches. |
| Reporting namespace | `brand_id`, `portal_domain`, `logo`, `color` | Keeps white-label/multi-brand data separate. |
| Partner attribution | `partner_id`, `commission_rule`, `eligible_until` | Controls referral payouts. |

## Failure Modes
- One workflow leaks data between brands or partners.
- Retainer automation keeps running after a project contract ends.
- Commission is paid before invoice collection.
- Enterprise clients receive SMB-style automated comms without human review.

## n8n Implementation Notes
Fetch client configuration at the start of every workflow and fail closed if required commercial fields are missing. Use Switch nodes for tier and model, but keep values in data tables so ops can change policy without editing workflow JSON.

```javascript
    const client = $input.first().json;
    return [{
      json: {
        client_id: client.id,
        operating_model: client.operating_model,
        approval_tier: client.tier === "Enterprise" ? "director" : "am",
        report_namespace: `${client.brand_id || client.id}:${client.billing_entity || "default"}`
      }
    }];
```

Document the commercial rule next to the automation rule. If finance, AM, and delivery disagree about the definition of "active client" or "qualified referral," the workflow will encode one team's assumption and create reconciliation work for another.

## Field Checklist
Before enabling this in production, confirm the credential owner, account or workspace identifier, rate-limit budget, retry policy, and dead-letter path are written into the workflow notes. Run one backfill with a deliberately small date range or batch size, record the expected count, and compare it with the destination count before widening scope. For client-facing or money-touching actions, keep the final node disabled until a human approves the sample payload and the rollback path.

In n8n, pin a representative success item and a representative error item. Validate the expressions that read nested webhook bodies, add null checks before every ID lookup, and store upstream request IDs in execution data so support can correlate incidents with vendor logs. Any workflow that mutates external state should emit an audit row with `workflow_id`, `execution_id`, source object ID, destination object ID, before/after summary, and the chosen retry count.

Keep a small operator runbook beside the workflow. It should name the owner, normal execution cadence, expected record counts, known vendor delay, escalation channel, and the exact switch that disables external side effects. That runbook is what lets an AM or engineer pause safely during a client incident instead of editing nodes under pressure.

The final launch check is a dry run with production-shaped data and harmless destinations. Compare the normalized output to the source system, then enable one external side effect at a time. This catches wrong IDs, stale credentials, hidden timezone conversions, and missing approval policy before the workflow has client-visible impact.
