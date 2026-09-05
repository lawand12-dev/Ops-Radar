/**
 * Brain → Notion sync engine (CP-29).
 *
 * The other direction of CP-26 (Notion → markdown). This takes the
 * authoritative brain (brain_documents Postgres) and renders it into
 * the customer's Notion workspace as a navigable mirror — so the
 * customer's Notion UI stays the read surface even as the brain
 * becomes the source of truth on the write side.
 *
 * What this does:
 *   1. Find / create a top-level page in the customer's Notion called
 *      "OpsRadar Brain (synced)". This is the parent of the mirror.
 *   2. Group brain documents by their top-level directory:
 *        pattern-cards/, risk-register/, decision-log/, kpi-snapshots/, etc.
 *   3. For each directory, find / create a child page named after the
 *      directory (e.g. "Pattern Cards").
 *   4. For each document, find / create a sub-page with the file's title.
 *      Replace the body with rendered markdown blocks (idempotent — same
 *      content_hash skips re-write).
 *
 * What this does NOT do:
 *   - Touch the customer's existing Notion databases (Clients, Risk
 *     Register, etc. provisioned by CP-24). Those remain customer-owned
 *     and customer-editable. The mirror is a separate "synced" subtree.
 *   - Delete pages when brain documents disappear. Soft-deprecated docs
 *     stay visible in Notion for now (safer; we can prune later).
 *
 * Idempotency: each Notion sync page carries a `content_hash` property
 * matching the brain document's current_version content_hash. Same hash
 * → skip. New hash → rewrite the page body.
 */

import { Client as NotionClient } from '@notionhq/client'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { loadBrainDocuments } from './store'
import type { BrainDocument } from './types'

const ROOT_PAGE_TITLE = 'OpsRadar Brain (synced)'

// Map top-level directory to a human-readable section title.
const DIR_TITLES: Record<string, string> = {
  'pattern-cards': 'Pattern Cards',
  'risk-register': 'Risk Register',
  'decision-log': 'Decision Log',
  'kpi-snapshots': 'Weekly KPI Snapshots',
  'real-pl': 'Real P&L',
  clients: 'Clients',
  'quarterly-memory': 'Quarterly Memory',
  projects: 'Projects',
  'service-lines': 'Service Lines',
  team: 'Team',
  'tool-stack': 'Tool Stack',
  contracts: 'Contracts',
  pages: 'Pages',
  'agent-runs': 'Agent Runs',
}

export type SyncResult = {
  status: 'succeeded' | 'skipped' | 'failed'
  reason?: string
  pagesCreated?: number
  pagesUpdated?: number
  pagesSkipped?: number
}

