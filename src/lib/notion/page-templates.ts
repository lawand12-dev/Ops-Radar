/**
 * Customer-owned strategic pages seeded under the OpsRadar Brain parent.
 *
 * These pages are created exactly ONCE on first Notion connect. They are
 * never overwritten by any agent — they are the customer's narrative
 * workspace (mission, OKRs, playbooks, how-we-work norms, meeting notes,
 * decision log). Agents READ them for personalization context but only
 * the customer writes to them.
 *
 * Why they matter: the Brain is supposed to be standalone-useful WITHOUT
 * our agents — these pages are what turn the 20 databases into a real
 * company operating system. They also become the personalization moat —
 * the "How We Work" page is read into every agent's system prompt at
 * runtime so the AI doesn't suggest things you've already decided against.
 *
 * Seed content uses block types supported by `BlockObjectRequest` in the
 * Notion SDK v5:
 *   - heading_1 / heading_2 / heading_3
 *   - paragraph
 *   - bulleted_list_item / numbered_list_item
 *   - callout
 *   - to_do
 *   - divider
 *   - quote
 *   - link_to_page
 *
 * NB: `child_database` is NOT a creatable block type — Notion synthesises
 * those from the page tree. To link the customer to a database we use
 * `link_to_page` with a `database_id`. To link to another page we use
 * `link_to_page` with a `page_id`.
 */

import type { Client } from '@notionhq/client'
import type { BlockObjectRequest } from '@notionhq/client'

// ─────────────────────────────────────────────────────────────────────────────
// Block builders — small helpers so the seed content reads like prose.
// ─────────────────────────────────────────────────────────────────────────────

function paragraph(text: string): BlockObjectRequest {
  return {
    type: 'paragraph',
    paragraph: {
      rich_text: text ? [{ type: 'text', text: { content: text } }] : [],
    },
  }
}

