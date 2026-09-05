---
name: detecting-scope-creep
description: Detects and names scope creep on retainer or fixed-fee clients. The "1st ask / 2nd ask / 3rd invoice" rule — accommodate the first off-scope ask, name it the second time, invoice it the third. Use when checking project health, reviewing capacity utilization, drafting a client conversation, or when a project is burning faster than budget. Returns the conversation script, not just the metric.
---

# Detecting Scope Creep

Scope creep kills agency margin silently. The conversation feels confrontational, so most owners avoid it until the relationship is unfixable. Your job: surface it early and give the owner the words.

## The signals

Each scope-creep client shows 2+ of these:

1. **Hours overrun** — logged_hours / budgeted_hours > 1.15 for the period
2. **Effective rate erosion** — see `calculating-effective-hourly-rate`. Drop > 10% MoM
3. **Channel sprawl** — client is now requesting work in domains not in the SOW (e.g. SEO retainer being asked for paid media optimization)
4. **PM time inflation** — account management hours grew while billable hours stayed flat
5. **The "quick favor" pattern** — multiple emails per week with single-task asks that don't fit the retainer scope

## The 1st / 2nd / 3rd rule

This is the canonical script. Every senior PM in the agency world uses some version. Codify it.

**1st ask off-scope**: Accommodate quietly. Note it internally. Tell no one. Trust is built here.

**2nd ask off-scope**: Name it. Don't bill yet. Use this language:
> "Happy to handle this. Just flagging — this falls outside what we scoped originally. We've absorbed both this and the [prior request] without going back to you, but if it keeps growing we should formalize it. Want to do a quick scope refresh on our next call?"

**3rd ask off-scope**: Invoice it (or move it into a scope refresh). Use this language:
> "Glad to take this on. Given the volume of off-scope work this month — [list 2-3 items] — I want to formalize it. Two options: (1) expand the retainer by $X/mo, (2) bill these as one-off projects at $Y/hour. Both work for us. Which fits your budget better?"

## The conversation cadence

| When | Who initiates | Topic |
|---|---|---|
| Month 1 of retainer | Owner | Set baseline expectations, name the SOW out loud |
| Quarterly | Owner | Scope refresh: what's in, what's out, capacity |
| When you flag scope creep | Owner | The naming conversation above |
| At 6× threshold | Owner | Fire conversation (see `firing-a-client`) |

## The numbers to bring to the conversation

Never name a feeling ("you've been asking for a lot lately"). Always name a number.

| Stat | Where it lives | How to present |
|---|---|---|
| Hours logged this period vs budget | Harvest project, Notion Projects DB | "We logged 47 hours; the retainer covers 32." |
| Off-scope items by name | Comm channels (Slack, email) | "The Q4 SEO audit, the LinkedIn ad refresh, the partner-page redesign." |
| Effective hourly rate | `calculating-effective-hourly-rate` | "Last quarter our effective rate on you was $87. Our floor is $125." |

## When NOT to recommend the conversation

- **First 60 days of a new retainer.** Onboarding burns hours. Don't surface this in month 1.
- **During a known crisis (campaign launch, board meeting).** Wait two weeks.
- **If the customer's How We Work rules say "never raise mid-contract".** Wait for renewal.
- **If the customer has lost a major client this month.** Surface privately to the founder, not as a recommended action card.

## Cross-references

- `calculating-effective-hourly-rate` — the supporting number
- `raising-retainer-prices` — the formal-price conversation
- `firing-a-client` — when scope creep is past saving
- Source data: `get_scope` tool (ClickUp/Asana + Harvest budget burn)

## What NOT to do

- Don't surface this in front of the client's team — only to the agency owner.
- Don't recommend an immediate price raise on first detection — start with the naming step.
- Don't generalize "scope creep" — name the specific off-scope items.
- Don't propose anti-relationship moves (legal threats, holding work hostage) — the goal is preservation of margin AND relationship.
