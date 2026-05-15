import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

export type AuditSubmissionInput = {
  agencyType: string | null | undefined
  teamSize: string | number | null | undefined
  revenue: string | null | undefined
  activeClients: string | number | null | undefined
  automationWish: string | null | undefined
  websiteUrl: string | null | undefined
  email: string | null | undefined
}

const EMAIL_BLOCKLIST = ['test', 'example', 'mailinator', 'yopmail', 'guerrillamail', 'tempmail']
const BLOCKED_WEBSITE_PATTERNS = ['localhost', 'example.com', '127.0.0.1']

function toInt(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : Math.floor(value)
  const parsed = parseInt(String(value ?? ''), 10)
  return isNaN(parsed) ? null : parsed
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
  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  })
    .from('agency_submissions')
    .insert({
      agency_type: input.agencyType!.trim(),
      team_size: toInt(input.teamSize),
      revenue: input.revenue?.trim() || null,
      active_clients: toInt(input.activeClients),
      automation_wish: input.automationWish!.trim(),
      website_url: input.websiteUrl?.trim() || null,
    })

  if (error) {
    console.warn('[agency-submissions] failed to save submission:', error.message)
  }
}