function h1(text: string): BlockObjectRequest {
  return {
    type: 'heading_1',
    heading_1: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

function h2(text: string): BlockObjectRequest {
  return {
    type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

function h3(text: string): BlockObjectRequest {
  return {
    type: 'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

function bullet(text: string): BlockObjectRequest {
  return {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  }
}

function todo(text: string, checked = false): BlockObjectRequest {
  return {
    type: 'to_do',
    to_do: {
      rich_text: [{ type: 'text', text: { content: text } }],
      checked,
    },
  }
}

function callout(text: string, emoji = '💡'): BlockObjectRequest {
  return {
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: text } }],
      icon: { type: 'emoji', emoji: emoji as never },
    },
  }
}

function divider(): BlockObjectRequest {
  return { type: 'divider', divider: {} }
}

function quote(text: string): BlockObjectRequest {
  return {
    type: 'quote',
    quote: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

/**
 * Create a child page under `parentPageId` with a title, icon, and seed body.
 * All template pages funnel through this helper to keep the signature uniform.
 */
async function createChildPage(
  notion: Client,
  parentPageId: string,
  args: { title: string; emoji: string; children: BlockObjectRequest[] },
): Promise<{ id: string }> {
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: args.emoji as never },
    properties: {
      title: { title: [{ type: 'text', text: { content: args.title } }] },
    },
    children: args.children,
  })
  return { id: page.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Company Overview — "About <Agency>"
// ─────────────────────────────────────────────────────────────────────────────

export async function createCompanyOverviewPage(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Company Overview',
    emoji: '🏛️',
    children: [
      callout(
        'This is the front door to your company. Keep it short and current — your AI ops team reads this to ground every recommendation.',
        '👋',
      ),
      h1('About us'),
      paragraph(
        '<One- or two-sentence elevator pitch. What do you do, for whom, and why does it matter?>',
      ),
      h2('Mission'),
      paragraph('<What change are you trying to create in the world?>'),
      h2('Services'),
      bullet('Service 1 — short description, typical engagement size, margin range'),
      bullet('Service 2 — short description, typical engagement size, margin range'),
      bullet('Service 3 — short description, typical engagement size, margin range'),
      h2('Team'),
      paragraph('Roster lives in the Team database. This is the high-level shape:'),
      bullet('Leadership: <names + roles>'),
      bullet('Delivery: <how big, how organised>'),
      bullet('Sales / partnerships: <who owns net-new>'),
      h2('Current focus'),
      paragraph(
        'What is the agency obsessed with this quarter? (e.g. "land 3 enterprise retainers", "ship 80% margin on web projects", "hire a head of delivery")',
      ),
      bullet('Focus #1'),
      bullet('Focus #2'),
      bullet('Focus #3'),
      divider(),
      paragraph(
        'Edit any of the above directly in Notion. Changes you save here will be reflected the next time an agent reasons about your agency.',
      ),
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) OKRs & Strategy
// ─────────────────────────────────────────────────────────────────────────────

export async function createOkrsPage(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'OKRs & Strategy',
    emoji: '🎯',
    children: [
      callout(
        'Quarterly objectives and the key results that prove you hit them. Your AI team uses this to prioritise — work that ladders up here gets surfaced first.',
        '🎯',
      ),
      h1('Q? 2026 — <theme>'),
      paragraph(
        'Pick a one-line theme for the quarter. Example: "Stabilise delivery and lift gross margin to 40%."',
      ),
      h2('Objective 1 — <short headline>'),
      paragraph('Why this objective matters and what success feels like.'),
      h3('Key results'),
      todo('KR 1.1 — <measurable target> by <date>'),
      todo('KR 1.2 — <measurable target> by <date>'),
      todo('KR 1.3 — <measurable target> by <date>'),
      h2('Objective 2 — <short headline>'),
      paragraph('Why this objective matters and what success feels like.'),
      h3('Key results'),
      todo('KR 2.1 — <measurable target> by <date>'),
      todo('KR 2.2 — <measurable target> by <date>'),
      h2('Objective 3 — <short headline>'),
      paragraph('Why this objective matters and what success feels like.'),
      h3('Key results'),
      todo('KR 3.1 — <measurable target> by <date>'),
      todo('KR 3.2 — <measurable target> by <date>'),
      divider(),
      h2('Last quarter — wins, misses, lessons'),
      bullet('What we shipped'),
      bullet('What we missed and why'),
      bullet('What we learned that changes how we plan next quarter'),
      divider(),
      paragraph(
        'Tip: re-read this page on the first Monday of each month and tick off the KRs you can claim. Your Briefing Agent will reference it in the Monday brief.',
      ),
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Playbooks — parent + 5 sub-pages
// ─────────────────────────────────────────────────────────────────────────────

export async function createPlaybooksPage(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  // Create the parent first so we can hang sub-pages off it.
  const parent = await createChildPage(notion, parentPageId, {
    title: 'Playbooks',
    emoji: '📘',
    children: [
      callout(
        'Your standard operating procedures. Each playbook captures how you want things done so new hires (and the AI ops team) follow the same rules.',
        '📘',
      ),
      paragraph(
        'Sub-pages will be created below. Edit them freely — the agents read them, but never overwrite them.',
      ),
    ],
  })

  // Sub-pages — sequential to respect Notion's ~3 req/sec rate limit.
  await createSalesPlaybook(notion, parent.id)
  await createDeliveryPlaybook(notion, parent.id)
  await createCollectionsPlaybook(notion, parent.id)
  await createHiringPlaybook(notion, parent.id)
  await createFiringAClientPlaybook(notion, parent.id)

  return parent
}

async function createSalesPlaybook(notion: Client, parentPageId: string): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Sales Playbook',
    emoji: '🎯',
    children: [
      h1('Sales Playbook'),
      paragraph('How a lead becomes a signed client. Edit this to match how you actually sell.'),
      h2('1. Inbound lead intake'),
      bullet('Where leads land (form, referral, partner) — assigned to <owner> within 1 business day'),
      bullet('Disqualify if: budget < $X / mo, industry not served, decision-maker not on first call'),
      h2('2. Discovery call'),
      bullet('Goal: confirm pain, budget, decision process, and timeline. ~30 min.'),
      bullet('Always-ask questions: <list 3-5 your team must ask>'),
      bullet('Output: BANT-style note in the Sales Pipeline DB'),
      h2('3. Proposal'),
      bullet('Sent within 3 business days of discovery'),
      bullet('Standard tiers: <Starter / Growth / Scale> — never custom-quote without leadership sign-off'),
      bullet('Discount ceiling: 15% (anything beyond → CEO approval)'),
      h2('4. Negotiation & close'),
      bullet('Standard payment terms: <e.g. net-15>, retainers billed monthly in advance'),
      bullet('Contract signed via <DocuSign / PandaDoc / etc.>'),
      bullet('Move stage to "Won" in Sales Pipeline DB the day the contract lands'),
      h2('5. Hand-off'),
      bullet('Kickoff scheduled within 5 business days of close'),
      bullet('Account owner (sales) introduces delivery lead and steps back'),
      divider(),
      callout(
        'When you change anything here, log it in the Decision Log so the team and the agents know why.',
        '🧠',
      ),
    ],
  })
}

async function createDeliveryPlaybook(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Delivery Playbook',
    emoji: '🚚',
    children: [
      h1('Delivery Playbook'),
      paragraph('From kickoff to launch to handoff. The cadence that keeps margin healthy.'),
      h2('Kickoff (week 1)'),
      bullet('Internal kickoff to set scope, hours budget, milestones — owner: PM'),
      bullet('Client kickoff: agree scope doc + communication norms (Slack channel, weekly check-ins)'),
      bullet('Set up project row in Projects DB with budget hours, deadline, assigned team'),
      h2('Mid-flight'),
      bullet('Weekly internal status: who is at risk, what slipped, what is the next milestone'),
      bullet('Hours logged daily, reviewed weekly — if budget burn ≥ 75% before 50% scope done, raise scope creep'),
      bullet('Change requests routed through written change-orders (no Slack-only "yes")'),
      h2('Launch'),
      bullet('QA gate: <internal checklist>'),
      bullet('Client UAT: 5 business days, signed-off in writing'),
      bullet('Launch retro within 1 week — log lessons in this playbook'),
      h2('Handoff'),
      bullet('Documented handover: credentials, runbook, support window'),
      bullet('Switch project to "Complete" in Projects DB and the client to "Active" retainer mode if applicable'),
      bullet('Send NPS survey via the Customer Support workflow'),
      divider(),
      callout(
        'Default web project buffer: 20%. If a quote ships without it, flag in the Decision Log.',
        '⚠️',
      ),
    ],
  })
}

async function createCollectionsPlaybook(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Collections Playbook',
    emoji: '💸',
    children: [
      h1('Collections Playbook'),
      paragraph(
        'When and how we chase overdue invoices. The Collections Agent uses these rules — edit them to fit your tolerance.',
      ),
      h2('Cadence'),
      bullet('Day +1 overdue: friendly nudge (email) — owner: AI agent (draft) → finance reviews'),
      bullet('Day +7: second nudge with payment link — auto-drafted, sent after human OK'),
      bullet('Day +14: phone call from account owner'),
      bullet('Day +21: written escalation to the client primary'),
      bullet('Day +30: pause delivery on active projects, CEO involved'),
      bullet('Day +60: send to collections / write off / mark "Chronic" in Clients DB'),
      h2('Tone'),
      bullet('Friendly for the first two touches, firm but professional after'),
      bullet('Never threaten — always offer a path (payment plan, refresh PO, etc.)'),
      h2('Exceptions'),
      bullet('Anchor clients (>$10K MRR) get a slower cadence and personal outreach first'),
      bullet('Recurring late payers move to "Sometimes late" / "Chronic" labels in Clients DB'),
      divider(),
      callout(
        'Hard rule: never pause delivery without CEO sign-off recorded in the Decision Log.',
        '🚫',
      ),
    ],
  })
}

