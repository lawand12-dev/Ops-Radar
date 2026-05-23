/**
 * "Brain Home" — the curated landing page the customer opens every morning.
 *
 * It is composed FROM the 20 Brain databases, not duplicating them. The first
 * cut (createBrainHomePage) ships with placeholder copy so the page is useful
 * the moment Notion is connected. The Briefing Agent calls updateBrainHomePage()
 * weekly to refresh the live numbers (MRR, cash, margin, risk top-3, etc.).
 *
 * Layout (top → bottom):
 *
 *   🧠 <Agency Name> Brain
 *   Maintained by your AI Ops Team · Last updated: <relative time>
 *
 *   ⏵ Greeting & week summary  (MRR / cash / margin / utilization deltas)
 *
 *   ⚠️ TOP 3 THINGS TO ACT ON  (from Risk Register — Open, by severity)
 *
 *   📊 12-WEEK TRENDS  (link to Weekly KPI Snapshots; native chart blocks land later)
 *
 *   ✨ THIS WEEK'S WINS  (resolved actions, value recovered, top 3-5 wins)
 *
 *   📚 EXPLORE YOUR BRAIN  (linked pages to every database + customer pages)
 *
 *   📝 HOW WE WORK  (link to the customer-editable How We Work page)
 *
 *   Footer: "← Powered by OpsRadar"
 *
 * Notion API note: `child_database` is NOT a creatable block type — Notion
 * synthesises those only from the page tree. To link to a database we use
 * `link_to_page` with a `database_id`. To link to another page we use
 * `link_to_page` with a `page_id`.
 *
 * Rate limit: Notion is ~3 req/sec per integration. Page creation is one call,
 * subsequent updates use a single `blocks.children.append` after wiping the
 * existing body via paginated list+delete (also sequential).
 */

import type { Client } from '@notionhq/client'
import type { BlockObjectRequest } from '@notionhq/client'

import { withNotionRetry } from './client'
import type {
  NotionDatabasesMap,
  NotionPagesMap,
  NotionWorkspaceEntityMap,
} from './schema-keys'

// ─────────────────────────────────────────────────────────────────────────────
// Block builders (local — kept identical in shape to page-templates.ts so each
// file is self-contained and easy to reason about).
// ─────────────────────────────────────────────────────────────────────────────

function rt(content: string): { type: 'text'; text: { content: string } } {
  return { type: 'text', text: { content } }
}

function paragraph(text: string): BlockObjectRequest {
  return {
    type: 'paragraph',
    paragraph: { rich_text: text ? [rt(text)] : [] },
  }
}

function h1(text: string): BlockObjectRequest {
  return { type: 'heading_1', heading_1: { rich_text: [rt(text)] } }
}

function h2(text: string): BlockObjectRequest {
  return { type: 'heading_2', heading_2: { rich_text: [rt(text)] } }
}

function bullet(text: string): BlockObjectRequest {
  return {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [rt(text)] },
  }
}

function divider(): BlockObjectRequest {
  return { type: 'divider', divider: {} }
}

type CalloutColor =
  | 'default'
  | 'gray_background'
  | 'blue_background'
  | 'green_background'
  | 'yellow_background'
  | 'orange_background'
  | 'red_background'

function callout(text: string, emoji = '💡', color: CalloutColor = 'default'): BlockObjectRequest {
  return {
    type: 'callout',
    callout: {
      rich_text: [rt(text)],
      icon: { type: 'emoji', emoji: emoji as never },
      color,
    },
  }
}

function linkToDatabase(databaseId: string): BlockObjectRequest {
  return {
    type: 'link_to_page',
    link_to_page: { type: 'database_id', database_id: databaseId },
  }
}

