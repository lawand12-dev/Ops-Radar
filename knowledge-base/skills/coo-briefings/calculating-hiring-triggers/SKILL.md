---
name: calculating-hiring-triggers
description: The revenue-per-headcount triggers for when an agency should hire its next account manager, senior strategist, or operations role. Most agencies hire 6+ months late (after burnout) or 6+ months early (cash hit). Includes the named thresholds by role and agency type. Use when the user asks "when should I hire", "do we need another AM", or when team utilization crosses 75%. Returns the trigger + the hire spec, not a vague "consider hiring".
---

# Calculating Hiring Triggers

Two failure modes: hiring too late (team burns out, work slips, churn spikes) or too early (cash hit before revenue catches up). Both cost about the same. Your job: surface the trigger before either fails.

## The revenue-per-headcount triggers

| Role | Trigger | Source |
|---|---|---|
| Account Manager | 1 per ~$40-60K MRR managed | Parakeeto agency benchmarks 2026 |
| Senior Strategist / Director | 1 per ~$120-180K MRR or ~10 clients | Karl Sakas "Made to Lead" |
| Project Manager | 1 per ~6 active projects with > $5K/mo budget | DPM (Digital PM) industry survey |
| Designer/Developer (billable) | When 3+ months of pipeline > 75% utilization | Internal benchmark |
| Ops / Office Manager | $1-2M ARR threshold (first dedicated ops hire) | Agency Roadmap (Jason Swenk) |
| Director of Operations | $2.5M+ ARR | Karl Sakas |
| CFO (fractional, then full) | $3M / $7M ARR thresholds | CFO Forum 2025 |
| VP Sales | When pipeline > $1.5M / quarter and founder selling > 30% time | HubSpot Agency Partners |

These are FLOORS, not ceilings. Most agencies hire later. Most who hire on schedule grow faster.

## The utilization trigger (the more sensitive one)

Track team-level utilization (billable hours / available billable hours). Hire trigger fires when:

- **Team-wide > 75% for 8+ consecutive weeks** → hire within 60 days
- **Team-wide > 85% for 4+ consecutive weeks** → hire urgently, within 30 days
- **Any single person > 90% for 6+ weeks** → that person is in burnout territory, swap workload BEFORE hiring

Why 75% not 100%: the remaining 25% is internal work (admin, training, sales support, scope writing). Pushing past 75% billable means internal work suffers — usually scope/SOWs/onboarding quality, which then cascades into scope creep on existing clients.

Sources: Parakeeto's "agency utilization benchmarks" (parakeeto.com/blog/agency-utilization-benchmarks/), DPM 2025 utilization survey.

## The pipeline trigger (forward-looking)

Don't hire after utilization tips — hire before. Pipeline triggers:

| Signal | Interpretation |
|---|---|
| Weighted pipeline > 50% of current MRR closing in next 90 days | Hire if utilization > 65% — they'll arrive in time |
| Weighted pipeline > 100% of current MRR closing in next 90 days | Hire ASAP — even if utilization currently low |
| Pipeline conversion rate stable + 3 sales calls per week | Sustainable growth — staged hiring acceptable |

## When to hire FIRST, sell LATER

Most agency owners default to "I'll hire when we close." Sometimes the right move is the reverse:

- **Onboarding capacity exhausted.** New clients can't be onboarded properly because no AM has bandwidth. Hire the AM BEFORE closing the next contract.
- **Senior gap.** Founder is the only one doing strategy. Hire a senior strategist BEFORE the next 3 strategic clients close — otherwise the founder gets pinned and growth stalls.
- **Founder selling > 40% of time.** Means founder is sales bottleneck. Hire a junior to handle delivery so the founder can sell more.

The trigger isn't "we won the deal." It's "we won't be able to deliver well if we win the next one."

## The hire spec — what to recommend, not just whether

When the agent queues a `recommend_hire` action, include:

| Field | Source / how to derive |
|---|---|
| `role` | The specific role from the table above |
| `seniority` | Junior / Mid / Senior — derived from the work-mix |
| `headcount_after` | Current + 1 |
| `expected_cost_loaded` | Base salary × 1.35 (taxes + benefits + tools) |
| `time_to_productivity_days` | 30 (junior AM) / 60 (mid AM) / 90 (senior strategist) |
| `revenue_to_justify` | expected_cost_loaded × 3 — the 3x heuristic (agency must add 3x cost in MRR for the hire to be margin-positive) |
| `pipeline_required_for_safety` | revenue_to_justify × 4 (because pipeline conversion is ~25%) |
| `risk_of_not_hiring` | named scenarios — "Acme will get under-served, churn risk" |
| `risk_of_hiring_too_early` | named — "$X cash hit, 60 days until revenue justifies" |

## What the agent should NEVER recommend

- "Just hire — you'll figure it out." (Always concrete role + cost.)
- "Wait and see." (Useless. Either trigger fires or it doesn't.)
- A senior hire when the bottleneck is junior delivery work. (Identify the actual gap.)
- A full-time hire when a contractor would solve the immediate problem. (Always evaluate fractional / freelance first if pipeline isn't confirmed.)

## How the cron Team Agent uses this

Weekly (Monday 11am):
1. Pull utilization from Harvest/Toggl over trailing 8 weeks
2. Pull MRR from Stripe and pipeline from HubSpot/Pipedrive
3. Apply the table above to identify triggered roles
4. If trigger fires, queue `recommend_hire` action with full spec
5. Update Notion `Risks` if utilization > 85% (burnout risk)

## Cross-references

- `projecting-cash-runway` — confirm hire is survivable
- `flagging-margin-erosion` — sometimes the right answer is repricing, not hiring
- `composing-weekly-briefing` — surface hiring triggers in Monday briefing
- Source data: Harvest/Toggl via Composio, HubSpot/Pipedrive for pipeline

## What NOT to do

- Don't recommend hiring when runway < 6 months (per `projecting-cash-runway`).
- Don't recommend a full-time hire when the workload is project-shaped (use contractors).
- Don't recommend hiring senior when the gap is junior — match seniority to actual work.
- Don't generalize — name the role, the cost, the trigger metric.
