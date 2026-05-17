import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { sanitizeString, serverErrorResponse } from '<npm>/lib/security';
import { applyRateLimit } from '<npm>/lib/rate-limit';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.co';
const SHARE_TTL_DAYS = 30;

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, 'share');
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const auditId     = sanitizeString(typeof b.auditId     === 'string' ? b.auditId     : '', 200);
  const accessToken = sanitizeString(typeof b.accessToken === 'string' ? b.accessToken : '', 200);

  if (!auditId || !accessToken) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();

  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, share_token, share_expires_at')
    .eq('id', auditId)
    .eq('access_token', accessToken)
    .single();

  if (error || !audit) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Return existing non-expired share token
  if (audit.share_token && audit.share_expires_at) {
    const expiresAt = new Date(audit.share_expires_at);
    if (expiresAt > new Date()) {
      return NextResponse.json({
        shareUrl: `${BASE_URL}/results/${audit.share_token}`,
        expiresAt: audit.share_expires_at,
      });
    }
  }

  const shareToken = randomUUID().replace(/-/g, '');
  const expiresAt  = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabase
    .from('audits')
    .update({ share_token: shareToken, share_expires_at: expiresAt })
    .eq('id', auditId);

  if (updateErr) {
    console.error('[share] update failed:', updateErr);
    return serverErrorResponse();
  }

  return NextResponse.json({
    shareUrl: `${BASE_URL}/results/${shareToken}`,
    expiresAt,
  });
}
