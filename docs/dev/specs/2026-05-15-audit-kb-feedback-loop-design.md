# Audit Knowledge Base Feedback Loop — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

## Problem

The knowledge base is static — it only contains pre-written research and n8n reference files. Real customer audit submissions contain valuable signal (agency type, team size, pain points) that could make future audits more grounded in actual agency patterns. Currently that signal is discarded after the audit completes.

## Goal

Every qualifying audit submission automatically enriches the knowledge base. Future audits for similar agency types get real-world context alongside the static files — zero manual effort, zero redeployments.

---

## Section 1: Architecture

Three isolated changes:

1. **New Supabase table `agency_submissions`** — stores qualifying audit inputs as plain text rows (no vectors, no embeddings)
2. **New `saveAuditSubmission()` call** in `src/app/api/generate-audit/route.ts` — fires after a successful audit, applies quality filter, writes to Supabase
3. **Updated `src/lib/knowledge-retrieval.ts`** — adds a second retrieval path that fetches 3–5 recent rows from `agency_submissions` where `agency_type` matches the current audit, returns them as `KnowledgeChunk[]`

No embeddings. No re-indexing. No redeployments. The loop is:

```
audit completes → row saved → next audit reads similar rows → AI gets real-world context
```

---

## Section 2: Quality Filter

A submission is saved only if ALL conditions pass. Any failure → silently skip (audit still completes normally).

| Check | Rule |
|---|---|
| Has agency type | `agencyType` not empty string |
| Has pain point | `automationWish` length > 20 chars |
| Has real website | `websiteUrl` present, not `localhost`, not `example.com` |
| Real email | `email` domain not in blocklist: `test`, `example`, `mailinator`, `yopmail`, `guerrillamail`, `tempmail` |
| Has team | `teamSize` is a number >= 1 |

---

## Section 3: Database Schema

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

-- Index for the retrieval query
CREATE INDEX agency_submissions_type_idx ON public.agency_submissions (agency_type, created_at DESC);

-- RLS: no direct client access — only service role writes/reads
ALTER TABLE public.agency_submissions ENABLE ROW LEVEL SECURITY;
```

Writes use the service role key (server-side only). No client-side access.

---

## Section 4: Retrieval Query

At audit time, after file-based category matching, `knowledge-retrieval.ts` runs:

```sql
SELECT agency_type, team_size, revenue, active_clients, automation_wish
FROM agency_submissions
WHERE agency_type ILIKE $1
ORDER BY created_at DESC
LIMIT 5
```

Where `$1` is the current audit's `agencyType`. Returns up to 5 rows, formatted as `KnowledgeChunk[]`:

```
Real agency profile: [agency_type], [team_size] people, [revenue] revenue, [active_clients] active clients.
Main automation need: [automation_wish]
```

These chunks are appended to the existing file-based chunks inside `retrieveRelevantKnowledge()` — `formatKnowledgeContext()` and all callers remain untouched.

If Supabase is unavailable or returns an error, the function returns only the file-based chunks (existing graceful-degradation pattern).

---

## Section 5: New Files & Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/agency-submissions.ts` | Create | `saveAuditSubmission()` — quality filter + Supabase write |
| `src/lib/knowledge-retrieval.ts` | Modify | Add `fetchSubmissionChunks()` call after file retrieval |
| `src/app/api/generate-audit/route.ts` | Modify | Call `saveAuditSubmission(auditInput, email, websiteUrl)` after audit completes |
| Supabase migration | Apply | Create `agency_submissions` table + index + RLS |

---

## Section 6: What Does NOT Change

- `formatKnowledgeContext()` — unchanged
- The audit prompt structure — unchanged
- All other API routes — unaffected
- The file-based KB categories — unchanged
- Existing `KnowledgeChunk` type — unchanged (submissions use same shape)
