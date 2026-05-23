# Playbook: Report to the agency (customer-facing health report)

**Type:** Procedure (composes the customer-visible incident timeline + the daily / weekly health digest)
**When to run:** Real-time alerts on incident creation; daily digest at 08:00 customer-local; weekly digest on Monday 08:00 customer-local
**Inputs:** the incident store (written by `playbooks/diagnose-workflow-failure` and `playbooks/recover-from-api-error`); customer config (timezone, severity thresholds, channels)
**Outputs:** an alert pushed to the customer's chosen channel(s); a structured digest email / Slack message; an updated dashboard
**Updated:** 2026-05-07

## Output surfaces

The agent writes to four surfaces, each with its own cadence and audience:

| Surface | Cadence | Audience | Detail level |
|---|---|---|---|
| **Real-time alert** | Immediate on HIGH severity | On-call engineer at agency | Single incident, full evidence |
| **Incident timeline** (dashboard) | Continuous append | Engineering | Every event, queryable |
| **Daily digest** | 08:00 customer-local | Agency lead | Aggregated, trend-aware |
| **Weekly digest** | Mon 08:00 customer-local | Agency lead + leadership | Trend, SLO, recommendations |

The customer report goes to the **agency**, not the agency's clients. The agency owns the customer-facing communication; the agent's report informs the agency's internal operations.

## Severity rubric

| Severity | Definition | Notify? |
|---|---|---|
| **CRITICAL** | Customer's revenue-affecting workflow is failing AND no auto-recovery is available | Real-time + digest |
| **HIGH** | Auto-recovery exhausted; workflow halted | Real-time + digest |
| **MEDIUM** | Auto-recovery succeeded; pattern recurring (>3 times / 24 h) | Digest only |
| **LOW** | Single auto-recovered failure | Digest only |
| **INFO** | Schema drift suspected, credential expiry approaching, capacity warning | Weekly digest only |

Revenue-affecting heuristic: workflow tagged `revenue:true`, OR workflow's downstream contains a Stripe / QuickBooks / payment-processing node, OR workflow name matches `/invoic|paym|charg|billing/i`.

## Real-time alert content

For CRITICAL / HIGH severity, post within 60 s of incident creation. The alert must contain enough for the on-call to triage **without logging into n8n**:

```
🛑 [HIGH] Workflow failure: {workflow_name}
Customer: {customer_name}
What happened: {one-line label translated to plain English}
Where it broke: {error.node} (node)
What we tried: {auto-handle action + outcome}
What you need to do: {case_file.Fix step 1, paraphrased}
Evidence: {top 3 evidence fields}
Open in n8n: {deep link to the failed execution}
Open in OpsRadar: {deep link to the incident}
```

Plain-English translation table (sample):

| Label | Plain English |
|---|---|
| `auth.refresh-expired` | "Google login expired — needs reconnect in n8n" |
| `ratelimit.meta-buc` | "Meta API daily quota hit — paused 15 min, then retrying" |
| `timeout.upstream` | "Workflow took too long; webhook caller gave up" |
| `data.duplicate-hubspot` | "Tried to create a HubSpot contact that already exists" |
| `infra.worker-died` | "An n8n worker crashed mid-execution; replayed successfully" |

Channels: Slack (preferred), email (fallback), webhook (for the agency's own routing). The customer's config controls which channels are active per severity.

## Daily digest

Composed at 08:00 customer-local, covering the previous 24 h. Structure:

```
OpsRadar daily report — {date}, {customer_name}
Active workflows:           {count}
Executions yesterday:       {count}     ({success_rate}% success)
Failures auto-recovered:    {count}     ({avg_recovery_time})
Failures requiring action:  {count}

— Top failures —
1. {workflow_name}    {failure_count}×    {dominant_label}    last @ {time}
2. ...

— Anomalies —
• {workflow_name}: success rate dropped from {prev}% to {curr}% over 7 d
• {credential_name}: not refreshed in 13 days (Google OAuth refresh window: 7d if app in Testing)
• {workflow_name}: average duration up 80% week-over-week

— Recommended actions —
• {recommendation 1, sourced from case file Prevention sections}
• {recommendation 2}
```

Rules for inclusion:

- Top failures: show the top 5; collapse the long tail into "and N more."
- Anomalies: only show if the change is statistically meaningful (z-score > 2 against the trailing 14 d, or absolute drop > 10 percentage points).
- Recommendations: deduplicate by `case_file`. If three failures all map to `cases/google-oauth-expired`, surface ONE recommendation referencing that case's Prevention section.

## Weekly digest

Composed Monday 08:00 customer-local. Adds to the daily digest:

- **Reliability score:** weighted average success rate across all `revenue:true` workflows (weight = execution count).
- **MTTR:** mean time from incident creation to `resolved` for HIGH+ incidents (auto-recovered or human-resolved).
- **Error budget burn:** % of the week's allowed-failure budget consumed (default budget = 1% per workflow, configurable).
- **Trend chart:** sparkline of daily success rate, stuck-execution count, and credential-expiry-distance.
- **Workflows entering risk:** new this week — workflows whose 7-day success rate dropped below 95% but stayed above 90%; flag before they become incidents.

## What to include vs exclude

**Always include:**
- Workflows tagged `revenue:true`
- Failures escalated to engineer (regardless of severity)
- Credential expiry warnings within 14 d
- Schema-drift suspicions
- Instance-level signals (queue depth, worker count, disk usage on Postgres)

**Exclude (noise reduction):**
- Manual-mode executions
- Executions on workflows tagged `dev:true` or `staging:true`
- Single-instance LOW-severity incidents that auto-recovered (they're in the timeline; not in the digest)
- Recurrences of the same `(workflow, label)` already alerted in the past 24 h (de-dup window)

## Plain English principles

The agent must rewrite technical labels for the agency lead's digest. Three rules:

1. **Verbs over nouns.** "Workflow timed out" beats "timeout.upstream."
2. **Money or trust impact first.** "Customer didn't receive welcome email" beats "Mailgun returned 403."
3. **Recommended action in one sentence.** "Reconnect Google in n8n" beats "Refresh OAuth2 credential `Google Workspace — Sales` (id: …)."

## Failure mode of this playbook itself

If the agent cannot post to the configured channel (Slack 5xx, email send failure), retry with backoff (30 s → 5 min → 30 min), then fall back to the next-priority channel. Never drop a CRITICAL alert silently — if all channels fail, write a `meta-incident` to the timeline and surface on the next successful channel post.

## Cross-references

`playbooks/diagnose-workflow-failure` · `playbooks/recover-from-api-error` · `playbooks/detect-stuck-execution` · `decision-trees/recovery-routing` · all `cases/`
