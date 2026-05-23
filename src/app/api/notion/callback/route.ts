/**
 * GET /api/notion/callback
 *
 * Notion redirects here after the user authorizes OpsRadar. We exchange the
 * `code` for an access token, then provision the customer's Brain:
 *   1. Create the "OpsRadar Brain" parent page in their workspace
 *   2. Create the launch-critical databases inside that page
 *   3. Encrypt + persist the access token and database map in `notion_workspaces`
 *
 * On success, redirect to /dashboard/integrations?notion=connected.
 * On failure, redirect to /dashboard/integrations?notion=failed&reason=<slug>.
 *
 * NB: The Inngest backfill is NOT fired here — `backfill_status` stays
 * 'pending' until Phase 4 wires it up.
 */

import { Client } from '@notionhq/client'
import { NextRequest, NextResponse } from 'next/server'

import { encryptApiKey } from '<npm>/lib/integrations/crypto'
import { createAllDatabases, createBrainParentPage } from '<npm>/lib/notion/create-brain'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NOTION_OAUTH_STATE_COOKIE = 'notion_oauth_state'
const INTEGRATIONS_PATH = '/dashboard/integrations'

type OAuthEnv = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getOAuthEnv(): { ok: true; env: OAuthEnv } | { ok: false; reason: string } {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return {
      ok: false,
      reason:
        'NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET, and NOTION_OAUTH_REDIRECT_URI must all be set.',
    }
  }
  return { ok: true, env: { clientId, clientSecret, redirectUri } }
}

function failureRedirect(request: NextRequest, reason: string): NextResponse {
  const url = new URL(INTEGRATIONS_PATH, request.nextUrl.origin)
  url.searchParams.set('notion', 'failed')
  url.searchParams.set('reason', reason)
  const response = NextResponse.redirect(url, 302)
  response.cookies.set({
    name: NOTION_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}

type NotionTokenResponse = {
  access_token: string
  workspace_id: string
  workspace_name?: string | null
  bot_id?: string | null
}

async function exchangeCodeForToken(
  env: OAuthEnv,
  code: string,
): Promise<NotionTokenResponse> {
  const basic = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64')
  const res = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.redirectUri,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Notion token exchange failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const json = (await res.json()) as Partial<NotionTokenResponse> & Record<string, unknown>
  if (typeof json.access_token !== 'string' || typeof json.workspace_id !== 'string') {
    throw new Error('Notion token response missing access_token or workspace_id')
  }

  return {
    access_token: json.access_token,
    workspace_id: json.workspace_id,
    workspace_name:
      typeof json.workspace_name === 'string' ? json.workspace_name : null,
    bot_id: typeof json.bot_id === 'string' ? json.bot_id : null,
  }
}

export async function GET(request: NextRequest) {
  const envCheck = getOAuthEnv()
  if (!envCheck.ok) {
    return NextResponse.json(
      { error: 'notion_oauth_not_configured', message: envCheck.reason },
      { status: 503 },
    )
  }
  const env = envCheck.env

  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const oauthError = request.nextUrl.searchParams.get('error')

  if (oauthError) {
    return failureRedirect(request, 'denied')
  }
  if (!code || !state) {
    return failureRedirect(request, 'missing_params')
  }

  const cookieState = request.cookies.get(NOTION_OAUTH_STATE_COOKIE)?.value
  if (!cookieState || cookieState !== state) {
    return failureRedirect(request, 'state_mismatch')
  }

  // 1. Exchange code for access token.
  let token: NotionTokenResponse
  try {
    token = await exchangeCodeForToken(env, code)
  } catch (err) {
    console.error('[notion/callback] token exchange failed:', err)
    return failureRedirect(request, 'token_exchange_failed')
  }

  // 2. Provision Brain (parent page + databases).
  const notion = new Client({ auth: token.access_token })
  let parentPageId: string
  let databases: Awaited<ReturnType<typeof createAllDatabases>>
  try {
    const parent = await createBrainParentPage(notion, token.workspace_id)
    parentPageId = parent.id
    databases = await createAllDatabases(notion, parentPageId)
  } catch (err) {
    console.error('[notion/callback] brain provisioning failed:', err)
    return failureRedirect(request, 'brain_provisioning_failed')
  }

  // 3. Encrypt access token and upsert workspace row.
  let storedToken: string
  try {
    const secret = encryptApiKey(token.access_token)
    storedToken = JSON.stringify(secret)
  } catch (err) {
    console.error('[notion/callback] token encryption failed:', err)
    return failureRedirect(request, 'encryption_failed')
  }

  try {
    const supabase = getServerSupabaseClient()
    const { error: upsertErr } = await supabase.from('notion_workspaces').upsert({
      user_id: userId,
      workspace_id: token.workspace_id,
      workspace_name: token.workspace_name,
      bot_id: token.bot_id,
      access_token_encrypted: storedToken,
      parent_page_id: parentPageId,
      databases,
      // TODO(phase-4): fire Inngest backfill event and let the worker move this
      // through phase1 → phase2 → phase3 → complete.
      backfill_status: 'pending',
    })
    if (upsertErr) {
      console.error('[notion/callback] supabase upsert failed:', upsertErr)
      return failureRedirect(request, 'persist_failed')
    }
  } catch (err) {
    console.error('[notion/callback] supabase upsert threw:', err)
    return failureRedirect(request, 'persist_failed')
  }

  // 4. Success — redirect into the dashboard, clearing the CSRF cookie.
  const successUrl = new URL(INTEGRATIONS_PATH, request.nextUrl.origin)
  successUrl.searchParams.set('notion', 'connected')
  const response = NextResponse.redirect(successUrl, 302)
  response.cookies.set({
    name: NOTION_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
