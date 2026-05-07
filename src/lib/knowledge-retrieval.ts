import { openai } from './openai'
import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536
const MAX_QUERY_CHARS = 8000
const DEFAULT_MATCH_THRESHOLD = 0.0
const MIN_OVERFETCH = 12
const MAX_OVERFETCH = 40
const CATEGORY_SCORE_BOOST = 0.04

let warnedHybridUnavailable = false

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

type KnowledgeCandidate = KnowledgeChunk & {
  retrievalScore: number
}

type RpcResult = {
  data: unknown
  error: { message?: string; code?: string } | null
}

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcResult>
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

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function overfetchCount(topK: number): number {
  return Math.max(topK, Math.min(Math.max(topK * 4, MIN_OVERFETCH), MAX_OVERFETCH))
}

function normalizeRows(
  rows: unknown,
  source: 'hybrid' | 'vector' | 'vector-category',
  categoryBias: string | null,
): KnowledgeCandidate[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row): KnowledgeCandidate => {
    const record = row && typeof row === 'object' && !Array.isArray(row)
      ? row as Record<string, unknown>
      : {}
    const category = typeof record.category === 'string' ? record.category : null
    const baseSimilarity =
      asNumber(record.similarity)
      ?? asNumber(record.vector_similarity)
      ?? asNumber(record.combined_score)
      ?? 0
    const combinedScore = asNumber(record.combined_score)
    const textRank = asNumber(record.text_rank)
    const retrievalScore = (combinedScore ?? baseSimilarity)
      + (categoryBias && category === categoryBias ? CATEGORY_SCORE_BOOST : 0)

    const metadata = (record.metadata ?? null) as Record<string, unknown> | null

    return {
      id: String(record.id ?? ''),
      slug: typeof record.slug === 'string' ? record.slug : null,
      sourceFile: String(record.source_file ?? 'unknown'),
      category,
      content: String(record.content ?? ''),
      similarity: baseSimilarity,
      metadata: {
        ...(metadata ?? {}),
        retrieval_source: source,
        retrieval_score: Number(retrievalScore.toFixed(6)),
        ...(combinedScore == null ? {} : { combined_score: combinedScore }),
        ...(textRank == null ? {} : { text_rank: textRank }),
      },
      retrievalScore,
    }
  })
}

function mergeCandidates(groups: KnowledgeCandidate[][]): KnowledgeCandidate[] {
  const byKey = new Map<string, KnowledgeCandidate>()

  for (const candidate of groups.flat()) {
    if (!candidate.id && !candidate.content) continue
    const key = candidate.slug
      ?? (candidate.id ? `id:${candidate.id}` : `${candidate.sourceFile}:${candidate.content.slice(0, 80)}`)
    const existing = byKey.get(key)
    if (!existing || candidate.retrievalScore > existing.retrievalScore) {
      byKey.set(key, candidate)
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
}

function selectDiverseCandidates(candidates: KnowledgeCandidate[], topK: number): KnowledgeChunk[] {
  const sorted = [...candidates].sort((a, b) => b.retrievalScore - a.retrievalScore)
  const selected: KnowledgeCandidate[] = []
  const selectedKeys = new Set<string>()
  const selectedSources = new Set<string>()
  const targetDistinctSources = Math.min(topK, Math.max(2, Math.ceil(topK * 0.6)))

  for (const candidate of sorted) {
    const key = candidate.slug ?? candidate.id
    if (!key || selectedKeys.has(key) || selectedSources.has(candidate.sourceFile)) continue
    selected.push(candidate)
    selectedKeys.add(key)
    selectedSources.add(candidate.sourceFile)
    if (selected.length >= targetDistinctSources) break
  }

  for (const candidate of sorted) {
    const key = candidate.slug ?? candidate.id
    if (!key || selectedKeys.has(key)) continue
    selected.push(candidate)
    selectedKeys.add(key)
    if (selected.length >= topK) break
  }

  return selected.slice(0, topK).map((candidate) => ({
    id: candidate.id,
    slug: candidate.slug,
    sourceFile: candidate.sourceFile,
    category: candidate.category,
    content: candidate.content,
    similarity: candidate.similarity,
    metadata: candidate.metadata,
  }))
}

async function fetchHybridMatches(
  rpcClient: RpcClient,
  queryEmbedding: number[],
  queryText: string,
  matchCount: number,
  categoryBias: string | null,
): Promise<KnowledgeCandidate[] | null> {
  const { data, error } = await rpcClient.rpc('match_knowledge_base_hybrid', {
    query_embedding: queryEmbedding as unknown as string,
    query_text: queryText,
    match_count: matchCount,
    match_threshold: DEFAULT_MATCH_THRESHOLD,
    filter_category: null,
    candidate_count: Math.max(matchCount * 2, matchCount),
  })

  if (error) {
    if (!warnedHybridUnavailable) {
      console.warn(
        '[knowledge-retrieval] hybrid RPC unavailable; falling back to vector search:',
        error.message ?? error.code ?? error,
      )
      warnedHybridUnavailable = true
    }
    return null
  }

  return normalizeRows(data, 'hybrid', categoryBias)
}

async function fetchVectorMatches(
  rpcClient: RpcClient,
  queryEmbedding: number[],
  matchCount: number,
  filterCategory: string | null,
  categoryBias: string | null,
): Promise<KnowledgeCandidate[]> {
  const args = {
    query_embedding: queryEmbedding as unknown as string,
    match_count: matchCount,
    match_threshold: DEFAULT_MATCH_THRESHOLD,
    filter_category: filterCategory,
  }
  let result = await rpcClient.rpc('match_knowledge_base', args)

  if (result.error && /filter_category|function|schema cache/i.test(result.error.message ?? '')) {
    result = await rpcClient.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding as unknown as string,
      match_count: matchCount,
      match_threshold: DEFAULT_MATCH_THRESHOLD,
    })
  }

  if (result.error) {
    console.warn('[knowledge-retrieval] match_knowledge_base RPC failed:', result.error.message)
    return []
  }

  return normalizeRows(
    result.data,
    filterCategory ? 'vector-category' : 'vector',
    categoryBias,
  )
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
  options: RetrievalOptions = {},
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
    console.log(`[knowledge-retrieval] applying category bias: ${filterCategory}`)
  }

  try {
    const supabase = getServerSupabaseClient()
    const rpcClient = supabase as unknown as RpcClient
    const matchCount = overfetchCount(topK)

    const hybridCandidates = await fetchHybridMatches(
      rpcClient,
      queryEmbedding,
      trimmed.slice(0, MAX_QUERY_CHARS),
      matchCount,
      filterCategory,
    )

    if (hybridCandidates && hybridCandidates.length > 0) {
      return selectDiverseCandidates(mergeCandidates([hybridCandidates]), topK)
    }

    const vectorGroups = await Promise.all([
      fetchVectorMatches(rpcClient, queryEmbedding, matchCount, null, filterCategory),
      filterCategory
        ? fetchVectorMatches(rpcClient, queryEmbedding, matchCount, filterCategory, filterCategory)
        : Promise.resolve([]),
    ])

    return selectDiverseCandidates(mergeCandidates(vectorGroups), topK)
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
