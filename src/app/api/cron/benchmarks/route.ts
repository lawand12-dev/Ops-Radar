import { hasServerSupabaseClient } from '<npm>/lib/supabase-server'
import { serverErrorResponse } from '<npm>/lib/security'
import { runBenchmarkAggregation } from '<npm>/lib/benchmarks/aggregator'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET) {
    console.error('[benchmarks cron] missing CRON_SECRET')
    return serverErrorResponse()
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasServerSupabaseClient()) return serverErrorResponse()

  const stats = await runBenchmarkAggregation()
  console.log('[benchmarks cron] done', stats)
  return Response.json({ ok: true, stats })
}
