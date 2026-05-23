/**
 * Canonical slugs for the 20 OpsRadar Brain databases.
 * Each customer's `notion_workspaces.databases` JSONB maps these slugs → Notion database ids.
 *
 * Source of truth: docs/dev/notion-brain-schema-2026.md
 */

export const NOTION_DATABASE_SLUGS = [
  'clients',
  'kpi_snapshots',
  'projects',
  'team',
  'sales_pipeline',
  'invoices',
  'pattern_cards',
  'risk_register',
  'action_log',
  'real_pnl',
  'marketing_performance',
  'communication',
  'support_tickets',
  'recruiting',
  'tool_stack',
  'growth_referrals',
  'contracts_legal',
  'meeting_load',
  'service_line_performance',
  'weekly_briefings',
] as const

export type NotionDatabaseSlug = (typeof NOTION_DATABASE_SLUGS)[number]

/** Map of slug → Notion database id, persisted in notion_workspaces.databases. */
export type NotionDatabasesMap = Partial<Record<NotionDatabaseSlug, string>>
