// CP-33 — Brain dashboard summary.
//
// Returns counts that make the Brain "feel real" on /dashboard/brain:
//   - documents:   how many markdown documents exist
//   - commits_7d:  how active the brain has been this week
//   - last_commit: timestamp of the most recent write (any author)
//   - last_sync_to_notion: when the brain → notion sync last ran
//   - last_export: when the weekly markdown export last ran (zip emailed)
//
// All five queries are head-only COUNTs or single-row selects. Cheap.

import { NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await getSessionSupabaseClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [docsRes, commitsRes, lastCommitRes] = await Promise.all([
    supabase
      .from('brain_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('current_version_id', 'is', null),
    supabase
      .from('brain_commits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('brain_commits')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return NextResponse.json({
    documents: docsRes.count ?? 0,
    commits_7d: commitsRes.count ?? 0,
    last_commit_at: lastCommitRes.data?.created_at ?? null,
  })
}
