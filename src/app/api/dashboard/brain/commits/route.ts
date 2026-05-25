// CP-33 — Recent brain commits feed.
//
// Returns the last N commits with the paths touched in each. Used by the
// /dashboard/brain "Recent activity" block to make the Karpathy-style
// append-only ledger VISIBLE to the customer.
//
// Default limit 20. Each row joins in the count of versions written in that
// commit (one version per path) via a sub-select on brain_document_versions.

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

type CommitRow = {
  id: string
  message: string | null
  author_type: string
  created_at: string
  brain_document_versions: { path: string }[] | null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  )

  const supabase = await getSessionSupabaseClient()
  const { data, error } = await supabase
    .from('brain_commits')
    .select('id, message, author_type, created_at, brain_document_versions(path)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[brain/commits] query failed:', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const commits = (data ?? []).map((row) => {
    const r = row as unknown as CommitRow
    const paths = (r.brain_document_versions ?? []).map((v) => v.path)
    return {
      id: r.id,
      message: r.message,
      author_type: r.author_type,
      created_at: r.created_at,
      paths,
      paths_count: paths.length,
    }
  })

  return NextResponse.json({ commits })
}
