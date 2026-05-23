/**
 * One-time provisioner: creates the "OpsRadar Brain" parent page and all 20 child databases
 * inside the customer's Notion workspace.
 *
 * Called from /api/notion/callback after OAuth completes.
 * Returns the slug → database_id map for persistence in notion_workspaces.databases.
 *
 * Implementation note: each database schema must match docs/dev/notion-brain-schema-2026.md EXACTLY.
 * Column names and select option labels are referenced by agent prompts and helpers — do not drift.
 *
 * Modeling judgment calls (documented for spec ambiguities):
 *  - Spec "Formula" columns are created as `number` (or `date` where the formula is date-arithmetic).
 *    Notion's API can't easily create computed formulas without referencing other properties by id,
 *    and agents already compute these values upstream — so we store the computed result instead.
 *  - Spec "Relation → X" columns are created as `rich_text` holding the related entity's name/title.
 *    True Notion relations require the target database id to exist at create time and a follow-up
 *    update pass; out of scope for this provisioner. Agents write the human-readable name; the
 *    customer can promote it to a real relation in Notion's UI if desired.
 *  - Multi-select columns without spec'd options ship with an empty options array; Notion auto-
 *    creates option labels on first write.
 */

import { Client } from '@notionhq/client'
import { type NotionDatabasesMap, type NotionDatabaseSlug } from './schema-keys'

/**
 * Slugs of databases that have implemented schemas. The OAuth callback iterates these
 * on first connect. With all 20 schemas implemented, this list mirrors NOTION_DATABASE_SLUGS.
 * Keep this list in sync with the dispatch switch in createDatabase().
 */
const IMPLEMENTED_DATABASE_SLUGS: readonly NotionDatabaseSlug[] = [
  'clients',
  'kpi_snapshots',
  'projects',
  'team',
  'sales_pipeline',
  'invoices',
  'real_pnl',
  'marketing_performance',
  'client_communication',
  'team_communication',
  'support_tickets',
  'contracts_legal',
  'tool_stack',
  'meeting_load',
  'recruiting',
  'growth_referrals',
  'pattern_cards',
  'risk_register',
  'action_log',
  'weekly_briefings',
] as const

export async function createBrainParentPage(
  notion: Client,
  _workspaceId: string,
): Promise<{ id: string }> {
  const page = await notion.pages.create({
    parent: { type: 'workspace', workspace: true },
    properties: {
      title: {
        title: [{ text: { content: 'OpsRadar Brain' } }],
      },
    },
  })
  return { id: page.id }
}

/**
 * Sequentially creates all 20 Brain databases. Sequential (not parallel) to stay under
 * Notion's 3 req/sec rate limit and to keep error reporting linear.
 */
export async function createAllDatabases(
  notion: Client,
  parentPageId: string,
): Promise<NotionDatabasesMap> {
  const created: NotionDatabasesMap = {}
  for (const slug of IMPLEMENTED_DATABASE_SLUGS) {
    created[slug] = await createDatabase(notion, parentPageId, slug)
  }
  return created
}

