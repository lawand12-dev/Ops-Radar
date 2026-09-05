/**
 * Canonical slugs for the OpsRadar Brain workspace inside the customer's Notion.
 *
 *   - NOTION_DATABASE_SLUGS: the 20 source-of-truth Brain databases. Each
 *     customer's `notion_workspaces.databases[<db_slug>]` is the data source id.
 *   - NOTION_PAGE_SLUGS: the curated Brain pages we seed once on first connect.
 *     These coexist in the same `notion_workspaces.databases` JSONB column
 *     (the column is name-only legacy — it really holds the workspace entity map).
 *     The "Brain Home" page is the only page the agents ever rewrite; everything
 *     else is customer-owned and never overwritten.
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

/**
 * Curated pages seeded under the "OpsRadar Brain" parent. These are CUSTOMER-OWNED
 * — agents only ever rewrite `brain_home`. The rest are scaffolded once and never
 * touched again by the system (customers edit them freely).
 *
 * The `__` prefix avoids any possible collision with a future database slug.
 */
export const NOTION_PAGE_SLUGS = [
  '__brain_home',         // Daily landing page — auto-refreshed by Briefing Agent
  '__company_overview',   // About <Agency> — mission, services, team
  '__okrs',               // Quarterly objectives + key results
  '__playbooks',          // Parent page with 5 sub-pages (sales, delivery, …)
  '__decision_log',       // Running log of strategic decisions
  '__how_we_work',        // Personalization moat — every agent reads this
  '__meeting_notes',      // Parent page with templates for recurring meetings
] as const

export type NotionPageSlug = (typeof NOTION_PAGE_SLUGS)[number]

/** Map of page slug → Notion page id, persisted in notion_workspaces.databases (jsonb). */
export type NotionPagesMap = Partial<Record<NotionPageSlug, string>>

/**
 * The combined map persisted in `notion_workspaces.databases` (jsonb). Database ids
 * and page ids share the same column (it's schemaless jsonb); the `__`-prefixed
 * keys are pages, the rest are database data-source ids.
 */
export type NotionWorkspaceEntityMap = NotionDatabasesMap & NotionPagesMap

/** Type guard — distinguishes page slugs from database slugs at runtime. */
export function isPageSlug(key: string): key is NotionPageSlug {
  return (NOTION_PAGE_SLUGS as readonly string[]).includes(key)
}
