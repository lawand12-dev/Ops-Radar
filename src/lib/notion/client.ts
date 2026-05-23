/**
 * Notion SDK client per user.
 *
 * Scaffold — requires `@notionhq/client` installed and a row in `notion_workspaces`
 * containing an encrypted access token. Token is decrypted via the existing crypto helper.
 */

// import { Client } from '@notionhq/client'
// import { decrypt } from '<npm>/lib/integrations/crypto'
// import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

import type { NotionDatabasesMap } from './schema-keys'

export type NotionWorkspace = {
  user_id: string
  workspace_id: string
  workspace_name: string | null
  bot_id: string | null
  parent_page_id: string
  databases: NotionDatabasesMap
  connected_at: string
  last_synced_at: string | null
  backfill_status:
    | 'pending'
    | 'phase1'
    | 'phase2'
    | 'phase3'
    | 'complete'
    | 'failed'
}

export async function getWorkspace(_userId: string): Promise<NotionWorkspace | null> {
  // TODO(scaffold):
  //   const supabase = await getServerSupabaseClient()
  //   const { data } = await supabase
  //     .from('notion_workspaces')
  //     .select('*')
  //     .eq('user_id', userId)
  //     .maybeSingle()
  //   return data as NotionWorkspace | null
  throw new Error('Notion workspace lookup not wired yet — see src/lib/notion/client.ts')
}

export async function getNotionClient(_userId: string): Promise<unknown> {
  // TODO(scaffold): after `npm install @notionhq/client`:
  //   const ws = await getWorkspace(userId)
  //   if (!ws) throw new Error('User has not connected Notion')
  //   const accessToken = await decrypt(ws.access_token_encrypted)
  //   return new Client({ auth: accessToken })
  throw new Error('Notion client not wired yet — see src/lib/notion/client.ts')
}

/**
 * Notion API rate limit is ~3 req/sec per integration token.
 * Wrap every write in this helper to back off and retry on 429.
 */
export async function withNotionRetry<T>(_op: () => Promise<T>, _maxRetries = 3): Promise<T> {
  // TODO(scaffold): implement exponential backoff on Notion 429 / 500 responses.
  throw new Error('withNotionRetry not implemented — see src/lib/notion/client.ts')
}
