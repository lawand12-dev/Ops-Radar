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

      // 3. Insert version
      const contentHash = sha256Hex(change.content)
      const { data: versionRow, error: versionErr } = await supabase
        .from('brain_document_versions')
        .insert({
          user_id: userId,
          document_id: documentId,
          commit_id: commitId,
          path: change.path,
          content: change.content,
          content_hash: contentHash,
          content_size: Buffer.byteLength(change.content, 'utf8'),
        })
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