async function createDatabase(
  notion: Client,
  parentPageId: string,
  slug: NotionDatabaseSlug,
): Promise<string> {
  switch (slug) {
    case 'clients':
      return createClientsDatabase(notion, parentPageId)
    case 'kpi_snapshots':
      return createKpiSnapshotsDatabase(notion, parentPageId)
    case 'projects':
      return createProjectsDatabase(notion, parentPageId)
    case 'team':
      return createTeamDatabase(notion, parentPageId)
    case 'sales_pipeline':
      return createSalesPipelineDatabase(notion, parentPageId)
    case 'invoices':
      return createInvoicesDatabase(notion, parentPageId)
    case 'real_pnl':
      return createRealPnlDatabase(notion, parentPageId)
    case 'marketing_performance':
      return createMarketingPerformanceDatabase(notion, parentPageId)
    case 'client_communication':
      return createClientCommunicationDatabase(notion, parentPageId)
    case 'team_communication':
      return createTeamCommunicationDatabase(notion, parentPageId)
    case 'support_tickets':
      return createSupportTicketsDatabase(notion, parentPageId)
    case 'contracts_legal':
      return createContractsLegalDatabase(notion, parentPageId)
    case 'tool_stack':
      return createToolStackDatabase(notion, parentPageId)
    case 'meeting_load':
      return createMeetingLoadDatabase(notion, parentPageId)
    case 'recruiting':
      return createRecruitingDatabase(notion, parentPageId)
    case 'growth_referrals':
      return createGrowthReferralsDatabase(notion, parentPageId)
    case 'pattern_cards':
      return createPatternCardsDatabase(notion, parentPageId)
    case 'risk_register':
      return createRiskRegisterDatabase(notion, parentPageId)
    case 'action_log':
      return createActionLogDatabase(notion, parentPageId)
    case 'weekly_briefings':
      return createWeeklyBriefingsDatabase(notion, parentPageId)
    default: {
      // Exhaustiveness guard — if a new slug is added to NotionDatabaseSlug
      // without a case here, this assignment fails at compile time.
      const _exhaustive: never = slug
      throw new Error(`Database schema for slug "${_exhaustive}" not implemented`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database schemas (spec: docs/dev/notion-brain-schema-2026.md)
// Property names, types, and select options are referenced by agent prompts and helpers.
// Do NOT drift from the spec.
// ─────────────────────────────────────────────────────────────────────────────

async function createClientsDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🏢' },
    title: [{ type: 'text', text: { content: 'Clients' } }],
    initial_data_source: {
      properties: {
        'Client name': { title: {} },
        'Status': {
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'At-risk', color: 'yellow' },
              { name: 'Churned', color: 'red' },
              { name: 'Prospect', color: 'blue' },
            ],
          },
        },
        'Monthly retainer value': { number: { format: 'dollar' } },
        'Contract start date': { date: {} },
        'Contract end date': { date: {} },
        'Service type': {
          multi_select: {
            options: [
              { name: 'SEO' },
              { name: 'Paid' },
              { name: 'Social' },
              { name: 'Web' },
              { name: 'PR' },
            ],
          },
        },
        'Monthly hours budget': { number: {} },
        'Avg hours logged/mo': { number: {} },
        'Actual margin %': { number: { format: 'percent' } },
        'Margin status': {
          select: {
            options: [
              { name: 'Healthy', color: 'green' },
              { name: 'Warning', color: 'yellow' },
              { name: 'Critical', color: 'red' },
            ],
          },
        },
        'Payment behaviour': {
          select: {
            options: [
              { name: 'Always on time', color: 'green' },
              { name: 'Sometimes late', color: 'yellow' },
              { name: 'Chronic', color: 'red' },
            ],
          },
        },
        'Avg days to pay': { number: {} },
        'Scope creep incidents (6mo)': { number: {} },
        'Churn risk score': { number: {} },
        'Lifetime value': { number: { format: 'dollar' } },
        'Difficulty score': { number: {} },
        'NPS score': { number: {} },
        'Days since last contact': { number: {} },
        'Ghost risk': { checkbox: {} },
        'Last COO review': { date: {} },
        'Notes': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createKpiSnapshotsDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📈' },
    title: [{ type: 'text', text: { content: 'Weekly KPI Snapshots' } }],
    initial_data_source: {
      properties: {
        'Week ending': { title: {} },
        'MRR': { number: { format: 'dollar' } },
        'Cash collected MTD': { number: { format: 'dollar' } },
        'Outstanding invoices': { number: { format: 'dollar' } },
        'Overdue invoices (30d+)': { number: { format: 'dollar' } },
        'Total clients': { number: {} },
        'Active clients': { number: {} },
        'Avg margin %': { number: { format: 'percent' } },
        'Team utilization %': { number: { format: 'percent' } },
        'Hours logged total': { number: {} },
        'Billable hours %': { number: { format: 'percent' } },
        'New deals closed': { number: {} },
        'Pipeline value': { number: { format: 'dollar' } },
        'Churn this week': { number: {} },
        'Net revenue change': { number: { format: 'dollar' } },
        'Net margin %': { number: { format: 'percent' } },
        'Gross profit': { number: { format: 'dollar' } },
        'Agent summary': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createProjectsDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📦' },
    title: [{ type: 'text', text: { content: 'Projects' } }],
    initial_data_source: {
      properties: {
        'Project name': { title: {} },
        // Spec: Relation → Clients. Modeled as rich_text (see header note).
        'Client': { rich_text: {} },
        'Status': {
          select: {
            options: [
              { name: 'On track', color: 'green' },
              { name: 'At risk', color: 'yellow' },
              { name: 'Delayed', color: 'orange' },
              { name: 'Complete', color: 'gray' },
            ],
          },
        },
        'Budget hours': { number: {} },
        'Hours logged': { number: {} },
        // Spec: Formula (Budget - logged). Stored as number (agent-computed).
        'Hours remaining': { number: {} },
        '% complete': { number: { format: 'percent' } },
        'Start date': { date: {} },
        'Deadline': { date: {} },
        // Spec: Formula (If past deadline). Stored as number (days).
        'Days overdue': { number: {} },
        'Scope change count': { number: {} },
        'Scope change value': { number: { format: 'dollar' } },
        'Assigned team': { multi_select: { options: [] } },
        'Profitability': {
          select: {
            options: [
              { name: 'Profitable', color: 'green' },
              { name: 'Break-even', color: 'yellow' },
              { name: 'Loss', color: 'red' },
            ],
          },
        },
        'Last agent check': { date: {} },
        'Risk flag': { checkbox: {} },
        'Risk reason': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createTeamDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '👥' },
    title: [{ type: 'text', text: { content: 'Team' } }],
    initial_data_source: {
      properties: {
        'Name': { title: {} },
        'Role': {
          select: {
            options: [
              { name: 'Designer' },
              { name: 'Dev' },
              { name: 'Strategist' },
              { name: 'PM' },
              { name: 'Copywriter' },
            ],
          },
        },
        'Monthly capacity hours': { number: {} },
        'Hours logged this month': { number: {} },
        // Spec: Formula (Logged / capacity). Stored as number (agent-computed).
        'Utilization %': { number: { format: 'percent' } },
        'Utilization status': {
          select: {
            options: [
              { name: 'Underloaded', color: 'blue' },
              { name: 'Healthy', color: 'green' },
              { name: 'Overloaded', color: 'red' },
            ],
          },
        },
        'Active projects': { number: {} },
        'Billable rate': { number: { format: 'dollar' } },
        'Avg overtime hrs/mo': { number: {} },
        'Burnout risk': {
          select: {
            options: [
              { name: 'Low', color: 'green' },
              { name: 'Medium', color: 'yellow' },
              { name: 'High', color: 'red' },
            ],
          },
        },
        'After-hours Slack %': { number: { format: 'percent' } },
        'Meetings per week': { number: {} },
        'Deep work hrs/week': { number: {} },
        'PTO days remaining': { number: {} },
        'Last 3mo trend': {
          select: {
            options: [
              { name: 'Improving', color: 'green' },
              { name: 'Stable', color: 'gray' },
              { name: 'Declining', color: 'red' },
            ],
          },
        },
        'Notes': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createSalesPipelineDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🎯' },
    title: [{ type: 'text', text: { content: 'Sales Pipeline' } }],
    initial_data_source: {
      properties: {
        'Deal name': { title: {} },
        'Company': { rich_text: {} },
        'Stage': {
          select: {
            options: [
              { name: 'Lead', color: 'gray' },
              { name: 'Qualified', color: 'blue' },
              { name: 'Proposal', color: 'purple' },
              { name: 'Negotiation', color: 'yellow' },
              { name: 'Won', color: 'green' },
              { name: 'Lost', color: 'red' },
            ],
          },
        },
        'Deal value (MRR)': { number: { format: 'dollar' } },
        'Close probability %': { number: { format: 'percent' } },
        'Expected close date': { date: {} },
        // Spec: Formula (velocity). Stored as number.
        'Days in current stage': { number: {} },
        'Lead source': {
          select: {
            options: [
              { name: 'Referral', color: 'green' },
              { name: 'Cold', color: 'gray' },
              { name: 'Inbound', color: 'blue' },
              { name: 'Partner', color: 'purple' },
            ],
          },
        },
        'Service type': { multi_select: { options: [] } },
        'Next action': { rich_text: {} },
        'Last activity': { date: {} },
        'Stale flag': { checkbox: {} },
      },
    },
  })
  return db.id
}

async function createInvoicesDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '💸' },
    title: [{ type: 'text', text: { content: 'Invoice Tracker' } }],
    initial_data_source: {
      properties: {
        'Invoice ID': { title: {} },
        // Spec: Relation → Clients. Modeled as rich_text.
        'Client': { rich_text: {} },
        'Amount': { number: { format: 'dollar' } },
        'Issue date': { date: {} },
        'Due date': { date: {} },
        'Status': {
          select: {
            options: [
              { name: 'Draft', color: 'gray' },
              { name: 'Sent', color: 'blue' },
              { name: 'Paid', color: 'green' },
              { name: 'Overdue', color: 'red' },
              { name: 'Written-off', color: 'default' },
            ],
          },
        },
        // Spec: Formula. Stored as number.
        'Days overdue': { number: {} },
        'Follow-up count': { number: {} },
        'Last follow-up': { date: {} },
        'Paid date': { date: {} },
        'Collections agent action': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createRealPnlDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '💰' },
    title: [{ type: 'text', text: { content: 'Real P&L' } }],
    initial_data_source: {
      properties: {
        // 'Month' is spec'd as Date. Notion requires a title column on every database;
        // we promote 'Month' to the title so each row's primary label is the month period.
        'Month': { title: {} },
        'Total revenue': { number: { format: 'dollar' } },
        'Total expenses': { number: { format: 'dollar' } },
        'Payroll cost': { number: { format: 'dollar' } },
        'Contractor payments': { number: { format: 'dollar' } },
        'Software costs': { number: { format: 'dollar' } },
        'Office/overhead': { number: { format: 'dollar' } },
        // Spec: Formula (Revenue - expenses). Stored as number.
        'Gross profit': { number: { format: 'dollar' } },
        'Gross margin %': { number: { format: 'percent' } },
        'Net profit': { number: { format: 'dollar' } },
        'Net margin %': { number: { format: 'percent' } },
        'vs last month': { number: { format: 'dollar' } },
        'vs target': { number: { format: 'dollar' } },
        'Agent summary': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createMarketingPerformanceDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📈' },
    title: [{ type: 'text', text: { content: 'Marketing Performance' } }],
    initial_data_source: {
      properties: {
        // 'Week' is the spec's first column (Date). Promoted to title for the same
        // reason as Real P&L's Month column.
        'Week': { title: {} },
        'Website sessions': { number: {} },
        'Leads generated': { number: {} },
        'Lead-to-client conversion %': { number: { format: 'percent' } },
        'Google Ads spend': { number: { format: 'dollar' } },
        'Google Ads ROAS': { number: {} },
        'Meta Ads spend': { number: { format: 'dollar' } },
        'Meta Ads ROAS': { number: {} },
        'LinkedIn impressions': { number: {} },
        'SEO ranking keywords': { number: {} },
        'Organic traffic': { number: {} },
        // Spec: Formula (Total spend / leads). Stored as number.
        'Cost per lead': { number: { format: 'dollar' } },
        'Best performing channel': {
          select: {
            options: [
              { name: 'Google Ads' },
              { name: 'Meta Ads' },
              { name: 'LinkedIn' },
              { name: 'SEO' },
              { name: 'Referral' },
            ],
          },
        },
      },
    },
  })
  return db.id
}

async function createClientCommunicationDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '💬' },
    title: [{ type: 'text', text: { content: 'Client Communication Health' } }],
    initial_data_source: {
      properties: {
        // Spec: Relation → Clients. Promoted to title (the natural row label).
        'Client': { title: {} },
        'Avg email response time (hrs)': { number: {} },
        'Emails sent this month': { number: {} },
        'Emails received this month': { number: {} },
        'Last communication date': { date: {} },
        // Spec: Formula. Stored as number.
        'Days since last contact': { number: {} },
        'Slack messages this month': { number: {} },
        'Meetings held this month': { number: {} },
        'Meeting sentiment': {
          select: {
            options: [
              { name: 'Positive', color: 'green' },
              { name: 'Neutral', color: 'gray' },
              { name: 'Negative', color: 'red' },
            ],
          },
        },
        'Communication trend': {
          select: {
            options: [
              { name: 'Increasing', color: 'green' },
              { name: 'Stable', color: 'gray' },
              { name: 'Dropping', color: 'red' },
            ],
          },
        },
        'Ghost risk': { checkbox: {} },
      },
    },
  })
  return db.id
}

