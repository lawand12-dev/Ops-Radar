---
name: following-up-on-meetings
description: The recap-and-actions template for after every client or sales meeting. Encodes the 24-hour timing rule and the exact structure most agencies fumble — summary, decisions made, action items with owner + date, the next-step ask. Use when a client / sales / discovery call just ended, when a transcript or notes arrive from Fireflies / Loom / Notion, when the user asks "draft the follow-up for X", or when a meeting on the calendar passes without a recap sent within 24 hours. Returns the draft recap email + the owner-side action queue, not a free-form summary. Triggers — "summarize this call", "action items from meeting", "send follow-up to client", "meeting recap".
---

# Following Up On Meetings

*Did the meeting actually count if nobody wrote down who said yes to what?*

Most agencies leave the room nodding, then ship nothing for a week. The client forgets what was decided. The team forgets what was promised. The next meeting opens with "where did we land on…". Your job: close the loop in writing, within 24 hours, every time.

## When this triggers

- A calendar event with a client, prospect, or partner ended in the last 24 hours and no recap has been logged.
- A transcript from Fireflies / Loom / Notion / Granola arrived for a meeting tagged client-facing or sales.
- The user says "draft the follow-up for {client/prospect}", "send the recap", "what were the action items".
- A meeting was tagged Discovery, QBR, kickoff, scope change, or renewal — these ALWAYS get a written recap, no exceptions.
- The previous meeting in this thread had open action items and the next meeting is on the calendar within 7 days.

Do NOT trigger on internal-only meetings, standups, or 1:1s unless the user opts those in.

## What to do

1. **Identify the meeting.** Grab calendar title, attendees (with emails), date, duration. If you can't name the attendees, stop — ask the user.
2. **Pull the source of truth.** Transcript > recording timestamps > user-provided notes. If only verbal notes exist, ask the user to confirm the decisions before drafting.
3. **Extract three things and only three.**
   - **Decisions made** — what was agreed. Past tense. No "we discussed".
   - **Action items** — each one needs an owner (named person, not "the team") AND a date.
   - **Next step** — the single concrete ask of the client, plus what they should expect from you next.
4. **Draft the recap email** using the template below. Keep it under 200 words.
5. **Queue the owner-side actions** — anything where the action owner is on your team becomes a task with a due date in the project tool (ClickUp / Asana / Linear). Do not wait for the client to reply.
6. **Send within 24 hours.** The recap that arrives on day three is half as valuable. After 72 hours the client has already moved on.
7. **If the meeting was a sales / discovery call**, also log the recap + next step to the CRM deal record. The deal's "next step" field is the agency's pipeline truth.

## Conversation script

### The recap email (the default — send within 24 hours)

Subject: `Recap + next steps — {meeting_topic}, {date}`

```
Hey {first_name},

Thanks for the time today. Quick recap so we're aligned:

Decisions
- {decision_1}
- {decision_2}
- {decision_3}

Action items
- {owner_name} — {action} — by {date}
- {owner_name} — {action} — by {date}
- {owner_name} — {action} — by {date}

Next step
{the_one_specific_ask — e.g. "Send over the brand guidelines by Friday so
we can start on the homepage wireframes Monday."}

If I've misrepresented anything above, flag it today and I'll correct.
Otherwise we'll treat this as the record of what we agreed.

{owner_signature}
```

Rules for the recap:
- **Name names.** "Sarah will send the asset list" — not "the team will".
- **Dates, not adverbs.** "By Friday May 30" — not "soon" or "next week".
- **Decisions are past tense.** "We agreed to defer the blog redesign to Q3." If it isn't decided, it doesn't go in the Decisions block — it goes in Next step as an open question.
- **One next-step ask, not five.** If you ask the client for five things, you get zero.

### When the client goes quiet (re-engagement script — use 4 business days after the recap with no reply)

Subject: `Re: Recap + next steps — {meeting_topic}`

```
Hey {first_name},

Just bumping this — wanted to make sure the recap landed and that
{the_specific_ask} is still on track for {date}.

If timing slipped on your side, no problem — just let me know the new
date and we'll re-sequence on our end. If something else came up and
this isn't the priority right now, also fine to say so.

{owner_signature}
```

If still silent after the bump, escalate inside the account (their PM, their boss, whoever else was on the original thread) — do NOT send a third "just bumping" email. Three pings without a reply is a relationship signal, not a calendar problem.

## What NOT to do

- Don't send a recap longer than 200 words. Nobody reads it.
- Don't list action items without an owner — an unowned task is a task that doesn't happen.
- Don't list action items without a date — "ASAP" is not a date.
- Don't paste the full transcript. The recap IS the artifact; the transcript is the backup.
- Don't include "we discussed X" filler. Decisions, actions, next step. That's it.
- Don't wait for a perfect draft — a tight recap on day one beats a polished one on day three.
- Don't promise things in the recap that weren't actually agreed in the meeting. The recap is the record, not a wishlist.
- Don't skip the recap because "they were on the call too". The whole point is the written record both sides can search later.
- Don't send the recap from a no-reply or shared inbox — it goes from the account owner, by name.
