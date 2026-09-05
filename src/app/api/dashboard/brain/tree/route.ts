// CP-33 — Brain directory listing.
//
// Returns the customer's brain document paths grouped by top-level directory
// (kpi-snapshots/, risk-register/, pattern-cards/, etc.) with file counts.
//
// Used by the /dashboard/brain "Browse" block — gives the customer a
// glanceable view of how the Karpathy-style markdown brain is organized,
// without needing to render every file.

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { listBrainPaths } from '<npm>/lib/brain/store'
import { BRAIN_DIRECTORIES } from '<npm>/lib/brain/paths'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const paths = await listBrainPaths({ userId })

  // Group by top-level dir; every file counts toward its dir.
  // Root-level files (README.md) go under "_root".
  const grouped: Record<string, string[]> = {}
  for (const dir of BRAIN_DIRECTORIES) grouped[dir] = []
  grouped['_root'] = []

  for (const p of paths) {
    const slashIdx = p.indexOf('/')
    if (slashIdx === -1) {
      grouped['_root'].push(p)
    } else {
      const dir = p.slice(0, slashIdx)
      if (!grouped[dir]) grouped[dir] = []
      grouped[dir].push(p)
    }
  }

  const knownDirs = new Set<string>(BRAIN_DIRECTORIES)
  const directories = Object.entries(grouped)
    .map(([name, files]) => ({ name, count: files.length, files: files.slice(0, 50) }))
    .filter((d) => d.count > 0 || knownDirs.has(d.name))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ directories, total: paths.length })
}