async function createTeamCommunicationDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🗨️' },
    title: [{ type: 'text', text: { content: 'Team Communication & Culture' } }],
    initial_data_source: {
      properties: {
        // Spec: Relation → Team. Promoted to title (the natural row label).
        'Team member': { title: {} },
        'Slack messages sent/week': { number: {} },
        'After-hours messages %': { number: { format: 'percent' } },
        'Meetings per week': { number: {} },
        'Deep work blocks/week': { number: {} },
        'Response time avg (hrs)': { number: {} },
        'PTO days used': { number: {} },
        'PTO days remaining': { number: {} },
        'Sentiment trend': {
          select: {
            options: [
              { name: 'Positive', color: 'green' },
              { name: 'Neutral', color: 'gray' },
              { name: 'Declining', color: 'red' },
            ],
          },
        },
        'Overload signals': { checkbox: {} },
      },
    },
  })
  return db.id
}

async function createSupportTicketsDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🎧' },
    title: [{ type: 'text', text: { content: 'Customer Support & Satisfaction' } }],
    initial_data_source: {
      properties: {
        // Spec: Relation → Clients. Promoted to title.
        'Client': { title: {} },
        'Open tickets': { number: {} },
        'Avg ticket resolution (hrs)': { number: {} },
        'NPS score': { number: {} },
        'NPS category': {
          select: {
            options: [
              { name: 'Promoter', color: 'green' },
              { name: 'Passive', color: 'yellow' },
              { name: 'Detractor', color: 'red' },
            ],
          },
        },
        'Last NPS date': { date: {} },
        'Complaints this month': { number: {} },
        'Escalations this month': { number: {} },
        'Satisfaction trend': {
          select: {
            options: [
              { name: 'Improving', color: 'green' },
              { name: 'Stable', color: 'gray' },
              { name: 'Declining', color: 'red' },
            ],
          },
        },
      },
    },
  })
  return db.id
}

