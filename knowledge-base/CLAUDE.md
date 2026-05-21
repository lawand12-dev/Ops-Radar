# OpsRadar Knowledge Base

## Purpose

Static knowledge injected at request time into two consumers:
- **Audit** (`/api/generate-audit`) — pulls from automation-flavored categories
- **COO agent** (`/api/dashboard/coo` via the `search_kb` tool) — pulls from agency-ops categories

No embeddings, no vector DB. Files are read directly from disk by `src/lib/knowledge-retrieval.ts`.

## Structure

```
knowledge-base/
  agency-profiles/     → shared — how agencies operate by type and size
  benchmarks/          → shared — hours, costs, ROI, margin benchmarks
  patterns/            → shared — operational pain patterns
  failures/            → shared — failure modes and fixes
  integrations/        → COO-only — agency-specific deep dives per tool (10 files)
  playbooks/           → COO-only — exact scripts and frameworks (7 files)
  tools/               → audit-only — API behaviour per tool
  n8n-core/            → audit-only — n8n platform reference
  n8n-playbooks/       → audit-only — workflow build/fix playbooks
  n8n-troubleshooting/ → audit-only — failure cases
  n8n-reference/       → audit-only — node types + API reference
  n8n-workflows/       → audit-only — workflow templates
```

## Frontmatter (COO files)

Files in `integrations/` and `playbooks/` (and any new COO-relevant content) carry YAML frontmatter that the retrieval ranker uses:

```yaml
---
title: ...
category: integrations | playbooks | agency-profiles | benchmarks | patterns | failures
tags: [...]
authority: primary-research | industry-report | playbook | case-study | anecdotal
publication_date: YYYY-MM-DD
last_verified: YYYY-MM-DD
coo_relevance: 1-5
audit_relevance: 1-5
summary: one-line
---
```

## How retrieval works

**Audit path** — `retrieveRelevantKnowledge()`. `selectCategories(agencyType, automationWish)` maps audit inputs to 2–3 category folders using regex. Each matched category is read up to 10K chars (2K per file). Returned chunks are appended with real agency submissions from the `agency_submissions` Supabase table.

**COO path** — `retrieveCooKnowledge(query)`. `selectCooCategories(query)` picks 2 COO-only categories. Each chunk is scored: `coo_relevance × 2` + recency boost (2026=2, 2025=1) + authority boost (primary-research/playbook +1, anecdotal −1). Sorted desc, packed into the 10K char budget. No Supabase call — pure file reads.

## Self-improving loop

When the COO agent calls `search_kb` and gets nothing useful, `runSearchKb` logs the question to the `coo_kb_gaps` Supabase table. View backlog at `/admin/kb-gaps` to see what content is missing.

## Vercel bundling

`next.config.ts` includes `outputFileTracingIncludes` so all files under `knowledge-base/` are bundled with the serverless functions for `/api/generate-audit` and `/api/dashboard/coo`.

## Adding new content

Drop `.md` files into the relevant category folder. No redeployment or reindexing needed — files are read at request time. Match the existing file style: clear headings, structured sections. For COO content (integrations/, playbooks/, or shared categories), add the full YAML frontmatter so the ranker can prioritize it.
