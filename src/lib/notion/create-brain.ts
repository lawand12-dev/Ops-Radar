/**
 * One-time provisioner: creates the "OpsRadar Brain" parent page and all 20 child databases
 * inside the customer's Notion workspace.
 *
 * Called from /api/notion/callback after OAuth completes.
 * Returns the slug → database_id map for persistence in notion_workspaces.databases.
 *
 * Implementation note: each database schema must match docs/dev/notion-brain-schema-2026.md EXACTLY.
 * Column names and select option labels are referenced by agent prompts and helpers — do not drift.
 */

import { Client } from '@notionhq/client'
import { type NotionDatabasesMap, type NotionDatabaseSlug } from './schema-keys'

/**
 * Slugs of databases that have implemented schemas. The OAuth callback iterates only these
 * on first connect; the remaining 15 slugs throw if invoked. Keep this list in sync with the
 * dispatch switch in createDatabase().
 */
const IMPLEMENTED_DATABASE_SLUGS: readonly NotionDatabaseSlug[] = [
  'clients',
  'kpi_snapshots',
  'pattern_cards',
  'risk_register',
  'action_log',
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
 * Sequentially creates the launch-critical databases (5 of 20). Sequential (not parallel) to
 * stay under Notion's 3 req/sec rate limit and to keep error reporting linear. The remaining
 * 15 databases will be added once their helpers/agents are wired up — until then we skip them
 * so first-connect provisioning never partially fails.
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
    case 'pattern_cards':
      return createPatternCardsDatabase(notion, parentPageId)
    case 'risk_register':
      return createRiskRegisterDatabase(notion, parentPageId)
    case 'action_log':
      return createActionLogDatabase(notion, parentPageId)
    default:
      throw new Error(`Database schema for slug "${slug}" not implemented yet — see notion-brain-schema-2026.md`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database schemas (spec: docs/dev/specs/2026-05-23-agents-notion-composio-design.md §3.2)
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
