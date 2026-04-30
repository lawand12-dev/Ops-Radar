import { openai } from './openai'
import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536
const MAX_QUERY_CHARS = 8000

export type KnowledgeChunk = {
  id: string
  slug: string | null
  sourceFile: string
  category: string | null
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
}

/**
 * Map from audit pain category keywords to knowledge_base category names.
 * Used to bias retrieval toward relevant research when the pain is known.
 */
function painToCategory(agencyType?: string, automationWish?: string): string | null {
  const pain = (automationWish ?? '').toLowerCase()
  const agency = (agencyType ?? '').toLowerCase()

  if (/fail|break|abandon|orphan|collapse/.test(pain)) return 'failures'
  if (/n8n|zapier|make|platform|tool|stack/.test(pain)) return 'tools'
  if (/onboard|report|invoice|proposal|workflow|process/.test(pain)) return 'patterns'
  if (/churn|burnout|hiring|linkedin|objection/.test(agency + pain)) return 'agency-profiles'
  if (/benchmark|revenue|rate|cost|margin/.test(pain)) return 'benchmarks'
  return null
}

/**
 * Retrieve the top `topK` chunks from the OpsRadar research library whose
 * embeddings are closest to the given query string. Returns an empty array
 * instead of throwing if Supabase or OpenAI is unavailable — RAG is a
 * best-effort augmentation, not a hard dependency of the audit pipeline.
 *
 * Pass `agencyType` and `automationWish` to enable category-biased retrieval.
 */
export async function retrieveRelevantKnowledge(
  query: string,
  topK: number = 5,
  options: { agencyType?: string; automationWish?: string; category?: string } = {},
): Promise<KnowledgeChunk[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (!hasServerSupabaseClient()) {
    console.warn('[knowledge-retrieval] Supabase not configured; returning no chunks')
    return []
  }

  if (!(process.env.OPENAI_API_KEY ?? '').trim()) {
    console.warn('[knowledge-retrieval] OPENAI_API_KEY not set; returning no chunks')
    return []
  }

  let queryEmbedding: number[]
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: trimmed.slice(0, MAX_QUERY_CHARS),
    })
    queryEmbedding = response.data[0]?.embedding ?? []
  } catch (err) {
    console.warn(
      '[knowledge-retrieval] embedding request failed:',
      err instanceof Error ? err.message : err,
    )
    return []
  }

  if (queryEmbedding.length !== EMBEDDING_DIMS) {
    console.warn(
      `[knowledge-retrieval] unexpected embedding dimension ${queryEmbedding.length} (expected ${EMBEDDING_DIMS})`,
    )
    return []
  }

  // Determine category filter: explicit option > pain-derived > null (no filter)
  const filterCategory = options.category
    ?? painToCategory(options.agencyType, options.automationWish)
    ?? null

  if (filterCategory) {
    console.log(`[knowledge-retrieval] applying category filter: ${filterCategory}`)
  }

  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding as unknown as string,
      match_count: topK,
      match_threshold: 0.0,
      filter_category: filterCategory,
    })
    if (error) {
      console.warn('[knowledge-retrieval] match_knowledge_base RPC failed:', error.message)
      return []
    }
    if (!Array.isArray(data)) return []

    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      slug: typeof row.slug === 'string' ? row.slug : null,
      sourceFile: String(row.source_file ?? 'unknown'),
      category: typeof row.category === 'string' ? row.category : null,
      content: String(row.content ?? ''),
      similarity: typeof row.similarity === 'number' ? row.similarity : 0,
      metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    }))
  } catch (err) {
    console.warn(
      '[knowledge-retrieval] Supabase call failed:',
      err instanceof Error ? err.message : err,
    )
    return []
  }
}

/**
 * Format retrieved chunks into the block that gets appended to the audit
 * system prompt. Returns an empty string when there are no chunks, so callers
 * can unconditionally concatenate.
 */
export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return ''

  const body = chunks
    .map((chunk) => `[Source: ${chunk.sourceFile}]\n${chunk.content.trim()}`)
    .join('\n\n')

  return [
    'RELEVANT KNOWLEDGE FROM OPSRADAR RESEARCH LIBRARY:',
    body,
    '',
    "Use this knowledge to support your analysis. Cite specific findings when relevant. Never fabricate — only reference what's in the knowledge above.",
  ].join('\n')
}
