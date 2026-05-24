/**
 * Brain provisioning helper.
 *
 * The single caller of provisionBrainIfNeeded(). Triggered automatically from
 * the Composio connection webhook when the user connects Notion (tool_slug === 'notion').
 *
 * Flow:
 *   1. Fetch the Composio connection to extract the raw OAuth access token.
 *   2. Instantiate a Notion SDK client with that token.
 *   3. Create "OpsRadar Brain" as a workspace-root page (parent: workspace).
 *   4. Provision all 20 databases + 7 strategic pages under that root.
 *   5. Upsert the notion_workspaces row with encrypted token + entity map.
 *
 * The function is idempotent: provisionBrainIfNeeded() short-circuits if the
 * Brain Home page already exists in the stored entity map. On reconnect it only
 * refreshes the encrypted token.
 *
 * Brain creation takes ~30 seconds (20 sequential Notion API calls to stay under
 * the 3 req/s rate limit). Call this fire-and-forget from the webhook handler;
 * never await it on the response path.
 */

import { Client } from '@notionhq/client'
import { getComposio } from '<npm>/lib/composio'
import { encryptApiKey } from '<npm>/lib/integrations/crypto'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getWorkspace } from './client'
import { provisionBrainIfNeeded } from './create-brain'

export async function provisionBrainFromComposio(
  userId: string,
  composioConnectionId: string,
  agencyName?: string | null,
): Promise<void> {
  const composio = getComposio()

  // Fetch the live Composio connection. The full Notion OAuth response is stored
  // in `state` (access_token, workspace_id, workspace_name, bot_id, etc.).
  const conn = await composio.connectedAccounts.get(composioConnectionId)
  const state = conn.state as Record<string, unknown>

  const accessToken = (state['access_token'] ?? state['oauth_token']) as string | undefined
  if (!accessToken) {
    throw new Error('[brain/provision] No access_token in Composio connection state for connection ' + composioConnectionId)
  }

  // Notion workspace metadata from the OAuth response stored in Composio.
  // Falls back to the connection ID if workspace_id is missing (shouldn't happen for Notion).
  const workspaceId = (state['workspace_id'] as string | undefined) ?? conn.id
  const workspaceName = (state['workspace_name'] as string | undefined) ?? null
  const botId = (state['bot_id'] as string | undefined) ?? null

  const notion = new Client({ auth: accessToken })

  // Create the top-level Brain root page in the user's Notion workspace.
  // parent: { type: 'workspace', workspace: true } places it at the root,
  // no parent page ID required. All 20 databases + 7 pages are nested under this.
  const rootPage = await notion.pages.create({
    parent: { type: 'workspace', workspace: true },
    properties: {
      title: { title: [{ type: 'text', text: { content: 'OpsRadar Brain' } }] },
    },
    icon: { type: 'emoji', emoji: '🧠' },
  })
  const parentPageId = rootPage.id

  // Load any existing workspace data for the idempotency check.
  const existing = await getWorkspace(userId)

  // Provision databases and strategic pages (skips if Brain Home already exists).
  const result = await provisionBrainIfNeeded(
    notion,
    parentPageId,
    existing?.databases ?? null,
    { agencyName },
  )

  const supabase = getServerSupabaseClient()

  if (result === null) {
    // Brain was already provisioned. Rotate the stored token only.
    await supabase
      .from('notion_workspaces')
      .update({ access_token_encrypted: JSON.stringify(encryptApiKey(accessToken)) })
      .eq('user_id', userId)
    return
  }

  await supabase.from('notion_workspaces').upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      workspace_name: workspaceName,
      bot_id: botId,
      access_token_encrypted: JSON.stringify(encryptApiKey(accessToken)),
      parent_page_id: parentPageId,
      databases: result.entities as unknown as Record<string, string>,
      connected_at: new Date().toISOString(),
      backfill_status: 'pending',
    },
    { onConflict: 'user_id' },
  )
}
