/**
 * Best-effort reader for the customer's "Decision Log" Notion page.
 *
 * The Decision Log is the running list of strategic decisions the customer
 * has made (and sometimes reversed): pricing changes, hiring / firing,
 * service-line shifts, vendor swaps. The COO chat appends new entries via
 * the `record_decision` tool; agents READ the page on every run so they
 * never re-suggest something the customer has already decided against.
 *
 * Returns null when the user has not connected Notion, the page id is not
 * in `notion_workspaces.databases`, or any Notion call fails. Mirrors the
 * shape of `readHowWeWork` so the agent loop can compose the two cheaply.
 */

import type { Client } from '@notionhq/client'
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'

import { getNotionClient, getWorkspace, withNotionRetry } from '<npm>/lib/notion/client'

// Page slug — matches NOTION_PAGE_SLUGS in schema-keys.ts.
const DECISION_LOG_SLUG = '__decision_log'

/**
 * Reads the customer's "Decision Log" Notion page and returns a plain-text /
 * Markdown-ish representation suitable for injection into a system prompt.
 *
 * Returns `null` if:
 *  - The user has not connected Notion
 *  - The page id is not present in `notion_workspaces.databases`
 *  - Any Notion API call fails (logged as a warning — this is best-effort
 *    enrichment, never throws)
 */
export async function readDecisionLog(userId: string): Promise<string | null> {
  try {
    const ws = await getWorkspace(userId)
    if (!ws) return null

    const databases = ws.databases as Record<string, string | undefined>
    const pageId = databases[DECISION_LOG_SLUG]
    if (!pageId) return null

    const notion = await getNotionClient(userId)
    const blocks = await fetchAllChildren(notion, pageId)
    const text = renderBlocks(blocks).trim()
    return text.length > 0 ? text : null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[readDecisionLog] failed:', message)
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
 * Render blocks as Markdown-ish plain text. Preserves headings, bullets,
 * numbered list items, todos, quotes, code blocks. Unsupported / media
 * blocks are skipped silently.
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
        lines.push(
          `${numberedCounter}. ${richText(block.numbered_list_item.rich_text)}`,
        )
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
