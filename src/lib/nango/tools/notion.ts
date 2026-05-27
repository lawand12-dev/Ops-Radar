/**
 * Notion tools for hired AI employees, brokered through Nango.
 *
 * Same toolkit shape as Gmail (CP-38 pattern). Notion API is REST under /v1
 * and REQUIRES a Notion-Version header on every call (we pin a stable one).
 * Nango injects the OAuth token. userId is closure-bound.
 *
 * This is the brain toolkit: agents READ the customer-owned Notion workspace
 * (databases, pages) and WRITE findings back (append rows, append blocks).
 * Notion writes execute immediately rather than queueing — they're notes to
 * the customer's own brain, not outbound actions — but we still mark the
 * create/append tools destructive so the approval gate + confidence scorer
 * treat them consistently with other toolkits.
 */

import { z } from 'zod'
import { tool } from 'ai'
import { nangoProxy, type NangoToolSlug } from '<npm>/lib/nango'

const NOTION: NangoToolSlug = 'notion'

// Pin a stable Notion API version. Bump deliberately when Notion ships
// breaking changes we want to adopt.
const NOTION_VERSION = '2022-06-28'
const NOTION_HEADERS = { 'Notion-Version': NOTION_VERSION }

// ─── CORE TOOLS (always loaded) ────────────────────────────────────────────

export function buildNotionToolsCore(userId: string) {
  return {
    notion_search: tool({
      description:
        'Search the connected Notion workspace for pages and databases by title. Start here to find the database or page you need to read or write.',
      inputSchema: z.object({
        query: z.string().describe('Title text to search for'),
        filter_type: z
          .enum(['page', 'database'])
          .optional()
          .describe('Restrict results to pages or databases'),
      }),
      execute: async ({ query, filter_type }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'POST',
          endpoint: '/v1/search',
          headers: NOTION_HEADERS,
          data: {
            query,
            ...(filter_type ? { filter: { property: 'object', value: filter_type } } : {}),
          },
        }),
    }),

    notion_query_database: tool({
      description:
        'Query rows of a Notion database. Pass the database_id (from notion_search). Optional filter + sorts use the Notion query schema. Use to read existing brain entries (clients, risks, KPIs).',
      inputSchema: z.object({
        database_id: z.string(),
        filter: z.unknown().optional().describe('Notion filter object'),
        sorts: z.array(z.unknown()).optional(),
        page_size: z.number().int().min(1).max(100).optional().default(50),
        start_cursor: z.string().optional(),
      }),
      execute: async ({ database_id, filter, sorts, page_size, start_cursor }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'POST',
          endpoint: `/v1/databases/${database_id}/query`,
          headers: NOTION_HEADERS,
          data: {
            ...(filter ? { filter } : {}),
            ...(sorts ? { sorts } : {}),
            page_size,
            ...(start_cursor ? { start_cursor } : {}),
          },
        }),
    }),

    notion_get_database: tool({
      description:
        'Read a database’s schema (its properties + types). Use before creating a row so you set the right property shapes.',
      inputSchema: z.object({ database_id: z.string() }),
      execute: async ({ database_id }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'GET',
          endpoint: `/v1/databases/${database_id}`,
          headers: NOTION_HEADERS,
        }),
    }),

    notion_get_page: tool({
      description: 'Read a page’s properties by id.',
      inputSchema: z.object({ page_id: z.string() }),
      execute: async ({ page_id }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'GET',
          endpoint: `/v1/pages/${page_id}`,
          headers: NOTION_HEADERS,
        }),
    }),

    notion_get_block_children: tool({
      description: 'Read the content blocks of a page or block (the actual text/body).',
      inputSchema: z.object({
        block_id: z.string().describe('A page id or block id'),
        page_size: z.number().int().min(1).max(100).optional().default(100),
      }),
      execute: async ({ block_id, page_size }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'GET',
          endpoint: `/v1/blocks/${block_id}/children`,
          headers: NOTION_HEADERS,
          params: { page_size },
        }),
    }),

    notion_create_page: tool({
      description:
        'Create a page — most commonly a new ROW in a database. Pass parent (e.g. { database_id }) and properties matching that database’s schema. Use notion_get_database first to learn the property shapes.',
      inputSchema: z.object({
        parent: z
          .unknown()
          .describe('Notion parent object, e.g. { "database_id": "…" } or { "page_id": "…" }'),
        properties: z.unknown().describe('Notion properties object matching the parent schema'),
        children: z
          .array(z.unknown())
          .optional()
          .describe('Optional block content for the new page body'),
      }),
      execute: async ({ parent, properties, children }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'POST',
          endpoint: '/v1/pages',
          headers: NOTION_HEADERS,
          data: { parent, properties, ...(children ? { children } : {}) },
        }),
    }),

    notion_append_blocks: tool({
      description:
        'Append content blocks to a page (e.g. a paragraph summary of what an employee found). children is an array of Notion block objects.',
      inputSchema: z.object({
        block_id: z.string().describe('The page id to append to'),
        children: z.array(z.unknown()).describe('Array of Notion block objects'),
      }),
      execute: async ({ block_id, children }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'PATCH',
          endpoint: `/v1/blocks/${block_id}/children`,
          headers: NOTION_HEADERS,
          data: { children },
        }),
    }),
  }
}