export async function syncBrainToNotion(userId: string): Promise<SyncResult> {
  const supabase = getServerSupabaseClient()

  // 1. Resolve the customer's Notion workspace (parent_page_id + token)
  const { data: workspace, error } = await supabase
    .from('notion_workspaces')
    .select('access_token_encrypted, parent_page_id, workspace_name, databases')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !workspace) {
    return { status: 'skipped', reason: 'no_notion_workspace' }
  }

  let token: string
  try {
    const blob = JSON.parse(workspace.access_token_encrypted as string)
    token = decryptApiKey(blob)
  } catch {
    return { status: 'skipped', reason: 'token_decrypt_failed' }
  }

  const notion = new NotionClient({ auth: token })
  const parentPageId = workspace.parent_page_id as string

  // 2. Load brain documents
  const docs = await loadBrainDocuments({ userId })
  if (docs.length === 0) {
    return { status: 'skipped', reason: 'brain_empty', pagesCreated: 0 }
  }

  // 3. Find / create the "OpsRadar Brain (synced)" root under the Notion parent
  const rootPageId = await findOrCreatePage(notion, parentPageId, ROOT_PAGE_TITLE)
  if (!rootPageId) {
    return { status: 'failed', reason: 'could_not_create_root_page' }
  }

  // 4. Group docs by top-level dir
  const byDir = new Map<string, BrainDocument[]>()
  for (const doc of docs) {
    const dir = doc.path.split('/')[0] ?? 'misc'
    const list = byDir.get(dir) ?? []
    list.push(doc)
    byDir.set(dir, list)
  }

  let created = 0
  let updated = 0
  let skipped = 0

  // 5. For each directory: child section page + per-doc pages under it
  for (const [dir, dirDocs] of byDir) {
    try {
      const sectionTitle = DIR_TITLES[dir] ?? prettifyDir(dir)
      const sectionPageId = await findOrCreatePage(notion, rootPageId, sectionTitle)
      if (!sectionPageId) {
        console.warn('[brain/sync] could not create section page:', dir)
        continue
      }

      for (const doc of dirDocs) {
        try {
          const result = await upsertDocPage(notion, sectionPageId, doc)
          if (result === 'created') created += 1
          else if (result === 'updated') updated += 1
          else skipped += 1
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.warn('[brain/sync] doc upsert failed:', doc.path, message)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[brain/sync] section failed:', dir, message)
    }
  }

  return {
    status: 'succeeded',
    pagesCreated: created,
    pagesUpdated: updated,
    pagesSkipped: skipped,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type SearchPage = {
  object: 'page'
  id: string
  properties?: Record<string, unknown>
}

async function findOrCreatePage(
  notion: NotionClient,
  parentPageId: string,
  title: string,
): Promise<string | null> {
  try {
    // Search children of the parent for a page with this title.
    // Notion's API: list children of parentPageId, filter by title.
    const children = (await notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 100,
    })) as { results: Array<{ id: string; type?: string; child_page?: { title?: string } }> }

    for (const block of children.results) {
      if (block.type === 'child_page' && block.child_page?.title === title) {
        return block.id
      }
    }

    // Not found — create it
    const created = (await notion.pages.create({
      parent: { type: 'page_id', page_id: parentPageId },
      properties: {
        title: { title: [{ type: 'text', text: { content: title } }] },
      },
    })) as SearchPage
    return created.id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[brain/sync] findOrCreatePage failed:', title, message)
    return null
  }
}

/**
 * Upsert one doc-page under a section parent. Returns 'created', 'updated', or 'skipped'.
 *
 * Strategy:
 *  - Use the brain doc's path leaf as the page title (e.g. 'acme-corp.md' → 'acme-corp')
 *  - Store the content_hash on the page's title (e.g. "acme-corp · h:abc123") so we
 *    can detect unchanged docs without rewriting the body. Crude but reliable.
 *  - If hash matches → skip.
 *  - If hash differs → archive (or update title) and write new page.
 *
 * For simplicity in v1 we just create a fresh page per sync if the existing
 * title doesn't match by stem. Idempotent enough for cron-driven sync.
 */
async function upsertDocPage(
  notion: NotionClient,
  sectionPageId: string,
  doc: BrainDocument,
): Promise<'created' | 'updated' | 'skipped'> {
  const stem = (doc.path.split('/').pop() ?? doc.path).replace(/\.md$/, '')
  const hashSuffix = doc.contentHash.slice(0, 8)
  const titleWithHash = `${stem} · h:${hashSuffix}`

  // Find existing page with the same stem (any hash)
  const children = (await notion.blocks.children.list({
    block_id: sectionPageId,
    page_size: 100,
  })) as { results: Array<{ id: string; type?: string; child_page?: { title?: string } }> }

  let existingPageId: string | null = null
  let alreadyCurrent = false
  for (const block of children.results) {
    if (block.type !== 'child_page') continue
    const t = block.child_page?.title ?? ''
    if (t === titleWithHash) {
      alreadyCurrent = true
      existingPageId = block.id
      break
    }
    if (t.startsWith(`${stem} · h:`) || t === stem) {
      existingPageId = block.id
    }
  }

  if (alreadyCurrent) return 'skipped'

  // Archive any stale version (rename, don't delete — customer can review)
  if (existingPageId) {
    await notion.pages.update({
      page_id: existingPageId,
      archived: true,
    } as unknown as Parameters<typeof notion.pages.update>[0])
  }

  // Create a fresh page with new content and the new hash in the title.
  // Cast children to the Notion SDK's BlockObjectRequest[] — our minimal
  // markdownToBlocks produces structurally-correct payloads but the SDK's
  // discriminated union type is too strict for a generic returner.
  await notion.pages.create({
    parent: { type: 'page_id', page_id: sectionPageId },
    properties: {
      title: { title: [{ type: 'text', text: { content: titleWithHash } }] },
    },
    children: markdownToBlocks(doc.content) as unknown as Parameters<
      typeof notion.pages.create
    >[0]['children'],
  })

  return existingPageId ? 'updated' : 'created'
}

/**
 * Minimal markdown → Notion block converter. Handles:
 *  - # / ## / ### headings
 *  - paragraphs
 *  - - / * bullets
 *  - 1. numbered lists
 *  - > blockquote
 *  - --- horizontal rule
 *  - ``` code fences (lumped into a single code block)
 *
 * Notion's API is picky; intentionally simple to avoid format errors.
 * Anything we can't render becomes a paragraph.
 */
function markdownToBlocks(md: string): Array<Record<string, unknown>> {
  const lines = md.split('\n')
  const blocks: Array<Record<string, unknown>> = []

  let inCode = false
  let codeBuffer: string[] = []

  const flushCode = () => {
    if (codeBuffer.length === 0) return
    blocks.push({
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: codeBuffer.join('\n').slice(0, 2000) } }],
        language: 'plain text',
      },
    })
    codeBuffer = []
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (line.trim() === '---') {
      blocks.push({ object: 'block', type: 'divider', divider: {} })
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push(headingBlock(3, line.slice(4)))
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push(headingBlock(2, line.slice(3)))
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push(headingBlock(1, line.slice(2)))
      continue
    }
    if (line.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: { rich_text: [{ type: 'text', text: { content: line.slice(2).slice(0, 2000) } }] },
      })
      continue
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: bulletMatch[1].slice(0, 2000) } }],
        },
      })
      continue
    }
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numberedMatch) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: numberedMatch[1].slice(0, 2000) } }],
        },
      })
      continue
    }
    if (line.trim() === '') {
      continue
    }
    // Default paragraph
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: line.slice(0, 2000) } }] },
    })
  }

  if (inCode) flushCode()

  // Notion has a 100-block limit per API call; truncate to be safe.
  return blocks.slice(0, 100)
}

function headingBlock(level: 1 | 2 | 3, text: string): Record<string, unknown> {
  const type = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3'
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: [{ type: 'text', text: { content: text.slice(0, 2000) } }],
    },
  }
}

function prettifyDir(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
