// Admin-only endpoint: sets a user's plan tier in user_metadata.
// Auth: bearer token must match ADMIN_PASSWORD env var (same as other admin routes).
//
// Usage:
//   curl -X POST https://opsradar.co/api/admin/set-plan \
//     -H "Authorization: Bearer $ADMIN_PASSWORD" \
//     -H "Content-Type: application/json" \
//     -d '{"user_id":"...","plan":"growth"}'
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { isValidPlan, type Plan } from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword === 'changeme') {
    console.error('[set-plan] ADMIN_PASSWORD missing or default');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasServerSupabaseClient()) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  let body: { user_id?: string; plan?: string };
  try {
    body = (await request.json()) as { user_id?: string; plan?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.user_id || typeof body.user_id !== 'string') {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }
  if (!isValidPlan(body.plan)) {
    return NextResponse.json(
      { error: 'invalid plan', valid_plans: ['starter', 'growth', 'pro', 'fo'] },
      { status: 400 },
    );
  }

  const plan: Plan = body.plan;
  const supabase = getServerSupabaseClient();

  // Read current metadata so we don't blow away other fields
  const { data: { user }, error: getErr } = await supabase.auth.admin.getUserById(body.user_id);
  if (getErr || !user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 });
  }

  const mergedMetadata = {
    ...(user.user_metadata ?? {}),
    plan,
  };

  const { error: updateErr } = await supabase.auth.admin.updateUserById(body.user_id, {
    user_metadata: mergedMetadata,
  });

  if (updateErr) {
    console.error('[set-plan] update failed:', updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: body.user_id, plan });
}