async function createContractsLegalDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📝' },
    title: [{ type: 'text', text: { content: 'Contracts & Legal' } }],
    initial_data_source: {
      properties: {
        // Spec: Relation → Clients. Promoted to title.
        'Client': { title: {} },
        'Contract status': {
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'Expiring', color: 'yellow' },
              { name: 'Expired', color: 'red' },
              { name: 'Unsigned', color: 'gray' },
            ],
          },
        },
        'Contract value': { number: { format: 'dollar' } },
        'Contract end date': { date: {} },
        // Spec: Formula. Stored as number (days).
        'Days to renewal': { number: {} },
        'Auto-renewal': { checkbox: {} },
        'SOW status': {
          select: {
            options: [
              { name: 'Signed', color: 'green' },
              { name: 'Pending', color: 'yellow' },
              { name: 'Expired', color: 'red' },
            ],
          },
        },
        'NDA signed': { checkbox: {} },
        'Renewal risk': {
          select: {
            options: [
              { name: 'Low', color: 'green' },
              { name: 'Medium', color: 'yellow' },
              { name: 'High', color: 'red' },
            ],
          },
        },
        'Agent recommendation': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createToolStackDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🧰' },
    title: [{ type: 'text', text: { content: 'Tool Stack & Software Costs' } }],
    initial_data_source: {
      properties: {
        'Tool name': { title: {} },
        'Category': {
          select: {
            options: [
              { name: 'PM' },
              { name: 'CRM' },
              { name: 'Finance' },
              { name: 'Comms' },
              { name: 'Design' },
              { name: 'Dev' },
            ],
          },
        },
        'Monthly cost': { number: { format: 'dollar' } },
        'Active users': { number: {} },
        'Last used': { date: {} },
        'Utilization %': { number: { format: 'percent' } },
        'Is redundant': { checkbox: {} },
        'Replacement candidate': { rich_text: {} },
        // Spec: Formula (Low util × annual cost). Stored as number.
        'Annual waste': { number: { format: 'dollar' } },
      },
    },
  })
  return db.id
}

