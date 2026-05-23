---
name: tuning-autonomy-policies
description: Decides which Composio toolkits should run in Ask, Auto, or Off mode for a given agency, and how to graduate a tool up the trust ladder over time. Use when the customer asks "should I auto-approve invoices", "the agent did X without asking", "how do I stop the agent from sending emails", "tune approval settings", "auto vs ask", or "how much should I let the agent do on its own". Returns a per-toolkit recommendation, not generic risk theory.

---

# Tuning Autonomy Policies

*"The agent just sent a follow-up to a client I was about to fire — how do I stop that without turning the whole thing off?"* That's the question this skill answers. Not "is automation safe in general," but "which switch in `/dashboard/settings/automation` do I flip, right now, for this exact toolkit."

## When this triggers

- Customer is opening `/dashboard/settings/automation` for the first time and doesn't know what defaults to pick.
- An action ran in Auto mode and the customer is upset, surprised, or asking how to claw it back.
- A queued action has been sitting in `/dashboard/actions` for days and the customer wants to know whether they can stop approving the obvious ones.
- The customer asks "should I trust the agent to send X" or "can I let it do Y on its own".
- A new toolkit was just connected (Gmail, Slack, HubSpot, Stripe) and the system needs to pick a default mode for it.
- Cron-agent volume crosses a threshold (e.g. >20 actions/week queued) and the manual approval load is the real bottleneck.

## What to do

1. **Start every new toolkit at Ask.** No exceptions. Even read-heavy tools get one or two write paths, and the only way to learn what the agent actually proposes is to watch it queue for a week. The default at provisioning is always Ask.

2. **Sort the toolkit into a safety category before picking a mode.** The categories below are non-negotiable — they map directly to what can never go to Auto.

   | Category | Examples | Floor mode |
   |---|---|---|
   | **Money-touching** | Stripe (charges, refunds, invoices, payouts), ad-budget changes in Meta/Google Ads, performance-fee calc writes | **Ask, always.** Never graduate. |
   | **Bulk operations** | Any single tool call that touches >100 records — CRM mass-update, mailing-list import, file moves | **Ask, with the >100-record rule enforced at the gate.** |
   | **Hard deletion** | HubSpot delete-contact, Mailchimp delete-subscriber, file deletes in Drive | **Ask, always.** Soft-delete or merge can graduate; hard delete cannot. |
   | **Client-facing writes** | Gmail send-to-client, Slack post in shared channel, portal updates, public-facing reports | **Ask until the agent has a clean 30-day track record on this exact action type.** |
   | **Internal housekeeping** | Notion page updates in the brain, Linear/ClickUp internal tasks, calendar drafts, internal Slack threads | **Auto-eligible after 14 days.** |

3. **Pick a recommended starting mode per toolkit by agency stage.**

   | Toolkit | Solo founder | 2–10 person agency | 10+ with ops lead |
   |---|---|---|---|
   | Gmail (client-facing) | Ask | Ask | Ask → Auto for follow-ups after 30 days clean |
   | Gmail (internal) | Ask | Auto | Auto |
   | Slack (DM / internal) | Auto | Auto | Auto |
   | Slack (client channel) | Ask | Ask | Ask |
   | Notion (brain writes) | Auto | Auto | Auto |
   | HubSpot (create / update) | Ask | Ask | Auto for non-bulk updates |
   | HubSpot (delete / merge) | Ask | Ask | Ask |
   | Stripe (any write) | Ask | Ask | Ask |
   | ClickUp / Linear (internal tasks) | Auto | Auto | Auto |
   | Calendar (drafts) | Auto | Auto | Auto |
   | Calendar (sends invite to client) | Ask | Ask | Auto for known recurring meeting types |
   | Ad platforms (budget / pause) | Off | Ask | Ask |

