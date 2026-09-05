---
name: identifying-burnout-risks
description: The conversation script for surfacing burnout risk — both the founder's own and individual team members'. Burnout is the #1 reason agency employees quit (75% cite workload), and 49% of agency owners are already in moderate-to-severe burnout. Use when team utilization crosses 85% for multiple weeks, when after-hours Slack/commit activity spikes, when standups get missed, when response times slip, or when the founder asks "is the team okay" / "am I okay". Returns the signal + the named driver + a non-preachy recommendation.
---

# Identifying Burnout Risks

Owners notice burnout after someone quits. By then it costs 1.5–2x annual salary to replace them and 3–6 months to refill. Your job is to surface burnout while it's still recoverable — and to do it without sounding preachy or HR-coded.

The data the founder needs to hear up front: agency workers hit 34% burnout prevalence, middle managers 43%, and 49% of agency owners themselves are in moderate-to-severe burnout (Resource Guru 2025; agency leadership burnout research 2024–2025). This is not a wellness issue. It's an operational one.

## The signals — what counts as a flag

A single signal isn't burnout. Two or more, for 2+ weeks, on the same person, is.

| Signal | Source | Threshold |
|---|---|---|
| Utilization > 85% billable | Harvest / Toggl / ClickUp | 4+ consecutive weeks |
| Utilization > 90% billable | Harvest / Toggl / ClickUp | 2+ weeks → already in burnout territory |
| After-hours Slack messages | Slack via Composio | > 20% of messages outside 8am–7pm local, sustained 2+ weeks |
| After-hours commits / PR activity | GitHub via Composio | > 25% outside business hours, sustained 2+ weeks |
| Missed standups / 1:1s | Calendar via Composio | 2+ no-shows in trailing 2 weeks, where they used to attend |
| Declining response times | Slack / Gmail via Composio | Median reply time up > 50% vs trailing 4-week baseline |
| Vacation balance accumulating | HR tool (if connected) | > 15 days unused + no PTO scheduled in next 60 days |
| Single-person bus factor on a client | ClickUp / Harvest | One person logging > 60% of a client's hours for 4+ weeks |

The founder's OWN signals are the same — except utilization comes from Calendar (back-to-back meetings > 6 hrs/day) and the after-hours signal usually dominates (founders send Slack at midnight).

## The thresholds (from the source data)

| Layer | Healthy | Watch | Burnout-risk |
|---|---|---|---|
| Team-wide utilization (trailing 4w) | 65–75% | 75–85% | > 85% sustained |
| Any single person utilization | < 80% | 80–90% | > 90% for 2+ weeks |
| Admin hours per employee per week | < 8 | 8–12 | > 15 (the agency average — already a problem) |
| After-hours work share | < 10% | 10–20% | > 20% sustained |
| Tool-switching context | < 5 tools touched per day | 5–8 | > 8 (drives 27% of burnout) |

Sources: Resource Guru 2025 agency survey, agency time-tracking research 2024–2025, Parakeeto utilization benchmarks.

## The script — surface without sounding preachy

The trap is sounding like an HR pamphlet. The agent is the founder's COO, not their therapist. Frame burnout as an operational risk to delivery and retention, not a feelings problem.

**Bad — preachy:**
> "I'm worried about Sara. She seems stressed. You should check in with her about work-life balance."

**Bad — vague:**
> "Team utilization is high. Consider reducing workload."

**Good — operational, with named signal + named cost:**
> "Sara has been at 94% billable utilization for 3 weeks running and her Slack messages have shifted to 28% after-hours (vs 8% baseline). She's the sole logger on Acme — 71% of that client's hours since the redesign started. Two operational risks: (1) Acme delivery is single-threaded through her, and (2) the 75% of agency leavers cite workload — refilling her role would take 3–6 months and cost ~$X (1.5–2x her loaded salary). Recommend: offload the partner-page work to Marcus this week, or push Acme's launch by 1 sprint. I've drafted both messages — open the action card."

**Good — for the founder themselves:**
> "Last week you had 31 meetings, sent 47 Slack messages after 9pm, and missed two of your own 1:1s. You're showing the same pattern Sara showed in March. The data, not me, is saying you're the bottleneck on three deals and the single point of failure on Acme. Recommend: cancel the two recurring meetings I've flagged in the action card, and consider whether the AM hire from the `calculating-hiring-triggers` trigger gets accelerated."

## Name the driver — every time

Burnout has operational causes. Name the ONE driving this case:

