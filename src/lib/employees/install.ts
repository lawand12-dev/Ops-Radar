/**
 * Install / lifecycle operations for custom employees (CP-34b).
 *
 * One module that handles the four mutation paths the COO chat tools need:
 *   - install — persist a confirmed draft, return the slug + slug url
 *   - pause / resume — flip status, no row deletion
 *   - archive — soft-delete (status='archived'), preserves brain memory
 *
 * Schedule registration:
 *   The hourly dispatcher (src/trigger/dispatch-custom-employees.ts) scans
 *   ALL active custom_employees rows on every tick, so we don't need to
 *   register a separate Trigger.dev schedule per employee here. The row
 *   itself IS the registration. This keeps lifecycle simple — change a
 *   row, dispatcher picks it up next tick.
 *
 * RLS is enforced at the table level (the migration scopes every query to
 * auth.uid() = user_id). These functions still pass userId explicitly so
 * we have defense-in-depth + clear data-ownership.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { isReservedSlug } from './registry'
import type { CustomEmployeeDraft } from './compile'
import type { Database } from '<npm>/lib/database.types'

export type InstallCustomEmployeeInput = {
  userId: string
  draft: CustomEmployeeDraft
}

export type InstallCustomEmployeeResult =
  | {
      success: true
      slug: string
      employeeId: string
      url: string
    }
  | {
      success: false
      error: string
    }

export async function installCustomEmployee(
  input: InstallCustomEmployeeInput,
): Promise<InstallCustomEmployeeResult> {
  const { userId, draft } = input

  if (draft.unsupported) {
    return {
      success: false,
      error: `Cannot install — ${draft.unsupported.reason}`,
    }
  }

  if (isReservedSlug(draft.slug)) {
    return {
      success: false,
      error: `Slug "${draft.slug}" collides with a built-in agent. Pick a different slug.`,
    }
  }

  const supabase = getServerSupabaseClient()

  // Check for existing slug for THIS user — friendlier error than the DB
  // unique-constraint violation.
  const { data: existing } = await supabase
    .from('custom_employees')
    .select('id, status')
    .eq('user_id', userId)
    .eq('slug', draft.slug)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'archived') {
      // Reanimate the archived row with the new spec.
      const { data: updated, error: updateErr } = await supabase
        .from('custom_employees')
        .update({
          name: draft.name,
          role: draft.role,
          emoji: draft.emoji,
          persona_summary: draft.persona_summary,
          system_prompt: draft.system_prompt,
          schedule_cron: draft.schedule_cron,
          status: 'active',
          model_slug: draft.model_slug,
          max_steps: draft.max_steps,
          scoped_toolkits: draft.scoped_toolkits,
          scoped_brain_prefixes: draft.scoped_brain_prefixes,
        })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select('id')
        .single()
      if (updateErr || !updated) {
        return {
          success: false,
          error: `Failed to reactivate archived employee: ${updateErr?.message ?? 'unknown'}`,
        }
      }
      return {
        success: true,
        slug: draft.slug,
        employeeId: updated.id,
        url: `/dashboard/employees/${draft.slug}`,
      }
    }
    return {
      success: false,
      error: `You already have an employee with slug "${draft.slug}". Pick a different name or pause the existing one first.`,
    }
  }

  const insertPayload: Database['public']['Tables']['custom_employees']['Insert'] = {
    user_id: userId,
    slug: draft.slug,
    name: draft.name,
    role: draft.role,
    emoji: draft.emoji,
    persona_summary: draft.persona_summary,
    system_prompt: draft.system_prompt,
    schedule_cron: draft.schedule_cron,
    status: 'active',
    autonomy: 'ask',
    model_slug: draft.model_slug,
    max_steps: draft.max_steps,
    scoped_toolkits: draft.scoped_toolkits,
    scoped_brain_prefixes: draft.scoped_brain_prefixes,
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('custom_employees')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertErr || !inserted) {
    return {
      success: false,
      error: `Failed to create employee: ${insertErr?.message ?? 'unknown'}`,
    }
  }

  return {
    success: true,
    slug: draft.slug,
    employeeId: inserted.id,
    url: `/dashboard/employees/${draft.slug}`,
  }
}

// ─── Lifecycle: pause / resume / archive ────────────────────────────────

export type LifecycleAction = 'pause' | 'resume' | 'archive'

export async function changeCustomEmployeeStatus(input: {
  userId: string
  slug: string
  action: LifecycleAction
}): Promise<{ success: true; status: string } | { success: false; error: string }> {
  const { userId, slug, action } = input

  const newStatus =
    action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'archived'

  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .update({ status: newStatus })
    .eq('user_id', userId)
    .eq('slug', slug)
    .select('status')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: `Failed to ${action} employee "${slug}": ${error?.message ?? 'not found'}`,
    }
  }

  return { success: true, status: data.status }
}