4. **Use the trust ladder, not a one-shot graduation.** A toolkit moves Ask → Auto only after: (a) at least 30 days of queued actions in that category, (b) the customer's approval rate on that category is above ~90%, (c) zero reverses or "undo this" in the last 14 days. If any of those break, drop back to Ask.

5. **Set the bulk + anomaly floor at the gate, not the policy.** Auto mode is not a free pass. Even in Auto, the approval gate enforces: writes touching >100 records, money movement, hard deletion, or anomalies above the customer's client-specific threshold get re-queued. The customer doesn't have to remember this — it's enforced.

6. **Use Off, not Ask, when the customer is unsure they want the integration at all.** Off returns an error to the model, which means the agent stops proposing those actions instead of cluttering the queue with rejects the customer will never approve. Reserve Off for "I don't want this capability yet," not "I want it but cautiously" — that's what Ask is for.

7. **Recover from a misfire in this order.** (a) Flip the offending toolkit to Off within the same screen. (b) Open `/dashboard/runs`, find the run, hit Reverse if the destination supports it (Gmail draft restore, HubSpot field revert from audit row, Notion page version). (c) Tell the affected client before they find it themselves — see script below. (d) Wait 14 days, then re-enable at Ask, not Auto. The trust ladder restarts from zero for that toolkit.

## Conversation script

For flipping a toolkit up the ladder (Ask → Auto), say to the team:

> "I'm flipping Gmail (internal threads only) to Auto starting Monday. The follow-up agent has been queueing drafts for 32 days, approval rate is 94%, and we haven't reversed one. Client-facing Gmail stays on Ask. If you see something land in a client inbox that you didn't write, page me — that means the classifier mis-sorted internal vs client and we drop back to Ask immediately."

For flipping it down after a misfire:

> "We had an Auto-mode misfire on HubSpot this morning — the deal-stage update agent moved 12 records into Closed Lost that shouldn't have. I've set HubSpot writes to Off through the weekend. I'll have the rollback done by EOD, and we'll come back at Ask on Monday. No customer-visible impact — these were internal stage fields."

For explaining the modes to a customer who's new to the dashboard:

> "Three modes per tool. Ask means the agent drafts the action and parks it in your queue — nothing happens until you approve. Auto means it runs immediately and logs to your runs view — use this for stuff that's reversible and you'd rubber-stamp anyway. Off means the agent can't touch this tool at all — use this when you don't want a capability yet, not when you're nervous. Default for every new tool is Ask. You graduate things one at a time."

For setting expectations on graduation cadence:

> "Don't flip everything to Auto in the first week. The point of Ask isn't to slow you down — it's to teach the agent what you'd actually approve. After 30 days of clean approvals on a category, we move that category to Auto. Money, deletion, and client-facing writes never graduate. The rest will."

## What NOT to do

- **Never put Stripe writes in Auto mode.** Charges, refunds, invoice issuance, payouts, and ad-budget changes are money-touching and stay on Ask permanently. There is no track record long enough to overcome the blast radius of an erroneous refund.
- **Never put hard-delete operations in Auto.** Soft-delete, archive, and merge can graduate. Hard delete (HubSpot delete-contact, file purge, subscriber removal) does not. The blast radius is irreversible and the rollback story is "restore from backup," which is not a story you want to tell a client.
- **Never graduate a toolkit while a related dispute or incident is open.** If a client is currently complaining about anything that toolkit touched, leave it on Ask. The trust ladder is paused by real-world heat, not just by the approval-rate math.
- **Never use Off as a long-term throttle.** Off hides the capability from the agent entirely, which means the agent stops proposing useful actions in that domain and the customer loses visibility into what they could be approving. If the customer wants the work but cautiously, that's Ask. Off is for "not yet."
- **Never skip the conversation when flipping modes.** If the customer's team uses the affected toolkit (Gmail, Slack, HubSpot), tell them before the flip lands. A surprise Auto-mode email from "the system" is worse than a slow approval queue, every time.
