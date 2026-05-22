import fs from 'fs'
import path from 'path'
import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

const KB_ROOT = path.join(process.cwd(), 'knowledge-base')
const CATEGORY_CHAR_BUDGET = 10000
const PER_FILE_CHAR_CAP = 2000
const MAX_CATEGORIES = 3

type RetrievalOptions = {
  agencyType?: string
  automationWish?: string
  category?: string
}

export type ChunkFrontmatter = {
  title?: string
  category?: string
  tags?: string[]
  authority?: 'primary-research' | 'industry-report' | 'playbook' | 'case-study' | 'anecdotal'
  publication_date?: string
  last_verified?: string
  coo_relevance?: number
  audit_relevance?: number
  summary?: string
}

export type KnowledgeChunk = {
  id: string
  slug: string | null
  sourceFile: string
  category: string | null
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
  frontmatter?: ChunkFrontmatter
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parseScalar(raw: string): string | number | string[] {
  const v = raw.trim()
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  }
  if (/^-?\d+$/.test(v)) return parseInt(v, 10)
  // strip surrounding quotes if present
  return v.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(raw: string): { frontmatter: ChunkFrontmatter; body: string } {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: {}, body: raw }

  const block = match[1]
  const body = raw.slice(match[0].length)
  const fm: Record<string, unknown> = {}

  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim()
    if (!key) continue
    fm[key] = parseScalar(value)
  }

  return { frontmatter: fm as ChunkFrontmatter, body }
}

function selectCategories(agencyType?: string, automationWish?: string): string[] {
  const pain = (automationWish ?? '').toLowerCase()
  const agency = (agencyType ?? '').toLowerCase()

  if (/fail|break|abandon|stuck|error|crash|timeout/.test(pain))
    return ['n8n-troubleshooting', 'n8n-core', 'failures']

  if (/hubspot|slack|stripe|airtable|google|notion|shopify|linkedin|meta|klaviyo|mailchimp/.test(pain))
    return ['tools', 'n8n-reference', 'n8n-playbooks']

  if (/n8n|zapier|make|workflow|automat|integrat|trigger/.test(pain))
    return ['n8n-playbooks', 'n8n-reference', 'n8n-workflows']

  if (/report|invoice|onboard|proposal|process|document/.test(pain))
    return ['patterns', 'n8n-playbooks']

  if (/churn|burnout|hiring|linkedin|objection|retention/.test(agency + pain))
    return ['agency-profiles']

  if (/benchmark|revenue|rate|cost|margin|pricing/.test(pain))
    return ['benchmarks', 'agency-profiles']

  return ['patterns', 'agency-profiles']
}

export function readCategory(category: string): KnowledgeChunk[] {
  const categoryPath = path.join(KB_ROOT, category)

  let files: string[]
  try {
    files = (fs.readdirSync(categoryPath, { encoding: 'utf-8' }) as string[])
      .filter(f => f.endsWith('.md') || f.endsWith('.json'))
      .filter(f => !/^[A-Z_-]+\.md$/.test(path.basename(f)))  // skip meta files like DEVELOPMENT.md
      .sort()
  } catch {
    return []
  }

  const chunks: KnowledgeChunk[] = []
  let remaining = CATEGORY_CHAR_BUDGET

  for (const file of files) {
    if (remaining <= 0) break
    const filePath = path.join(categoryPath, file)
    let raw: string
    try {
      raw = fs.readFileSync(filePath, 'utf-8')
    } catch {
      continue
    }
    if (!raw.trim()) continue

    const { frontmatter, body } = parseFrontmatter(raw)
    const content = body.trim()
    if (!content) continue

    const truncated = content.slice(0, Math.min(remaining, PER_FILE_CHAR_CAP))
    remaining -= truncated.length

    chunks.push({
      id: `${category}/${file}`,
      slug: `${category}/${file}`,
      sourceFile: `knowledge-base/${category}/${file}`,
      category,
      content: truncated,
      similarity: 1.0,
      metadata: { retrieval_source: 'file' },
      frontmatter,
    })
  }

  return chunks
}

