/**
 * Brain storage operations (CP-27).
 *
 * `commitBrainChanges` is the only write path. Every change to the brain
 * goes through it. The function:
 *
 *   1. Inserts ONE brain_commits row (the commit metadata).
 *   2. For each path in `changes`, upserts a brain_documents row to
 *      establish stable document identity.
 *   3. Inserts a brain_document_versions row referencing both the
 *      document_id and the commit_id.
 *   4. Updates brain_documents.current_version_id to point at the new
 *      version (the "is_latest" rotation, done by FK update — no row
 *      mutation, autovacuum-friendly).
 *
 * All four happen in one Postgres call sequence; failures roll back via
 * Supabase JS catch (we don't have explicit BEGIN/COMMIT in supabase-js,
 * but the atomic property comes from each insert being individually
 * idempotent + the unique constraint on brain_documents.path).
 *
 * For now the public API is fire-and-forget — write failures log and
 * return a degraded result. The agents' primary memory remains Notion
 * during the transition; the brain table accumulates in parallel.
 */

import crypto from 'node:crypto'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { openai } from '<npm>/lib/openai'
import type {
  BrainDocument,
  CommitBrainChangesInput,
  CommitBrainChangesResult,
  DocumentHistoryEntry,
  DocumentHistoryInput,
  ListBrainPathsInput,
  LoadBrainDocumentsInput,
} from './types'

function sha256Hex(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

// ─── CP-35 — embed-on-commit for curated paths ───────────────────────────
//
// Only a small curated subset of brain paths gets embedded at write time:
//   pattern-cards/, decision-log/, risk-register/, employees/<slug>/learned-rules/
// Everything else stays embedding-free (per
// docs/strategy/three-tier-memory-architecture-2026.md §Adjustment 2 —
// embedding clients/, projects/, agent-runs/ would burn credits with no
// measurable retrieval gain). The HNSW index on brain_document_versions
// also has a matching WHERE clause so the index stays compact.

const EMBED_STRING_PREFIXES = [
  'pattern-cards/',
  'decision-log/',
  'risk-register/',
] as const

const EMBED_REGEX_PREFIXES: RegExp[] = [/^employees\/[^/]+\/learned-rules\//]

const EMBED_MODEL = 'text-embedding-3-small'

function shouldEmbedPath(path: string): boolean {
  if (EMBED_STRING_PREFIXES.some((p) => path.startsWith(p))) return true
  if (EMBED_REGEX_PREFIXES.some((r) => r.test(path))) return true
  return false
}

/**
 * Returns an OpenAI embedding for the given content, or null if anything
 * fails. NEVER throws — embedding is a best-effort enrichment; failures
 * must not block the brain commit.
 */
async function maybeEmbed(
  content: string,
): Promise<{ embedding: number[]; model: string } | null> {
  try {
    const trimmed = content.slice(0, 8000)
    if (!trimmed.trim()) return null
    const r = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: trimmed,
    })
    const vec = r.data[0]?.embedding
    if (!vec || vec.length !== 1536) return null
    return { embedding: vec, model: EMBED_MODEL }
  } catch (err) {
    console.warn(
      '[brain/store] embedding failed (continuing without):',
      err instanceof Error ? err.message : String(err),
    )
    return null
  }
}

/**
 * pgvector wants the literal `[0.123, 0.456, ...]` string form on insert
 * via supabase-js. (The column is `vector(1536)`; supabase-js serializes
 * via JSON.stringify by default which yields the same shape.)
 */
function vectorToLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}

// ─── Write path ──────────────────────────────────────────────────────────

