import fs from 'fs'
import path from 'path'

const KB_ROOT = path.join(process.cwd(), 'knowledge-base')
const CATEGORY_CHAR_BUDGET = 4000
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
    files = fs.readdirSync(categoryPath, { encoding: 'utf-8' })
      .filter(f => f.endsWith('.md') || f.endsWith('.json'))
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

    const truncated = content.slice(0, remaining)
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

export async function retrieveRelevantKnowledge(
  query: string,
  _topK: number = 15, // retained for call-site compatibility; char budget controls output size
  options: RetrievalOptions = {},
): Promise<KnowledgeChunk[]> {
  if (!query.trim()) return []

  const categories = options.category
    ? [options.category]
    : selectCategories(options.agencyType, options.automationWish).slice(0, MAX_CATEGORIES)

  return categories.flatMap(cat => readCategory(cat))
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
