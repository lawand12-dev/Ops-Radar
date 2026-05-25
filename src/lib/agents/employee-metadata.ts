/**
 * Display metadata for the 28 built-in agents (CP-34).
 *
 * Promotes each agent slug from `registry.ts` into a named "AI employee" with
 * a friendly identity customers can chat with like a teammate.
 *
 * Conventions:
 *  - Domain agents + evaluator get a human first name + role.
 *  - Tool agents get a role-based title only (no human name).
 *  - Bios are plain-spoken, one sentence, under 80 chars.
 */

export type EmployeeDisplayMetadata = {
  name: string // first name only (domain agents) OR role title (tool agents)
  role: string // "Revenue Analyst", "Stripe Specialist", etc.
  emoji: string // single emoji
  bio: string // 1 sentence, < 80 chars, friendly, says what they do
}

export const BUILT_IN_EMPLOYEE_METADATA: Record<string, EmployeeDisplayMetadata> = {
  // Domain agents — human first names
  revenue: { name: 'Riley', role: 'Revenue Analyst', emoji: '💰', bio: 'Watches MRR, cash collected, and overdue invoices every morning.' },
  collections: { name: 'Cole', role: 'Collections Lead', emoji: '📨', bio: 'Chases overdue invoices with the right nudge at the right time.' },
  scope: { name: 'Scott', role: 'Scope Watchdog', emoji: '📐', bio: 'Flags scope creep before it eats a client retainer.' },
  delivery: { name: 'Devon', role: 'Delivery Manager', emoji: '🚚', bio: 'Tracks project health and surfaces stuck work daily.' },
  briefing: { name: 'Brian', role: 'Daily Briefer', emoji: '📰', bio: 'Writes your morning COO briefing of what changed overnight.' },
  profitability: { name: 'Penny', role: 'Profitability Analyst', emoji: '📊', bio: 'Calculates per-client margin and flags money-losing accounts.' },
  team: { name: 'Tia', role: 'Team Lead', emoji: '👥', bio: 'Monitors burnout, utilization, and capacity across the team.' },
  growth: { name: 'Grace', role: 'Growth Strategist', emoji: '📈', bio: 'Tracks pipeline and marketing funnel health every Monday.' },
  renewal: { name: 'Renee', role: 'Renewals Lead', emoji: '🔁', bio: 'Watches contract expiries and flags renewals at risk.' },
  stack: { name: 'Sam', role: 'Stack Auditor', emoji: '🧰', bio: 'Audits your software stack monthly for waste and overlap.' },

  // Tool agents — role-based titles only
  'tool-gmail': { name: 'Gmail Specialist', role: 'Gmail Specialist', emoji: '✉️', bio: 'Watches inboxes, drafts replies, and routes important threads.' },
  'tool-hubspot': { name: 'HubSpot Specialist', role: 'HubSpot Specialist', emoji: '🧡', bio: 'Keeps the HubSpot CRM clean and surfaces deal movement.' },
  'tool-pipedrive': { name: 'Pipedrive Specialist', role: 'Pipedrive Specialist', emoji: '🟢', bio: 'Tracks pipeline stages and stale deals inside Pipedrive.' },
  'tool-apollo': { name: 'Apollo Specialist', role: 'Apollo Specialist', emoji: '🚀', bio: 'Sources prospects and watches outbound sequence performance.' },
  'tool-calendly': { name: 'Calendly Specialist', role: 'Calendly Specialist', emoji: '📅', bio: 'Tracks meeting bookings, no-shows, and scheduling friction.' },
  'tool-clickup': { name: 'ClickUp Specialist', role: 'ClickUp Specialist', emoji: '🟣', bio: 'Watches ClickUp tasks, due dates, and project status.' },
  'tool-asana': { name: 'Asana Specialist', role: 'Asana Specialist', emoji: '🔺', bio: 'Tracks Asana projects, blockers, and overdue work.' },
  'tool-monday': { name: 'Monday Specialist', role: 'Monday Specialist', emoji: '🗓️', bio: 'Keeps Monday.com boards aligned with delivery reality.' },
  'tool-harvest': { name: 'Harvest Specialist', role: 'Harvest Specialist', emoji: '⏱️', bio: 'Watches logged hours, budgets, and timesheet gaps in Harvest.' },
  'tool-toggl': { name: 'Toggl Specialist', role: 'Toggl Specialist', emoji: '🟥', bio: 'Tracks Toggl time entries and missing logs across the team.' },
  'tool-notion': { name: 'Notion Specialist', role: 'Notion Specialist', emoji: '📓', bio: 'Maintains your Notion brain — docs, databases, and updates.' },
  'tool-slack': { name: 'Slack Specialist', role: 'Slack Specialist', emoji: '💬', bio: 'Posts updates, summarizes channels, and watches client threads.' },
  'tool-stripe': { name: 'Stripe Specialist', role: 'Stripe Specialist', emoji: '💳', bio: 'Watches charges, subscriptions, and failed payments in Stripe.' },
  'tool-quickbooks': { name: 'QuickBooks Specialist', role: 'QuickBooks Specialist', emoji: '📒', bio: 'Reconciles books and watches expenses inside QuickBooks.' },
  'tool-google-calendar': { name: 'Google Calendar Specialist', role: 'Google Calendar Specialist', emoji: '🗓️', bio: 'Manages meetings, scheduling, and calendar conflicts.' },
  'tool-google-analytics': { name: 'Analytics Specialist', role: 'Google Analytics Specialist', emoji: '📉', bio: 'Tracks site traffic, conversions, and acquisition channels.' },
  'tool-google-ads': { name: 'Ads Specialist', role: 'Google Ads Specialist', emoji: '🎯', bio: 'Watches ad spend, CPA, and campaign performance in Google Ads.' },
  'tool-linkedin': { name: 'LinkedIn Specialist', role: 'LinkedIn Specialist', emoji: '🔗', bio: 'Tracks LinkedIn outreach, posts, and engagement signals.' },
  'tool-bamboo-hr': { name: 'BambooHR Specialist', role: 'BambooHR Specialist', emoji: '🎍', bio: 'Watches PTO, headcount, and HR records in BambooHR.' },
  'tool-gusto': { name: 'Gusto Specialist', role: 'Gusto Specialist', emoji: '🧾', bio: 'Tracks payroll runs, taxes, and benefits inside Gusto.' },
  'tool-typeform': { name: 'Typeform Specialist', role: 'Typeform Specialist', emoji: '📝', bio: 'Watches form submissions and routes new leads downstream.' },
  'tool-intercom': { name: 'Intercom Specialist', role: 'Intercom Specialist', emoji: '💭', bio: 'Watches Intercom conversations and tracks response times.' },
  'tool-zendesk': { name: 'Zendesk Specialist', role: 'Zendesk Specialist', emoji: '🎫', bio: 'Tracks Zendesk tickets, SLAs, and customer escalations.' },

  // Meta agents — human first name
  evaluator: { name: 'Evan', role: 'Quality Evaluator', emoji: '🧐', bio: 'Reviews every other agent’s proposed actions for quality daily.' },
}
