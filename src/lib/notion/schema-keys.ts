/**
 * Canonical slugs for the 20 OpsRadar Brain databases.
 * Each customer's `notion_workspaces.databases` JSONB maps these slugs → Notion database ids.
 *
 * Source of truth: docs/dev/notion-brain-schema-2026.md (20 databases in spec order)
 */

export const NOTION_DATABASE_SLUGS = [
  'clients',                  // DB 1
  'kpi_snapshots',            // DB 2: Weekly KPI Snapshots
  'projects',                 // DB 3
  'team',                     // DB 4
  'sales_pipeline',           // DB 5
  'invoices',                 // DB 6: Invoice Tracker
  'real_pnl',                 // DB 7
  'marketing_performance',    // DB 8
  'client_communication',     // DB 9: Client Communication Health
  'team_communication',       // DB 10: Team Communication & Culture
  'support_tickets',          // DB 11: Customer Support & Satisfaction
  'contracts_legal',          // DB 12
  'tool_stack',               // DB 13: Tool Stack & Software Costs
  'meeting_load',             // DB 14
  'recruiting',               // DB 15: Recruiting & Capacity Planning
  'growth_referrals',         // DB 16
  'pattern_cards',            // DB 17
  'risk_register',            // DB 18
  'action_log',               // DB 19: Agent Action Log
  'weekly_briefings',         // DB 20
] as const

export type NotionDatabaseSlug = (typeof NOTION_DATABASE_SLUGS)[number]

/** Map of slug → Notion database id, persisted in notion_workspaces.databases. */
export type NotionDatabasesMap = Partial<Record<NotionDatabaseSlug, string>>
