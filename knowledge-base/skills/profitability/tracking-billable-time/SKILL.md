---
name: tracking-billable-time
description: The hygiene rules that make timesheets a trustworthy source of truth for profitability math. Use when the user asks about missing hours, timesheet compliance, billable percentage, "why don't my margin numbers match what I feel", "is the time data clean enough to bill from", or when an effective-hourly-rate calculation is about to be presented and the underlying hours look thin. Returns the compliance read + the specific gap + the nudge script.
---

# Tracking Billable Time

*Is the hour data clean enough that I can actually trust the margin number I'm about to show the owner?*

Effective hourly rate is only as honest as the timesheet behind it. Before any profitability number leaves your mouth, you check the hygiene. A 92% margin on a client whose AM hasn't logged a single hour this week is not a margin — it's a fiction.

## When this triggers

- A profitability or effective-rate calculation is about to be surfaced and the trailing-7-day logged hours are below the historical average.
- Friday afternoon — weekly hygiene sweep before Monday's profitability cron.
- Owner asks "why is Acme suddenly so profitable" and the answer is "because nobody logged time, not because the work shrank."
- A team member's billable percentage drops more than 10 percentage points week-over-week.
- A client appears in the live data with revenue but zero hours for the period.

## What to do

### 1. Run the four compliance checks before trusting any hours total

| Check | What good looks like | What to do if it fails |
|---|---|---|
| Submission rate | Every team member has entries through end of yesterday | Nudge the missing person, don't compute |
| Coverage | Hours logged ≥ 80% of scheduled hours for the period | Flag as "thin data" on any downstream number |
| Project assignment | < 5% of entries on "General" / unassigned / no client | Send the list back for re-categorization |
| Billable flag | Each entry has billable=true/false set explicitly | Default-true is a lie; force the decision |

If any check fails, the effective-rate number gets a "data quality: partial" tag and you say so out loud.

### 2. Separate the three buckets — never blur them

- **Billable** — work the client is paying for, on a billable project code.
- **Non-billable client work** — account management, onboarding, internal review of their work. Counts against the client's effective rate. Most owners forget this exists.
- **Internal / company time** — sales, admin, PTO, training. Does not touch any client's margin.

The single most common reason effective-rate numbers feel wrong: non-billable client work was filed as internal. The hour was real, the client caused it, the agency ate it — and the report doesn't show it.

### 3. Compute the missing-hours gap, then name the offender

```
expected_hours = headcount × scheduled_hours_per_week × weeks_in_period
logged_hours   = sum of all entries for the period
gap            = expected_hours - logged_hours
gap_pct        = gap / expected_hours
```

If gap_pct > 15%, you do not present profitability without saying so. If gap_pct > 25%, you escalate to a hygiene conversation before showing any per-client number at all.

### 4. Watch for the four patterns that quietly poison the data

1. **The Friday backfill.** Someone enters 40 hours on Friday afternoon for the whole week. Numbers look fine, but the day-of-week distribution is impossible. Flag entries where > 60% of the week was logged on a single day.
2. **The round-number tell.** Real work is logged in 15-min increments. A timesheet full of clean 1.0 / 2.0 / 4.0 entries is being reconstructed from memory. The total is plausible; the client allocation isn't.
3. **The catch-all project.** "Internal — general" or "Admin" absorbing > 20% of a person's week means real client work is hiding there. Send it back.
4. **The silent contractor.** Freelancers who invoice monthly but never log inside the timesheet tool. Their hours exist only on a PDF. Reconcile against the invoice or the margin is wrong.

### 5. Present the hygiene read alongside the number, not after

**Bad:**
> "Acme's effective rate is $112/hour."

**Good:**
> "Acme's effective rate is $112/hour — but only two of the four AMs logged hours this week, and Tuesday is missing entirely for the senior designer. The real number is probably 15–20% worse. Want me to chase the missing entries before we use this for a repricing conversation?"

## Conversation script

### Friday 4pm — weekly nudge to the team

> "Quick Friday hygiene check — closing the week. Three people still have gaps:
>
> - **Maya** — Tuesday and Wednesday open
> - **Devin** — no entries since Monday
> - **Priya** — Thursday open
>
> If your time isn't in by end of day, Monday's profitability run will use last week's average for you — which means whichever client you actually worked on doesn't get credited, and we'll over-state their margin. Two minutes now saves a wrong number going to the owner."

### Escalation — chronic offender (3+ weeks of < 60% submission)

> "I'm flagging this only because the profitability numbers depend on it. Over the last three weeks your logged hours have averaged 22 against a 40-hour week. Two possibilities I'd like to rule out:
>
> 1. The work is happening but the entries are skipping the tool — which means clients you're working on are showing inflated margins and we're under-billing them.
> 2. The work isn't happening — in which case the schedule needs a conversation, not the timesheet.
>
> Can we get a clean week first, then look at the numbers together? I don't want to surface a margin alert that's really a logging gap."

## What NOT to do

- Don't present an effective-rate or margin number when gap_pct > 15% without a "data quality: partial" caveat.
- Don't blame the team in the owner's briefing — the timesheet gap is an owner-fixable process problem, not a person problem.
- Don't auto-fill missing hours from averages and pretend it's real data. Either chase the entries or mark the number as estimated.
- Don't count internal time (sales, PTO, training) against any client's effective rate. That makes every client look unprofitable.
- Don't trust default-billable=true. Force every entry to declare itself, or the billable percentage is meaningless.
- Don't run the weekly profitability cron on a week where submission rate is below 80% — the per-client numbers will be wrong in non-obvious ways.

## Cross-references

- `calculating-effective-hourly-rate` — the number that depends on this hygiene being real
- `flagging-margin-erosion` — the alert this data feeds; partial data = partial alert
- `detecting-scope-creep` — needs clean hours-vs-retainer to be credible
