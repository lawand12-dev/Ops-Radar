# KB Upgrade — Design Spec

*Written 2026-05-21. Approved by founder.*

---

## Goal

Turn the COO-relevant slice of the knowledge base into a smarter retrieval system that (a) prefers higher-authority and more recent content, (b) captures questions the COO couldn't answer, and (c) becomes a content-creation backlog driven by real chat usage.

---

## Three Dimensions

| # | Dimension | Status after this ship |
|---|-----------|------------------------|
| 1 | **Better structure** — YAML frontmatter on every COO-relevant KB file + retrieval that ranks by it | Live |
| 2 | **Self-improving loop** — capture chat questions where search_kb returned nothing, surface in an admin view | Live |
| 3 | **More + better content** — 7 playbooks (AI-drafted, founder-reviewed) | 1-2 ship in this session, rest later |

---

## Frontmatter Schema

Every COO-relevant file gets this header:

```yaml
---
title: string
category: agency-profiles | benchmarks | patterns | failures | playbooks | case-studies
tags: string[]                # free-form, e.g. ["margin", "pricing", "paid-media"]
authority: primary-research | industry-report | playbook | case-study | anecdotal
publication_date: YYYY-MM-DD
last_verified: YYYY-MM-DD
coo_relevance: 1-5            # how relevant to COO agent
audit_relevance: 1-5          # how relevant to audit funnel
summary: string               # one-line description for ranking + UI
---
```

Files without frontmatter are still readable but rank lower than files with structured metadata.

---

## Retrieval Upgrade

`retrieveCooKnowledge(query)` changes:

1. Keyword routing stays — picks 2 categories
2. Reads files from those categories
3. Parses frontmatter using `gray-matter` (already a common npm dep, or simple inline parser)
4. **Ranks files** by score:
   - `coo_relevance` × 2
   - + Recency boost: 0–2 points based on `publication_date` (newer = higher)
   - + Authority boost: `primary-research` and `playbook` get +1, `anecdotal` gets 0
5. Returns top N chunks (still capped at 10KB total budget)
6. Each chunk includes frontmatter summary for the agent to cite

---

## Self-Improving Loop

### New Supabase table

```sql
CREATE TABLE coo_kb_gaps (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_question TEXT NOT NULL,
  kb_query TEXT,             -- what the agent searched for
  found_results BOOLEAN,     -- did search_kb return anything?
  agent_acknowledged_gap BOOLEAN,  -- did the final answer say "no data available"?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX coo_kb_gaps_created_at_idx ON coo_kb_gaps (created_at DESC);
ALTER TABLE coo_kb_gaps ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS — admin-only access via service role.
```

### Capture logic in COO route

When `search_kb` is called inside the agent loop:
- If it returns `success: false` OR returns 0 chunks → insert a row to `coo_kb_gaps` with the query
- Capture the user's original question alongside

### Admin view

`/admin/kb-gaps` — server-rendered list:
- Top 20 most recent unanswered questions
- Group by topic keyword (basic clustering)
- Frequency count per topic
- Click-to-copy as a "content brief" for the founder

---

## Content Playbooks

7 target playbooks:
1. `playbooks/retainer-pricing.md` — when and how to raise retainer rates
2. `playbooks/client-conversation-margin-alert.md` — exact script for "this client is unprofitable"
3. `playbooks/client-conversation-scope-creep.md` — exact script for "you're over scope"
4. `playbooks/capacity-planning.md` — when to hire vs outsource vs say no
5. `playbooks/difficult-client-diagnostic.md` — should I fire this client?
6. `playbooks/cash-flow-recovery.md` — 3 levers when cash is tight
7. `playbooks/onboarding-excellence.md` — checklist for new client first 30 days

**Author flow:** AI drafts each from web research + existing KB + COO domain knowledge → founder reviews/edits → marks `coo_relevance: 5` + `last_verified: <today>` → saved.

In this session: draft 2 playbooks as examples. Rest queued for next session.

---

## What This Does NOT Include

- No semantic search / embeddings (deferred — keyword routing is good enough at this scale)
- No multi-tenant content (KB is the same for every customer)
- No KB editing UI (markdown files in repo, edit with editor of choice)
- No automatic content generation (AI drafts on request, never on schedule)

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/knowledge-retrieval.ts` | Add frontmatter parser + ranking |
| `src/lib/coo/executor.ts` | Log gaps when `search_kb` returns empty |
| `supabase/migrations/2026XXXX_coo_kb_gaps.sql` | New table |
| `src/lib/database.types.ts` | Regenerate after migration |
| `src/app/admin/kb-gaps/page.tsx` | New admin view |
| `knowledge-base/playbooks/*.md` | 2 new playbook files (sample) |

---

## Acceptance Criteria

- A query like "what's a normal margin for paid media?" returns the highest-`coo_relevance` benchmark file first, with summary
- When the agent asks `search_kb` and gets nothing useful, a row appears in `coo_kb_gaps`
- `/admin/kb-gaps` renders the captured questions with frequency clustering
- 2 sample playbooks land in `knowledge-base/playbooks/` with full frontmatter
- Build passes, types regenerate, no breaking changes to the audit's existing retrieval
