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

import { NOTION_DATABASE_SLUGS, type NotionDatabasesMap, type NotionDatabaseSlug } from './schema-keys'

export async function createBrainParentPage(
  _notion: unknown,
  _workspaceId: string,
): Promise<{ id: string }> {
  // TODO(scaffold): create parent page titled "OpsRadar Brain" at workspace root.
  //   return notion.pages.create({
  //     parent: { type: 'workspace', workspace: true },
  //     properties: { title: { title: [{ text: { content: 'OpsRadar Brain' } }] } },
  //   })
  throw new Error('createBrainParentPage not implemented')
}

/**
 * Sequentially creates all 20 databases. Sequential (not parallel) to stay under Notion's
 * 3 req/sec rate limit and to keep error reporting linear.
 */
export async function createAllDatabases(
  notion: unknown,
  parentPageId: string,
): Promise<NotionDatabasesMap> {
  const created: NotionDatabasesMap = {}
  for (const slug of NOTION_DATABASE_SLUGS) {
    created[slug] = await createDatabase(notion, parentPageId, slug)
  }
  return created
}

async function createDatabase(
  _notion: unknown,
  _parentPageId: string,
  _slug: NotionDatabaseSlug,
): Promise<string> {
  // TODO(scaffold): switch on slug → call notion.databases.create() with the exact
  // schema from docs/dev/notion-brain-schema-2026.md. Returns the new database id.
  //
  // Highest-priority schemas to implement first (used by launch agents):
  //   - clients
  //   - kpi_snapshots
  //   - pattern_cards
  //   - risk_register
  //   - action_log
  // (see specs/2026-05-23-agents-notion-composio-design.md §3.2 for full property maps)
  throw new Error('createDatabase not implemented')
}
