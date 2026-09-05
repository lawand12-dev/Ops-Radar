// Webhook registration API: list, create, delete, toggle.
// Branch: main / Supabase. Gated to Pro+ tier (custom_webhooks feature).
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { ALL_EVENT_TYPES, generateSigningSecret, type OpsRadarEventType } from '<npm>/lib/webhooks/dispatch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authenticate(): Promise<{ userId: string } | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan(user?.user_metadata ?? null);
  if (!canAccess(plan, 'custom_webhooks')) {
    return NextResponse.json(upgradeRequiredBody('pro'), { status: 402 });
  }

  return { userId };
}

function isValidEventType(value: string): value is OpsRadarEventType {
  return (ALL_EVENT_TYPES as readonly string[]).includes(value);
}

export async function GET(): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('outgoing_webhooks')
    .select('id, url, events, is_active, created_at, updated_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[webhooks] list failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    webhooks: data ?? [],
    available_events: ALL_EVENT_TYPES,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

  let body: { url?: string; events?: string[] };
  try {
    body = (await request.json()) as { url?: string; events?: string[] };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const url = (body.url ?? '').trim();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'url must use https' }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  for (const e of events) {
    if (typeof e !== 'string' || !isValidEventType(e)) {
      return NextResponse.json(
        { error: 'invalid event type', received: e, allowed: ALL_EVENT_TYPES },
        { status: 400 },
      );
    }
  }

  const signingSecret = generateSigningSecret();
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('outgoing_webhooks')
    .insert({
      user_id: auth.userId,
      url,
      events,
      signing_secret: signingSecret,
      is_active: true,
    })
    .select('id, url, events, is_active, created_at')
    .single();

  if (error) {
    console.error('[webhooks] insert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the signing secret ONCE (creation only) so the customer can store it.
  // We never expose it again via GET — they regenerate by deleting + recreating.
  return NextResponse.json({ ok: true, webhook: data, signing_secret: signingSecret }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('outgoing_webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId);

  if (error) {
    console.error('[webhooks] delete failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

  let body: { id?: string; is_active?: boolean; events?: string[] };
  try {
    body = (await request.json()) as { id?: string; is_active?: boolean; events?: string[] };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: { is_active?: boolean; events?: string[]; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  if (Array.isArray(body.events)) {
    for (const e of body.events) {
      if (typeof e !== 'string' || !isValidEventType(e)) {
        return NextResponse.json({ error: 'invalid event type', received: e }, { status: 400 });
      }
    }
    updates.events = body.events;
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('outgoing_webhooks')
    .update(updates)
    .eq('id', body.id)
    .eq('user_id', auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
