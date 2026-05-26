/**
 * STUB — Hire chat is offline pending the post-Gmail expansion.
 *
 * Per the "Gmail first, then expand" decision (2026-05-26), the Hire chat
 * compiler stays offline until the engine + Gmail employee are validated
 * end-to-end. When ready, this route wires `src/lib/hire/ai-sdk-tools.ts`
 * + `runAgent` to the chat UI's expected SSE protocol — same pattern as
 * /api/dashboard/employees/[slug]/chat.
 *
 * Returns a friendly 503 with `message` so the chat UI shows a clear note
 * instead of a generic "something went wrong".
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const OFFLINE_MESSAGE =
  'Custom hire is temporarily offline. The team is finishing the Gmail employee end-to-end first. In the meantime, hire one of the pre-built employees from your sidebar.'

export async function GET() {
  return NextResponse.json({
    sessions: [],
    messages: [],
    offline: true,
    message: OFFLINE_MESSAGE,
  })
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'hire_offline',
      message: OFFLINE_MESSAGE,
    },
    { status: 503 },
  )
}
