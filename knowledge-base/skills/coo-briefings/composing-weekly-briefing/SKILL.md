---
name: composing-weekly-briefing
description: The template for the Monday-morning weekly COO briefing — the single most-read agent output. Tight structure: the one-thing-to-do-today, three risks ranked, three wins ranked, the agency's number, what's queued for approval. Use when the Briefing Agent runs (Mondays 6am), when composing the dashboard hero narrative, or when the user asks "what should I focus on this week". Returns the exact briefing structure to fill in, not a free-form summary.
---

# Composing the Weekly Briefing

Most agency owners glance at dashboards. They read briefings. Your job: make the briefing the thing they read.

## The structure (NEVER deviate)

```
{ONE LINE — what to do today}

THIS WEEK'S NUMBER: {single most important metric}

⚠️ Risks (top 3, ranked by financial impact)
1. {risk_1}
2. {risk_2}
3. {risk_3}

✓ Wins (top 3, ranked by recency or value)
1. {win_1}
2. {win_2}
3. {win_3}

⏵ Queued for approval ({count})
{action_summaries}

—
{agent_signature}
```

That's it. Every section is fixed. No improvisation.

## Section-by-section rules

### The opening line (the most important sentence)

ONE concrete action the owner should take today. Not vague ("review your dashboard"). Specific:
- "Reprice Acme. They're at $87/hr effective; floor is $125."
- "Pause work on Globex. 32 days past due on invoice #4421."
- "Hire the AM. Team utilization hit 87% last 3 weeks."

If you can't name ONE concrete action, write: "Nothing critical today. Review the queued approvals when you have 10 minutes."

NEVER fabricate urgency. If the week is calm, say so.

### The number

Single metric. The one number that summarizes the agency's state THIS WEEK.

Possible choices, in priority:
1. If runway < 6 months → "Runway: {N} months base / {N} months 2-retainer-loss"
2. If margin < 15% blended → "Blended margin: {N}% (down from {M}% last month)"
3. If utilization > 85% → "Team utilization: {N}% — at burnout threshold"
4. If MRR change > 5% → "MRR: ${N} ({delta} vs last month)"
5. Default → "MRR: ${N} · {client_count} active clients · ${cash} cash"

Cite the source/comparison so it's interpretable.

### Risks (always 3, ranked)

Risk = something that COULD cost money in next 90 days but hasn't yet. Rank by financial impact.

Format per risk:
```
1. {Client/topic name} — {one-sentence specific risk}. {one-sentence what to do}.
```

Examples:
- "Acme — Effective rate $87/hr vs $125 floor; losing $9K/quarter. Recommend reprice conversation this week (draft queued)."
- "Cash flow — Top 5 invoices total $47K overdue avg 22 days. Touch-3 cadence triggered for Acme + Globex."
- "Scope — Three projects at >120% of budget burn. Surfaced in `Scope Risk` Notion DB."

If fewer than 3 real risks, write the first two and add: "No third risk this week — focus on the two above."

### Wins (always 3, ranked)

Win = something concrete that improved the agency's state. Real outcomes only, not "we tried."

Format per win:
```
1. {Specific outcome} — {value/impact}. {credit where due}.
```

Examples:
- "Acme paid invoice #4421 — $12K recovered after Touch-3. Approved by [you] Monday."
- "Stack Agent cancelled Loom subscription — $58/mo saved, 6-month payback on usage analysis."
- "Briefing Agent surfaced Globex margin risk 12 days before quarter-end — repricing conversation queued in time."

Wins matter for two reasons: (1) trust — the customer sees the AI Ops Team paying for itself, (2) momentum — owners need the morale.

### Queued for approval

Don't dump every pending action. Summarize:

```
⏵ Queued for approval (4)
- 2 collections emails (Acme + Globex)
- 1 repricing draft (Acme)
- 1 scope conversation script (Initech)
```

Link to `/dashboard/actions` for review.

## The voice

- **Direct.** No filler, no apologies. "Acme is bleeding margin" not "I noticed Acme's margins might be a slight concern."
- **Concrete.** Always a name + a number. Never a feeling.
- **Single-action-per-line.** Owner should be able to scan and act.
- **No emojis.** (The structural arrows ⚠️ ✓ ⏵ are fine — they're scannable. Other emojis aren't.)
- **No corporate-speak.** "Recommend" not "It might be worth considering."

## What to skip

- Status of healthy clients ("Beta is doing fine") — don't waste the owner's attention.
- Metric trends without thresholds ("MRR is up 2%") — needs a comparison or a benchmark.
- Restatements of last week's briefing — only what's new or changed.
- General advice — only specific actions on specific entities.

## How the Briefing Agent should use this

The Briefing Agent (cron `0 6 * * 1` — Monday 6am) does:

1. Pull data from: Stripe finance, HubSpot pipeline, Harvest utilization, Notion Risks DB, recent agent_actions
2. Run the priority logic:
   - If runway < 6mo → top action = cash-related
   - Else if margin alert in last 7d → top action = margin-related
   - Else if utilization > 85% → top action = team-related
   - Else if scope alert in last 7d → top action = scope-related
   - Else → "Nothing critical today"
3. Compose the briefing using the template above
4. Write to Notion `Brain Home` page (the customer's daily landing)
5. Optionally: queue a `send_briefing_email` action if customer has opted in

## Cross-references

- `projecting-cash-runway` — for the runway-priority case
- `flagging-margin-erosion` — for the margin-priority case
- `calculating-hiring-triggers` — for the team-priority case
- `detecting-scope-creep` — for the scope-priority case
- Source: `briefing` cron agent at `src/lib/agents/briefing/index.ts`

## What NOT to do

- Don't write more than 200 words in total.
- Don't include charts / images / numbers without comparison.
- Don't surface every action — only the top 3 risks.
- Don't celebrate "we did our job" wins (e.g. "all integrations connected") — those aren't wins to the customer.
- Don't change the structure based on the week. Consistency = scannability.