async function fetchSubmissionChunks(agencyType: string): Promise<KnowledgeChunk[]> {
  if (!agencyType.trim() || !hasServerSupabaseClient()) return []
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('agency_submissions')
      .select('id, agency_type, team_size, revenue, active_clients, automation_wish')
      .ilike('agency_type', `%${agencyType.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data) return []

    return data.map(row => ({
      id: row.id,
      slug: null,
      sourceFile: 'agency_submissions',
      category: 'real-submissions',
      content: [
        `Real agency: ${row.agency_type}`,
        row.team_size != null ? `${row.team_size} people` : '',
        row.revenue ? `${row.revenue} revenue` : '',
        row.active_clients != null ? `${row.active_clients} active clients` : '',
        `Main automation need: ${row.automation_wish}`,
      ].filter(Boolean).join(', '),
      similarity: 1.0,
      metadata: { retrieval_source: 'supabase-submissions' },
    }))
  } catch {
    return []
  }
}

export async function retrieveRelevantKnowledge(
  _query: string,
  _topK: number = 15, // retained for call-site compatibility; char budget controls output size
  options: RetrievalOptions = {},
): Promise<KnowledgeChunk[]> {
  if (!_query.trim()) return []

  const categories = options.category
    ? [options.category]
    : selectCategories(options.agencyType, options.automationWish).slice(0, MAX_CATEGORIES)

  const fileChunks = categories.flatMap(cat => readCategory(cat))
  const submissionChunks = await fetchSubmissionChunks(options.agencyType ?? '')
  return [...fileChunks, ...submissionChunks]
}

function selectCooCategories(query: string): string[] {
  const q = query.toLowerCase()
  // Tool/integration questions → integrations folder first
  if (/stripe|hubspot|harvest|clickup|pipedrive|apollo|asana|monday|toggl|calendly/.test(q))
    return ['integrations', 'patterns']
  // Playbook-flavored questions → playbooks first
  if (/script|template|conversation|how do i|playbook|framework/.test(q))
    return ['playbooks', 'agency-profiles']
  if (/margin|profit|reprice|pricing|rate|hourly cost/.test(q)) return ['benchmarks', 'playbooks']
  if (/churn|retention|onboarding|client/.test(q)) return ['playbooks', 'agency-profiles']
  if (/cash|invoice|overdue|collection/.test(q)) return ['playbooks', 'agency-profiles']
  if (/utilization|capacity|hours|burnout|hiring|team/.test(q)) return ['benchmarks', 'playbooks']
  if (/scope|overrun|project|delivery|deadline/.test(q)) return ['playbooks', 'patterns']
  if (/revenue|growth|benchmark/.test(q)) return ['benchmarks', 'agency-profiles']
  return ['agency-profiles', 'benchmarks']
}

function scoreCooChunk(chunk: KnowledgeChunk): number {
  const fm = chunk.frontmatter ?? {}
  let score = 0

  if (typeof fm.coo_relevance === 'number') score += fm.coo_relevance * 2

  // Recency boost: 2 if published <6 months ago, 1 if <18 months, else 0
  if (fm.publication_date) {
    const t = new Date(fm.publication_date).getTime()
    if (!Number.isNaN(t)) {
      const ageMs = Date.now() - t
      const months = ageMs / (1000 * 60 * 60 * 24 * 30)
      if (months < 6) score += 2
      else if (months < 18) score += 1
    }
  }

  // Authority boost
  if (fm.authority === 'primary-research' || fm.authority === 'playbook') score += 1

  return score
}

export function retrieveCooKnowledge(query: string): KnowledgeChunk[] {
  if (!query.trim()) return []
  const categories = selectCooCategories(query).slice(0, 2)
  const allChunks = categories.flatMap((cat) => readCategory(cat))

  // Score each chunk; mutate `similarity` so it represents the ranking score
  for (const c of allChunks) {
    c.similarity = scoreCooChunk(c)
  }

  // Sort descending by score, then fill within 10KB budget (capped per-chunk)
  allChunks.sort((a, b) => b.similarity - a.similarity)

  let remaining = CATEGORY_CHAR_BUDGET
  const selected: KnowledgeChunk[] = []
  for (const c of allChunks) {
    if (remaining <= 0) break
    const trim = c.content.slice(0, Math.min(remaining, PER_FILE_CHAR_CAP))
    selected.push({ ...c, content: trim })
    remaining -= trim.length
  }
  return selected
}

/**
 * Hybrid retriever: semantic (pgvector) + keyword (category routing).
 * Semantic surfaces files the keyword router wouldn't pick because the
 * filename / category doesn't match; keyword surfaces files semantic
 * underweights because they're long / dense / multi-topic.
 *
 * Strategy:
 *   1. Run keyword retrieval (existing logic — fast, deterministic)
 *   2. Run semantic search in parallel (network call to OpenAI, then pgvector)
 *   3. Merge: dedupe by sourceFile, semantic matches outrank keyword unless
 *      already present, hybrid result capped at PER_FILE_CHAR_CAP per file
 *      and CATEGORY_CHAR_BUDGET overall.
 *
 * Failure mode: if semantic search returns empty (no OPENAI_API_KEY, no
 * embeddings yet, network failure), this gracefully degrades to keyword-only.
 */
export async function retrieveCooKnowledgeHybrid(query: string): Promise<KnowledgeChunk[]> {
  if (!query.trim()) return []

  // Lazy import to avoid pulling OpenAI client into modules that only need
  // the keyword retriever (and to keep client-side bundles small).
  const { semanticSearchKb } = await import('./coo/semantic-retrieval')

  const [keywordChunks, semanticMatches] = await Promise.all([
    Promise.resolve(retrieveCooKnowledge(query)),
    semanticSearchKb(query, 5).catch(() => []),
  ])

  // If we got useful semantic matches, layer them in: load the full chunk
  // by sourceFile (via readCategory) so we get the same fields as keyword.
  const semanticChunks: KnowledgeChunk[] = []
  for (const m of semanticMatches) {
    if (!m.category) continue
    // Skip if this file is already in the keyword set
    if (keywordChunks.some((k) => k.sourceFile === m.source_file)) continue
    const catChunks = readCategory(m.category)
    const match = catChunks.find((c) => c.sourceFile === m.source_file)
    if (match) {
      // Encode semantic similarity into the similarity field for ranking
      match.similarity = scoreCooChunk(match) + m.similarity * 2 // bias toward semantic hits
      semanticChunks.push(match)
    }
  }

  // Merge: semantic-augmented chunks first (they tend to be precision hits),
  // then keyword chunks. Apply the same 10KB budget.
  const merged = [...semanticChunks, ...keywordChunks]
  merged.sort((a, b) => b.similarity - a.similarity)

  let remaining = CATEGORY_CHAR_BUDGET
  const selected: KnowledgeChunk[] = []
  const seen = new Set<string>()
  for (const c of merged) {
    if (remaining <= 0) break
    if (seen.has(c.sourceFile)) continue
    seen.add(c.sourceFile)
    const trim = c.content.slice(0, Math.min(remaining, PER_FILE_CHAR_CAP))
    selected.push({ ...c, content: trim })
    remaining -= trim.length
  }
  return selected
}

export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return ''

  const body = chunks
    .map((chunk) => {
      const sourceParts = [
        `[Source: ${chunk.sourceFile}]`,
        chunk.category ? `Category: ${chunk.category}` : '',
        chunk.slug ? `Slug: ${chunk.slug}` : '',
      ].filter(Boolean)

      return `${sourceParts.join('\n')}\n${chunk.content.trim()}`
    })
    .join('\n\n')

  return [
    'RELEVANT KNOWLEDGE FROM OPSRADAR RESEARCH LIBRARY:',
    body,
    '',
    "Use this knowledge to support your analysis. Cite specific findings when relevant. Never fabricate — only reference what's in the knowledge above.",
  ].join('\n')
}
