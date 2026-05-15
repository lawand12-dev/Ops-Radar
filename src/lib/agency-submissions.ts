import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

export type AuditSubmissionInput = {
  agencyType: string | null | undefined
  teamSize: string | number | null | undefined
  revenue: string | null | undefined
  activeClients: string | number | null | undefined
  automationWish: string | null | undefined
  websiteUrl: string | null | undefined
  email: string | null | undefined
  auditId: string | null | undefined   // idempotency key — prevents duplicate rows on retry
}

const EMAIL_BLOCKLIST = ['test', 'example', 'mailinator', 'yopmail', 'guerrillamail', 'tempmail']
const BLOCKED_WEBSITE_PATTERNS = ['localhost', 'example.com', '127.0.0.1']

function toInt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? Math.floor(numeric) : null
}

export function passesQualityFilter(input: AuditSubmissionInput): boolean {
  if (!input.agencyType?.trim()) return false

  if (!input.automationWish || input.automationWish.trim().length <= 20) return false

  const teamSize = toInt(input.teamSize)
  if (teamSize === null || teamSize < 1) return false

  if (!input.websiteUrl?.trim()) return false
  if (BLOCKED_WEBSITE_PATTERNS.some(p => input.websiteUrl!.toLowerCase().includes(p))) return false

  if (input.email) {
    const domain = input.email.split('@')[1]?.toLowerCase() ?? ''
    if (EMAIL_BLOCKLIST.some(blocked => domain.includes(blocked))) return false
  }

  return true
}

export async function saveAuditSubmission(input: AuditSubmissionInput): Promise<void> {
  if (!passesQualityFilter(input)) return
  if (!hasServerSupabaseClient()) return

  const supabase = getServerSupabaseClient()
  const { error } = await supabase
    .from('agency_submissions')
    .upsert(
      {
        agency_type: input.agencyType!.trim(),
        team_size: toInt(input.teamSize),
        revenue: input.revenue?.trim() || null,
        active_clients: toInt(input.activeClients),
        automation_wish: input.automationWish!.trim(),
        website_url: input.websiteUrl?.trim() || null,
        audit_id: input.auditId ?? null,
      },
      { onConflict: 'audit_id', ignoreDuplicates: true },
    )

  if (error) {
    throw new Error(`[agency-submissions] failed to save submission: ${error.message}`)
  }
}