// ─── ADVANCED TOOLS (loaded on demand) ─────────────────────────────────────

export function buildNotionToolsAdvanced(userId: string) {
  return {
    notion_update_page: tool({
      description: 'Update a page’s properties (e.g. change a status or a date on a database row).',
      inputSchema: z.object({
        page_id: z.string(),
        properties: z.unknown().describe('Notion properties object with the fields to change'),
      }),
      execute: async ({ page_id, properties }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'PATCH',
          endpoint: `/v1/pages/${page_id}`,
          headers: NOTION_HEADERS,
          data: { properties },
        }),
    }),

    notion_archive_page: tool({
      description: 'Archive (soft-delete) a page or database row by setting archived=true.',
      inputSchema: z.object({ page_id: z.string() }),
      execute: async ({ page_id }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'PATCH',
          endpoint: `/v1/pages/${page_id}`,
          headers: NOTION_HEADERS,
          data: { archived: true },
        }),
    }),

    notion_list_users: tool({
      description: 'List workspace users (to resolve people for person-type properties).',
      inputSchema: z.object({
        page_size: z.number().int().min(1).max(100).optional().default(100),
      }),
      execute: async ({ page_size }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'GET',
          endpoint: '/v1/users',
          headers: NOTION_HEADERS,
          params: { page_size },
        }),
    }),

    notion_update_block: tool({
      description: 'Update the content of a single block by id.',
      inputSchema: z.object({
        block_id: z.string(),
        block: z.unknown().describe('Notion block object with the updated content'),
      }),
      execute: async ({ block_id, block }) =>
        nangoProxy({
          userId,
          tool: NOTION,
          method: 'PATCH',
          endpoint: `/v1/blocks/${block_id}`,
          headers: NOTION_HEADERS,
          data: block,
        }),
    }),
  }
}

// ─── CATALOG ────────────────────────────────────────────────────────────────

export const NOTION_TOOLS_ADVANCED_CATALOG = [
  { name: 'notion_update_page', description: 'Update a page/row’s properties.' },
  { name: 'notion_archive_page', description: 'Archive (soft-delete) a page or row.' },
  { name: 'notion_list_users', description: 'List workspace users.' },
  { name: 'notion_update_block', description: 'Update one content block.' },
  { name: 'notion_create_database', description: 'Create a new database under a page.' },
  { name: 'notion_delete_block', description: 'Delete a content block.' },
  { name: 'notion_create_comment', description: 'Add a comment to a page.' },
] as const

export type NotionCoreToolName = keyof ReturnType<typeof buildNotionToolsCore>
export type NotionAdvancedToolName = keyof ReturnType<typeof buildNotionToolsAdvanced>

/**
 * Notion write actions. Notion writes are notes to the customer's own brain
 * (they execute immediately rather than queueing for outbound approval), but
 * we still mark create/update tools destructive so the confidence scorer and
 * gate treat them consistently across toolkits.
 */
export const NOTION_DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  'notion_create_page',
  'notion_append_blocks',
  'notion_update_page',
  'notion_archive_page',
  'notion_update_block',
])
