import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchClickupDeliveryData } from '<npm>/lib/integrations/clickup/adapter';
import { fetchAsanaDeliveryData } from '<npm>/lib/integrations/asana/adapter';
import type { DeliveryData } from '<npm>/lib/integrations/delivery-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:delivery:${userId}`;

type DeliveryResponse =
  | { status: 'ok'; data: DeliveryData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

type IntegrationRow = {
  tool: string;
  encrypted_token: string;
  iv: string;
  auth_tag: string;
  status: string;
};

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const supabase = getServerSupabaseClient();
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['clickup', 'asana']);

  const clickupRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'clickup' && r.status === 'connected',
  );
  const asanaRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'asana' && r.status === 'connected',
  );

  if (!clickupRow && !asanaRow) {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<DeliveryResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  const merged: DeliveryData = { active_projects: 0, overdue_tasks: 0, tasks: [] };
  const synced: string[] = [];

  if (clickupRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: clickupRow.encrypted_token,
        iv: clickupRow.iv,
        auth_tag: clickupRow.auth_tag,
      });
      const d = await fetchClickupDeliveryData(key);
      merged.active_projects += d.active_projects;
      merged.overdue_tasks += d.overdue_tasks;
      merged.tasks.push(...d.tasks);
      synced.push('clickup');
    } catch (err) {
      console.error('[delivery] clickup fetch failed:', err);
    }
  }

  if (asanaRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: asanaRow.encrypted_token,
        iv: asanaRow.iv,
        auth_tag: asanaRow.auth_tag,
      });
      const d = await fetchAsanaDeliveryData(key);
      merged.active_projects += d.active_projects;
      merged.overdue_tasks += d.overdue_tasks;
      merged.tasks.push(...d.tasks);
      synced.push('asana');
    } catch (err) {
      console.error('[delivery] asana fetch failed:', err);
    }
  }

  const lastSyncedAt = new Date().toISOString();
  if (synced.length > 0) {
    await supabase
      .from('integrations')
      .update({ last_synced_at: lastSyncedAt, last_error: null })
      .eq('client_id', userId)
      .in('tool', synced);
  }

  const payload: DeliveryResponse = {
    status: 'ok',
    data: merged,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
