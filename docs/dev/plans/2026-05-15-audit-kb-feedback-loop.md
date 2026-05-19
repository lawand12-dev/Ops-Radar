# Audit KB Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically save qualifying audit inputs to Supabase and inject real agency profiles into future audits via knowledge retrieval.

**Architecture:** A new `agency_submissions` Supabase table stores anonymized audit inputs that pass a quality filter. `knowledge-retrieval.ts` gains a second retrieval path that fetches up to 5 recent matching rows alongside the existing file-based chunks. A new `agency-submissions.ts` module handles the filter and write logic, called fire-and-forget from `generate-audit/route.ts` after a successful audit.

**Tech Stack:** TypeScript, Next.js 16 API Routes, Supabase (service role), Node.js `fs`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| Supabase migration | Apply | Create `agency_submissions` table + index + RLS |
| `src/lib/agency-submissions.ts` | Create | Quality filter + `saveAuditSubmission()` |
| `src/lib/knowledge-retrieval.ts` | Modify | Add `fetchSubmissionChunks()` + call in `retrieveRelevantKnowledge()` |
| `src/app/api/generate-audit/route.ts` | Modify | Import + call `saveAuditSubmission()` after audit saved |

---

## Task 1: Apply Supabase migration

**Files:**
- Apply via Supabase MCP: `agency_submissions` table

No test runner — verification is a live Supabase query.

- [ ] **Step 1: Apply the migration via Supabase MCP**

Run this SQL against project `nbdcrmepvwbfbcjqfubr`:

```sql
CREATE TABLE public.agency_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_type text NOT NULL,
  team_size integer,
  revenue text,
  active_clients integer,
  automation_wish text NOT NULL,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agency_submissions_type_idx
  ON public.agency_submissions (agency_type, created_at DESC);

ALTER TABLE public.agency_submissions ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Verify table exists**

Run:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agency_submissions'
ORDER BY ordinal_position;
```

Expected: 7 rows — `id`, `agency_type`, `team_size`, `revenue`, `active_clients`, `automation_wish`, `website_url`, `created_at`.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore(db): add agency_submissions table migration"
```

---

## Task 2: Create `src/lib/agency-submissions.ts`

**Files:**
- Create: `src/lib/agency-submissions.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/agency-submissions.ts` with this exact content:

```typescript
import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

export type AuditSubmissionInput = {
  agencyType: string | null | undefined
  teamSize: string | number | null | undefined
  revenue: string | null | undefined
  activeClients: string | number | null | undefined
  automationWish: string | null | undefined
  websiteUrl: string | null | undefined
  email: string | null | undefined
}

const EMAIL_BLOCKLIST = ['test', 'example', 'mailinator', 'yopmail', 'guerrillamail', 'tempmail']
const BLOCKED_WEBSITE_PATTERNS = ['localhost', 'example.com', '127.0.0.1']

function toInt(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : Math.floor(value)
  const parsed = parseInt(String(value ?? ''), 10)
  return isNaN(parsed) ? null : parsed
}

export function passesQualityFilter(input: AuditSubmissionInput): boolean {
  if (!input.agencyType?.trim()) return false

  if (!input.automationWish || input.automationWish.trim().length <= 20) return false

  const teamSize = toInt(input.teamSize)
  if (teamSize === null || teamSize < 1) return false

  if (!input.websiteUrl?.trim()) return false
  if (BLOCKED_WEBSITE_PATTERNS.some(p => input.websiteUrl!.toLowerCase().includes(p))) return false

  if (input.email) {
    const domain = input.email.split('@')[1]?.toLowerCase() ?? ''
    if (EMAIL_BLOCKLIST.some(blocked => domain.includes(blocked))) return false
  }

  return true
}

export async function saveAuditSubmission(input: AuditSubmissionInput): Promise<void> {
  if (!passesQualityFilter(input)) return
  if (!hasServerSupabaseClient()) return

  const supabase = getServerSupabaseClient()
  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  })
    .from('agency_submissions')
    .insert({
      agency_type: input.agencyType!.trim(),
      team_size: toInt(input.teamSize),
      revenue: input.revenue?.trim() || null,
      active_clients: toInt(input.activeClients),
      automation_wish: input.automationWish!.trim(),
      website_url: input.websiteUrl?.trim() || null,
    })

  if (error) {
    console.warn('[agency-submissions] failed to save submission:', error.message)
  }
}
```

- [ ] **Step 2: Run lint**

Run from `opsradar/`:
```bash
npm run lint 2>&1 | grep "agency-submissions"
```

Expected: no errors for `agency-submissions.ts`. (Pre-existing errors in other files are fine.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/agency-submissions.ts
git commit -m "feat(kb): add agency-submissions save with quality filter"
```

---

## Task 3: Add `fetchSubmissionChunks` to `knowledge-retrieval.ts`

**Files:**
- Modify: `src/lib/knowledge-retrieval.ts`