async function createMeetingLoadDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📅' },
    title: [{ type: 'text', text: { content: 'Meeting Load' } }],
    initial_data_source: {
      properties: {
        // 'Week' is the first spec column (Date). Promoted to title; each row is one
        // team-member-week pair, labeled by the ISO week start.
        'Week': { title: {} },
        // Spec: Relation → Team. Modeled as rich_text.
        'Team member': { rich_text: {} },
        'Total meetings': { number: {} },
        'Client meetings': { number: {} },
        'Internal meetings': { number: {} },
        'Meeting hours total': { number: {} },
        'Deep work hours': { number: {} },
        // Spec: Formula (Meeting hrs / work hrs). Stored as number.
        'Meeting load %': { number: { format: 'percent' } },
        'Back-to-back count': { number: {} },
        'Agent flag': { checkbox: {} },
      },
    },
  })
  return db.id
}

async function createRecruitingDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🤝' },
    title: [{ type: 'text', text: { content: 'Recruiting & Capacity Planning' } }],
    initial_data_source: {
      properties: {
        'Role': { title: {} },
        'Status': {
          select: {
            options: [
              { name: 'Open', color: 'blue' },
              { name: 'Interviewing', color: 'yellow' },
              { name: 'Filled', color: 'green' },
              { name: 'On hold', color: 'gray' },
            ],
          },
        },
        'Urgency': {
          select: {
            options: [
              { name: 'Immediate', color: 'red' },
              { name: 'This quarter', color: 'yellow' },
              { name: 'Future', color: 'gray' },
            ],
          },
        },
        'Why needed': { rich_text: {} },
        'Monthly cost': { number: { format: 'dollar' } },
        'Open since': { date: {} },
        'LinkedIn applicants': { number: {} },
        'Interviews scheduled': { number: {} },
      },
    },
  })
  return db.id
}

