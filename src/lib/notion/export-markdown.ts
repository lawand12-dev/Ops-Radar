/**
 * Notion Brain → markdown export (CP-26).
 *
 * Renders the customer's entire Notion workspace (20 DBs + 7 strategic pages)
 * into a structured set of markdown files. Called weekly from
 * /api/cron/brain-export, packaged into a zip, uploaded to Supabase Storage,
 * emailed to the customer.
 *
 * This is the safety valve for the Karpathy "Notion is not a Company Brain"
 * critique: the customer gets a portable markdown snapshot they can take
 * anywhere — even if OpsRadar disappears.
 *
 * The Notion API client (this lib's getWorkspace + page-templates) handles
 * the heavy lifting. This file converts Notion block trees into clean
 * markdown using a minimal renderer (no external deps).
 */

import { Client as NotionClient } from '@notionhq/client'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export type MarkdownFile = {
  /** Relative path inside the export — e.g. "clients/acme-corp.md". */
  path: string
  content: string
}

export type BrainExportResult = {
  files: MarkdownFile[]
  workspaceName: string | null
  parentPageId: string
  generatedAt: string
}

// ─── Public entry ──────────────────────────────────────────────────────────

export async function exportBrainAsMarkdown(
  userId: string,
): Promise<BrainExportResult | null> {
  const supabase = getServerSupabaseClient()
  const { data: workspace, error } = await supabase
    .from('notion_workspaces')
    .select('access_token_encrypted, parent_page_id, workspace_name, databases')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !workspace) {
    console.warn('[brain-export] no Notion workspace for user', userId)
    return null
  }

  let token: string
  try {
    const blob = JSON.parse(workspace.access_token_encrypted as string)
    token = decryptApiKey(blob)
  } catch (err) {
    console.warn('[brain-export] could not decrypt Notion token:', err)
    return null
  }

  const notion = new NotionClient({ auth: token })
  const entities = (workspace.databases ?? {}) as Record<string, string>
  const files: MarkdownFile[] = []

  // README — the root index file
  files.push({
    path: 'README.md',
    content: buildReadme({
      workspaceName: workspace.workspace_name as string | null,
      parentPageId: workspace.parent_page_id as string,
      entityCount: Object.keys(entities).length,
      generatedAt: new Date().toISOString(),
    }),
  })

  // Per-entity files — one per DB or strategic page
  for (const [slug, entityId] of Object.entries(entities)) {
    try {
      if (slug.startsWith('__')) {
        // Strategic pages (curated, customer-edited)
        const file = await renderPageAsMarkdown(notion, entityId, slug)
        if (file) files.push(file)
      } else {
        // Databases — render as a folder of one-row-per-file
        const dbFiles = await renderDatabaseAsMarkdown(notion, entityId, slug)
        files.push(...dbFiles)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[brain-export] failed to render ${slug}:`, message)
      // Continue — one bad entity shouldn't break the whole export.
    }
  }

  return {
    files,
    workspaceName: workspace.workspace_name as string | null,
    parentPageId: workspace.parent_page_id as string,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Strategic page renderer ───────────────────────────────────────────────

async function renderPageAsMarkdown(
  notion: NotionClient,
  pageId: string,
  slug: string,
): Promise<MarkdownFile | null> {
  try {
    const page = (await notion.pages.retrieve({ page_id: pageId })) as {
      properties?: Record<string, unknown>
    }
    const title = extractTitle(page.properties) ?? slug.replace(/^__/, '').replace(/_/g, ' ')

    const blocks = await fetchAllBlocks(notion, pageId)
    const body = blocksToMarkdown(blocks)

    const filename = slug.replace(/^__/, '').replace(/_/g, '-') + '.md'
    return {
      path: `pages/${filename}`,
      content: `# ${title}\n\n${body}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[brain-export] page render failed for ${slug}:`, message)
    return null
  }
}

// ─── Database renderer ─────────────────────────────────────────────────────

async function renderDatabaseAsMarkdown(
  notion: NotionClient,
  databaseId: string,
  slug: string,
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = []
  let cursor: string | undefined
  let page = 0
  const maxPages = 20 // safety cap — ~2000 rows max per DB

  // Index file listing all rows in this DB
  const indexLines: string[] = [`# ${slug.replace(/_/g, ' ')}`, '']

  while (page < maxPages) {
    // Notion SDK v5: use dataSources.query — each database has a data source
    // identified by the same id we stored as the database id (or its default
    // data source). Same pattern used in src/lib/notion/helpers.ts.
    const result = (await (notion as unknown as {
      dataSources: {
        query: (args: {
          data_source_id: string
          start_cursor?: string
          page_size: number
        }) => Promise<{
          results: Array<{ id: string; properties: Record<string, unknown> }>
          next_cursor: string | null
        }>
      }
    }).dataSources.query({
      data_source_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    }))

    for (const row of result.results) {
      const title = extractTitle(row.properties) ?? `row-${row.id.slice(0, 8)}`
      const safeFilename = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60) || row.id.slice(0, 8)
      const rowPath = `databases/${slug}/${safeFilename}.md`

      const props = propertiesToMarkdown(row.properties)
      const blocks = await fetchAllBlocks(notion, row.id, 50).catch(() => [])
      const body = blocks.length > 0 ? blocksToMarkdown(blocks) : ''

      files.push({
        path: rowPath,
        content: `# ${title}\n\n${props}${body ? `\n\n## Content\n\n${body}` : ''}`,
      })
      indexLines.push(`- [${title}](./${safeFilename}.md)`)
    }

    if (!result.next_cursor) break
    cursor = result.next_cursor
    page++
  }

  files.push({
    path: `databases/${slug}/INDEX.md`,
    content: indexLines.join('\n'),
  })

  return files
}

