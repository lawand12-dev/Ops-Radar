---
name: projecting-cash-runway
description: Computes how many months of runway the agency has under three scenarios (base, two-retainer-loss, payroll-shock). The #1 anxiety of every agency founder. Use when the user asks "how long can we last", "will I make payroll", "what's our cash runway", "what happens if I lose Acme", or any cash-survival framing. Returns a structured projection with named thresholds.
---

# Projecting Cash Runway

The agency owner asks this question silently every Sunday night. Answer it before they ask.

## Inputs you need

| Field | Source | Default if missing |
|---|---|---|
| Current cash balance | Stripe balance + bank linked in QB/Xero | Ask the user |
| Monthly burn (fixed costs) | P&L Monthly Notion DB, last 3 months avg | Approximate: team count × $7,000/mo |
| MRR (recurring revenue) | Stripe / Sum of active retainers | get_finance() |
| Top 5 clients by MRR | Profitability DB | get_profitability() |
| Months of AR outstanding | Stripe overdue + invoiced - paid | get_finance() |

## The three projections

Always compute and present all three. Owners need the worst-case framing to act.

**1. Base case (current trajectory)**
```
Runway_months = Current_cash / (Monthly_burn - MRR_after_taxes)
```
Use 30% effective tax rate on MRR for accrual-based agencies; 0% if cash-basis.

**2. Two-retainer-loss (the realistic bad day)**
Drop the top 2 clients by MRR. Recompute. This is what happens when one client churns and a second is over-extended. Most agencies don't model this; they should.

**3. Payroll-shock (the emergency)**
Assume zero new revenue for 90 days but payroll continues. Then:
```
Runway_months = (Current_cash + AR_collectible_30d) / Monthly_burn
```

## Named thresholds — call out by name

| Months | Label | What to tell the owner |
|---|---|---|
| > 12 | Safe | Mention it briefly. Don't dwell. |
| 6–12 | Healthy | Standard ops. Watch for changes. |
| 3–6 | Caution | Suggest reviewing top 3 client risks. Don't be alarmist. |
| 1–3 | Critical | Surface in the daily briefing. Recommend specific cost cuts (Stack Agent: low-utilization tools). |
| < 1 | Emergency | Page the founder. Hold all non-essential spend approvals. Surface ASAP. |

## How to present the answer

Lead with the 2-retainer-loss number (not the base case). It's the number that should drive behavior.

**Bad answer:**
> "You have 8 months of runway."

**Good answer:**
> "Base case: 11 months. If Acme + Globex churn this quarter (your two biggest, both at >25% under-margin), you drop to 4 months. If revenue zeros out for 90 days, you have 2.5 months before payroll breaks. Recommend: Have the repricing conversation with Acme this week — it converts your biggest risk to your biggest renewal."

## Hidden cash math the model often forgets

- **Cash taxes (accrual books)**: 25–30% of net profit gets owed in quarterly estimates. Subtract before calling runway "safe."
- **Vendor float**: net-30 vendors give an extra 30 days of effective runway. Net-60 gives 60.
- **Stripe payout delay**: 2–7 days for new accounts, 2 days for established. Don't include un-paid-out balance as available cash.
- **Subcontractor payables**: 1099 contractors paid on completion can stack up; check Bill.com / QB AP aging.

## When to surface this proactively

The Revenue or Briefing Agent should run this calculation:
- Weekly on Monday morning
- Within 24h of any client churn signal
- Immediately when MRR drops by > 5% month-over-month
- 30 days before any payroll cycle if runway < 3 months

## What NOT to do

- Don't say "you're fine" without showing the worst case.
- Don't quote a single number — three scenarios always.
- Don't include un-banked Stripe balance as available cash.
- Don't recommend cost cuts without naming specific line items (vague advice is worthless here).
