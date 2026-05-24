/**
 * Composio trigger registration helpers (CP-20, Phase 6).
 *
 * `registerComposioTrigger` is called by the install_automation COO tool after
 * a customer confirms an automation draft. It resolves the user's Composio
 * connected_account_id for the toolkit, calls `composio.triggers.create(...)`,
 * and writes the returned `ti_*` ID into `automation_trigger_instances` so the
 * webhook handler (src/app/api/automations/webhook/composio/route.ts) can route
 * fired events back to the right automation.
 *
 * `deactivateComposioTrigger` is the inverse — flips is_active=false on the
 * instance row and best-effort unregisters via the SDK.
 *
 * Composio v3 SDK shape (verified from @composio/core types):
 *   composio.triggers.create(userId, triggerSlug, { connectedAccountId, triggerConfig })
 *     → { triggerId: string }
 *   composio.triggers.delete(triggerId)
 */

import { getComposio, type ToolSlug } from '<npm>/lib/composio'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export type RegisterTriggerInput = {
  userId: string
  automationId: string
  toolkit: ToolSlug
  triggerSlug: string
  triggerConfig?: Record<string, unknown>
}

export type RegisterTriggerResult =
  | { ok: true; composioTriggerId: string; connectedAccountId: string }
  | { ok: false; error: string }

export async function registerComposioTrigger(
  input: RegisterTriggerInput,
): Promise<RegisterTriggerResult> {
  const { userId, automationId, toolkit, triggerSlug, triggerConfig } = input

  const supabase = getServerSupabaseClient()
  const { data: conn, error: connErr } = await supabase
    .from('composio_connections')
    .select('composio_connection_id')
    .eq('user_id', userId)
    .eq('tool_slug', toolkit)
    .eq('is_active', true)
    .maybeSingle()

  if (connErr) {
    return { ok: false, error: `connection lookup failed: ${connErr.message}` }
  }
  if (!conn) {
    return {
      ok: false,
      error: `${toolkit} is not connected — connect it from /dashboard/integrations first.`,
    }
  }

  // `composio_connection_id` in our DB == Composio's connected_account_id
  // (the same `ca_xxx` value Composio returns in webhook metadata).
  const connectedAccountId = (conn as { composio_connection_id: string | null })
    .composio_connection_id
  if (!connectedAccountId) {
    return {
      ok: false,
      error: `${toolkit} connection is missing a connection id (re-auth may be required).`,
    }
  }

  let composioTriggerId: string
  try {
    const composio = getComposio()
    const response = await composio.triggers.create(userId, triggerSlug, {
      connectedAccountId,
      triggerConfig: (triggerConfig ?? {}) as Record<string, unknown>,
    })
    composioTriggerId = response.triggerId
    if (!composioTriggerId) {
      return {
        ok: false,
        error: 'Composio returned no triggerId — toolkit may not support this trigger.',
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Composio trigger registration failed: ${message}` }
  }

  const { error: insErr } = await supabase
    .from('automation_trigger_instances')
    .insert({
      automation_id: automationId,
      user_id: userId,
      composio_trigger_id: composioTriggerId,
      trigger_slug: triggerSlug,
      connected_account_id: connectedAccountId,
      is_active: true,
    })

  if (insErr) {
    // Best-effort rollback at Composio so we don't leave an orphan ti_* row.
    try {
      await getComposio().triggers.delete(composioTriggerId)
    } catch (err) {
      console.warn(
        '[automations/composio-triggers] rollback delete failed:',
        err instanceof Error ? err.message : String(err),
      )
    }
    return {
      ok: false,
      error: `trigger instance insert failed: ${insErr.message}`,
    }
  }

  return { ok: true, composioTriggerId, connectedAccountId }
}

export async function deactivateComposioTrigger(automationId: string): Promise<void> {
  const supabase = getServerSupabaseClient()
  const { data: rows, error } = await supabase
    .from('automation_trigger_instances')
    .select('id, composio_trigger_id')
    .eq('automation_id', automationId)
    .eq('is_active', true)

  if (error) {
    console.warn(
      '[automations/composio-triggers] deactivate lookup failed:',
      error.message,
    )
    return
  }

  for (const row of rows ?? []) {
    const tid = (row as { composio_trigger_id: string }).composio_trigger_id
    try {
      await getComposio().triggers.delete(tid)
    } catch (err) {
      console.warn(
        `[automations/composio-triggers] best-effort delete failed for ${tid}:`,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  const { error: updateErr } = await supabase
    .from('automation_trigger_instances')
    .update({ is_active: false })
    .eq('automation_id', automationId)

  if (updateErr) {
    console.warn(
      '[automations/composio-triggers] is_active flip failed:',
      updateErr.message,
    )
  }
}
