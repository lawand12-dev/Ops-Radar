---
name: diagnosing-difficult-clients
description: The diagnostic to run BEFORE recommending a fire. Distinguishes scope-creep from abuse, slow-pay from no-pay, demanding from impossible. Scores a client on 4 axes (margin, behavior, future, capacity) and returns a recommended path — reprice, reduce-scope, switch account manager, or fire. Use when the user asks "should I fire {client}", "is this client worth it", "this client is hard", "is it me or them", or whenever a fire trigger from another skill is about to recommend off-boarding.
---

# Diagnosing Difficult Clients

*"I think this client is the problem — but I'm not sure if it's them or me, and I don't want to make the wrong call."*

Almost every owner is carrying at least one client they should have ended a quarter ago. They are also carrying at least one they think is unfixable but isn't. Your job: run the diagnostic before the owner runs the firing script. Most "fire this client" instincts are actually a reprice, a scope reset, or an account-manager swap waiting to happen.

## When this triggers

Run the diagnostic when ANY of these are true:

- Owner explicitly asks "should I fire {client}" or "is {client} worth it"
- Owner describes a client as "difficult," "a nightmare," "draining," "toxic" — and asks what to do
- Another skill (e.g. `firing-a-client`, `detecting-scope-creep`, `flagging-margin-erosion`) is about to surface fire-criteria — gate it through this first
- A client triggers two or more of: margin below floor, repeated late payment, team complaint, owner Slack message at midnight, renewal anxiety
- Owner asks "is it me or them"

Never let the COO recommend firing without running this first. The 4-criteria fire test in `firing-a-client` answers "is it allowed"; this skill answers "is it the right move."

## What to do

### Step 1 — Classify the category (one or more)

Different problems demand different responses. Identify which category(ies) apply before deciding anything. A client is often two of these at once — name both.

| Category | Tell | Default path |
|---|---|---|
| **Late Payer** | Average days-to-pay > stated terms + 15 days, OR > 30% of last 12 invoices landed late | Reprice + payment terms reset (auto-pay / ACH) |
| **Scope Creeper** | Last 3 months ran ≥ 20% over budgeted hours; no change-order process exists | Scope reset OR retainer resize (`raising-retainer-prices`) |
| **Team-Disrespecter** | Two of three team members hesitate or cite specific incidents in 1:1s | Account-manager swap OR direct ultimatum on behavior |
| **Mismatched-Expectations** | Recurring phrases: "I thought…" "Aren't you supposed to…" "Last agency did…" | Scope reset conversation; fix qualification process |
| **Strategically Unprofitable** | Fully-loaded margin below agency target with no realistic upgrade path in 90 days | Reprice OR fire — easiest of the five to act on cleanly |

### Step 2 — Score the four axes (1 = worst, 5 = best)

| Axis | What it measures |
|---|---|
| **Margin** | Fully-loaded net margin: revenue minus delivery hours, AM time, scope creep, rework |
| **Behavior** | How the team experiences calls/messages — abuse, condescension, after-hours pings, hesitation in 1:1s |
| **Future** | Strategic value: logo, case study, referral source, expansion runway, learning opportunity |
| **Capacity** | Can the agency backfill this revenue within 90 days, OR is the cash hit survivable per `projecting-cash-runway` |

Sum the four. The total is the recommendation:

- **17–20: Grow.** Top-quartile client. Deepen, QBR, expand.
- **13–16: Keep & monitor.** Healthy. Improve the one axis dragging the score.
- **9–12: Fix — do not fire yet.** Run a reset conversation. 60–90 day window. If no improvement, escalate.
- **5–8: Fire path.** Plan the off-ramp via `firing-a-client`.
- **4: Fire now.** Damage exceeds revenue.

### Step 3 — Return the path, not the verdict

Map the score + category to a recommended path. Do NOT jump straight to firing unless the score is ≤ 8 AND `firing-a-client`'s 4 criteria all hit.