export async function commitBrainChanges(
  input: CommitBrainChangesInput,
): Promise<CommitBrainChangesResult> {
  const { userId, message, authorType, agentRunId, changes } = input
  if (changes.length === 0) {
    return { commitId: '', versionIds: [], documentsCreated: 0, documentsUpdated: 0 }
  }

  const supabase = getServerSupabaseClient()

  // Step 1: create the commit
  const { data: commitRow, error: commitErr } = await supabase
    .from('brain_commits')
    .insert({
      user_id: userId,
      message: message ?? null,
      author_type: authorType,
      agent_run_id: agentRunId ?? null,
    })
    .select('id')
    .single()

  if (commitErr || !commitRow) {
    console.error('[brain/store] commit insert failed:', commitErr?.message)
    return { commitId: '', versionIds: [], documentsCreated: 0, documentsUpdated: 0 }
  }
  const commitId = commitRow.id as string

  // Step 2 + 3 + 4: per-path upsert document → insert version → update pointer
  const versionIds: string[] = []
  let created = 0
  let updated = 0

  for (const change of changes) {
    try {
      // 2a. Upsert the document row (stable identity per path).
      const { data: docRow, error: docErr } = await supabase
        .from('brain_documents')
        .upsert(
          {
            user_id: userId,
            path: change.path,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,path' },
        )
        .select('id, current_version_id')
        .single()

      if (docErr || !docRow) {
        console.warn('[brain/store] document upsert failed:', change.path, docErr?.message)
        continue
      }
      const documentId = docRow.id as string
      const wasNew = docRow.current_version_id == null
      if (wasNew) created += 1
      else updated += 1

      // 3. Insert version — with optional embedding for curated paths.
      // The embedding call is fire-and-forget at the per-path level: if it
      // fails, we still insert the version with embedding=null.
      const contentHash = sha256Hex(change.content)
      const embedResult = shouldEmbedPath(change.path)
        ? await maybeEmbed(change.content)
        : null

      const versionPayload: Record<string, unknown> = {
        user_id: userId,
        document_id: documentId,
        commit_id: commitId,
        path: change.path,
        content: change.content,
        content_hash: contentHash,
        content_size: Buffer.byteLength(change.content, 'utf8'),
      }
      if (embedResult) {
        versionPayload.embedding = vectorToLiteral(embedResult.embedding)
        versionPayload.embedding_model = embedResult.model
      }

      const { data: versionRow, error: versionErr } = await supabase
        .from('brain_document_versions')
        .insert(versionPayload as never)
        .select('id')
        .single()

      if (versionErr || !versionRow) {
        console.warn('[brain/store] version insert failed:', change.path, versionErr?.message)
        continue
      }
      const versionId = versionRow.id as string
      versionIds.push(versionId)

      // 4. Rotate the pointer
      const { error: updateErr } = await supabase
        .from('brain_documents')
        .update({
          current_version_id: versionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)

      if (updateErr) {
        console.warn('[brain/store] pointer rotation failed:', change.path, updateErr.message)
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err)
      console.warn('[brain/store] per-path threw:', change.path, m)
    }
  }

  return {
    commitId,
    versionIds,
    documentsCreated: created,
    documentsUpdated: updated,
  }
}

// ─── Read path ───────────────────────────────────────────────────────────

/**
 * Returns the current content of every brain document for a user.
 * One JOIN query — bounded by document count (~500 per customer), not
 * version history depth.
 *
 * For partial reads (e.g. "just give me pages/*.md"), pass `prefixes`.
 */
export async function loadBrainDocuments(
  input: LoadBrainDocumentsInput,
): Promise<BrainDocument[]> {
  const { userId, prefixes, limit } = input
  const supabase = getServerSupabaseClient()

  // Read the current pointer set
  let q = supabase
    .from('brain_documents')
    .select(
      'path, current_version_id, updated_at, brain_document_versions!brain_documents_current_version_id_fkey(content, content_hash, id)',
    )
    .eq('user_id', userId)
    .not('current_version_id', 'is', null)
    .order('path', { ascending: true })

  if (prefixes && prefixes.length > 0) {
    const filters = prefixes.map((p) => `path.like.${p}%`).join(',')
    q = q.or(filters)
  }
  if (limit) q = q.limit(limit)

  const { data, error } = await q
  if (error) {
    console.warn('[brain/store] loadBrainDocuments failed:', error.message)
    return []
  }

  return (data ?? []).flatMap((row) => {
    const v = (row as unknown as { brain_document_versions: { content?: string; content_hash?: string; id?: string } | null }).brain_document_versions
    if (!v || !v.content) return []
    return [{
      path: (row as { path: string }).path,
      content: v.content,
      contentHash: v.content_hash ?? '',
      versionId: v.id ?? '',
      updatedAt: (row as { updated_at: string }).updated_at,
    }]
  })
}

/**
 * Just the paths — light, for browsing / preflight before download.
 */
export async function listBrainPaths(
  input: ListBrainPathsInput,
): Promise<string[]> {
  const supabase = getServerSupabaseClient()
  let q = supabase
    .from('brain_documents')
    .select('path')
    .eq('user_id', input.userId)
    .not('current_version_id', 'is', null)
    .order('path', { ascending: true })

  if (input.prefix) q = q.like('path', `${input.prefix}%`)

  const { data, error } = await q
  if (error) {
    console.warn('[brain/store] listBrainPaths failed:', error.message)
    return []
  }
  return (data ?? []).map((r) => (r as { path: string }).path)
}

/**
 * Full version history for a single path — newest first.
 */
export async function documentHistory(
  input: DocumentHistoryInput,
): Promise<DocumentHistoryEntry[]> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('brain_document_versions')
    .select('id, commit_id, content_size, content_hash, created_at, brain_commits!inner(author_type, message)')
    .eq('user_id', input.userId)
    .eq('path', input.path)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 50)

  if (error) {
    console.warn('[brain/store] documentHistory failed:', error.message)
    return []
  }

  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string
      commit_id: string
      content_size: number
      content_hash: string
      created_at: string
      brain_commits: { author_type: string; message: string | null }
    }
    return {
      versionId: row.id,
      commitId: row.commit_id,
      authorType: row.brain_commits.author_type,
      commitMessage: row.brain_commits.message,
      contentSize: row.content_size,
      contentHash: row.content_hash,
      createdAt: row.created_at,
    }
  })
}

