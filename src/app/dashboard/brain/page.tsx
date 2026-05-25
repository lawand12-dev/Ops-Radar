// /dashboard/brain (CP-33).
//
// Doc-backed 4-block layout — makes the customer's Brain VISIBLE as the moat
// it is: agents write here (Postgres-as-git), customer reads in Notion,
// keeps a weekly markdown zip forever.
//
//   1. Hero — counts that make the Brain "feel real"
//   2. Recent activity feed — Karpathy-style append-only ledger of commits
//   3. Three ownership doors — Notion / zip download / weekly email
//   4. Directory tree — browse what's inside
//
// Research basis:
//   - docs/strategy/three-tier-memory-architecture-2026.md (Karpathy critique
//     + the markdown export safety valve)
//   - docs/strategy/moats-and-friction-2026.md (ownership = moat)
//   - docs/strategy/path-a-strategy-2026.md (YC #4 Company Brain)

import { redirect } from 'next/navigation'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { BrainHero } from './_components/brain-hero'
import { BrainCommitsFeed } from './_components/brain-commits-feed'
import { BrainOwnershipDoors } from './_components/brain-ownership-doors'
import { BrainDirectoryTree } from './_components/brain-directory-tree'

export const dynamic = 'force-dynamic'

function notionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`
}

export default async function BrainPage() {
  const userId = await getCurrentUserId()
  if (!userId) redirect('/login')

  const supabase = getServerSupabaseClient()
  const { data: workspace } = await supabase
    .from('notion_workspaces')
    .select('databases')
    .eq('user_id', userId)
    .maybeSingle()

  const databases = (workspace?.databases ?? {}) as Record<string, string | undefined>
  const brainHomeId = databases['__brain_home']
  const notionUrl = brainHomeId ? notionPageUrl(brainHomeId) : null

  return (
    <div className="flex flex-col gap-6">
      <BrainHero />
      <BrainCommitsFeed />
      <BrainOwnershipDoors notionUrl={notionUrl} />
      <BrainDirectoryTree />
    </div>
  )
}
