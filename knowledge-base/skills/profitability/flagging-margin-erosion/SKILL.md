---
name: flagging-margin-erosion
description: The conversation script for surfacing margin erosion to the agency owner — when a client's margin drops below threshold, when team utilization tips into burnout, or when blended margin trends downward over a quarter. Use when proposing a margin_alert action, drafting the founder's weekly briefing on profitability, or answering "is my agency healthy". Returns the framing + the numbers + the next-action recommendation.
---

# Flagging Margin Erosion

Owners look at MRR. Top-1% fractional COOs look at gross margin and effective hourly rate. Your job is to make margin erosion impossible to ignore.

## The thresholds (per-client, per-month)

| Client gross margin | Severity | What to surface |
|---|---|---|
| > 40% | Healthy | Don't dwell. Maybe pre-emptive scope refresh annually. |
| 25–40% | Acceptable | Track trend. Flag if MoM drop > 5pp. |
| 10–25% | Concerning | Recommend scope conversation. See `detecting-scope-creep`. |
| 0–10% | Critical | Recommend repricing OR firing. See `firing-a-client`. |
| Negative | Emergency | Surface in next daily briefing. Specific action: pause new work for that client. |

## The blended (whole-agency) thresholds

| Blended margin | Label | Action |
|---|---|---|
| > 30% | Reinvest | Healthy. Suggest growth experiments. |
| 20–30% | Operate | Standard. Keep watching. |
| 10–20% | Tighten | Recommend cost audit (Stack Agent), review bottom 3 clients. |
| < 10% | Survive | Critical. Pair with `projecting-cash-runway`. Specific cuts required. |

Compute as: `(MRR_total - COGS_loaded_labor - overhead) / MRR_total`.
COGS includes: salaries × loaded multiplier (typically 1.3–1.5), contractor invoices, payroll taxes, benefits.

## How to present the alert

**Bad:**
> "Acme's margin is 8%."

**Good:**
> "Acme is at 8% gross margin — down from 22% last quarter. The driver is logged hours: 290 in October vs the retainer budget of 200. Two off-scope items I can see in Slack: the [partner page redesign] and the [LinkedIn ad refresh]. Recommend: scope refresh conversation this week. I've drafted a 4-paragraph version following the 1st/2nd/3rd ask script — open the action card to review."

## The drivers — name them every time

When margin drops, ALWAYS name the driver:

1. **Hours overrun** (most common) → scope creep
2. **Mix shift** (senior time replaced junior time) → onboarding gap or poor delegation
3. **Cost-side increase** (raise, new hire, new tool) → cost audit needed
4. **Discount given** (client renegotiated down) → retention concession, may be intentional
5. **Refund / chargeback** → quality or expectation problem
6. **Currency / payment processor fees** → look at Stripe fee breakdown

Without the driver, the recommendation is useless. The owner can't act on "margin dropped." They can act on "you took on 90 off-scope hours."

## When to escalate to a fire conversation

Fire when ALL of these are true:
- Effective rate < 0.6× floor for 60+ days
- Client has rejected one repricing conversation in past 6 months
- No clear path back to floor (e.g. scope is structurally bigger than retainer)
- Owner has at least 1 month of cash runway above 6-month threshold (otherwise: keep + reprice)

See `firing-a-client` for the script.

## When to recommend a price raise instead

Raise when:
- Effective rate < 0.85× floor but client has been a customer < 18 months
- Effective rate has only just crossed below floor (last 30 days)
- Client has > 12 months loyalty + no major dispute
- Owner hasn't raised them in > 12 months

See `raising-retainer-prices` for the script.

## How the cron Profitability Agent uses this

Weekly (Monday 9am via cron `0 9 * * 1`):
1. Compute per-client gross margin for the trailing 30 days
2. Compare to last month + last quarter
3. For any client below 25%, queue a `margin_alert` action with:
   - Effective rate
   - Trend direction (improving / flat / eroding)
   - The single driver (named above)
   - The recommended next conversation
4. Write the result to Notion `Risks` DB if margin < 10%

## Cross-references

- `calculating-effective-hourly-rate` — the single most-actionable number
- `detecting-scope-creep` — the conversation if scope is the driver
- `raising-retainer-prices` — the conversation if pricing is the driver
- `firing-a-client` — the conversation if neither works
- `projecting-cash-runway` — the framing if blended margin is critical

## What NOT to do

- Don't surface a margin alert without a named driver.
- Don't surface to the client team — the agent only talks to the owner.
- Don't recommend firing on first detection — try the scope/price conversation first.
- Don't recommend a price raise without checking `__how_we_work` rules first.
