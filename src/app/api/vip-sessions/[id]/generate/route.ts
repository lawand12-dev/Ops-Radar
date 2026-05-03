// src/app/api/vip-sessions/[id]/generate/route.ts

import { type SupabaseClient } from '@supabase/supabase-js'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../../../lib/supabase-server'
import {
  getAdminSessionTokenFromCookieHeader,
  isValidAdminSessionToken,
} from '../../../../../lib/admin-session'
import { generateBlueprintData } from '../../../../../lib/vip-blueprint-prompt'
import { renderBlueprintHtml, blueprintFooterHtml } from '../../../../../lib/vip-html-renderer'
import { htmlToPdf } from '../../../../../lib/pdfshift'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

function requireAdmin(request: Request): Response | null {
  const token = getAdminSessionTokenFromCookieHeader(
    request.headers.get('cookie') ?? '',
  )
  return isValidAdminSessionToken(token)
    ? null
    : Response.json({ error: 'Unauthorized' }, { status: 401 })
}

function db(): SupabaseClient {
  return getServerSupabaseClient() as unknown as SupabaseClient
}

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const authErr = requireAdmin(request)
  if (authErr) return authErr

  const { id } = await params

  if (!hasServerSupabaseClient())
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  // Step 1: Load session
  const { data: session, error: sessionErr } = await db()
    .from('deep_audit_briefs')
    .select('id, agency_name, layer1_answers, layer1_consultant_fields')
    .eq('id', id)
    .single()

  if (sessionErr || !session)
    return Response.json({ error: 'Session not found' }, { status: 404 })

  const row = session as {
    id: string
    agency_name: string
    layer1_answers: Record<string, unknown>
    layer1_consultant_fields: Record<string, string>
  }

  // Step 2: Fetch knowledge base context (top 40 rows by recency)
  const { data: kbRows } = await db()
    .from('knowledge_base')
    .select('content')
    .limit(40)

  const knowledgeContext = ((kbRows ?? []) as { content: string }[])
    .map((r) => r.content)
    .join('\n\n---\n\n')
    .slice(0, 40000)

  // Step 3: Call Claude to generate structured blueprint JSON
  let blueprintData
  try {
    blueprintData = await generateBlueprintData(
      row.agency_name,
      row.layer1_answers ?? {},
      row.layer1_consultant_fields ?? {},
      knowledgeContext,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude generation failed'
    return Response.json({ error: msg }, { status: 500 })
  }

  // Step 4: Render HTML
  const html = renderBlueprintHtml(blueprintData)
  const footer = blueprintFooterHtml(row.agency_name)

  // Step 5: Convert HTML → PDF via PDFShift
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await htmlToPdf(html, {
      footer: { source: footer, height: '28px' },
      format: 'A4',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed'
    return Response.json({ error: msg }, { status: 500 })
  }

  // Step 6: Upload to Supabase Storage
  const storagePath = `${id}/blueprint.pdf`
  const supabase = getServerSupabaseClient()
  const { error: uploadErr } = await supabase.storage
    .from('vip-blueprints')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadErr)
    return Response.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 })

  // Step 7: Get public URL
  const { data: urlData } = supabase.storage
    .from('vip-blueprints')
    .getPublicUrl(storagePath)

  const pdfUrl = urlData.publicUrl

  // Step 8: Update session record
  await db()
    .from('deep_audit_briefs')
    .update({ pdf_url: pdfUrl, status: 'blueprint_ready' })
    .eq('id', id)

  return Response.json({ pdf_url: pdfUrl })
}
