# Knowledge Base Reorganization — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

## Problem

The OpsRadar audit AI retrieves context from a Supabase vector database using OpenAI embeddings. This adds:
- Two external API calls per audit (embed query → Supabase RPC)
- A manual seeding step whenever knowledge files change
- A hard dependency on Supabase being configured and reachable

Meanwhile, 5 directories in the repo contain rich n8n knowledge (workflow patterns, troubleshooting cases, playbooks, reference) that is **never actually used** by the audit — they're not seeded into Supabase, so the AI never sees them.

## Goal

1. Consolidate all 5 source directories into a single, well-structured `knowledge-base/`.
2. Replace the Supabase+embedding retrieval with direct file reading — category-matched at request time.
3. Zero external API calls for knowledge retrieval.

---

## Section 1: New `knowledge-base/` Structure

```
knowledge-base/
  agency-profiles/       ← existing, unchanged
  patterns/              ← existing, unchanged
  benchmarks/            ← existing, unchanged
  failures/              ← existing, unchanged
  tools/                 ← existing, unchanged
  n8n-core/              NEW — platform reference, versioned nodes, setup docs
  n8n-playbooks/         NEW — how to build/generate/fix workflows + code patterns
  n8n-troubleshooting/   NEW — failure cases, error scenarios, evals
  n8n-reference/         NEW — node types, production patterns, API reference
  n8n-workflows/         NEW — workflow templates and JSON examples
```

---

## Section 2: File Extraction

Only documentation and reference files are copied. Code, node_modules, dist, build artifacts, Dockerfiles, and Python source files are excluded.

| Source | → Destination | Files kept |
|--------|--------------|------------|
| `n8n-mcp-main/` | `n8n-core/` | `versioned-nodes.md`, `README.md`, `N8N_HTTP_STREAMABLE_SETUP.md`, `MEMORY_N8N_UPDATE.md`, `docs/N8N_DEPLOYMENT.md`, `docs/DATABASE_CONFIGURATION.md`, `docs/SELF_HOSTING.md`, `docs/SECURITY_HARDENING.md` |
| `n8n-agent/reference/` | `n8n-reference/` | All `.md` files recursively |
| `n8n-agent/cases/` + `n8n-agent/evals/` | `n8n-troubleshooting/` | All `.md` files |
| `n8n-agent/playbooks/` + `n8n-agent/agents/` + `n8n-agent/decision-trees/` + `n8n-skills-main/skills/` | `n8n-playbooks/` | All `.md` files |
| `n8n-agent/models/` + `n8n-agent/tools/` + `n8n-agent/runtime-architecture.md` | `n8n-reference/` | All `.md` files |
| `n8n-workflows-main/templates/` | `n8n-workflows/` | All `.md` and `.json` files |
| `n8n-skills-main/docs/` | `n8n-playbooks/` | All `.md` files |
| `n8n-workflows-main/ai-stack/` (docs only) | `n8n-core/` | `README.md`, `QUICK-START.md`, `CHEAT-SHEET.md`, `SUMMARY.md` |

The 5 original source directories remain in the repo but are excluded from the knowledge retrieval path. They can be deleted or gitignored in a follow-up cleanup.

---

## Section 3: New `knowledge-retrieval.ts`

Replaces `src/lib/knowledge-retrieval.ts` entirely. Same exported API (`retrieveRelevantKnowledge`, `formatKnowledgeContext`, `KnowledgeChunk`) so all callers are untouched.

### How it works

1. **`selectCategories(agencyType, automationWish)`** — maps audit inputs to 2–3 category folder names (see mapping below). Returns a string array.
2. **`readCategory(category, charBudget)`** — reads all `.md` files from `knowledge-base/{category}/` using `fs.readdirSync` + `fs.readFileSync`. Concatenates content up to `charBudget` chars, then stops. File order is alphabetical (deterministic).
3. **`retrieveRelevantKnowledge(query, topK, options)`** — calls `selectCategories`, then `readCategory` for each, returns `KnowledgeChunk[]` (one chunk per file, capped at `topK`).

### Token budget

- Per-category character limit: **4,000 chars**
- Max categories selected: **3**
- Total max context injected: **~12,000 chars** (~3,000 tokens)

This is comparable to the current Supabase path (5 chunks × ~500 chars average).

### File path at runtime

```ts
import path from 'path'
const KB_ROOT = path.join(process.cwd(), 'knowledge-base')
```

Next.js API routes run in Node.js on Vercel. `process.cwd()` resolves to the project root, which includes `knowledge-base/` since it's committed to git.

---

## Section 4: Pain → Category Mapping

```ts
function selectCategories(agencyType?: string, automationWish?: string): string[] {
  const pain = (automationWish ?? '').toLowerCase()
  const agency = (agencyType ?? '').toLowerCase()

  if (/fail|break|abandon|stuck|error|crash|timeout/.test(pain))
    return ['n8n-troubleshooting', 'n8n-core', 'failures']

  if (/n8n|zapier|make|workflow|automat|integrat|trigger/.test(pain))
    return ['n8n-playbooks', 'n8n-reference', 'n8n-workflows']

  if (/report|invoice|onboard|proposal|process|document/.test(pain))
    return ['patterns', 'n8n-playbooks']

  if (/churn|burnout|hiring|linkedin|objection|retention/.test(agency + pain))
    return ['agency-profiles']

  if (/benchmark|revenue|rate|cost|margin|pricing/.test(pain))
    return ['benchmarks', 'agency-profiles']

  // safe defaults when nothing specific is detected
  return ['patterns', 'agency-profiles']
}
```

---

## Section 5: What Does NOT Change

- `formatKnowledgeContext(chunks)` — unchanged, same function
- `generate-audit/route.ts` — no changes needed, calls same `retrieveRelevantKnowledge`
- `KnowledgeChunk` type — same shape (sourceFile, category, content, similarity set to 1.0)
- All other API routes — unaffected

---

## Section 6: Cleanup (post-implementation)

After verification:
- Add `n8n-mcp-main/`, `n8n-workflows-main/` to `.gitignore` (too large to keep in deploy bundle)
- Delete `n8n-agent/`, `n8n-skills-main/` from repo root (content migrated to `knowledge-base/`)
- Remove Supabase RPC functions `match_knowledge_base` and `match_knowledge_base_hybrid` from the DB (optional, non-breaking)
- Remove `EMBEDDING_MODEL`, `EMBEDDING_DIMS` and all OpenAI embedding imports from the new file

---

## Implementation Order

1. Create the 5 new `knowledge-base/` subdirectories
2. Copy/extract files from source directories into each new category
3. Rewrite `src/lib/knowledge-retrieval.ts`
4. Verify `npm run build` and `npm run lint` pass
5. Post-verification cleanup (gitignore / delete source dirs)
