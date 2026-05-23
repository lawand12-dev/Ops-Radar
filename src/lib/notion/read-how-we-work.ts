/**
 * Best-effort reader for the customer's "How We Work" Notion page.
 *
 * This page is created on first-connect by a parallel provisioning agent and
 * contains customer-editable rules in their own voice — things like:
 *   - "We never give discounts over 15%"
 *   - "Fire below-20% margin clients after 2 quarters"
 *   - "Sarah approves all invoices > $5K personally"
 *
 * The agent loop (src/lib/agents/loop.ts) calls this helper and appends the
 * returned string to every agent's system prompt at runtime. The page id is
 * looked up via the existing `notion_workspaces.databases` jsonb under the
 * slug `how_we_work_page_id`.
 *
 * TODO(parallel-agent): the slug `how_we_work_page_id` is the assumed key the
 * parallel agent (which owns create-brain.ts / page-templates.ts) will use to
 * store this page id. If they choose a different slug, update the constant
 * below to match. Until then, this helper returns null for every customer and
 * the agent loop gracefully falls through to the base system prompt.
 */

import type { Client } from '@notionhq/client'
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'

import { getNotionClient, getWorkspace, withNotionRetry } from '<npm>/lib/notion/client'

// Page slug for "How We Work" — matches NOTION_PAGE_SLUGS in schema-keys.ts.
// Page slugs use `__` prefix to namespace them inside the shared
// notion_workspaces.databases jsonb column (alongside DB ids).
const HOW_WE_WORK_SLUG = '__how_we_work'

/**
 * Reads the customer's "How We Work" Notion page and returns a plain-text /
 * Markdown-ish representation suitable for injection into a system prompt.
 *
 * Returns `null` if:
 *  - The user has not connected Notion
 *  - The page id is not present in `notion_workspaces.databases`
 *  - Any Notion API call fails (logged as a warning — this is best-effort
 *    enrichment, never throws)
 */
export async function readHowWeWork(userId: string): Promise<string | null> {
  try {
    const ws = await getWorkspace(userId)
    if (!ws) return null

    const databases = ws.databases as Record<string, string | undefined>
    const pageId = databases[HOW_WE_WORK_SLUG]
    if (!pageId) return null

    const notion = await getNotionClient(userId)
    const blocks = await fetchAllChildren(notion, pageId)
    const text = renderBlocks(blocks).trim()
    return text.length > 0 ? text : null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[readHowWeWork] failed:', message)
    return null
  }
}

/** Walks the block list, paginating via `start_cursor`. */
async function fetchAllChildren(
  notion: Client,
  blockId: string,
): Promise<BlockObjectResponse[]> {
  const all: BlockObjectResponse[] = []
  let cursor: string | undefined = undefined

  do {
    const res = await withNotionRetry(() =>
      notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      }),
    )
    for (const b of res.results) {
      if (isFullBlock(b)) all.push(b)
    }
    cursor = res.next_cursor ?? undefined
  } while (cursor)

  return all
}

function isFullBlock(
  b: BlockObjectResponse | PartialBlockObjectResponse,
): b is BlockObjectResponse {
  return 'type' in b
}

/**
 * Render blocks as Markdown-ish plain text. Preserves headings (#, ##, ###),
 * bullets (-), numbered list items (1.), todos ([ ] / [x]), quotes (>), and
 * code blocks. Unsupported / media blocks are skipped silently.
 */
function renderBlocks(blocks: BlockObjectResponse[]): string {
  const lines: string[] = []
  let numberedCounter = 0

  for (const block of blocks) {
    if (block.type !== 'numbered_list_item') numberedCounter = 0

    switch (block.type) {
      case 'heading_1':
        lines.push(`# ${richText(block.heading_1.rich_text)}`)
        break
      case 'heading_2':
        lines.push(`## ${richText(block.heading_2.rich_text)}`)
        break
      case 'heading_3':
        lines.push(`### ${richText(block.heading_3.rich_text)}`)
        break
      case 'paragraph': {
        const text = richText(block.paragraph.rich_text)
        if (text.length > 0) lines.push(text)
        break
      }
      case 'bulleted_list_item':
        lines.push(`- ${richText(block.bulleted_list_item.rich_text)}`)
        break
      case 'numbered_list_item':
        numberedCounter += 1
        lines.push(`${numberedCounter}. ${richText(block.numbered_list_item.rich_text)}`)
        break
      case 'to_do': {
        const mark = block.to_do.checked ? 'x' : ' '
        lines.push(`- [${mark}] ${richText(block.to_do.rich_text)}`)
        break
      }
      case 'quote':
        lines.push(`> ${richText(block.quote.rich_text)}`)
        break
      case 'callout':
        lines.push(`> ${richText(block.callout.rich_text)}`)
        break
      case 'code':
        lines.push('```')
        lines.push(richText(block.code.rich_text))
        lines.push('```')
        break
      case 'divider':
        lines.push('---')
        break
      default:
        // Skip unsupported / media block types silently.
        break
    }
  }

  return lines.join('\n')
}

function richText(items: RichTextItemResponse[]): string {
  return items.map((i) => i.plain_text).join('')
}
