# OpsRadar Knowledge Base

## Purpose

Static knowledge injected into audit generation at request time. No embeddings, no Supabase — files are read directly from disk by `src/lib/knowledge-retrieval.ts`.

## Structure

```
knowledge-base/
  agency-profiles/     → how agencies operate by type and size
  patterns/            → common operational pain patterns
  benchmarks/          → hours, costs, ROI benchmarks by agency type
  failures/            → failure modes and fixes
  tools/               → API behaviour and failures per tool
  n8n-core/            → n8n platform reference, setup, deployment docs
  n8n-playbooks/       → how to build, generate, and fix workflows
  n8n-troubleshooting/ → failure cases, error scenarios, evals
  n8n-reference/       → node types, production patterns, API reference
  n8n-workflows/       → workflow templates and JSON examples
```

## How retrieval works

`selectCategories(agencyType, automationWish)` in `knowledge-retrieval.ts` maps audit inputs to 2–3 category folders using regex patterns. Each matched category is read up to 10,000 chars (capped at 2,000 chars per file). Results are returned as `KnowledgeChunk[]` and appended with real agency submissions fetched from the `agency_submissions` Supabase table.

## Vercel bundling

`next.config.ts` includes `outputFileTracingIncludes` so all files under `knowledge-base/` are bundled with the serverless functions for `/api/generate-audit` and `/api/chat`.

## Adding new content

Drop `.md` files into the relevant category folder. No redeployment or reindexing needed — files are read at request time. Match the existing file style: clear headings, structured sections.
