// src/app/api/dashboard/automations/[id]/route.ts
//
// CP-20 Phase 5d — single-automation GET / PATCH / DELETE.
//
// PATCH only allows mutating status, autonomy, name, description. Spec
// edits must go through the COO chat (proposeAutomation → confirm install)
// because spec mutations need re-validation against the available trigger /
// action catalog and a fresh diff for the customer to confirm.
//
// DELETE removes the row; cascade in the schema (ON DELETE CASCADE on
// automation_runs / automation_trigger_instances) takes care of children.
// We also attempt to deactivate any Composio trigger instance — the
// composio-triggers helper is being added in a parallel commit; until it
// lands the deactivation is a TODO so we don't leave orphan ti_* triggers.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { inspectAutomation } from '<npm>/lib/automations/registry';
import { deactivateComposioTrigger } from '<npm>/lib/automations/composio-triggers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PatchBodySchema = z
  .object({
    status: z.enum(['active', 'paused', 'archived']).optional(),
    autonomy: z.enum(['ask', 'auto', 'off']).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(1000).optional(),
  })
  .strict()
  .refine(
    (obj) => Object.keys(obj).length > 0,
    { message: 'no_fields_to_update' },
  );

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const automation = await inspectAutomation(userId, id);
  if (!automation) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ automation });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const update = { ...parsed.data, updated_at: new Date().toISOString() };

  const supabase = await getSessionSupabaseClient();
  const { data, error } = await supabase
    .from('customer_automations')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[automations/patch] db error:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ automation: data });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = await getSessionSupabaseClient();

  // Ownership check first so we don't deactivate Composio triggers for
  // an automation that isn't ours. inspectAutomation is RLS-scoped to userId.
  const existing = await inspectAutomation(userId, id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Best-effort: stop Composio from delivering events for this automation.
  // Runs before the row delete so the FK in automation_trigger_instances
  // (ON DELETE CASCADE) doesn't wipe the rows we still need to look up.
  try {
    await deactivateComposioTrigger(id);
  } catch (err) {
    console.warn(
      '[automations/delete] composio deactivate failed (continuing):',
      err instanceof Error ? err.message : String(err),
    );
  }

  const { error } = await supabase
    .from('customer_automations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[automations/delete] db error:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
