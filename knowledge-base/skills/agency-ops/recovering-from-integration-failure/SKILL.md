---
name: recovering-from-integration-failure
description: The trust-event skill — how the agent surfaces and recovers when a connected tool breaks. Use when an integration broke, OAuth expired, a webhook missed, data is stale, the agent stopped updating, a number on the dashboard looks wrong, or the owner asks "is this number current". Returns the customer-facing recovery message + the named detection signals, not a technical post-mortem.
---

# Recovering From an Integration Failure

*"Is this number current, or is the integration broken again?"*

That question is the one moment that ends the relationship. If the owner has to ask it, you've already lost trust. Your job is to surface the break first, with a plan, and in the owner's language — not buried in a logs panel.

The owner does not care about the technical cause. They care about three things, in order:

1. You noticed before they did.
2. You already have a plan.
3. What they need to do — if anything.

## When this triggers

Four named failure types, all silent by default. The agent must convert each one into a visible "we caught it" moment.

**1. OAuth refresh failure.** The customer's connected tool token rotated, was revoked, lost consent after an SSO change, or hit concurrent-refresh contention. Executions appear "successful" but downstream business counts disagree — the dashboard shows the wrong total for that integration, or a `null` returns where data should be. *Detection: vendor errors, empty result sets, or successful runs with downstream business counts that don't match source-of-truth.*

**2. Rate limit hit.** The customer's vendor (HubSpot, Meta, Shopify, Google Ads) is throttling. Symptoms include HTTP 429s, HTTP 200s with `{"error":{"code":17,...}}` (Meta's pattern — buried in a 200 body, so naive checks miss it), execution time growing as workflows sleep more, or a cliff-then-zero in the daily API call graph. The danger isn't the 429 itself — it's a naive retry that turns a transient throttle into a sustained ban.

**3. Webhook missed.** Webhooks are at-least-once and platform-dependent. **Shopify auto-deletes a webhook subscription after 19 consecutive delivery failures.** Stripe retries ~87 times over 3 days. HubSpot only retries 3 times over 24 hours. If the customer's endpoint was down — VPS maintenance, TLS cert expiry, deploy window — events are silently lost and the customer first hears about it when a client says "my form didn't trigger anything."

**4. Data sync drift.** The most insidious. Workflows run green, but the destination has fewer rows than the source. Drift accumulates via missed webhooks, failed retries that get silently dropped, timezone conversion errors, expired pagination cursors, partial batch failures, or schema additions. *Surface threshold: data > 47 minutes stale, OR source-vs-destination count delta > 1% (or > 10 records, whichever is higher).*

## What to do

Run these steps in order. Steps 1–3 happen automatically. Step 4 is the only place the owner gets pinged.

1. **Detect, then pause.** Freeze the workflow or reduce concurrency so the incident stops growing. Do not auto-retry money-touching writes (invoices, refunds, payouts, contract notifications) — those go straight to a hold queue.

2. **Switch the affected metric into degraded-mode UI.** Every KPI sourced from the broken integration must show a "stale — last refresh {timestamp}" banner. Never show a number with no indicator that it's behind. If data is > 47 min stale, the banner is required.

3. **Open a recovery action card.** Pre-fill: which integration, what type (OAuth / rate limit / webhook / drift), how long it has been degraded, what the agent is doing about it, what the owner needs to do (usually nothing — sometimes one click to reconnect).

4. **Send the first-detection message.** Use the template below. Do not wait for the owner to notice. The whole point is that the agent surfaces it first.

5. **Run the reconciliation.** Once the integration is healthy again, backfill through the normal deduplicated path — never via a one-off script that bypasses dedup, audit logging, or unit conversion. Emergency scripts cause the second incident.

6. **Close the loop in the briefing.** The next daily briefing should name what broke, what was missed, what was recovered, and whether any client-visible number was wrong during the window.

## Conversation script

The voice is calm, specific, and short. No jargon. The owner reads this on their phone between meetings.

**First-detection (agent reaches out within 5 minutes of detection):**

> "Hey — just flagging that the {Stripe / HubSpot / ClickUp} integration paused {23 min} ago. {Token needs a refresh / vendor is rate-limiting us / a webhook stopped firing}. We're {reconnecting / backing off and retrying / re-registering the webhook} now. No action needed from you yet. The {MRR / pipeline / hours-logged} number on the dashboard is showing the last known value with a stale banner. I'll ping you again if it crosses 60 minutes."

**Stale-data threshold crossed (47+ min stale, drift > 1%):**

> "Heads up — the {X} number on the dashboard is currently {Y minutes} behind. Source shows {N} records, we have {M}. I've paused the downstream {report / alert / agent} that uses it. Want me to roll back the last automated send tied to this number, or are we fine with the {1 client} who already saw it?"

**Escalation (founder asks "is this current?", or > 60 min degraded):**

> "{X} has been degraded for {Y}. Here's what we're doing: (1) {specific recovery step in progress}, (2) the {KPI / action / agent} downstream is paused, (3) once we're reconnected I'll backfill through the normal sync path so we don't get duplicates. The one thing I need from you: {reconnect the OAuth in /dashboard/integrations / nothing}. I'll have a full recap in tomorrow's briefing."

**Recovery confirmed:**

> "{X} is back. We missed {N} events between {T1} and {T2} — all backfilled. The {MRR / pipeline / etc.} number on the dashboard is current as of {timestamp}. No client-visible number was wrong during the window. (Or: the {one alert sent at 9:42} used stale data — flagging so you can decide if it needs a correction.)"

## What NOT to do

- **Never fail silently.** A green execution log with disagreeing downstream counts is the worst-case outcome. If we noticed a discrepancy, the owner has to see it before they have to ask.
- **Never auto-retry money-touching writes.** Invoices, refunds, payouts, client-visible notifications — all of these go to a hold queue on first failure. Retrying a refund because a webhook came in twice (at-least-once delivery) creates a duplicate refund, which creates a second incident worse than the first.
- **Never show a wrong-but-not-stale number without a banner.** If we know the integration is behind, the metric needs a "stale — last refresh {ts}" indicator. A dashboard number with no indicator is implicitly a promise that it's current.
- **Never use n8n static data or in-memory state as the sole source of the recovery watermark.** It resets on restart. Watermarks live in Supabase.
- **Never run an emergency backfill script that bypasses the normal sync path.** It will skip dedup, skip audit logging, skip unit conversion, and create the next incident. Backfill through the same path normal traffic uses.
- **Never apologize without naming the specific integration, the time degraded, and the specific recovery step.** "Sorry, things were down" loses trust. "Stripe was throttled for 14 minutes, we backed off and retried, MRR is now current" keeps it.

## Cross-references

- `flagging-margin-erosion` — if the broken integration was Stripe or Harvest, margin numbers are affected; pause margin alerts until reconnect
- `detecting-scope-creep` — if ClickUp or Harvest is degraded, scope-creep detection is paused
- Source signals: OAuth token expiry, vendor 429 / `{"error":{"code":17}}`, Shopify 19-failure auto-delete, source-vs-destination count delta > 1% over 47-minute window
