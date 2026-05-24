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

// ConnectionDataSchema is a discriminated union: { authScheme, val: {...} }
// The actual OAuth fields (access_token, workspace_id, etc.) live inside `val`.
// We also fall back to the deprecated `params`/`data` fields.
function extractComposioToken(conn: {
  state?: unknown
  params?: Record<string, unknown>
  data?: Record<string, unknown>
}): { accessToken: string | undefined; meta: Record<string, unknown> } {
  const s = conn.state as Record<string, unknown> | null | undefined
  const val: Record<string, unknown> =
    s && typeof s === 'object' && s['val'] && typeof s['val'] === 'object'
      ? (s['val'] as Record<string, unknown>)
      : s && typeof s === 'object'
      ? s
      : {}
  const dep: Record<string, unknown> = conn.params ?? conn.data ?? {}
  const accessToken = (
    val['access_token'] ??
    val['oauth_token'] ??
    dep['access_token'] ??
    dep['oauth_token']
  ) as string | undefined
  return { accessToken, meta: { ...dep, ...val } }
}

export async function provisionBrainFromComposio(
  userId: string,
  composioConnectionId: string,
  agencyName?: string | null,
): Promise<void> {
  // Idempotency guard: if a workspace row already exists, only rotate the token.
  // This prevents concurrent provision calls (e.g. activate endpoint + webhook
  // firing simultaneously) from creating duplicate Brain setups in Notion.
  const earlyCheck = await getWorkspace(userId)
  if (earlyCheck) {
    const dbKeys = Object.keys(earlyCheck.databases ?? {})
    if (dbKeys.length > 0) {
      // Already fully provisioned — rotate the token from the new connection only.
      const composioForToken = getComposio()
      const connForToken = await composioForToken.connectedAccounts.get(composioConnectionId)
      const { accessToken: freshToken } = extractComposioToken(connForToken)
      if (freshToken) {
        const supabaseForToken = getServerSupabaseClient()
        await supabaseForToken
          .from('notion_workspaces')
          .update({ access_token_encrypted: JSON.stringify(encryptApiKey(freshToken)) })
          .eq('user_id', userId)
      }
      console.log('[brain/provision] already provisioned for user:', userId, '— token rotated')
      return
    }
    // Row exists but no databases yet — another provision call is in flight.
    console.log('[brain/provision] provision already in progress for user:', userId)
    return
  }

  const composio = getComposio()

  // Fetch the live Composio connection. ConnectionDataSchema is a discriminated
  // union on `authScheme` with the actual OAuth payload in the nested `val` field:
  //   { authScheme: "OAUTH2", val: { status: "ACTIVE", access_token: "...", ... } }
  // We also fall back to the deprecated `params`/`data` fields for older SDK versions.
  const conn = await composio.connectedAccounts.get(composioConnectionId)
  const { accessToken, meta } = extractComposioToken(conn)

  // Log token prefix (first 12 chars, never the full token) to diagnose
  // whether Composio is returning a real Notion token (ntn_*/secret_*) or
  // an internal reference. Safe to log — not enough to authenticate.
  console.log('[brain/provision] token prefix:', accessToken ? accessToken.slice(0, 12) + '...' : 'none', '| meta keys:', Object.keys(meta))

  if (!accessToken) {
    throw new Error(
      '[brain/provision] No access_token in Composio connection state for connection ' +
      composioConnectionId +
      ' — available keys: ' + JSON.stringify(Object.keys(meta))
    )
  }

  // Notion workspace metadata from the OAuth response stored in Composio.
  const workspaceId = (meta['workspace_id'] as string | undefined) ?? conn.id
  const workspaceName = (meta['workspace_name'] as string | undefined) ?? null
  const botId = (meta['bot_id'] as string | undefined) ?? null

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

  // Load any existing workspace data for the idempotency check inside provisionBrainIfNeeded.
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
