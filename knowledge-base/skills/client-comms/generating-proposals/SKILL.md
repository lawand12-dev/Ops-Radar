---
name: generating-proposals
description: Drafts a client proposal after a qualified sales call — structure (problem / approach / scope / timeline / investment / terms), the pricing math (effective $/hr floor check), must-haves vs nice-to-haves, and the close. Use when the user says "draft proposal for Acme", "what should I quote", "is this scope priced right", "proposal template", or after a discovery call where the agent has scope notes. Returns the full draft + the price-anchor language.
---

# Generating Proposals

*"I had the call, it went well, and now I'm staring at a blank Google Doc — am I going to underprice this again?"*

## When this triggers

- User asks the agent to draft a proposal for a named prospect.
- A discovery call summary just landed in the brain (Calls DB row with `outcome = qualified`).
- User pastes scope notes and asks "what should I quote?"
- User asks for a proposal template, a pricing sanity check, or a "is this enough" review of an existing draft.
- A deal moves into the `Proposal` stage in the CRM (HubSpot / Pipedrive) and no proposal exists yet.

The agent should NEVER auto-send a proposal. This is always a draft for the owner to edit and send. Proposal price is owner-anxious territory — the agent's job is to remove the blank page, not to commit revenue.

## What to do

### 1. Pull context first — never quote on vibes

Before writing a word, gather:

| Field | Source |
|---|---|
| Prospect name, company, industry | Calls DB / CRM |
| Pain stated on the call | Calls DB transcript or summary |
| Stated budget (if any) | Calls DB |
| Decision-maker + timeline | Calls DB |
| Scope discussed | Calls DB |
| Comparable existing-client retainers | Clients DB |
| User's effective hourly floor by service type | `calculating-effective-hourly-rate` |
| Standard contract terms | `__how_we_work` Notion page |

If any of the first four are missing, ASK before drafting. A proposal written from "they want SEO help" will be wrong.

### 2. Pick the shape

Three shapes — never invent a fourth:

1. **Project (fixed scope, fixed fee)** — one-time engagement with a defined deliverable. Best for: audits, builds, one-off campaigns.
2. **Retainer (monthly, hour budget OR deliverable budget)** — ongoing relationship. Best for: paid media, SEO, content, ops support.
3. **Hybrid (onboarding project → retainer)** — most common for new clients. Best for: anything that needs a setup phase.

If the call notes are ambiguous, default to **hybrid**. It de-risks both sides.

### 3. Do the pricing math BEFORE writing copy

For every shape, compute:

```
estimated_hours      = your honest estimate, not the optimistic one
loaded_hourly_floor  = from calculating-effective-hourly-rate table
proposed_fee         = estimated_hours × target_effective_rate
implied_rate         = proposed_fee / estimated_hours
```

Then the floor check:

| Implied rate vs floor | Verdict |
|---|---|
| > 1.5× floor | Healthy — you have room to discount if asked |
| 1.0–1.5× floor | Acceptable — quote as-is |
| 0.8–1.0× floor | Reprice up OR cut scope — do not send |
| < 0.8× floor | Stop. Either the scope is wrong or this prospect isn't a fit |

Never quote a number that lands below floor without the owner seeing the math and explicitly overriding. Surface the floor in the draft notes, not in the client-facing document.

### 4. Separate must-haves from nice-to-haves

Inside the scope section, every proposal has two lists:

- **Included** — what they're paying for. Tight, testable, owner-can-defend.
- **Available as add-on** — things that came up on the call but aren't core. Keeps the headline price clean and gives an upsell lane.

If the call surfaced 8 things they want and the budget supports 4, the other 4 become "available as add-on" with rough pricing — never "we'll figure it out later".

### 5. Write the document

Use this structure, in this order. Every section earns its place.