async function createGrowthReferralsDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🌱' },
    title: [{ type: 'text', text: { content: 'Growth & Referrals' } }],
    initial_data_source: {
      properties: {
        // 'Month' is the first spec column (Date). Promoted to title.
        'Month': { title: {} },
        'Referrals received': { number: {} },
        'Referral source': { rich_text: {} },
        'Referrals converted': { number: {} },
        'Referral revenue': { number: { format: 'dollar' } },
        'Inbound leads': { number: {} },
        'Outbound leads': { number: {} },
        // Spec: Relation → Clients. Modeled as rich_text.
        'Best referrer': { rich_text: {} },
        // Spec: Formula (Referrals / total new). Stored as number.
        'Word of mouth score': { number: { format: 'percent' } },
      },
    },
  })
  return db.id
}

async function createPatternCardsDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🔍' },
    title: [{ type: 'text', text: { content: 'Pattern Cards' } }],
    initial_data_source: {
      properties: {
        'Pattern title': { title: {} },
        'Category': {
          select: {
            options: [
              { name: 'Revenue' },
              { name: 'Delivery' },
              { name: 'Client' },
              { name: 'Team' },
              { name: 'Sales' },
              { name: 'Growth' },
            ],
          },
        },
        'Description': { rich_text: {} },
        'First observed': { date: {} },
        'Confidence': { number: { format: 'percent' } },
        'Status': {
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'Watching', color: 'yellow' },
              { name: 'Resolved', color: 'gray' },
            ],
          },
        },
        'Recommended action': { rich_text: {} },
        'Times confirmed': { number: {} },
      },
    },
  })
  return db.id
}

