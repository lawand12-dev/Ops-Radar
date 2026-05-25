/**
 * Weekly Brain Export cron (CP-26).
 *
 * Runs every Sunday at 23:00 UTC. For each customer with a provisioned
 * Notion Brain:
 *   1. Render the whole Notion workspace to markdown files
 *   2. Zip them
 *   3. Upload to Supabase Storage (private bucket per user)
 *   4. Email the customer with a 7-day signed download URL
 *
 * This is the Karpathy safety valve — agency owners get a clickable Notion UI
 * for daily work + a portable markdown snapshot they can take anywhere if
 * they ever leave OpsRadar.
 *
 * Auth: requires CRON_SECRET header (Vercel cron). No customer can call this.
 * Cost: ~10 MB per export per customer; one Resend email per customer.
 */

import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { Resend } from 'resend'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { exportBrainAsMarkdown } from '<npm>/lib/notion/export-markdown'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const BUCKET = 'brain-exports'
const FROM = 'OpsRadar <notifications@opsradar.co>'

export async function GET(req: NextRequest) {
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${(process.env.CRON_SECRET ?? '').trim()}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabaseClient()

  // Every customer with a provisioned Brain (Brain Home page exists).
  const { data: workspaces, error: listErr } = await supabase
    .from('notion_workspaces')
    .select('user_id, workspace_name')
    .neq('backfill_status', 'failed')
  if (listErr) {
    console.error('[brain-export] list workspaces failed:', listErr.message)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  const results: Array<{ user_id: string; status: string; reason?: string }> = []

  for (const ws of workspaces ?? []) {
    const userId = ws.user_id as string
    try {
      const outcome = await exportOneCustomer(userId)
      results.push({ user_id: userId, status: outcome.status, reason: outcome.reason })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[brain-export] failed for', userId, message)
      results.push({ user_id: userId, status: 'failed', reason: message.slice(0, 200) })
    }
  }

  const succeeded = results.filter((r) => r.status === 'succeeded').length
  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    detail: results,
  })
}

async function exportOneCustomer(userId: string): Promise<{
  status: 'succeeded' | 'skipped' | 'failed'
  reason?: string
}> {
  const supabase = getServerSupabaseClient()

  // 1. Render the Brain
  const exported = await exportBrainAsMarkdown(userId)
  if (!exported) {
    return { status: 'skipped', reason: 'no_workspace_or_token' }
  }
  if (exported.files.length === 0) {
    return { status: 'skipped', reason: 'empty_brain' }
  }

  // 2. Build the zip
  const zip = new JSZip()
  for (const file of exported.files) {
    zip.file(file.path, file.content)
  }
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // 3. Upload to Supabase Storage (private bucket)
  const isoWeek = isoWeekStamp()
  const storagePath = `${userId}/brain-export-${isoWeek}.zip`

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, zipBuffer, {
      contentType: 'application/zip',
      upsert: true,
    })
  if (uploadErr) {
    return { status: 'failed', reason: `upload_failed: ${uploadErr.message}` }
  }

  // 4. Signed URL valid for 7 days
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
  if (signErr || !signed) {
    return { status: 'failed', reason: `sign_failed: ${signErr?.message ?? 'unknown'}` }
  }

  // 5. Email the customer
  await emailBrainExport({
    userId,
    workspaceName: exported.workspaceName,
    signedUrl: signed.signedUrl,
    fileCount: exported.files.length,
    weekStamp: isoWeek,
  })

  return { status: 'succeeded' }
}

async function emailBrainExport(input: {
  userId: string
  workspaceName: string | null
  signedUrl: string
  fileCount: number
  weekStamp: string
}): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) {
    console.warn('[brain-export] RESEND_API_KEY not set — skipping email for', input.userId)
    return
  }

  const supabase = getServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(input.userId)
  if (error || !user?.email) return

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const companyName =
    typeof meta.company_name === 'string' ? meta.company_name : 'your agency'
  const firstName =
    typeof meta.first_name === 'string' && meta.first_name.length > 0
      ? meta.first_name
      : null
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `${companyName}'s Brain export — week of ${input.weekStamp}`,
      html: buildHtml({ greeting, companyName, signedUrl: input.signedUrl, fileCount: input.fileCount, weekStamp: input.weekStamp }),
      text: buildText({ greeting, companyName, signedUrl: input.signedUrl, fileCount: input.fileCount, weekStamp: input.weekStamp }),
    })
  } catch (err) {
    console.warn('[brain-export] Resend send failed:', err)
  }
}

function buildHtml(p: {
  greeting: string
  companyName: string
  signedUrl: string
  fileCount: number
  weekStamp: string
}): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:16px;line-height:1.5;color:#0a0a0a;">${p.greeting}</p>
  <p style="font-size:16px;line-height:1.5;color:#0a0a0a;">
    Your weekly <strong>${p.companyName} Brain</strong> export is ready — ${p.fileCount} markdown files snapshotted from your Notion workspace.
  </p>
  <p style="margin:28px 0;">
    <a href="${p.signedUrl}" style="display:inline-block;background:#0066FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:500;font-size:15px;">
      Download Brain export (week of ${p.weekStamp})
    </a>
  </p>
  <p style="font-size:13px;line-height:1.5;color:#777;">
    Link valid for 7 days. Your Brain in Notion is unchanged — this is just a portable markdown backup so you can take your data anywhere.
  </p>
  <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
  <p style="font-size:12px;line-height:1.5;color:#999;">
    OpsRadar — AI Chief of Staff for agencies and services businesses. Your Brain, your data, forever.
  </p>
</div>`
}

function buildText(p: {
  greeting: string
  companyName: string
  signedUrl: string
  fileCount: number
  weekStamp: string
}): string {
  return `${p.greeting}

Your weekly ${p.companyName} Brain export is ready — ${p.fileCount} markdown files snapshotted from your Notion workspace.

Download Brain export (week of ${p.weekStamp}):
${p.signedUrl}

Link valid for 7 days. Your Brain in Notion is unchanged — this is just a portable markdown backup so you can take your data anywhere.

— OpsRadar`
}

function isoWeekStamp(now: Date = new Date()): string {
  // Returns "2026-W21" — ISO week of the year. Standard ISO 8601.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((+d - +yearStart) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}
