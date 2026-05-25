/**
 * Brain storage types (CP-27).
 *
 * The OpsRadar-hosted git-like brain — Postgres-backed, not actual git.
 * See docs/adr/0004-three-tier-memory.md for the why.
 *
 * Public API surface:
 *   commitBrainChanges() — atomic multi-file write (Postgres transaction)
 *   loadBrainDocuments() — fetch current state for one user
 *   listBrainPaths()    — light index of paths only (no content)
 *   documentHistory()   — version history of a single path
 */

export type BrainAuthorType =
  | 'agent:revenue'
  | 'agent:collections'
  | 'agent:scope'
  | 'agent:delivery'
  | 'agent:briefing'
  | 'agent:profitability'
  | 'agent:team'
  | 'agent:growth'
  | 'agent:renewal'
  | 'agent:stack'
  | 'agent:evaluator'
  | 'coo-chat'
  | 'customer'
  | 'sync'
  | (string & {})

export type BrainChange = {
  /** Relative path inside the brain — e.g. "clients/acme-corp.md". */
  path: string
  /** Full markdown content. Stored as the whole new version, not a diff. */
  content: string
}

export type CommitBrainChangesInput = {
  userId: string
  message?: string
  authorType: BrainAuthorType
  agentRunId?: string
  changes: BrainChange[]
}

export type CommitBrainChangesResult = {
  commitId: string
  versionIds: string[]
  documentsCreated: number
  documentsUpdated: number
}

export type BrainDocument = {
  path: string
  content: string
  contentHash: string
  versionId: string
  updatedAt: string
}

export type LoadBrainDocumentsInput = {
  userId: string
  /** Optional path filter — only return docs whose path matches one of these prefixes. */
  prefixes?: string[]
  /** Optional cap (default: no limit). */
  limit?: number
}

export type ListBrainPathsInput = {
  userId: string
  prefix?: string
}

export type DocumentHistoryInput = {
  userId: string
  path: string
  limit?: number
}

export type DocumentHistoryEntry = {
  versionId: string
  commitId: string
  authorType: string
  commitMessage: string | null
  contentSize: number
  contentHash: string
  createdAt: string
}
