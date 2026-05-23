---
name: using-toggl
description: Read Toggl Track as the source of truth for hours, billable %, retainer burn, project hour overruns, and timer compliance — the alternative to Harvest when the customer's stack uses Toggl. Use when the owner asks "are we under-billing", "hours logged this week", "retainer burn", "timer compliance", "is the team at capacity", "which projects are over budget", or when proposing margin / scope / capacity actions that depend on Toggl hours data.
---

# Using Toggl

*"Are we eating our retainers again, or did the team just forget to start timers for a week?"*

Toggl is where the agency's real operating truth lives when Harvest isn't — hours per project, billable vs non-billable, retainer burn, capacity. The signal surface is identical to Harvest; only the adapter differs. If timer fill is sloppy, every downstream metric (effective hourly rate, margin per client, scope creep) lies. Treat Toggl as the upstream input to `calculating-effective-hourly-rate` and `tracking-team-capacity`, not as a standalone report.

## When this triggers

- Owner asks any variant of "are we under-billing", "did we make money on Client X", "is the team at capacity", "who's slammed", "did so-and-so log their hours".
- Cron `profitability` (Mon 9am) or `scope` (Mon 8am) needs hours-by-client for the trailing 30 days.
- Cron `team` (Mon 11am) computes utilization and needs per-person billable %.
- A `margin_alert` or `scope_alert` action is being drafted and the driver might be hours overrun.
- An invoice dispute lands and substantiation requires per-entry descriptions.
- The customer's Toggl `(No project)` bucket grows past the data-hygiene threshold.

## What to do

1. **Pull last 7 days of time entries via Composio.** Use the Toggl Reports API for aggregates (faster) or the v9 Time Entries API for per-entry detail. Group by user, by client, by project. Compute three numbers per producer: total hours, billable hours, billable % = billable / total.
2. **Flag timer compliance.** For each active user, find the most recent entry's `stop` time. If gap > 2 days, queue a `timer_nudge` action. If gap > 5 days, escalate to the owner — the data is now reconstructive fiction. Also flag any running entry > 8 hours as a forgotten timer.
3. **Compute utilization per producer (weekly).** `billable_hours / available_hours` (default available = 40/week, override from `Team Members` DB if part-time). Compare against the benchmark band:
   - < 60% → under-utilized → sales or staffing problem, surface in weekly briefing
   - 65–85% → healthy, no action
   - > 90% for 2+ consecutive weeks → burnout risk, queue `capacity_alert` action
4. **Compute retainer burn per client.** Pull contracted hours from `retainer` configs (Supabase) or from the Toggl project's time estimate. Compare to hours logged this period:
   - > 75% with > 1 week left → warning, surface to owner
   - > 100% → scope creep confirmed → see `detecting-scope-creep` for the conversation
   - < 50% with < 1 week left → client paying for unused capacity, flag for renewal conversation
5. **Compute project budget pacing for fixed-fee.** `hours_logged / time_estimate`. At > 85% with the deliverable not shipped, queue an `overrun_alert` action with the named driver (which tag ate the budget — `design`, `dev`, `pm`, `revisions`, `qa`).
6. **Data-hygiene scan.** Count entries this week where the project is `(No project)` or description is null/empty. If `(No project)` exceeds 2% of total hours, surface as a `data_hygiene` warning — invoices built on this data will not survive a dispute, and profitability rolls up under-report.
7. **Scope-creep tag aggregation.** Sum hours tagged `scope-creep` per client over the trailing 60 days. If > 15% of total hours for a client, flag as a renegotiation candidate and feed into `detecting-scope-creep`.
8. **Cross-join for margin.** Hours per client × per-user cost rate (Premium tier only) = cost of delivery. Subtract from Stripe revenue per client = gross margin. Feed into `flagging-margin-erosion`. If the customer is on Starter or Free, cost rates aren't available — surface as a `setup_gap` and refuse to compute margin.
9. **Write to Notion brain.** Append a row to `Agent Action Log` for every alert. Update `Clients` DB with `hours_this_month` and `retainer_burn_pct`. Update `Projects` DB with `budget_used_pct`. Never write to `Team Members` — that's customer-owned.

## Conversation script (talking to the team about timer compliance)

When timer fill drops below the bar, the owner needs to talk to the team. The frame matters more than the numbers — punishing low utilization gets padded data, not better data. Toggl's low-friction tracker makes this a discipline problem more often than a tooling problem, so name that honestly.

**Don't open with:**
> "Your hours are low this week."

**Open with the diagnostic, not the verdict:**
> "I noticed last week had a chunk of `(No project)` time and a few people hadn't logged since Wednesday. Before I read into it — was there a tooling problem, a heavy-meeting week, or did timer entry just slip? I'd rather fix the cause than chase the number."

**Reinforce why it matters, not how to comply:**
> "When timer fill drops below daily entry, three things break: I can't tell which clients are over scope until the invoice goes out, I can't see who's slammed before they burn out, and we can't substantiate invoices if a client pushes back. None of that is about clocking you — it's about not flying blind."

**Set the bar, not the punishment:**
> "Bar is end-of-day entry before logging off, with a project tagged and a one-line description per entry. The browser extension's start-timer button in ClickUp / Asana eliminates the 'what was I doing?' problem — use it. If a tool is in the way, tell me and I'll fix the tool."

**For the chronic offender, escalate to a 1:1 — never call out in group settings.** Bring the data: days-since-last-entry, the gap, the impact on the specific client invoice that was at risk.

**For the burnout signal (> 90% utilized 2+ weeks):** Don't congratulate. Ask:
> "You've been at 95% three weeks running. What can come off your plate? If it's all critical, we have a staffing problem, not a you problem."

## What NOT to do

- Don't compute margin without cost rates loaded (Toggl Premium). Revenue per client without cost is a vanity number — surface a `setup_gap` instead.
- Don't surface utilization as a stick. The moment producers learn it's a performance metric, you get padded data and lose the ability to forecast capacity.
- Don't trust hours backfilled more than 48 hours after the work, and assume anything older than the Premium time-entry lock window is unreliable for retrospective profitability.
- Don't fire a `scope_alert` on hours alone — pair it with the `scope-creep`-tagged entries or the specific off-tag breakdown so the owner has the scope conversation, not the hours conversation.
- Don't write to the customer's `Team Members` or `Hires & Departures` Notion DBs. Agents read those; the owner writes them.
- Don't propose retainer renegotiation on one month of overrun. The bar is > 15% over contracted for 2 consecutive months — anything less is noise.
- Don't show the customer raw Toggl URIs, workspace IDs, or entry IDs. Surface client name + project name + the number that matters.
- Don't assume every project has a time estimate set. If the estimate is null, queue a `setup_gap` action — there is no margin or scope signal possible until budgets are entered at project kickoff.