async function createRiskRegisterDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '⚠️' },
    title: [{ type: 'text', text: { content: 'Risk Register' } }],
    initial_data_source: {
      properties: {
        'Risk title': { title: {} },
        'Type': {
          select: {
            options: [
              { name: 'Revenue' },
              { name: 'Delivery' },
              { name: 'Team' },
              { name: 'Client' },
              { name: 'Cash flow' },
              { name: 'Legal' },
            ],
          },
        },
        'Severity': {
          select: {
            options: [
              { name: 'Low', color: 'gray' },
              { name: 'Medium', color: 'yellow' },
              { name: 'High', color: 'orange' },
              { name: 'Critical', color: 'red' },
            ],
          },
        },
        'Description': { rich_text: {} },
        'Financial exposure': { number: { format: 'dollar' } },
        'Date flagged': { date: {} },
        'Status': {
          select: {
            options: [
              { name: 'Open', color: 'red' },
              { name: 'Mitigating', color: 'yellow' },
              { name: 'Resolved', color: 'green' },
            ],
          },
        },
        'Deadline to act': { date: {} },
        'Agent recommendation': { rich_text: {} },
        'Owner': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createActionLogDatabase(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '✅' },
    title: [{ type: 'text', text: { content: 'Agent Action Log' } }],
    initial_data_source: {
      properties: {
        'Action': { title: {} },
        'Agent': {
          select: {
            options: [
              { name: 'Revenue' },
              { name: 'Collections' },
              { name: 'Scope' },
              { name: 'Delivery' },
              { name: 'Briefing' },
              { name: 'Profitability' },
              { name: 'Team' },
              { name: 'Growth' },
              { name: 'Renewal' },
              { name: 'Stack' },
              { name: 'COO' },
            ],
          },
        },
        'Date': { date: {} },
        'Trigger': { rich_text: {} },
        'Action taken': { rich_text: {} },
        'Outcome': {
          select: {
            options: [
              { name: 'Resolved', color: 'green' },
              { name: 'Pending', color: 'yellow' },
              { name: 'Escalated', color: 'orange' },
              { name: 'No action', color: 'gray' },
            ],
          },
        },
        'Value recovered / saved': { number: { format: 'dollar' } },
        'Human override': { checkbox: {} },
        'Override reason': { rich_text: {} },
      },
    },
  })
  return db.id
}

async function createWeeklyBriefingsDatabase(
  notion: Client,
  parentPageId: string,
): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: { type: 'emoji', emoji: '📰' },
    title: [{ type: 'text', text: { content: 'Weekly Briefings' } }],
    initial_data_source: {
      properties: {
        // 'Week' is spec'd as Date. Promoted to title.
        'Week': { title: {} },
        'Headline': { rich_text: {} },
        'Revenue status': { rich_text: {} },
        'Top risk this week': { rich_text: {} },
        'Top win this week': { rich_text: {} },
        'Agent actions this week': { number: {} },
        'Full briefing': { rich_text: {} },
        'Owner read it': { checkbox: {} },
      },
    },
  })
  return db.id
}
