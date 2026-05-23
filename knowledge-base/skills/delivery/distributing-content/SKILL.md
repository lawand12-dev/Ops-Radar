---
name: distributing-content
description: The distribution checklist that runs when the agency publishes a new content piece — blog post, case study, podcast episode, video. Encodes the timing windows (publish hour → first 48 hours → week-two repurpose), the per-channel checklist (LinkedIn, X, newsletter, sales-enablement, internal Slack), and the briefing script the agent uses when handing the asset to the social team. Use when the user says "we just published X", "distribute this content", "promote this case study", "what should I do with this new post", "content distribution checklist", or when a CMS publish event lands and the agent needs to propose the next-action queue.
---

# Distributing Content

*A piece just went live — is it actually going to get seen, or is it going to die on the blog index next to last quarter's 200 other posts?*

Most agency content dies because the publish step is treated as the finish line. The publish step is the starting gun. The first 48 hours decide whether a post earns its keep — after that the algorithmic and search lift is mostly locked in. Your job is to make sure the distribution checklist actually fires, against the channels the customer has connected, with copy that matches the asset.

## When this triggers

The agent runs this skill when ANY of the following is true:

- CMS publish event arrives (webhook from the customer's CMS, or status changes to `Approved`)
- Owner pastes a URL into the COO chat and says "we just shipped this" or "distribute this"
- A case study row in the Notion `Patterns` DB flips from `draft` to `published`
- A podcast episode appears in the customer's connected RSS or hosting tool
- The owner asks "what should I do with this post" / "promote this for me"

If the trigger is a webhook the agent **must** dedupe against `Agent Action Log` using the source URL or CMS post ID — duplicate publish events are common and re-posting the same LinkedIn caption twice in 30 minutes is a brand-damage event, not a no-op.

## What to do

### Step 1 — Classify the asset (don't skip)

Read the URL or paste and decide which lane the asset belongs in. Distribution differs by lane.

| Lane | Examples | Primary value |
|---|---|---|
| Thought-leadership post | Founder essay, hot take, framework | LinkedIn engagement + author rep |
| Case study | Named client outcome with numbers | Sales enablement + outbound proof |
| Podcast / interview | Episode with guest or founder | Audience swap + guest's network |
| Tactical playbook | How-to with screenshots | SEO + newsletter referrals |
| Announcement | Hire, raise, product launch | Press + team morale + ICP signal |

The lane decides which channels matter and what the caption sounds like. A case study gets pitched in sales-enablement; a hot take does not.

### Step 2 — Run the timing checklist

The distribution window has three phases. Each phase has a specific action set.

**Phase 1 — Publish hour (T+0 to T+2h):**
- Confirm the post is live, indexable, and has its OG image set
- Post the founder's LinkedIn caption (lane-specific — see Conversation script)
- Post the company LinkedIn share (same caption shape, different author)
- Post to X / company X account if owner's audience is there
- Drop the link into the internal `#wins` or `#publishing` Slack channel
- Add the row to Notion `Patterns` DB with status `published`, source URL, owner, publish_at

**Phase 2 — First 48 hours (T+2h to T+48h):**
- Newsletter inclusion if the next send is within 7 days (slot it in)
- DM the link to the named guests / clients mentioned in the post — ask them to reshare
- Reply to comments on LinkedIn within 2 hours during business hours
- If the asset is a case study, route the link to sales-enablement with the buyer-context blurb (see script)

**Phase 3 — Week-two repurpose (T+7d to T+14d):**
- Pull two quote-cards or one short clip out of the asset
- Repost a different excerpt with a different hook on the same channels
- Update the asset in the Notion `Patterns` DB with engagement numbers from each channel
- If the post overperformed (top-quartile vs the customer's own history), queue a "double-down" action: similar topic, expanded format

### Step 3 — Update the brain

Every distribution run writes one row to `Agent Action Log` with: agent name, the asset URL, channels posted to, scheduled time per channel, owner, status (`proposed` / `executed` / `skipped`). Failing to log it means the agent can't dedupe next time and can't measure which lanes work.

### Step 4 — Queue an approval card if the lane needs it

Captions on the founder's personal LinkedIn ALWAYS go through approval — that account is the customer's voice and a wrong word costs reputation. Company channels with a connected scheduler (Buffer / Publer / similar) can auto-fire if the customer's per-tool autonomy is set to `Auto`; otherwise queue to `/dashboard/actions`.

## Conversation script

### Briefing the social team / scheduler

When handing off to the human (or a scheduler tool), the agent says:

> "[Asset title] went live at [time]. Lane: [case study / thought-leadership / podcast / playbook / announcement]. Primary channels to fire in the first 2 hours: [LinkedIn founder, LinkedIn company, X, Slack #wins]. Newsletter slot: [next send date]. Two people to DM for amplification: [guest name, client name]. I've drafted the founder LinkedIn caption below — needs your edit before it posts. Approval card is at /dashboard/actions."

### Founder LinkedIn caption — case study template

Use this exact shape. The opener is a one-line outcome, not a humble-brag.

> "[Client] went from [before state] to [after state] in [time window].
>
> Here's what actually moved the number:
> — [Lever 1, one line]
> — [Lever 2, one line]
> — [Lever 3, one line]
>
> Full breakdown (no gate, no form): [link]
>
> The thing I'd do differently next time: [one honest sentence]."

### Founder LinkedIn caption — thought-leadership template

> "[One-sentence claim that would make a junior agency owner argue with you.]
>
> Three things I see most agencies get wrong here:
> 1. [Thing]
> 2. [Thing]
> 3. [Thing]
>
> Wrote the long version: [link]
>
> Disagree? I want to hear it — comments open."

### Case study → sales-enablement blurb

When the asset is a case study, route this to the sales channel:

> "New case study: [Client] — [headline outcome]. Use this with any prospect in [vertical] who's pushed back on [common objection]. The relevant page is [section anchor]. Link: [url]. Drop into [outbound sequence X] starting next week."

## What NOT to do

- Don't post the same caption verbatim across LinkedIn and X — the audiences are different and cross-platform copy-paste is read as lazy.
- Don't fire the founder's personal LinkedIn without an approval card unless the owner explicitly set that channel to `Auto`. The voice risk is too high.
- Don't schedule the newsletter slot without checking when the next send is — slotting a piece into a send that goes out in 6 hours blows the editorial cadence.
- Don't repurpose in week two if the asset underperformed in its own channel — that's throwing good content effort after bad. Update the `Patterns` row and move on.
- Don't pitch a thought-leadership post as sales-enablement. Account managers ignore it and it trains them to ignore the next case study too.
- Don't message the named guest / client without confirming they've seen the live URL — being tagged in a post they didn't know about is a relationship cost.
- Don't write to customer-owned Notion pages (OKRs, How We Work, Decision Log) from this skill. Distribution only writes to `Patterns`, `Agent Action Log`, and proposes actions — never edits strategy pages.
- Don't claim a number ("got 40k impressions") in the founder caption unless the engagement data is already in. Wait for the data; lying ages badly.
