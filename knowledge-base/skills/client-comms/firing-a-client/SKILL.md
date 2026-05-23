---
name: firing-a-client
description: When and how to fire an agency client. Most agency founders avoid this conversation for 6+ months past where they should. Includes the 4 fire criteria, the off-boarding SOP, the legal/IP cleanup, and the exact conversation script. Use ONLY when the user has explicitly considered firing or when a client meets all 4 fire criteria. Returns the script + a 30-day off-boarding plan.
---

# Firing a Client

This is the highest-stakes agency conversation. Most founders avoid it. Your job: arm them with the words AND make sure all 4 fire criteria are actually met before recommending.

## The 4 fire criteria (ALL must be true)

1. **Margin**: effective hourly rate < 0.6× floor for 60+ consecutive days
2. **Conversation attempted**: owner has tried scope refresh AND/OR price raise in past 6 months — rejected or ignored
3. **Behavior**: at least one of [late-paying repeatedly, abusive to team, demands beyond SOW with no compensation, unwilling to follow agreed processes]
4. **Capacity replacement**: the agency has pipeline or roster to backfill within 90 days — OR the cash hit is survivable per `projecting-cash-runway`

If only 3 of 4 are true, recommend an alternative path (reprice, scope reduction, account-manager change). Do not recommend firing.

## The decision framework

Before firing, the agent should help the owner answer:

| Question | If "yes" |
|---|---|
| Does losing this revenue drop us below 6 months runway? | Don't fire — focus on the reprice path |
| Is this our biggest client (> 25% of MRR)? | Don't fire today — fire in stages over 6+ months |
| Did we recently raise their price or refuse a request? | Wait 30 days — let the dust settle |
| Is the agency owner in personal crisis (health, family)? | Wait — defer the conversation |

Run all four checks before queueing the fire conversation.

## The off-boarding SOP (30-day glide path)

Default: 30 days notice. Shorter if behavior justifies (abuse, fraud). Longer never.

| Day | Action |
|---|---|
| 0 | Internal: owner + ops align. Notion: open off-boarding checklist. Pause non-essential work. |
| 1 | The conversation (script below). Send written confirmation within 24 hours. |
| 1–7 | Internal: inventory deliverables — what's complete, what's in flight, what gets handed off. |
| 7 | Sent to client: written transition plan. List of files, credentials, ownership. |
| 14 | Final invoice for any uncollected work. |
| 21 | Knowledge transfer call (if relationship survives). Or send transition packet (if it doesn't). |
| 28 | All credentials/passwords/files transferred. Final relationship check. |
| 30 | Contract ends. Final email. Update Notion `Clients` DB to `inactive`. |

## The conversation script (delivered live, not by email)

ALWAYS deliver firing in person or via video call. Never email-only. The owner owes this to the relationship.

```
[Open]
"{first_name}, I want to have a difficult conversation. I've been
thinking about our work together a lot — and I've decided we're not the
right agency for you moving forward.

[The honest reason — pick one and own it]
- "The scope of what you need has grown beyond what our retainer covers,
  and we haven't been able to align on a path that works for both of us."
- "There have been a few moments in the last quarter where our teams
  haven't been able to deliver to your expectations — and I take that
  responsibility. I think you deserve a partner that fits the way you
  want to work."
- "Our agency is moving toward {specialty}, and I want to be honest:
  the work you need is no longer in our core."

[The plan]
"What I'd like to propose is a 30-day transition. We'll wrap up
{specific_in_flight_work}, transfer everything you need to a new
partner, and I'll personally help you scope what to look for. I'd
rather end this well than leave you in a bind.

[The close]
"I know this is hard to hear. I want this to be a good ending for both
of us. What questions do you have?"
```

Notes:
- NEVER blame the client directly in the script. Even if true. The point is the cleanest possible exit.
- NEVER offer to "stay if X" — that's the reprice conversation, not the fire conversation.
- DO offer the transition help. Most clients accept it. It's worth the goodwill.

## IP / legal cleanup

The agent surfaces these as a checklist for the owner to confirm:

- [ ] Final invoice issued and paid (use `chasing-overdue-invoices` cadence if needed)
- [ ] All work-product files transferred (Google Drive shared, Notion exported, Figma transferred)
- [ ] Credentials revoked from agency accounts (HubSpot, Mailchimp, ad platforms, Slack)
- [ ] Brand assets returned or licensed per contract
- [ ] NDAs / confidentiality reaffirmed in writing
- [ ] No outstanding unbilled hours — invoice all logged work
- [ ] Update HubSpot status to `Lost - Off-boarded`, set Reason field
- [ ] Send Notion `Clients` row to `inactive` status
- [ ] Internal: post-mortem in 14 days — what did we learn?

## When to NOT recommend firing — alternatives

| Situation | Alternative |
|---|---|
| Effective rate is 0.7× floor but client has been good | Reprice (see `raising-retainer-prices`) |
| Behavior is poor but margin is fine | Account-manager switch — protect the team |
| Scope has grown but client is willing to expand budget | Scope refresh conversation |
| Client is paying on time and respectful but margin slid | Tighten scope back to original SOW |
| Owner is anxious but criteria not met | Wait. Reassess in 30 days. |

## Cross-references

- `projecting-cash-runway` — the survivability check
- `calculating-effective-hourly-rate` — the trigger metric
- `raising-retainer-prices` — the conversation to try first
- `detecting-scope-creep` — the alternative if scope is the driver
- `chasing-overdue-invoices` — for the final-invoice phase

## What NOT to do

- Don't recommend firing in the daily briefing — only as a direct response when owner has explicitly considered it.
- Don't recommend firing without confirming all 4 criteria met.
- Don't recommend firing during the owner's personal/business crisis.
- Don't recommend firing the client they care most about emotionally without 60 days of cool-down.
- Don't propose the fire conversation by email; always live channel.
