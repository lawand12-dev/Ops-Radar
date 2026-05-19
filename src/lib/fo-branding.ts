// FO white-label branding lib.
// Branch: main / Supabase.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export type FoBranding = {
  brand_name: string | null;
  logo_url: string | null;
  accent_color: string | null;
  email_from_name: string | null;
};

const EMPTY: FoBranding = {
  brand_name: null,
  logo_url: null,
  accent_color: null,
  email_from_name: null,
};

export async function getFoBranding(foUserId: string): Promise<FoBranding> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('fo_branding')
      .select('brand_name, logo_url, accent_color, email_from_name')
      .eq('fo_user_id', foUserId)
      .maybeSingle();
    if (error || !data) return EMPTY;
    return {
      brand_name: data.brand_name as string | null,
      logo_url: data.logo_url as string | null,
      accent_color: data.accent_color as string | null,
      email_from_name: data.email_from_name as string | null,
    };
  } catch {
    return EMPTY;
  }
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ABSOLUTE_URL_RE = /^https?:\/\//;

export function isValidAccentColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

export function isValidLogoUrl(value: unknown): value is string {
  return typeof value === 'string' && ABSOLUTE_URL_RE.test(value) && value.length <= 500;
}
