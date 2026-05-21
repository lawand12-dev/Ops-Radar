import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { chatV2Fetch } from '<npm>/lib/chatv2/client';
import { ChatV2Error } from '<npm>/lib/chatv2/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FRESH_TTL = 3 * 60;       // 3 minutes
const STALE_TTL = 24 * 60 * 60; // 24 hours

type WorkflowHealthEntry = {
  workflow_id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: Array<{
    execution_id: string;
    status: 'success' | 'failure' | 'running' | 'canceled';
    started_at: string | null;
    duration_ms: number | null;
    error_summary: string | null;
  }>;
};

type WorkflowHealthResponse =
  | { status: 'not_enrolled' }
  | { status: 'ok'; workflows: WorkflowHealthEntry[]; from_cache?: boolean }
  | { status: 'unavailable'; message: string };

let redisInstance: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisInstance !== undefined) return redisInstance;
  try {
    redisInstance = Redis.fromEnv();
    return redisInstance;
  } catch {
    redisInstance = null;
    return null;
  }
}

async function safeGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try { return (await r.get<T>(key)) ?? null; } catch { return null; }
}

async function safeSet<T>(key: string, value: T, ttl: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try { await r.set(key, value, { ex: ttl }); } catch { /* non-fatal */ }
}

function cacheKeys(userId: string) {
  return {
    fresh: `dash:workflow-health:${userId}`,
    stale: `dash:workflow-health:${userId}:stale`,
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse<WorkflowHealthResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const keys = cacheKeys(userId);

  const fresh = await safeGet<WorkflowHealthEntry[]>(keys.fresh);
  if (fresh) {
    return NextResponse.json({ status: 'ok', workflows: fresh, from_cache: true });
  }

  try {
    const body = await chatV2Fetch<{ project_id: string; workflows: WorkflowHealthEntry[] }>(
      '/workflows/health',
      { projectId: userId },
    );
    await Promise.all([
      safeSet(keys.fresh, body.workflows, FRESH_TTL),
      safeSet(keys.stale, body.workflows, STALE_TTL),
    ]);
    return NextResponse.json({ status: 'ok', workflows: body.workflows, from_cache: false });
  } catch (err) {
    if (err instanceof ChatV2Error) {
      if (err.isNotFound()) {
        return NextResponse.json({ status: 'not_enrolled' });
      }
      // Serve stale silently rather than showing an error
      if (err.isUnavailable()) {
        const stale = await safeGet<WorkflowHealthEntry[]>(keys.stale);
        if (stale) {
          return NextResponse.json({ status: 'ok', workflows: stale, from_cache: true });
        }
      }
      console.error(`[workflow-health] chatv2 ${err.status} ${err.code}: ${err.message}`);
      return NextResponse.json(
        { status: 'unavailable', message: `upstream_${err.status || 'error'}` },
        { status: 502 },
      );
    }
    console.error('[workflow-health] unexpected error:', err);
    return NextResponse.json(
      { status: 'unavailable', message: 'internal_error' },
      { status: 500 },
    );
  }
}