// ─── Notion block tree → markdown ──────────────────────────────────────────

type NotionBlock = {
  id: string
  type: string
  has_children?: boolean
  [k: string]: unknown
}

async function fetchAllBlocks(
  notion: NotionClient,
  parentId: string,
  maxBlocks = 500,
): Promise<NotionBlock[]> {
  const out: NotionBlock[] = []
  let cursor: string | undefined
  while (out.length < maxBlocks) {
    const result = (await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
      page_size: 100,
    })) as { results: NotionBlock[]; next_cursor: string | null }
    out.push(...result.results)
    if (!result.next_cursor) break
    cursor = result.next_cursor
  }
  return out
}

function blocksToMarkdown(blocks: NotionBlock[]): string {
  const lines: string[] = []
  for (const block of blocks) {
    const md = blockToMarkdown(block)
    if (md) lines.push(md)
  }
  return lines.join('\n\n')
}

function blockToMarkdown(block: NotionBlock): string {
  const type = block.type
  const data = block[type] as Record<string, unknown> | undefined
  if (!data) return ''

  const text = extractRichText(data['rich_text'])

  switch (type) {
    case 'paragraph':
      return text
    case 'heading_1':
      return `# ${text}`
    case 'heading_2':
      return `## ${text}`
    case 'heading_3':
      return `### ${text}`
    case 'bulleted_list_item':
      return `- ${text}`
    case 'numbered_list_item':
      return `1. ${text}`
    case 'to_do':
      return `- [${data['checked'] ? 'x' : ' '}] ${text}`
    case 'quote':
      return `> ${text}`
    case 'callout':
      return `> ${text}`
    case 'code':
      return '```\n' + text + '\n```'
    case 'divider':
      return '---'
    case 'child_page':
      return `(child page: ${(data['title'] as string) ?? 'untitled'})`
    default:
      return text ? `${text}` : ''
  }
}

// ─── Property + rich-text extraction ───────────────────────────────────────

function extractTitle(props: Record<string, unknown> | undefined): string | null {
  if (!props) return null
  for (const key of Object.keys(props)) {
    const value = props[key] as { type?: string; title?: unknown; rich_text?: unknown }
    if (value?.type === 'title') {
      const title = extractRichText(value.title)
      if (title) return title
    }
  }
  return null
}

function extractRichText(rt: unknown): string {
  if (!Array.isArray(rt)) return ''
  return rt
    .map((r) => {
      const entry = r as { plain_text?: string; text?: { content?: string } }
      return entry?.plain_text ?? entry?.text?.content ?? ''
    })
    .join('')
}

function propertiesToMarkdown(props: Record<string, unknown>): string {
  const lines: string[] = []
  for (const [key, raw] of Object.entries(props)) {
    const value = raw as { type?: string; [k: string]: unknown }
    if (!value?.type) continue
    const rendered = renderProperty(value)
    if (rendered) lines.push(`- **${key}**: ${rendered}`)
  }
  return lines.join('\n')
}

function renderProperty(value: { type?: string; [k: string]: unknown }): string {
  switch (value.type) {
    case 'title':
    case 'rich_text':
      return extractRichText(value[value.type])
    case 'number':
      return value.number != null ? String(value.number) : ''
    case 'select': {
      const v = value.select as { name?: string } | null
      return v?.name ?? ''
    }
    case 'multi_select': {
      const arr = (value.multi_select as Array<{ name?: string }>) ?? []
      return arr.map((s) => s.name ?? '').filter(Boolean).join(', ')
    }
    case 'status': {
      const v = value.status as { name?: string } | null
      return v?.name ?? ''
    }
    case 'date': {
      const d = value.date as { start?: string; end?: string } | null
      if (!d?.start) return ''
      return d.end ? `${d.start} → ${d.end}` : d.start
    }
    case 'checkbox':
      return value.checkbox ? '✓' : '—'
    case 'url':
      return (value.url as string) ?? ''
    case 'email':
      return (value.email as string) ?? ''
    case 'phone_number':
      return (value.phone_number as string) ?? ''
    case 'people':
      return (value.people as Array<{ name?: string }>)?.map((p) => p.name).join(', ') ?? ''
    default:
      return ''
  }
}

function buildReadme(input: {
  workspaceName: string | null
  parentPageId: string
  entityCount: number
  generatedAt: string
}): string {
  return [
    '# OpsRadar Brain Export',
    '',
    `Generated: **${input.generatedAt}**`,
    `Notion workspace: **${input.workspaceName ?? '(unnamed)'}**`,
    `Total entities exported: **${input.entityCount}**`,
    '',
    '## What\'s in this archive',
    '',
    '- `pages/` — your curated strategic pages (Brain Home, How We Work, Decision Log, OKRs, etc.)',
    '- `databases/<name>/` — each Notion database with one markdown file per row + an `INDEX.md`',
    '',
    '## Why we send this',
    '',
    'Your Company Brain belongs to you. Even if OpsRadar disappears tomorrow, you keep:',
    '',
    '1. Your Notion workspace (always — it lives in your Notion account)',
    '2. This weekly markdown snapshot (portable to any tool that reads markdown)',
    '3. The data in your original tools (Stripe, HubSpot, etc.) — we never touched those',
    '',
    'This export is automated every Sunday. You can leave OpsRadar at any time and take everything with you.',
    '',
    '---',
    '',
    `*Generated by OpsRadar Brain Export · ${input.generatedAt}*`,
  ].join('\n')
}