| Score band | Dominant category | Recommended path |
|---|---|---|
| 9–12 | Late Payer | Payment terms reset (auto-pay / ACH); 30-day ultimatum |
| 9–12 | Scope Creeper | Scope reset OR retainer resize — see `raising-retainer-prices` |
| 9–12 | Team-Disrespecter | Account-manager swap; protect the team first |
| 9–12 | Mismatched-Expectations | Reset conversation owner-to-owner; rewrite SOW |
| 9–12 | Strategically Unprofitable | Reprice; if refused, move toward fire |
| 5–8 | Any | Off-ramp via `firing-a-client` |
| ≤ 4 | Any | Off-ramp immediately; behavior-driven firings get shorter notice |

### Step 4 — Block the fire if any of these are true

Even if the score says fire, hold the conversation when:

- Losing this revenue drops the agency below 6 months runway (use `projecting-cash-runway`)
- The client is > 25% of MRR — stage the off-ramp over 6+ months instead
- The agency raised price or refused a request in the last 30 days — let dust settle
- Owner is in personal crisis (health, family) — defer

If any of these hit, return a HOLD with the reason and a reassess-in date.

## Conversation script

### Internal team alignment (use BEFORE deciding)

The owner runs this in their next leadership meeting. Three direct questions to three team members who interact with the client:

> "I want to ask you about {client} specifically. No wrong answers.
> 1. How are calls with them going? Anything I should know about how they communicate with you?
> 2. If you could change one thing about working with them, what would it be?
> 3. Would you be relieved or sad if we stopped working with them?"

If two of three hesitate or describe specific incidents — behavior is in play, weight that axis to 1–2. If two of three say "relieved" — the morale tax is real and you are underpricing it.

### The "let me investigate" message to a stressed founder

When the owner pings the COO at 11pm saying "I think we need to fire {client}" — slow them down. Anger is data, not a decision energy.

> "Heard. Before we draft a firing call — give me 24 hours to run the diagnostic. I'll pull the last 3 months of margin, scope, and payment data on {client}, and check with you on team morale and runway. By tomorrow I'll have a recommendation: reprice, scope reset, AM swap, or off-ramp — with the math and the script. Three reasons I want to do this first: (1) most "fire this client" instincts are actually a reprice waiting to happen, and reprices preserve the revenue; (2) if it IS a fire, we want the math airtight so you don't second-guess at month 2; (3) if you fire in anger by email tonight, that becomes the story the client tells. The decision still gets made — just in the right tone, 24 hours from now."

Always follow with the diagnostic output in writing the next day. Two paragraphs. Score, category, recommended path, blockers (if any).

## What NOT to do

- Don't run this diagnostic in the daily briefing. It is a direct response to an owner's question or to a fire trigger from another skill — never an unsolicited "here's how you should feel about {client}."
- Don't score the client without pulling actual data. Margin, days-to-pay, hours-over-budget — load them before assigning numbers, never eyeball.
- Don't recommend firing on a 9–12 score without a documented reset conversation in the last 30 days. The reset is the prerequisite, not the alternative.
- Don't recommend an account-manager swap for a Strategically Unprofitable client — the AM is not the problem. Reprice or fire.
- Don't recommend reprice for a Team-Disrespecter — money doesn't fix abuse.
- Don't hand the owner the firing script (`firing-a-client`) until this diagnostic returns a fire path AND the 4 fire criteria all check out AND none of the four blocks in Step 4 apply.
- Don't tell the owner "you're being too sensitive" or "this is fixable" without the data behind it. The owner's instinct that something is wrong is usually correct; the question is which lever to pull.

## Cross-references

- `firing-a-client` — the next skill, only after this returns a fire path
- `raising-retainer-prices` — the most common alternative when score is 9–12
- `detecting-scope-creep` — when Scope Creeper category dominates
- `calculating-effective-hourly-rate` — the input to the Margin axis
- `projecting-cash-runway` — the input to the Capacity axis
- `flagging-margin-erosion` — the most common trigger that points here