// ─── CP-35 — Semantic search over the curated brain ──────────────────────

export type SemanticSearchBrainInput = {
  userId: string
  query: string
  /** Optional path prefix filter, e.g. `employees/sarah/learned-rules/`. */
  prefix?: string
  /** Max number of matches to return (default 5). */
  limit?: number
}

export type SemanticSearchBrainMatch = {
  path: string
  content: string
  similarity: number
}

/**
 * Returns the top-K most semantically similar CURRENT-version brain
 * documents for a user, optionally restricted to one path prefix.
 *
 * Used by Apprentice Mode to find similar past rules before deriving a
 * new one (so we don't write near-duplicate rules each rejection).
 *
 * Safety: the caller MUST pass the authenticated user's id. The RPC
 * function trusts the parameter — RLS is enforced by always calling from
 * a server-only path with a known userId. Returns an empty list on any
 * failure (embedding error, RPC error, etc.) — never throws.
 */
export async function semanticSearchBrain(
  input: SemanticSearchBrainInput,
): Promise<SemanticSearchBrainMatch[]> {
  const { userId, query, prefix, limit } = input
  if (!query.trim()) return []

  const embedResult = await maybeEmbed(query)
  if (!embedResult) return []

  const supabase = getServerSupabaseClient()
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: Array<{ path: string; content: string; similarity: number }> | null
    error: unknown
  }>

  try {
    const { data, error } = await rpc('match_brain_documents', {
      target_user_id: userId,
      query_embedding: vectorToLiteral(embedResult.embedding),
      match_count: limit ?? 5,
      path_prefix: prefix ?? null,
    })
    if (error) {
      const msg = (error as { message?: string })?.message ?? String(error)
      console.warn('[brain/store] semanticSearchBrain rpc failed:', msg)
      return []
    }
    return (data ?? []).map((m) => ({
      path: m.path,
      content: m.content,
      similarity: m.similarity,
    }))
  } catch (err) {
    console.warn(
      '[brain/store] semanticSearchBrain threw:',
      err instanceof Error ? err.message : String(err),
    )
    return []
  }
}