async function createHiringPlaybook(notion: Client, parentPageId: string): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Hiring Playbook',
    emoji: '🧑‍💼',
    children: [
      h1('Hiring Playbook'),
      paragraph('When, where, and how we hire. Calibrated against our capacity model.'),
      h2('Triggers to hire'),
      bullet('Team utilization > 85% sustained for 4+ weeks → time to hire (see Team DB)'),
      bullet('Pipeline value ≥ 3× current monthly delivery capacity → hire one delivery role'),
      bullet('Specific role pain (e.g. no senior designer) — log a Recruiting row with "Why needed"'),
      h2('Where to source'),
      bullet('Tier 1: referrals from current team (highest signal, fastest)'),
      bullet('Tier 2: partner network + alumni'),
      bullet('Tier 3: LinkedIn job + targeted communities'),
      bullet('Tier 4: agency-of-record / recruiter (last resort, expensive)'),
      h2('Process'),
      bullet('Phone screen (30 min, hiring manager)'),
      bullet('Skills exercise (paid, 2-4 hrs)'),
      bullet('Panel interview (3 people, 60 min)'),
      bullet('Reference checks (always 2)'),
      bullet('Offer + 24 hr decision window'),
      h2('Compensation guardrails'),
      bullet('Pay in the 60–75th percentile for the market'),
      bullet('Equity / profit-share documented in the offer letter'),
      divider(),
      callout(
        'Never open a role you cannot fund for 12 months. Cross-check the Real P&L DB before posting.',
        '💰',
      ),
    ],
  })
}