1. **Cover paragraph** (3–5 sentences) — restate their problem in their words, name what success looks like in 90 days, signal the shape (project / retainer / hybrid).
2. **Approach** — how you'll attack it. 3–5 bullets max. No methodology lectures.
3. **Scope — what's included** — bullet list, written as outcomes not tasks.
4. **Scope — available as add-on** — bullet list with rough pricing.
5. **Timeline** — phases with weeks, not dates. Use "Week 1–2 / Week 3–4 / Month 2 onward" framing.
6. **Investment** — one number, bolded. Then the structure (one-time vs monthly, payment terms).
7. **Terms** — pull from `__how_we_work`. Payment cadence, term length, notice period, what's out of scope by default (rush work, weekend coverage, new platforms).
8. **Next steps** — what happens if they say yes. Sign here → kickoff call → start date.

Keep it under 3 pages. Long proposals signal anxiety, not value.

### 6. Recommend the delivery channel

- **PandaDoc / DocuSign** if it's > $5k/mo or a multi-month commitment — you want the signature trail and the read-receipt.
- **Google Doc with comment access** if it's < $5k/mo and you've spoken twice — friction matters at this size.
- **Inline email** only for repeat clients adding a small scope — never for new logos.

## Conversation script

### The cover-letter open (sets the frame before the price hits)

Open the document with a paragraph that does three things in this order — restate their problem, name the outcome, signal the shape. The agent should draft this verbatim:

> "{Prospect first name} — thanks for the call on {date}. Based on what you shared, the core problem is {one-sentence restatement of their pain in their words, not yours}. The outcome we're scoping toward is {what 'better' looks like in 90 days — concrete, testable}. To get there, we're proposing a {project / monthly retainer / onboarding-then-retainer} engagement. Details below."

This paragraph buys you the price reveal. If you skip it and lead with the number, every prospect anchors on the price before they remember the problem.

### The price-anchor reveal (where most proposals lose the deal)

Never put the price in a table next to options. Put it in a sentence, with the structure first and the number second:

> "Investment for the {scope description} is a **{one-time setup of $X}** to get systems live, then **${Y}/month** on a 6-month initial term. Payment terms are 50% on signing, 50% on go-live for the setup, then monthly in advance for the retainer."

If you've offered a "package" option (good / better / best), state the recommendation explicitly:

> "Three options below. Most {prospect type} clients land on Option 2 — it's the one we'd recommend given what you described on the call."

Then when the prospect pushes back (and 60% will), the script is:

1. **"Can you do it for less?"** → "I can — but the way I'd do it is cut scope, not cut rate. The headline price reflects 90 hours of senior team time. If you want to bring it in cheaper, the lever is dropping {specific add-on}, which takes us to ${lower}."
2. **"Why is it more than {competitor}?"** → "Honestly? Either we're scoping more, or we're scoping more carefully. Send me their proposal and I'll show you the line-by-line." (Then actually do it.)
3. **"Can we start without the setup fee?"** → "We can't — the setup is what makes month 2 cheap. Without it, the monthly retainer would need to be ${monthly + amortized_setup}. Same money, just spread differently."

Do NOT offer a discount as the first response to pushback. Offer scope reduction. Discounts train the client to negotiate every renewal.

## What NOT to do

- Don't quote without doing the effective-rate floor check.
- Don't send a proposal without the cover paragraph — the price needs to land after the problem restatement, not before.
- Don't include more than three pricing options. Two is better.
- Don't list tasks in the scope section. List outcomes. "Set up Google Ads" is a task; "Generate qualified leads from paid search at a cost per lead under $X" is an outcome.
- Don't include a methodology section. Nobody reads it.
- Don't promise a date. Promise a phase ("Week 1–2"). Dates make you a liar when the prospect signs three weeks late.
- Don't bury the price. Hidden prices feel evasive — the prospect will scroll until they find it anyway.
- Don't auto-send. The agent drafts. The owner sends.
- Don't reuse a proposal from a different vertical without rewriting the cover paragraph. The restatement is the whole document.