1. **Workload / over-allocation** (41% of cases) → utilization trigger; offload or hire (`calculating-hiring-triggers`)
2. **Unrealistic deadlines** (30%) → pipeline trigger; renegotiate timeline or scope (`detecting-scope-creep`)
3. **Tool switching / admin overload** (27% / 15 hrs per employee per week) → automation candidate; admin agent can reclaim a full day
4. **Client emergencies + reporting demands** (21%) → buffer hours into retainer, automate reporting
5. **Billable-hour pressure without protected downtime** → the metric system itself; recommend protected non-billable time
6. **Bus-factor on a client** → cross-training, not a wellness conversation

Without a driver, the recommendation is unactionable. "Sara is burning out" is a problem. "Sara is the sole logger on Acme at 94% utilization because the AM gap means she's also writing scopes" is a thing the founder can fix this week.

## When to escalate to a fire / pause / hire conversation

Escalate when ANY of these are true:

- A team member has been > 90% utilization for 6+ weeks → swap workload BEFORE recommending a hire (per `calculating-hiring-triggers`, this is "in burnout territory")
- Team-wide > 85% for 4+ weeks → recommend the next hire urgently (per `calculating-hiring-triggers`)
- Founder is showing > 2 of the founder-signals AND pipeline is healthy → recommend a delivery hire so they can step off ops
- A single client is responsible for > 1 person's burnout (emergencies, scope, reporting all from same client) → escalate to `firing-a-client` or repricing (`raising-retainer-prices`)

Do NOT escalate to "you should take a vacation" or "consider therapy." The agent isn't qualified for that and the founder will tune it out.

## The intervention bundle — what actually works

Agencies that implement the bundle see 15–25% retention improvement (agency intervention research 2024–2025):

1. **Capacity planning tool actually used** — reduces over-allocation 20–30%
2. **Admin automation** — reclaims the 15 hours/week/employee (26% of work time) lost to admin
3. **Tool consolidation** — cuts the 27% of burnout traced to context-switching
4. **Structured downtime** — non-billable time PROTECTED, not just hoped for
5. **Role autonomy** — fewer approval gates on small decisions
6. **Recognition** — named wins in briefings (the COO briefing skill can carry this)
7. **Clear expectations** — scope documented before kickoff (links to scope skills)
8. **Managerial support** — 1:1s actually happen (calendar check)

When the agent recommends interventions, pick ONE from the bundle that matches the named driver. Don't list all 8 — that's a wellness pamphlet again.

## How the cron Team Agent uses this

Weekly (Monday 11am — same cron slot as the hiring-trigger agent):

1. Pull utilization from Harvest/Toggl/ClickUp over trailing 4 weeks
2. Pull after-hours activity share from Slack and (if connected) GitHub
3. Pull meeting attendance and response times from Calendar/Gmail
4. For each team member, compute the signal count above thresholds
5. For each person with 2+ signals sustained 2+ weeks, queue a `burnout_risk` action with:
   - The named person (or "founder")
   - The signals tripped, with the specific numbers
   - The named driver from the 6 above
   - The single recommended intervention from the bundle
6. Run the same check on the founder using calendar + Slack timing
7. If team-wide utilization > 85%, ALSO queue the `recommend_hire` action via `calculating-hiring-triggers`
8. Write the result to Notion `Risks` DB if any signal is > 90% utilization or > 25% after-hours

## Cross-references

- `calculating-hiring-triggers` — the structural fix when utilization is the driver
- `detecting-scope-creep` — when client emergencies are the driver
- `flagging-margin-erosion` — when the burnout is being subsidized by a bad-margin client
- `firing-a-client` — when one client is producing > 1 person's burnout
- `composing-weekly-briefing` — surface the burnout signal in Monday briefing
- Source data: Harvest/Toggl/ClickUp/Slack/Gmail/Calendar/GitHub via Composio

## What NOT to do

- Don't surface a burnout flag without named signals and numbers. "Seems stressed" is useless.
- Don't moralize. The agent is the COO, not HR. Frame as delivery risk + retention cost.
- Don't recommend "take a vacation" as the primary intervention — pair with structural fix (hire, scope, automation).
- Don't surface team-member burnout to the team member. The agent only talks to the owner.
- Don't flag a single high-utilization week — burnout requires sustained signal (2+ weeks for after-hours, 4+ for utilization).
- Don't generalize across the team. Name the person, the signal, the number.
- Don't ignore founder burnout. 49% of owners are already in moderate-to-severe — when their signals trip, surface them with the same operational framing.