function linkToPageBlock(pageId: string): BlockObjectRequest {
  return {
    type: 'link_to_page',
    link_to_page: { type: 'page_id', page_id: pageId },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Body composition
// ─────────────────────────────────────────────────────────────────────────────

type ComposeArgs = {
  agencyName: string
  /** Pre-rendered "Last updated …" line (e.g. "Last updated 2 hours ago"). */
  lastUpdatedLabel: string
  databases: NotionDatabasesMap
  pages: NotionPagesMap
  /** Live data — when omitted, the placeholder copy is rendered instead. */
  live?: BrainHomeLiveData | null
}

/**
 * Live data the Briefing Agent computes and feeds into the page on its weekly pass.
 * All fields optional so a partial refresh still works.
 */
export type BrainHomeLiveData = {
  greetingName?: string
  mrr?: { current: number; deltaPctVsLastWeek?: number }
  cashCollected?: { current: number; deltaPctVsLastWeek?: number }
  marginMedianPct?: { current: number; deltaPpVsLastWeek?: number }
  utilizationPct?: { current: number; deltaPpVsLastWeek?: number }
  topRisks?: Array<{
    title: string
    severity: 'Critical' | 'High' | 'Medium' | 'Low'
    description?: string
  }>
  weeklyWinsValue?: number
  weeklyWinsBullets?: string[]
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  // Compact for large numbers ($1.2M / $12K), exact otherwise.
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '0%'
  return `${n.toFixed(1)}%`
}

function deltaArrow(delta?: number): string {
  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return '·'
  return delta > 0 ? '▲' : '▼'
}

function deltaLabelPct(delta?: number): string {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return 'flat vs last week'
  if (delta === 0) return 'flat vs last week'
  return `${deltaArrow(delta)} ${Math.abs(delta).toFixed(1)}% vs last week`
}

function deltaLabelPp(delta?: number): string {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return 'flat vs last week'
  if (delta === 0) return 'flat vs last week'
  return `${deltaArrow(delta)} ${Math.abs(delta).toFixed(1)} pp vs last week`
}

function severityCalloutColor(s: 'Critical' | 'High' | 'Medium' | 'Low'): CalloutColor {
  switch (s) {
    case 'Critical':
      return 'red_background'
    case 'High':
      return 'orange_background'
    case 'Medium':
      return 'yellow_background'
    case 'Low':
      return 'gray_background'
  }
}

function severityEmoji(s: 'Critical' | 'High' | 'Medium' | 'Low'): string {
  switch (s) {
    case 'Critical':
      return '🔴'
    case 'High':
      return '🟠'
    case 'Medium':
      return '🟡'
    case 'Low':
      return '⚪'
  }
}

function composeBrainHomeBody(args: ComposeArgs): BlockObjectRequest[] {
  const { agencyName, lastUpdatedLabel, databases, pages, live } = args
  const blocks: BlockObjectRequest[] = []

  // ── Title strip ──────────────────────────────────────────────────────────
  blocks.push(h1(`🧠 ${agencyName} Brain`))
  blocks.push(paragraph(`Maintained by your AI Ops Team · ${lastUpdatedLabel}`))
  blocks.push(divider())

  // ── Greeting & week summary ─────────────────────────────────────────────
  const greetingName = live?.greetingName?.trim()
  const greeting = greetingName ? `Hi ${greetingName} — this week:` : 'This week:'
  blocks.push(h2('⏵ Week summary'))
  blocks.push(paragraph(greeting))

  if (live) {
    if (live.mrr) {
      blocks.push(
        bullet(
          `MRR: ${formatUsd(live.mrr.current)}  (${deltaLabelPct(live.mrr.deltaPctVsLastWeek)})`,
        ),
      )
    }
    if (live.cashCollected) {
      blocks.push(
        bullet(
          `Cash collected: ${formatUsd(live.cashCollected.current)}  (${deltaLabelPct(
            live.cashCollected.deltaPctVsLastWeek,
          )})`,
        ),
      )
    }
    if (live.marginMedianPct) {
      blocks.push(
        bullet(
          `Margin (median): ${formatPct(live.marginMedianPct.current)}  (${deltaLabelPp(
            live.marginMedianPct.deltaPpVsLastWeek,
          )})`,
        ),
      )
    }
    if (live.utilizationPct) {
      blocks.push(
        bullet(
          `Team utilization: ${formatPct(live.utilizationPct.current)}  (${deltaLabelPp(
            live.utilizationPct.deltaPpVsLastWeek,
          )})`,
        ),
      )
    }
  } else {
    blocks.push(bullet('MRR: — (updated weekly by Briefing Agent)'))
    blocks.push(bullet('Cash collected: — (updated weekly by Briefing Agent)'))
    blocks.push(bullet('Margin (median): — (updated weekly by Briefing Agent)'))
    blocks.push(bullet('Team utilization: — (updated weekly by Briefing Agent)'))
  }

  blocks.push(divider())

  // ── Top 3 things to act on (from Risk Register) ─────────────────────────
  blocks.push(h2('⚠️ Top 3 things to act on'))
  const risks = (live?.topRisks ?? []).slice(0, 3)
  if (risks.length === 0) {
    blocks.push(
      callout(
        'No critical risks open right now. The Risk Register is empty (or your AI Ops Team has not run a full sweep yet). Open the Risk Register below to add risks manually any time.',
        '✅',
        'green_background',
      ),
    )
  } else {
    for (const r of risks) {
      const body = r.description
        ? `${r.title} — ${r.description}`
        : r.title
      blocks.push(
        callout(`[${r.severity}] ${body}`, severityEmoji(r.severity), severityCalloutColor(r.severity)),
      )
    }
  }
  if (databases.risk_register) {
    blocks.push(paragraph('Open in Notion → Risk Register:'))
    blocks.push(linkToDatabase(databases.risk_register))
  }
  blocks.push(divider())

  // ── 12-week trends ──────────────────────────────────────────────────────
  blocks.push(h2('📊 12-week trends'))
  blocks.push(
    paragraph(
      'Your last 12 Weekly KPI Snapshots — MRR, cash, margin, utilization, pipeline. Open in Notion to see the full chart view (native chart blocks coming soon).',
    ),
  )
  if (databases.kpi_snapshots) {
    blocks.push(linkToDatabase(databases.kpi_snapshots))
  }
  blocks.push(divider())

  // ── This week's wins ────────────────────────────────────────────────────
  blocks.push(h2("✨ This week's wins"))
  if (live?.weeklyWinsValue !== undefined) {
    blocks.push(
      callout(
        `Value recovered/protected this week: ${formatUsd(live.weeklyWinsValue)}`,
        '💰',
        'green_background',
      ),
    )
  } else {
    blocks.push(
      callout(
        'Value recovered/protected this week: — (updated weekly by Briefing Agent)',
        '💰',
        'gray_background',
      ),
    )
  }
  const wins = (live?.weeklyWinsBullets ?? []).slice(0, 5)
  if (wins.length === 0) {
    blocks.push(
      bullet(
        '(The Briefing Agent will list the 3–5 most impactful actions from your Agent Action Log here every week.)',
      ),
    )
  } else {
    for (const w of wins) blocks.push(bullet(w))
  }
  if (databases.action_log) {
    blocks.push(paragraph('Open in Notion → Agent Action Log:'))
    blocks.push(linkToDatabase(databases.action_log))
  }
  blocks.push(divider())

  // ── Explore your Brain ──────────────────────────────────────────────────
  blocks.push(h2('📚 Explore your Brain'))
  blocks.push(
    paragraph(
      'Every database in your Brain. Each one is editable directly in Notion — your AI Ops Team reads from and writes to them.',
    ),
  )
  if (databases.clients) {
    blocks.push(bullet('All clients →'))
    blocks.push(linkToDatabase(databases.clients))
  }
  if (databases.risk_register) {
    blocks.push(bullet('Risk register →'))
    blocks.push(linkToDatabase(databases.risk_register))
  }
  if (databases.pattern_cards) {
    blocks.push(bullet('Pattern cards →'))
    blocks.push(linkToDatabase(databases.pattern_cards))
  }
  if (databases.real_pnl) {
    blocks.push(bullet('Real P&L →'))
    blocks.push(linkToDatabase(databases.real_pnl))
  }
  if (databases.team) {
    blocks.push(bullet('Team capacity →'))
    blocks.push(linkToDatabase(databases.team))
  }
  if (databases.projects) {
    blocks.push(bullet('Projects →'))
    blocks.push(linkToDatabase(databases.projects))
  }
  if (databases.invoices) {
    blocks.push(bullet('Invoice tracker →'))
    blocks.push(linkToDatabase(databases.invoices))
  }
  if (databases.sales_pipeline) {
    blocks.push(bullet('Sales pipeline →'))
    blocks.push(linkToDatabase(databases.sales_pipeline))
  }
  if (databases.weekly_briefings) {
    blocks.push(bullet('Weekly briefings archive →'))
    blocks.push(linkToDatabase(databases.weekly_briefings))
  }
  if (databases.action_log) {
    blocks.push(bullet('Agent action log →'))
    blocks.push(linkToDatabase(databases.action_log))
  }
  blocks.push(divider())

  // ── How we work ─────────────────────────────────────────────────────────
  blocks.push(h2('📝 How we work'))
  blocks.push(
    paragraph(
      'Your operating rules — read by every agent before it acts. Edit this freely; nothing in your Brain is more important.',
    ),
  )
  if (pages.__how_we_work) {
    blocks.push(linkToPageBlock(pages.__how_we_work))
  } else {
    blocks.push(
      callout(
        'The "How We Work" page has not been provisioned yet. Reconnect Notion to seed it.',
        '⚠️',
        'yellow_background',
      ),
    )
  }
  blocks.push(divider())

  // ── Footer ──────────────────────────────────────────────────────────────
  blocks.push(paragraph('← Powered by OpsRadar'))

  return blocks
}

function defaultLastUpdatedLabel(now: Date = new Date()): string {
  return `Last updated ${now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}`
}

function extractAgencyName(workspaceName: string | undefined | null): string {
  const trimmed = workspaceName?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'Your Agency'
}

/**
 * Split block array into chunks the Notion `blocks.children.append` /
 * `pages.create` endpoints accept. The API limit is 100 children per call.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length <= size) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — create + update
// ─────────────────────────────────────────────────────────────────────────────

export type CreateBrainHomeArgs = {
  /** Optional workspace/agency name; defaults to "Your Agency" when blank. */
  agencyName?: string
  /** Optional clock injection for tests. */
  now?: Date
}

/**
 * Create the Brain Home page under the OpsRadar Brain parent.
 *
 * Called once on first Notion connect. Returns the home page id, which the
 * OAuth callback persists in `notion_workspaces.databases.__brain_home`.
 *
 * Seed content uses placeholder text where live data would go — the Briefing
 * Agent's weekly pass replaces it via updateBrainHomePage().
 */
export async function createBrainHomePage(
  notion: Client,
  parentPageId: string,
  databases: NotionWorkspaceEntityMap,
  args: CreateBrainHomeArgs = {},
): Promise<{ id: string }> {
  const agencyName = extractAgencyName(args.agencyName)
  const body = composeBrainHomeBody({
    agencyName,
    lastUpdatedLabel: defaultLastUpdatedLabel(args.now),
    databases: databases as NotionDatabasesMap,
    pages: databases as NotionPagesMap,
    live: null,
  })

  // Notion allows up to 100 children in `pages.create.children`. The Brain
  // Home body sits comfortably under that, but if a future iteration grows
  // it, the first 100 ship with the create call and the remainder are
  // appended via blocks.children.append.
  const [first, ...rest] = chunk(body, 100)
  const page = await withNotionRetry(() =>
    notion.pages.create({
      parent: { type: 'page_id', page_id: parentPageId },
      icon: { type: 'emoji', emoji: '🧠' as never },
      properties: {
        title: { title: [{ type: 'text', text: { content: `${agencyName} Brain Home` } }] },
      },
      children: first,
    }),
  )

  for (const next of rest) {
    await withNotionRetry(() =>
      notion.blocks.children.append({ block_id: page.id, children: next }),
    )
  }

  return { id: page.id }
}

export type UpdateBrainHomeArgs = {
  agencyName?: string
  workspaceName?: string | null
  /** Live snapshot composed by the Briefing Agent. Optional — partial OK. */
  live?: BrainHomeLiveData | null
  now?: Date
}

/**
 * Refresh the Brain Home page in place. Called by the Briefing Agent every
 * Monday morning after it has composed the week's snapshot.
 *
 * Implementation: list the existing top-level blocks, delete them, append the
 * freshly-composed body. We do not try to do a smart diff because (a) the
 * customer can edit databases, not the home page (the home page is purely
 * derived), and (b) wipe-and-rewrite keeps the code simple and matches the
 * "this is the agent's view of the world" mental model.
 */
export async function updateBrainHomePage(
  notion: Client,
  homePageId: string,
  databases: NotionWorkspaceEntityMap,
  args: UpdateBrainHomeArgs = {},
): Promise<void> {
  const agencyName = extractAgencyName(args.agencyName ?? args.workspaceName)
  const body = composeBrainHomeBody({
    agencyName,
    lastUpdatedLabel: defaultLastUpdatedLabel(args.now),
    databases: databases as NotionDatabasesMap,
    pages: databases as NotionPagesMap,
    live: args.live ?? null,
  })

  // Wipe existing top-level blocks (paginated — the SDK returns ≤100/page).
  let cursor: string | undefined
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const list = await withNotionRetry(() =>
      notion.blocks.children.list({
        block_id: homePageId,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    )
    for (const block of list.results) {
      if ('id' in block && typeof block.id === 'string') {
        await withNotionRetry(() => notion.blocks.delete({ block_id: block.id }))
      }
    }
    if (!list.has_more || !list.next_cursor) break
    cursor = list.next_cursor
  }

  // Append the freshly-composed body in 100-block chunks.
  for (const next of chunk(body, 100)) {
    await withNotionRetry(() =>
      notion.blocks.children.append({ block_id: homePageId, children: next }),
    )
  }
}