async function createFiringAClientPlaybook(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Firing-a-Client Playbook',
    emoji: '👋',
    children: [
      h1('Firing-a-Client Playbook'),
      paragraph(
        'Hard but necessary. The Profitability Agent flags candidates — this page is the human script for the conversation.',
      ),
      h2('Triggers'),
      bullet('Margin < 20% for 2 consecutive quarters and no path to fix'),
      bullet('Chronic late payment (avg > 45 days), more than 2 nudge cycles per invoice'),
      bullet('Repeated scope creep / boundary-pushing (>3 incidents/6mo)'),
      bullet('Toxic to the team — measured by sustained negative meeting sentiment + after-hours pressure'),
      h2('Before the conversation'),
      bullet('Confirm the Profitability Agent calc by re-reading the client in the Real P&L DB'),
      bullet('Decide: graduate (rate increase + smaller scope) or off-board entirely'),
      bullet('Plan a transition window of 30–60 days so the client lands softly'),
      h2('Conversation script (draft)'),
      quote(
        '"<Client>, we have to be honest with you about where this engagement is. Over the last <X> quarters the work has come at a margin we cannot sustain without compromising the rest of our roster. We can either restructure to <new shape + price> or wind down in the next 60 days. Either is OK — what we will not do is keep going as we are."',
      ),
      h2('Off-boarding'),
      bullet('Written notice + 30-day support tail'),
      bullet('Hand back assets, credentials, and docs'),
      bullet('Final invoice + closeout retrospective'),
      bullet('Mark client "Churned" in Clients DB with a one-paragraph postmortem'),
      divider(),
      callout(
        'Always log the rationale in the Decision Log. The next time the same pattern shows up, you will be glad you wrote this down.',
        '🧠',
      ),
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Decision Log
// ─────────────────────────────────────────────────────────────────────────────

export async function createDecisionLogPage(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Decision Log',
    emoji: '🧠',
    children: [
      callout(
        'A running list of strategic decisions you have made — including ones you later changed your mind on. The AI ops team reads this so it does not pitch you ideas you have already considered and rejected.',
        '🧠',
      ),
      h1('How to log a decision'),
      paragraph(
        'Add a short entry below for any decision that changes how the agency operates: pricing, hiring, firing, vendor swaps, service line changes, big bets. Format:',
      ),
      bullet('Date — Decision — Why — Owner — Status (kept / changed mind)'),
      divider(),
      h2('Decisions'),
      bullet(
        'YYYY-MM-DD — Example: "Stop accepting one-off web projects under $25K" — Margin too thin, distracting from retainer book — CEO — kept',
      ),
      bullet(
        'YYYY-MM-DD — Example: "Move from Asana to Linear" — Team friction with task triage — Head of Delivery — kept',
      ),
      bullet(
        'YYYY-MM-DD — Example: "Drop SEO as a service line" — Could not hire the right lead, opportunity cost too high — CEO — changed mind 6 months later after hiring J.',
      ),
      divider(),
      paragraph(
        'Tip: link from agent action receipts that cite a decision here — it turns the log into the agency\'s long-term memory.',
      ),
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) How We Work — THE personalization moat
// ─────────────────────────────────────────────────────────────────────────────

export async function createHowWeWorkPage(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'How We Work',
    emoji: '⚙️',
    children: [
      callout(
        'The most important page in your Brain. Every agent reads this at runtime before it acts — so the AI ops team behaves like you would, not like a generic template.',
        '⚙️',
      ),
      paragraph(
        'Write down the rules of the road in plain English. Anything from "never discount more than 15%" to "Sarah approves all invoices > $5K" belongs here. Edit freely.',
      ),
      h1('Pricing & negotiation'),
      bullet('We never give discounts over 15% without CEO approval'),
      bullet('Web projects are always quoted with a 20% time buffer'),
      bullet('Retainers under $5K/mo are not worth the overhead — politely decline'),
      h1('Client comms'),
      bullet('All client communication happens in shared Slack channels, never DMs'),
      bullet('Response SLA: 4 business hours during the day, 24 hours overnight'),
      bullet('Weekly written status note every Friday by 5pm local'),
      h1('Approvals'),
      bullet('Sarah approves all invoices over $5K before they go out'),
      bullet('Any scope change > 8 hours needs a written change-order, not a Slack thumbs-up'),
      bullet('Hiring decisions: hiring manager + one peer interviewer + CEO sign-off'),
      h1('Margin & client portfolio'),
      bullet('We fire below-20% margin clients after 2 quarters if there is no path to fix'),
      bullet('No single client > 25% of revenue — concentration risk'),
      bullet('Pause delivery for clients with payments overdue > 30 days (after CEO sign-off)'),
      h1('Team & culture'),
      bullet('Default to async (Slack, Loom) — meetings only when async fails'),
      bullet('Friday afternoons are no-meeting blocks for deep work'),
      bullet('No after-hours Slack expectations — anything urgent goes by phone'),
      h1('Tools & ops'),
      bullet('Source of truth for project status: this Brain (Projects DB)'),
      bullet('Time tracking is logged daily, not weekly'),
      bullet('Vendor or tool swap > $100/mo requires a quick written rationale in the Decision Log'),
      divider(),
      paragraph(
        'Add as many rules as you want. The more specific, the more the AI ops team mirrors how you actually run the agency.',
      ),
    ],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Meeting Notes — parent with templates for recurring meetings
// ─────────────────────────────────────────────────────────────────────────────

export async function createMeetingNotesPage(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  const parent = await createChildPage(notion, parentPageId, {
    title: 'Meeting Notes',
    emoji: '📝',
    children: [
      callout(
        'A home for the notes from every recurring meeting. Sub-pages below are templates — duplicate them each week so the agency builds a memory of conversations, not just metrics.',
        '📝',
      ),
      paragraph(
        'When the Briefing Agent writes a Monday brief, it can quote recent meeting notes — so the more you capture here, the smarter the brief gets.',
      ),
    ],
  })

  await createMondayStandupTemplate(notion, parent.id)
  await createLeadershipReviewTemplate(notion, parent.id)
  await createClientQbrTemplate(notion, parent.id)

  return parent
}

async function createMondayStandupTemplate(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Monday Standup — template',
    emoji: '☕',
    children: [
      h1('Monday Standup — <YYYY-MM-DD>'),
      paragraph('Attendees: <names>'),
      h2('Wins last week'),
      bullet('<…>'),
      h2('Misses last week'),
      bullet('<…>'),
      h2('Top 3 priorities this week'),
      todo('Priority 1 — owner — done-by'),
      todo('Priority 2 — owner — done-by'),
      todo('Priority 3 — owner — done-by'),
      h2('Blockers / asks'),
      bullet('<…>'),
      h2('Mood check'),
      paragraph('Green / yellow / red — one word per attendee.'),
    ],
  })
}

async function createLeadershipReviewTemplate(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Leadership Review — template',
    emoji: '🧭',
    children: [
      h1('Leadership Review — <month>'),
      paragraph('Cadence: monthly. Attendees: leadership team.'),
      h2('KPI walk'),
      bullet('MRR + delta vs last month'),
      bullet('Cash collected + AR aging'),
      bullet('Gross + net margin'),
      bullet('Team utilization + burnout signals'),
      h2('OKR progress'),
      paragraph('Walk every key result — green / yellow / red, with one-line evidence.'),
      h2('Risks (from Risk Register)'),
      bullet('Critical risks open + owners'),
      bullet('Risks closed since last review — what we learned'),
      h2('Decisions this month'),
      bullet('Log each one in the Decision Log'),
      h2('Top 3 things to do before next review'),
      todo('Action 1 — owner — done-by'),
      todo('Action 2 — owner — done-by'),
      todo('Action 3 — owner — done-by'),
    ],
  })
}

async function createClientQbrTemplate(
  notion: Client,
  parentPageId: string,
): Promise<{ id: string }> {
  return createChildPage(notion, parentPageId, {
    title: 'Client QBR — template',
    emoji: '🤝',
    children: [
      h1('Client QBR — <client name> — <quarter>'),
      paragraph('Quarterly business review with the client. ~60 min.'),
      h2('Wins this quarter'),
      bullet('<…>'),
      h2('What is on track'),
      bullet('<…>'),
      h2('What is off track + recovery plan'),
      bullet('<…>'),
      h2('Next quarter — proposal'),
      bullet('Scope changes'),
      bullet('New initiatives'),
      bullet('Investment asks'),
      h2('Renewal / expansion signal'),
      paragraph('Strong / mixed / at-risk — and the one thing that would change it.'),
      h2('Action items'),
      todo('Action 1 — owner — done-by'),
      todo('Action 2 — owner — done-by'),
    ],
  })
}
