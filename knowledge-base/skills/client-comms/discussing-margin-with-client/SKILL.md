---
name: discussing-margin-with-client
description: The conversation script for when a client is eroding margin and the owner wants to keep them. Encodes the framing (never lead with "you're unprofitable"), the prep (5 numbers on one page), the 30-min agenda, the three asks (narrow scope / raise price / call it good), and how to handle pushback. Use when the user asks "how do I talk to {client} about margin", "Acme is unprofitable but I want to keep them", "framing the price talk", "margin conversation script", or when a margin-erosion action has been queued and the owner is preparing the meeting. Returns the opener variant + the three options + the close.
---

# Discussing Margin With a Client

*"They're a great client, they love us — how do I tell them we're losing money on them without blowing the whole thing up?"*

You don't. You don't tell them you're losing money. You don't make them the villain of your P&L. You walk in with one page, three options, and a calm voice — and you let them choose.

## When this triggers

Queue this skill when ALL of the following are true:

- A specific client has been flagged on margin (effective hourly rate below floor, or per-client P&L below the agency's target floor) for at least one full billing cycle.
- The owner has explicitly said they want to keep the client — not fire them. (If they're already considering firing, use `firing-a-client` instead.)
- A clean diagnosis exists for *why* margin is eroding — scope creep, legacy rate, complexity, team-mix, or client mismanagement. Without a diagnosis, the conversation has no asks.
- The owner has authority and bandwidth to hold the meeting within 7 days.

Do NOT trigger this skill for:
- A general "we should probably raise prices" mood — use `raising-retainer-prices`.
- Pure scope creep where margin is still healthy — use the scope refresh playbook.
- Owner anxiety with no specific client — that's a coaching conversation, not a client meeting.

## What to do

### Prep — before the meeting

Walk in with five numbers on ONE page (not a deck — decks read as defensive):

1. Logged hours, last 90 days, by role.
2. Revenue from this client, last 90 days, net of discounts.
3. Fully-loaded cost of delivery (hours × loaded cost per role).
4. Margin % = (Revenue − Cost) / Revenue.
5. What a comparable engagement would price at today for a new client.

Useful sixth: in-scope vs out-of-scope hours — lets you say "78% of what we've done is what we sold" without sounding accusatory.

Decide which of the three asks you're pushing for BEFORE the invite goes out:

| Diagnosis | Default ask | Fallback |
|-----------|-------------|----------|
| Scope creep | Narrow scope | Raise price |
| Underestimated complexity | Raise price | Narrow scope |
| Legacy rate | Raise price | Transition |
| Team mix wrong | Change team mix | Raise price |
| Client mismanagement | Narrow scope + process reset | Transition |

The owner walks in pushing for ONE option. The other two are fallbacks the client can pick if they reject the lead. Three options on the table, not four — keep it clean.

### The 30-minute meeting flow

- **0–2 min:** Opener (pick a variant below). Set the frame *before* showing numbers.
- **2–10 min:** Slide the one-pager across. Walk through the five numbers, neutrally.
- **10–20 min:** Lay out the three asks. Ask which feels right.
- **20–28 min:** Handle pushback. Trade concessions for concessions — never discount on demand.
- **28–30 min:** Close with a decision, a date, or a transition. Not "we'll see."

Send the recap email within 24 hours. The conversations that die are the ones nobody wrote down.

## Conversation script

### Opener — Variant A (value framing, newer/transactional relationship)

> "Thanks for making time. I want to talk about how we keep this engagement working over the next year. When we scoped this last [month], the work looked like A, B, and C. Since then, the team has been delivering A, B, C, and increasingly D and E — which is great, your business is growing, and we're glad to be part of it. But the engagement we sold doesn't have D and E in it, and we're at a point where I either need to formally expand what we're doing together, or pull back to the original scope. I'd rather expand — and I want to walk you through what that looks like."

Never says "unprofitable." Says: we're doing more than we sold.

### Opener — Variant B (transparency framing, mature trust-based relationship)

> "I want to be straight with you because I think we've earned that with each other. I ran the numbers on our engagement for the last quarter. The work is great, the relationship is great, but at our current setup we can't keep our senior people on your account — and you don't want junior people running it. So I want to talk through three options for how we fix this together, and you tell me which one feels right."

Only works if you have enough relationship capital that candor lands as information, not a complaint.

### Opener — Variant C (future framing, real growth story)

> "I've been thinking about where this engagement should be in twelve months. You've added [a second product line / two new markets / a new founder-led brand], and our current setup was built for where you were last year. I want to lay out what a next-version of working together looks like — what we'd cover, what it would cost, and what's not in the deal. The version we're running today won't carry you through next year, and I'd rather propose the next version than keep stretching this one."

Reprice without saying "your old rate doesn't work" — you're proposing a new engagement.

### The data reveal

After the opener, slide the one-pager across:

> "Here's what I'm looking at. Over the last 90 days we logged [X] hours across [roles]. The retainer covers roughly [Y] hours of work at our standard mix. The gap is [Z] hours — which is real work your team has been getting, and we've been glad to do it. I want to make sure we agree on those numbers before we talk about what to do next."

Pause. Let them read. Do not narrate while they read.

### The three asks

> "There are three ways we can land this. I have a preference, but I want to hear yours too.
>
> **One — we narrow the scope back to what we sold.** Same price, but D and E come off the table or get quoted separately when they come up. Simplest. Keeps everything where it is.
>
> **Two — we expand the engagement.** New retainer at [$X] reflects what the work has actually become. Same team, same cadence, no surprises on the next out-of-scope request.
>
> **Three — we shift the team mix.** [Senior person] moves to oversight; [different role] does the day-to-day. Price stays similar, the work continues, but the people change.
>
> My recommendation is [option]. Which of these feels closest to what you'd want?"

Then shut up. Whoever talks next negotiates against themselves.

### Handling pushback

**"We don't have the budget."** Offer trade-offs, not discounts.
> "Fair. Let's look at what we can take out so the number works. If we move [strategy session] to quarterly and pull [QA] back to your team, we land at [$X]. Does that math work?"

**"We'll have to leave."** Don't fold.
> "I hear you, and I don't want that. But I'd rather have an honest conversation about whether this fits than have us limp along until the work suffers and you leave anyway. What part feels like the dealbreaker?"

**"This isn't a good time."** It never will be.
> "I understand — and honestly, there's never going to be a quarter when this is easy. The longer we wait the bigger the gap gets. What if the new structure starts [60 days from now] — does that buy you enough runway?"

**"We already pay you a lot."** Sometimes true; doesn't change the math.
> "You do, and we're grateful for it. The question isn't whether we charge enough in absolute terms — it's whether we charge enough for what we've ended up delivering. Look at the 90-day hour breakdown and tell me if that matches what you thought you were paying for."

### The close

> "Before we wrap — what I'm hearing is [restate the option]. I'll send a recap email by end of day tomorrow with the new terms and start date. If anything in there doesn't match what we just agreed, you tell me and we fix it. Sound good?"

If they refuse to commit to anything, that's information. Diagnosis is probably "client mismanagement leaking in," and the next conversation is `firing-a-client`.

## What NOT to do

- **Don't say "we're losing money on you."** Positions the client as the problem and you as the victim. Say *"the engagement has drifted from what we scoped."*
- **Don't pre-apologize.** "I hate to bring this up" tells them you don't believe your own ask. Skip it.
- **Don't lead with the number.** Framing first, numbers second. The page stays face-down until after the opener.
- **Don't bring four options.** Three. More than three becomes a menu and the client picks the cheapest.
- **Don't run the meeting with the day-to-day contact.** Margin conversations happen with the SOW signer or their direct boss. Escalate or reschedule if the wrong person is in the room.
- **Don't agree to "let me think about it" without a date.** Vague endings kill these conversations. Either a decision, a scheduled second meeting within 7 days, or a transition.
- **Don't email the recap two weeks later.** 24 hours. Half of margin conversations die because nobody wrote down what was agreed.
- **Don't deliver this by email.** Live channel only — phone or video. Email is for the recap, not the ask.
- **Don't run this conversation twice with the same client.** If the new structure erodes again inside 90 days, the next conversation isn't margin — it's `firing-a-client`.

## Related skills

- `flagging-margin-erosion` — the trigger that produces this conversation
- `calculating-effective-hourly-rate` — the number you bring face-down
- `raising-retainer-prices` — the "just raise the price" path if scope isn't the driver
- `discussing-scope-with-client` — the parallel conversation if scope is the real issue
- `diagnosing-difficult-clients` — when you're not sure margin is the right opening
- `firing-a-client` — when the conversation needs to happen for a second time
