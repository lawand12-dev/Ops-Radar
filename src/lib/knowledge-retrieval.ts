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

export type KnowledgeChunk = {
  id: string
  slug: string | null
  sourceFile: string
  category: string | null
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
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

function readCategory(category: string): KnowledgeChunk[] {
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
    let content: string
    try {
      content = fs.readFileSync(filePath, 'utf-8').trim()
    } catch {
      continue
    }
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
