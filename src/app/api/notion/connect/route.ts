/**
 * GET /api/notion/connect
 *
 * Kicks off the Notion OAuth flow. Generates a CSRF state token, stores it in
 * an httpOnly cookie, then 302-redirects the browser to Notion's authorize
 * endpoint. Notion will redirect back to /api/notion/callback with `code` +
 * `state`.
 */

import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getCurrentUserId } from '<npm>/lib/supabase-ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NOTION_OAUTH_STATE_COOKIE = 'notion_oauth_state'
const STATE_COOKIE_MAX_AGE_SECONDS = 600 // 10 minutes

function getOAuthEnv():
  | { ok: true; clientId: string; redirectUri: string }
  | { ok: false; reason: string } {
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
  return { ok: true, clientId, redirectUri }
}

export async function GET() {
  const env = getOAuthEnv()
  if (!env.ok) {
    return NextResponse.json(
      { error: 'notion_oauth_not_configured', message: env.reason },
      { status: 503 },
    )
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const state = randomBytes(16).toString('hex')

  const authorizeUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', env.clientId)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('owner', 'user')
  authorizeUrl.searchParams.set('redirect_uri', env.redirectUri)
  authorizeUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizeUrl.toString(), 302)
  response.cookies.set({
    name: NOTION_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
