import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Profile = {
  email: string;
  full_name: string;
  company_name: string;
  timezone: string;
  role: string;
  blended_hourly_rate_usd: number;
};

const COMMON_TIMEZONES = new Set([
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Sydney',
]);

export async function GET(): Promise<NextResponse> {
  const supabase = await getSessionSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const profile: Profile = {
    email: data.user.email ?? '',
    full_name: typeof meta.full_name === 'string' ? meta.full_name : '',
    company_name: typeof meta.company_name === 'string' ? meta.company_name : '',
    timezone: typeof meta.timezone === 'string' ? meta.timezone : 'UTC',
    role: typeof meta.role === 'string' ? meta.role : '',
    blended_hourly_rate_usd: typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : 85,
  };
  return NextResponse.json({ profile });
}

type PatchBody = {
  full_name?: unknown;
  company_name?: unknown;
  timezone?: unknown;
  blended_hourly_rate_usd?: unknown;
};

function sanitizeText(input: unknown, max: number): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length > max) return null;
  return trimmed;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSessionSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const updates: Record<string, string | number> = {};

  if ('full_name' in body) {
    const v = sanitizeText(body.full_name, 80);
    if (v === null) return NextResponse.json({ error: 'invalid_full_name' }, { status: 400 });
    updates.full_name = v;
  }
  if ('company_name' in body) {
    const v = sanitizeText(body.company_name, 80);
    if (v === null) return NextResponse.json({ error: 'invalid_company_name' }, { status: 400 });
    updates.company_name = v;
  }
  if ('timezone' in body) {
    if (typeof body.timezone !== 'string' || !COMMON_TIMEZONES.has(body.timezone)) {
      return NextResponse.json({ error: 'invalid_timezone' }, { status: 400 });
    }
    updates.timezone = body.timezone;
  }
  if ('blended_hourly_rate_usd' in body) {
    const v = body.blended_hourly_rate_usd;
    if (typeof v !== 'number' || v < 1 || v > 10_000 || !Number.isFinite(v)) {
      return NextResponse.json({ error: 'invalid_blended_hourly_rate_usd' }, { status: 400 });
    }
    updates.blended_hourly_rate_usd = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const existing = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
  const merged = { ...existing, ...updates };

  const { error: updateErr } = await supabase.auth.updateUser({ data: merged });
  if (updateErr) {
    console.error('[profile] update failed:', updateErr);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
