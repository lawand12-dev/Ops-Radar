---
name: composing-slack-digest
description: The team-channel Slack digest — daily and weekly recaps of what the AI agents did, what got approved, what got rejected, what's still pending. Distinct from the weekly founder briefing — this post is for the agency team, so they see the AI working alongside them rather than behind a curtain. Use when posting the daily 6pm digest, the Friday weekly recap, when the user asks "what did the agents do today", "team-channel update", or "post Slack digest". Returns the exact post structure and timing, not a free-form summary.
---

# Composing Slack Digest

*Will the team trust an AI teammate they can't see working?*

The team channel is where trust gets built or burned. If the agents run silently, the team treats them as a black box — useful when they work, suspicious when they don't. The digest is how the AI shows up to standup. Same format every day. Same time every day. The team learns to scan it the way they scan a sprint report.

This is NOT the founder briefing. The founder briefing is one person, Monday 6am, financial-impact-ranked. The team digest is plural — the AMs, specialists, and PMs read it together at 6pm and again Friday at 4pm.

## When this triggers

- Daily at 6pm in the customer's timezone — recap of the day's agent activity
- Friday at 4pm — weekly recap, replaces the daily that day
- When the user asks "what did the agents do today" or "post the team digest"
- After a major agent run completes outside the schedule (manual recap)

Skip the daily post if zero agent activity occurred that day. Don't post empty digests — it trains the team to ignore the channel.

## What to do

The digest has three states. Pick one based on the day's activity:

1. **Daily recap (Mon-Thu 6pm)** — what happened today only. 5 sections max.
2. **Weekly recap (Fri 4pm)** — what happened across the full week. Replaces Friday's daily.
3. **Quiet day** — fewer than 3 agent events. Single line, no sections.

Post structure for the daily and weekly recaps:

```
{header line — agents active + headline outcome}

✓ Approved ({count})
{bullet per approved action — who approved, what it did}

✗ Rejected ({count})
{bullet per rejected action — who rejected, brief reason if known}

⏵ Pending ({count})
{bullet per still-waiting action — owner + how long pending}

⚠ Flagged ({count})
{bullet per agent-surfaced risk — entity + one-line summary}

—
{thread-link to /dashboard/runs for full detail}
```

Rules that hold across both daily and weekly:

- ALWAYS lead with the header line. The team scans the channel — they need the headline before the bullets.
- ALWAYS include the section count in parens, even if zero. "Rejected (0)" signals "we checked."
- NEVER fabricate activity. If no actions were approved today, write "Approved (0)" — don't pad.
- NEVER credit "the AI" — credit the named agent (Revenue Agent, Collections Agent, etc.) and the named approver.
- Order bullets by recency within each section. Newest at the top.

Timing is non-negotiable. The team learns the cadence — moving the post by an hour breaks the habit.

## Conversation script

### Daily recap — normal day

```
Agents ran 4 times today. Recovered $4.2K, queued 2 actions, flagged 1 scope risk.

✓ Approved (3)
- Collections Agent → Touch-2 email to Acme. Approved by Sarah at 11:14am.
- Revenue Agent → Stripe MRR snapshot logged to Brain. Auto-approved (read-only).
- Stack Agent → Loom cancellation queued (Sarah approved at 3:02pm).

✗ Rejected (1)
- Collections Agent → Touch-3 to Globex. Rejected by Sarah — relationship-sensitive, she's calling instead.

⏵ Pending (2)
- Profitability Agent → Reprice draft for Acme. Waiting on Mike (queued 4h ago).
- Scope Agent → Scope conversation script for Initech. Waiting on Sarah (queued 2h ago).

⚠ Flagged (1)
- Initech project at 138% of budget burn. Surfaced by Scope Agent at 2:41pm.

—
Full detail: dashboard/runs
```

### Weekly recap — Friday 4pm

```
Week in review. Agents ran 27 times, recovered $14.8K, surfaced 4 risks, queued 11 actions.

✓ Approved this week (8)
- 5 collections emails sent across 3 clients
- 2 stack cancellations (Loom + an unused Notion seat) — $134/mo saved
- 1 reprice conversation queued and sent to Acme

✗ Rejected this week (3)
- Sarah rejected 2 collections touches as relationship-sensitive
- Mike rejected 1 scope script — wanted to write it himself

⏵ Still pending heading into next week (4)
- Acme reprice acceptance (waiting on Acme)
- Globex Touch-3 (waiting on Sarah)
- 2 scope conversation scripts (Initech, Beta)

⚠ Risks surfaced this week (4)
- Acme effective rate $87/hr vs $125 floor — Revenue Agent, Mon
- Globex 32d past due on #4421 — Collections Agent, Tue
- Initech 138% budget burn — Scope Agent, Thu
- Team utilization hit 87% — Team Agent, Fri

—
Full detail: dashboard/runs
```

### Quiet day — fewer than 3 events

```
Agents quiet today. Revenue Agent logged the daily Stripe snapshot. No actions queued. Full week recap Friday 4pm.
```

### Saying "I don't know" in the digest

If an agent run errored or partial-completed, name it:

```
⚠ Collections Agent errored on Globex (HubSpot rate limit). Will retry tomorrow 9am. No action lost.
```

Never hide errors. The team's trust is built on the digest matching reality.

## What NOT to do

- Don't post the founder briefing structure into the team channel. That's a one-person doc. The team needs different framing — they want to see THEIR teammates (Sarah, Mike) named, not just the agency's number.
- Don't write more than ~15 bullets total in a daily. The team scans on a phone — long posts get scrolled past.
- Don't include charts, screenshots, or embedded images. Slack threads strip them. Text-only.
- Don't summarize what the agents "tried" — only what they did. "Stack Agent tried to find waste" is noise. "Stack Agent queued Loom cancellation" is signal.
- Don't include client-confidential numbers the team shouldn't see (e.g. specific client margin %, salary data). Surface the existence of a risk, not the financial detail.
- Don't post if there's truly zero activity. Skip the day. Posting empty digests trains the team to mute the channel.
- Don't change the section order. Approved → Rejected → Pending → Flagged. Every time. Scannability beats novelty.
- Don't credit "the AI" or "OpsRadar." Credit the named agent. The team should learn the agent names the same way they know each other's names.
- Don't promise outcomes that haven't happened yet. "Acme will pay tomorrow" is fabrication. "Acme replied to Touch-2, owner Sarah" is fact.