Two changes: (1) add the import + `fetchSubmissionChunks` function, (2) call it inside `retrieveRelevantKnowledge`.

- [ ] **Step 1: Add the Supabase import at the top of the file**

In `src/lib/knowledge-retrieval.ts`, after the existing imports (`import fs from 'fs'` and `import path from 'path'`), add:

```typescript
import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'
```

- [ ] **Step 2: Add `fetchSubmissionChunks` function**

Add this function before `retrieveRelevantKnowledge` (paste it right before the `export async function retrieveRelevantKnowledge` line):

```typescript
async function fetchSubmissionChunks(agencyType: string): Promise<KnowledgeChunk[]> {
  if (!agencyType.trim() || !hasServerSupabaseClient()) return []
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          ilike: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: Array<{
                  id: string
                  agency_type: string
                  team_size: number | null
                  revenue: string | null
                  active_clients: number | null
                  automation_wish: string
                }> | null
                error: { message: string } | null
              }>
            }
          }
        }
      }
    })
      .from('agency_submissions')
      .select('id, agency_type, team_size, revenue, active_clients, automation_wish')
      .ilike('agency_type', `%${agencyType.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data) return []

    return data.map(row => ({
      id: row.id,
      slug: null,
      sourceFile: 'agency_submissions',
      category: 'real-submissions',
      content: [
        `Real agency: ${row.agency_type}`,
        row.team_size != null ? `${row.team_size} people` : '',
        row.revenue ? `${row.revenue} revenue` : '',
        row.active_clients != null ? `${row.active_clients} active clients` : '',
        `Main automation need: ${row.automation_wish}`,
      ].filter(Boolean).join(', '),
      similarity: 1.0,
      metadata: { retrieval_source: 'supabase-submissions' },
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Call `fetchSubmissionChunks` inside `retrieveRelevantKnowledge`**

Find the current return statement inside `retrieveRelevantKnowledge`:

```typescript
  return categories.flatMap(cat => readCategory(cat))
```

Replace it with:

```typescript
  const fileChunks = categories.flatMap(cat => readCategory(cat))
  const submissionChunks = await fetchSubmissionChunks(options.agencyType ?? '')
  return [...fileChunks, ...submissionChunks]
```

- [ ] **Step 4: Run lint**

```bash
npm run lint 2>&1 | grep "knowledge-retrieval"
```

Expected: only the pre-existing `_topK` and `_query` unused-var warnings. No new errors.

- [ ] **Step 5: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build completes successfully, all pages generated.

- [ ] **Step 6: Commit**

```bash
git add src/lib/knowledge-retrieval.ts
git commit -m "feat(kb): inject real agency submissions into audit retrieval"
```

---

## Task 4: Call `saveAuditSubmission` from `generate-audit/route.ts`

**Files:**
- Modify: `src/app/api/generate-audit/route.ts`

- [ ] **Step 1: Add the import**

At the top of `src/app/api/generate-audit/route.ts`, find the block of lib imports (the lines importing from `'../../../lib/...'`). Add this line alongside them:

```typescript
import { saveAuditSubmission } from '../../../lib/agency-submissions'
```

- [ ] **Step 2: Add the fire-and-forget call**

Find this comment in `route.ts` (around line 394):

```typescript
    // ── Pre-call briefing email ──────────────────────────────────────────
```

Insert these lines immediately **before** that comment (after the closing `}` of the Supabase insert block):

```typescript
    // Fire-and-forget — never block the response on KB feedback
    saveAuditSubmission({ agencyType, teamSize, revenue, activeClients, automationWish, websiteUrl: normalizedWebsiteUrl, email })
      .catch(err => console.warn('[generate-audit] saveAuditSubmission failed:', err instanceof Error ? err.message : err))
```

- [ ] **Step 3: Run lint**

```bash
npm run lint 2>&1 | grep "generate-audit"
```

Expected: no new errors for `generate-audit/route.ts`.

- [ ] **Step 4: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build completes successfully.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate-audit/route.ts
git commit -m "feat(kb): save qualifying audit inputs to agency_submissions"
```

---

## Task 5: End-to-end verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Submit a test audit that passes the quality filter**

Use a real-looking submission:
- Agency type: `performance marketing`
- Team size: `5`
- Automation wish: `We spend hours manually pulling ad reports from Meta and Google and sending them to clients`
- Website: any real-looking URL
- Email: a non-blocked domain

- [ ] **Step 3: Verify the row was saved in Supabase**

Run against project `nbdcrmepvwbfbcjqfubr`:
```sql
SELECT agency_type, team_size, automation_wish, created_at
FROM agency_submissions
ORDER BY created_at DESC
LIMIT 3;
```

Expected: the test submission appears as the most recent row.

- [ ] **Step 4: Submit a second audit for the same agency type**

Check the console logs. You should see:
```
[generate-audit] injected N knowledge chunk(s) from [..., 'agency_submissions']
```

The `agency_submissions` source should now appear in the injected chunks list.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(kb): e2e verification fixes" # only if changes were made
```
