// FO branding CRUD. Gated to FO plan.
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { getFoBranding, isValidAccentColor, isValidLogoUrl } from '<npm>/lib/fo-branding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authenticate(): Promise<{ userId: string } | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan(user?.user_metadata ?? null);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }
  return { userId };
}

export async function GET(): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;
  const branding = await getFoBranding(auth.userId);
  return NextResponse.json({ branding });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

  let body: {
    brand_name?: unknown;
    logo_url?: unknown;
    accent_color?: unknown;
    email_from_name?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: {
    fo_user_id: string;
    brand_name: string | null;
    logo_url: string | null;
    accent_color: string | null;
    email_from_name: string | null;
    updated_at: string;
  } = {
    fo_user_id: auth.userId,
    brand_name: null,
    logo_url: null,
    accent_color: null,
    email_from_name: null,
    updated_at: new Date().toISOString(),
  };

  if (body.brand_name !== undefined) {
    if (body.brand_name === null || body.brand_name === '') {
      updates.brand_name = null;
    } else if (typeof body.brand_name === 'string' && body.brand_name.trim().length <= 80) {
      updates.brand_name = body.brand_name.trim();
    } else {
      return NextResponse.json({ error: 'invalid_brand_name' }, { status: 400 });
    }
  }

  if (body.logo_url !== undefined) {
    if (body.logo_url === null || body.logo_url === '') {
      updates.logo_url = null;
    } else if (isValidLogoUrl(body.logo_url)) {
      updates.logo_url = body.logo_url;
    } else {
      return NextResponse.json({ error: 'invalid_logo_url' }, { status: 400 });
    }
  }

  if (body.accent_color !== undefined) {
    if (body.accent_color === null || body.accent_color === '') {
      updates.accent_color = null;
    } else if (isValidAccentColor(body.accent_color)) {
      updates.accent_color = body.accent_color;
    } else {
      return NextResponse.json({ error: 'invalid_accent_color (expected #rrggbb)' }, { status: 400 });
    }
  }

  if (body.email_from_name !== undefined) {
    if (body.email_from_name === null || body.email_from_name === '') {
      updates.email_from_name = null;
    } else if (typeof body.email_from_name === 'string' && body.email_from_name.trim().length <= 60) {
      updates.email_from_name = body.email_from_name.trim();
    } else {
      return NextResponse.json({ error: 'invalid_email_from_name' }, { status: 400 });
    }
  }

  // Merge with existing so unset fields aren't overwritten with null.
  const supabase = getServerSupabaseClient();
  const { data: existing } = await supabase
    .from('fo_branding')
    .select('brand_name, logo_url, accent_color, email_from_name')
    .eq('fo_user_id', auth.userId)
    .maybeSingle();

  const finalUpdates = {
    fo_user_id: auth.userId,
    brand_name: body.brand_name !== undefined ? updates.brand_name : (existing?.brand_name as string | null) ?? null,
    logo_url: body.logo_url !== undefined ? updates.logo_url : (existing?.logo_url as string | null) ?? null,
    accent_color: body.accent_color !== undefined ? updates.accent_color : (existing?.accent_color as string | null) ?? null,
    email_from_name: body.email_from_name !== undefined ? updates.email_from_name : (existing?.email_from_name as string | null) ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('fo_branding')
    .upsert(finalUpdates, { onConflict: 'fo_user_id' });

  if (error) {
    console.error('[fo/branding] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    branding: {
      brand_name: finalUpdates.brand_name,
      logo_url: finalUpdates.logo_url,
      accent_color: finalUpdates.accent_color,
      email_from_name: finalUpdates.email_from_name,
    },
  });
}
