/**
 * Notion SDK client per user.
 *
 * Workspace metadata lives in `notion_workspaces`. The OAuth access token is
 * AES-256-GCM encrypted with the same helper used for integration API keys —
 * we serialise the {encrypted_token, iv, auth_tag} object into the single
 * `access_token_encrypted` text column as JSON.
 */

import { Client, APIErrorCode, APIResponseError } from '@notionhq/client'

import { decryptApiKey, type EncryptedSecret } from '<npm>/lib/integrations/crypto'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

import type { NotionWorkspaceEntityMap } from './schema-keys'

export type NotionWorkspace = {
  user_id: string
  workspace_id: string
  workspace_name: string | null
  bot_id: string | null
  parent_page_id: string
  /**
   * Map of all OpsRadar Brain entities in this workspace. Database slugs
   * (e.g. `clients`, `risk_register`) map to Notion data-source ids; curated
   * page slugs (prefixed `__`, e.g. `__brain_home`, `__how_we_work`) map to
   * Notion page ids. Stored as jsonb in `notion_workspaces.databases` — the
   * column name is legacy from when only databases were tracked.
   */
  databases: NotionWorkspaceEntityMap
  connected_at: string
  last_synced_at: string | null
  backfill_status:
    | 'pending'
    | 'phase1'
    | 'phase2'
    | 'phase3'
    | 'complete'
    | 'failed'
  /** Internal — used by getNotionClient() to decrypt before instantiating SDK. */
  access_token_encrypted: string
}

const BACKFILL_STATUSES = [
  'pending',
  'phase1',
  'phase2',
  'phase3',
  'complete',
  'failed',
] as const

function normalizeBackfillStatus(value: string): NotionWorkspace['backfill_status'] {
  return (BACKFILL_STATUSES as readonly string[]).includes(value)
    ? (value as NotionWorkspace['backfill_status'])
    : 'pending'
}

export async function getWorkspace(userId: string): Promise<NotionWorkspace | null> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('notion_workspaces')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    user_id: data.user_id,
    workspace_id: data.workspace_id,
    workspace_name: data.workspace_name,
    bot_id: data.bot_id,
    parent_page_id: data.parent_page_id,
    databases: (data.databases ?? {}) as NotionWorkspaceEntityMap,
    connected_at: data.connected_at,
    last_synced_at: data.last_synced_at,
    backfill_status: normalizeBackfillStatus(data.backfill_status),
    access_token_encrypted: data.access_token_encrypted,
  }
}

/**
 * Returns an authenticated Notion SDK client for the user. Throws if the user
 * has not connected Notion or the stored token is malformed/cannot be decrypted.
 */
export async function getNotionClient(userId: string): Promise<Client> {
  const ws = await getWorkspace(userId)
  if (!ws) {
    throw new Error('User has not connected Notion')
  }

  let secret: EncryptedSecret
  try {
    secret = JSON.parse(ws.access_token_encrypted) as EncryptedSecret
  } catch {
    throw new Error('notion_workspaces.access_token_encrypted is not valid JSON')
  }

  const accessToken = decryptApiKey(secret)
  return new Client({ auth: accessToken })
}

/**
 * Notion API rate limit is ~3 req/sec per integration token.
 * Wrap every read/write through this helper. Retries on:
 *   - `rate_limited` (HTTP 429)
 *   - transient 5xx (`internal_server_error`, `service_unavailable`, `gateway_timeout`)
 *
 * Backoff: 500ms, 1500ms, 4500ms (× exponential).
 */
export async function withNotionRetry<T>(
  op: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  const baseDelay = 500
  let attempt = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await op()
    } catch (err) {
      if (attempt >= maxRetries || !isRetryable(err)) {
        throw err
      }
      const delay = baseDelay * Math.pow(3, attempt)
      await sleep(delay)
      attempt += 1
    }
  }
}

function isRetryable(err: unknown): boolean {
  if (APIResponseError.isAPIResponseError(err)) {
    if (err.code === APIErrorCode.RateLimited) return true
    if (err.code === APIErrorCode.InternalServerError) return true
    if (err.code === APIErrorCode.ServiceUnavailable) return true
    if (err.code === APIErrorCode.GatewayTimeout) return true
    if (err.status === 429) return true
  }
  if (err && typeof err === 'object') {
    const maybe = err as { status?: number; code?: string }
    if (maybe.status === 429) return true
    if (maybe.code === 'rate_limited') return true
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
