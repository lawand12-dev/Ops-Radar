/**
 * Dev-only Nango connectivity check (CP-45 migration spike, step 1).
 *
 * Calls `nango.listIntegrations()` using NANGO_SECRET_KEY_DEV to prove:
 *   1. The secret key in .env.local is valid
 *   2. The @nangohq/node SDK can talk to Nango's API from our infra
 *   3. The lazy singleton in src/lib/nango.ts works end-to-end
 *
 * This endpoint is NOT customer-facing. It's gated behind the admin password
 * (same gate as /api/admin-auth) so it can't be hit on the public internet.
 *
 * Delete this file once the migration is complete — it's a spike artifact,
 * not production code.
 */

import { NextResponse } from 'next/server'
import { getNango } from '<npm>/lib/nango'
import { requireAdminPassword } from '<npm>/lib/security-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const authResponse = requireAdminPassword(request)
  if (authResponse) return authResponse

  try {
    const nango = getNango()
    const { configs } = await nango.listIntegrations()

    return NextResponse.json({
      ok: true,
      sdk_version: '@nangohq/node@0.70.4',
      integration_count: configs.length,
      integrations: configs.map((c) => ({
        unique_key: c.unique_key,
        provider: c.provider,
        display_name: c.display_name ?? null,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        error: 'nango_check_failed',
        message,
        hint:
          'Check NANGO_SECRET_KEY_DEV is set in .env.local and matches the key shown in app.nango.dev → Environment Settings → API Keys.',
      },
      { status: 500 },
    )
  }
}
