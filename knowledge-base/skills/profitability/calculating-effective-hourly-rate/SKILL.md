---
name: calculating-effective-hourly-rate
description: Computes the effective hourly rate the agency is earning on each client (revenue / hours logged). The agency's single most-actionable profitability number. Use when the user asks about which clients are profitable, who to reprice, why margin is dropping, what the floor should be, or "is this client worth it". Always present the floor + the comparison, never just the raw number.
---

# Calculating Effective Hourly Rate

Per-client profitability is a chart. Effective hourly rate is a conversation.

## The formula

```
effective_hourly_rate = monthly_retainer_or_project_value / hours_logged_in_period
```

Source:
- Revenue: Stripe `monthly_retainer` from Clients DB or `actual_invoiced` from invoices
- Hours: Harvest / Toggl `time_entries` filtered by `client_id` and date range

## The floor — the number every owner needs

Agency cost basis (loaded labor + overhead) typically lands around:

| Agency type | Floor (effective $/hr) | Source |
|---|---|---|
| Paid media (small, 5–15 people) | $125 | Parakeeto agency benchmarks 2026 |
| SEO / content | $110 | Parakeeto, AgencyAnalytics |
| Creative / design | $135 | Parakeeto |
| Recruiting | $140 | industry survey 2025 |
| Full-service digital | $140 | Hubspot agency partner data |

If the customer hasn't given you their target rate explicitly (check `__how_we_work` page), use the table above and explicitly cite the assumption.

## When to flag

| Effective rate | Severity | Action |
|---|---|---|
| > 1.5× floor | Healthy — leave alone | Maybe pre-emptively raise on next renewal |
| 1.0–1.5× floor | Acceptable | Watch trend, no action |
| 0.8–1.0× floor | Concerning | Suggest scope conversation, not a price raise yet |
| < 0.8× floor | Critical | Strong recommendation: reprice or fire |

## How to present the answer

**Bad answer:**
> "Acme's effective rate is $87/hour."

**Good answer:**
> "Acme is paying you $87/hour effective. Your floor for paid media is $125. You're losing $38/hour every hour your team spends on them. Last quarter that was 240 logged hours = $9,120 you should have invoiced. Two options: (1) raise their retainer 45% at renewal to bring you to floor, (2) cap scope at 18 hours/month to bring effective rate back. Want me to draft the conversation?"

## The patterns the agent should watch

1. **The slow drift.** Effective rate erodes over 6 months as the client requests more. Flag when month-over-month rate drops > 10%.
2. **The hidden overrun.** A client at the floor on retainer but who keeps emailing for "quick favors" — hours logged on email-response is invisible to most reporting tools.
3. **The new-client trap.** Onboarding is hour-intensive. Effective rate is artificially low for first 60 days. Don't flag — but DO note that the post-90-day rate is the real one.
4. **The senior-time leak.** Effective rate misses that the founder's hours on the client are 2-3× more expensive than the AM's. Use a blended rate.

## Cross-references

- `flagging-margin-erosion` skill — for the conversation script
- `raising-retainer-prices` skill — for the price-raise framing
- `firing-a-client` skill — for the < 0.6× floor case
- Source data: `get_profitability` tool + Clients Notion DB

## What NOT to do

- Don't compute hourly rate over too short a window — minimum 30 days, ideally 90.
- Don't quote a rate without naming the floor; otherwise the customer doesn't know if it's good or bad.
- Don't recommend price raises before checking the customer's How We Work rules — they may have a "no raises mid-contract" policy.
- Don't use only billable hours — internal hours (project management, account management) count too.
