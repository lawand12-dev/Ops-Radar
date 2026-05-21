# Knowledge Base Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all n8n knowledge into `knowledge-base/` and replace the Supabase+embedding retrieval in `knowledge-retrieval.ts` with direct file reading, eliminating two external API dependencies from the audit pipeline.

**Architecture:** Five new subdirectories are added to `knowledge-base/` by copying only the `.md`/`.json` reference files from `n8n-mcp-main`, `n8n-agent`, `n8n-skills-main`, and `n8n-workflows-main`. `src/lib/knowledge-retrieval.ts` is fully replaced with a file-system reader that uses category matching (same `agencyType`/`automationWish` inputs) to select and return up to ~12,000 chars of relevant knowledge per audit request.

**Tech Stack:** Node.js `fs` (built-in), TypeScript, Next.js 16 App Router API routes, Vercel serverless (Node.js 24).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `knowledge-base/n8n-core/` | Create + populate | n8n platform reference, versioned nodes, setup |
| `knowledge-base/n8n-playbooks/` | Create + populate | Playbooks, skills, code patterns |
| `knowledge-base/n8n-troubleshooting/` | Create + populate | Failure cases, error scenarios |
| `knowledge-base/n8n-reference/` | Create + populate | Node types, API references, production guides |
| `knowledge-base/n8n-workflows/` | Create + populate | Workflow templates |
| `src/lib/knowledge-retrieval.ts` | Rewrite | Remove Supabase; add `fs`-based category reader |
| `.gitignore` | Modify | Exclude the two large source dirs from git |

---

## Task 1: Create the five new KB subdirectories

**Files:**
- Create: `knowledge-base/n8n-core/`
- Create: `knowledge-base/n8n-playbooks/`
- Create: `knowledge-base/n8n-troubleshooting/`
- Create: `knowledge-base/n8n-reference/`
- Create: `knowledge-base/n8n-workflows/`

- [ ] **Step 1: Create directories**

Run from `opsradar/`:
```bash
mkdir -p knowledge-base/n8n-core \
         knowledge-base/n8n-playbooks \
         knowledge-base/n8n-troubleshooting \
         knowledge-base/n8n-reference \
         knowledge-base/n8n-workflows
```

- [ ] **Step 2: Verify**

```bash
ls knowledge-base/
```

Expected output includes: `agency-profiles  benchmarks  failures  n8n-core  n8n-playbooks  n8n-reference  n8n-troubleshooting  n8n-workflows  patterns  tools`

- [ ] **Step 3: Commit**

```bash
git add knowledge-base/
git commit -m "chore(kb): create n8n knowledge-base subdirectories"
```

---

## Task 2: Populate `n8n-core/` from `n8n-mcp-main`

**Files:**
- Modify: `knowledge-base/n8n-core/` (add files)

Source: `n8n-mcp-main/` root + `n8n-mcp-main/docs/` + `n8n-mcp-main/ai-stack/`

- [ ] **Step 1: Copy root reference files**

Run from `opsradar/`:
```bash
cp n8n-mcp-main/versioned-nodes.md knowledge-base/n8n-core/
cp n8n-mcp-main/README.md knowledge-base/n8n-core/README-mcp.md
cp n8n-mcp-main/N8N_HTTP_STREAMABLE_SETUP.md knowledge-base/n8n-core/
cp n8n-mcp-main/MEMORY_N8N_UPDATE.md knowledge-base/n8n-core/
```

- [ ] **Step 2: Copy relevant docs**

```bash
cp n8n-mcp-main/docs/N8N_DEPLOYMENT.md knowledge-base/n8n-core/
cp n8n-mcp-main/docs/DATABASE_CONFIGURATION.md knowledge-base/n8n-core/
cp n8n-mcp-main/docs/SELF_HOSTING.md knowledge-base/n8n-core/
cp n8n-mcp-main/docs/SECURITY_HARDENING.md knowledge-base/n8n-core/
```

- [ ] **Step 3: Copy ai-stack quick-reference docs**

```bash
cp n8n-workflows-main/ai-stack/README.md knowledge-base/n8n-core/ai-stack-README.md
cp n8n-workflows-main/ai-stack/QUICK-START.md knowledge-base/n8n-core/ai-stack-QUICK-START.md
cp n8n-workflows-main/ai-stack/CHEAT-SHEET.md knowledge-base/n8n-core/ai-stack-CHEAT-SHEET.md
cp n8n-workflows-main/ai-stack/SUMMARY.md knowledge-base/n8n-core/ai-stack-SUMMARY.md
```

- [ ] **Step 4: Verify**

```bash
ls knowledge-base/n8n-core/
```

Expected: 12 files total.

- [ ] **Step 5: Commit**

```bash
git add knowledge-base/n8n-core/
git commit -m "chore(kb): populate n8n-core from n8n-mcp-main and ai-stack docs"
```

---

## Task 3: Populate `n8n-troubleshooting/` from `n8n-agent`

**Files:**
- Modify: `knowledge-base/n8n-troubleshooting/` (add files)

Source: `n8n-agent/cases/` and `n8n-agent/evals/`

- [ ] **Step 1: Copy all case files**

Run from `opsradar/`:
```bash
cp n8n-agent/cases/*.md knowledge-base/n8n-troubleshooting/
```

- [ ] **Step 2: Copy all eval scenario files**

```bash
cp n8n-agent/evals/*.md knowledge-base/n8n-troubleshooting/
```

- [ ] **Step 3: Verify**

```bash
ls knowledge-base/n8n-troubleshooting/ | wc -l
```

Expected: ~25 files (7 cases + ~18 eval scenarios).

- [ ] **Step 4: Commit**

```bash
git add knowledge-base/n8n-troubleshooting/
git commit -m "chore(kb): populate n8n-troubleshooting from n8n-agent cases and evals"
```

---

## Task 4: Populate `n8n-playbooks/` from `n8n-agent` and `n8n-skills-main`

**Files:**
- Modify: `knowledge-base/n8n-playbooks/` (add files)

Source: `n8n-agent/playbooks/`, `n8n-agent/agents/`, `n8n-agent/decision-trees/`, `n8n-skills-main/skills/` (recursive), `n8n-skills-main/docs/`

- [ ] **Step 1: Copy agent playbooks**

Run from `opsradar/`:
```bash
cp n8n-agent/playbooks/*.md knowledge-base/n8n-playbooks/
```

- [ ] **Step 2: Copy agent agents and decision-trees**

```bash
cp n8n-agent/agents/*.md knowledge-base/n8n-playbooks/ 2>/dev/null || true
cp n8n-agent/decision-trees/*.md knowledge-base/n8n-playbooks/ 2>/dev/null || true
```

- [ ] **Step 3: Copy skills (flatten subdirs, prefix with skill name)**

```bash
find n8n-skills-main/skills -name "*.md" | while read f; do
  skill=$(echo "$f" | awk -F'/' '{print $3}')
  fname=$(basename "$f")
  cp "$f" "knowledge-base/n8n-playbooks/${skill}__${fname}"
done
```

- [ ] **Step 4: Copy skills docs**

```bash
cp n8n-skills-main/docs/*.md knowledge-base/n8n-playbooks/
```

- [ ] **Step 5: Verify**

```bash
ls knowledge-base/n8n-playbooks/ | wc -l
```

Expected: ~50+ files.

- [ ] **Step 6: Commit**

```bash
git add knowledge-base/n8n-playbooks/
git commit -m "chore(kb): populate n8n-playbooks from n8n-agent and n8n-skills-main"
```

---

## Task 5: Populate `n8n-reference/` from `n8n-agent/reference`

**Files:**
- Modify: `knowledge-base/n8n-reference/` (add files)

Source: `n8n-agent/reference/` (all subdirs), `n8n-agent/models/`, `n8n-agent/tools/`, `n8n-agent/runtime-architecture.md`, `n8n-agent/SKILL.md`

- [ ] **Step 1: Copy reference subdirs (flatten)**

Run from `opsradar/`:
```bash
find n8n-agent/reference -name "*.md" | while read f; do
  subdir=$(echo "$f" | awk -F'/' '{print $3}')
  fname=$(basename "$f")
  cp "$f" "knowledge-base/n8n-reference/${subdir}__${fname}"
done
```

- [ ] **Step 2: Copy models and tools directories**

```bash
find n8n-agent/models -name "*.md" 2>/dev/null | xargs -I{} cp {} knowledge-base/n8n-reference/ 2>/dev/null || true
find n8n-agent/tools -name "*.md" 2>/dev/null | xargs -I{} cp {} knowledge-base/n8n-reference/ 2>/dev/null || true
```

- [ ] **Step 3: Copy top-level agent reference files**

```bash
cp n8n-agent/runtime-architecture.md knowledge-base/n8n-reference/
cp n8n-agent/SKILL.md knowledge-base/n8n-reference/n8n-agent-SKILL.md
```

- [ ] **Step 4: Verify**

```bash
ls knowledge-base/n8n-reference/ | wc -l
```

Expected: ~60 files.

- [ ] **Step 5: Commit**

```bash
git add knowledge-base/n8n-reference/
git commit -m "chore(kb): populate n8n-reference from n8n-agent reference and models"
```

---

## Task 6: Populate `n8n-workflows/` from `n8n-workflows-main/templates`

**Files:**
- Modify: `knowledge-base/n8n-workflows/` (add files)

Source: `n8n-workflows-main/templates/` (all `.md` and `.json` files, recursive)

- [ ] **Step 1: Copy template markdown files**

Run from `opsradar/`:
```bash
find n8n-workflows-main/templates -name "*.md" | while read f; do
  subdir=$(dirname "$f" | awk -F'/' '{print $3}')
  fname=$(basename "$f")
  cp "$f" "knowledge-base/n8n-workflows/${subdir}__${fname}"
done
```

- [ ] **Step 2: Copy template JSON files**

```bash
find n8n-workflows-main/templates -name "*.json" | while read f; do
  subdir=$(dirname "$f" | awk -F'/' '{print $3}')
  fname=$(basename "$f")
  cp "$f" "knowledge-base/n8n-workflows/${subdir}__${fname}"
done
```

- [ ] **Step 3: Copy workflows main README**

```bash
cp n8n-workflows-main/README.md knowledge-base/n8n-workflows/README-workflows-main.md
```

- [ ] **Step 4: Verify**

```bash
ls knowledge-base/n8n-workflows/ | wc -l
```

Expected: files from templates/communication + templates/data-processing + README.

- [ ] **Step 5: Commit**

```bash
git add knowledge-base/n8n-workflows/
git commit -m "chore(kb): populate n8n-workflows from n8n-workflows-main templates"
```

---

## Task 7: Rewrite `src/lib/knowledge-retrieval.ts`

**Files:**
- Modify: `src/lib/knowledge-retrieval.ts` (full rewrite)

This removes ~290 lines of Supabase+embedding code and replaces with ~100 lines of `fs`-based category reading. The exported types and function signatures are **unchanged** so all callers remain untouched.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/lib/knowledge-retrieval.ts` with:

```typescript
import fs from 'fs'
import path from 'path'

const KB_ROOT = path.join(process.cwd(), 'knowledge-base')
const CATEGORY_CHAR_BUDGET = 4000
const MAX_CATEGORIES = 3

type RetrievalOptions = {
  agencyType?: string
  automationWish?: string
  category?: string
}

export type KnowledgeChunk = {
  id: string
  slug: string | null
  sourceFile: string
  category: string | null
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
}

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

  return ['patterns', 'agency-profiles']
}

function readCategory(category: string): KnowledgeChunk[] {
  const categoryPath = path.join(KB_ROOT, category)

  let files: string[]
  try {
    files = (fs.readdirSync(categoryPath, { recursive: true }) as string[])
      .filter(f => f.endsWith('.md') || f.endsWith('.json'))
      .sort()
  } catch {
    return []
  }

  const chunks: KnowledgeChunk[] = []
  let remaining = CATEGORY_CHAR_BUDGET

  for (const file of files) {
    if (remaining <= 0) break
    const filePath = path.join(categoryPath, file)
    let content: string
    try {
      content = fs.readFileSync(filePath, 'utf-8').trim()
    } catch {
      continue
    }
    if (!content) continue

    const truncated = content.slice(0, remaining)
    remaining -= truncated.length

    chunks.push({
      id: `${category}/${file}`,
      slug: `${category}/${file}`,
      sourceFile: `knowledge-base/${category}/${file}`,
      category,
      content: truncated,
      similarity: 1.0,
      metadata: { retrieval_source: 'file' },
    })
  }

  return chunks
}

export async function retrieveRelevantKnowledge(
  query: string,
  _topK: number = 15,
  options: RetrievalOptions = {},
): Promise<KnowledgeChunk[]> {
  if (!query.trim()) return []

  const categories = options.category
    ? [options.category]
    : selectCategories(options.agencyType, options.automationWish).slice(0, MAX_CATEGORIES)

  return categories.flatMap(cat => readCategory(cat))
}

export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return ''

  const body = chunks
    .map((chunk) => {
      const sourceParts = [
        `[Source: ${chunk.sourceFile}]`,
        chunk.category ? `Category: ${chunk.category}` : '',
        chunk.slug ? `Slug: ${chunk.slug}` : '',
      ].filter(Boolean)

      return `${sourceParts.join('\n')}\n${chunk.content.trim()}`
    })
    .join('\n\n')

  return [
    'RELEVANT KNOWLEDGE FROM OPSRADAR RESEARCH LIBRARY:',
    body,
    '',
    "Use this knowledge to support your analysis. Cite specific findings when relevant. Never fabricate — only reference what's in the knowledge above.",
  ].join('\n')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/knowledge-retrieval.ts
git commit -m "feat(kb): replace Supabase vector retrieval with file-based category matching"
```

---

## Task 8: Update `.gitignore` and verify build

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the two large source directories to `.gitignore`**

Add these two lines at the end of `.gitignore`:

```
# Large n8n source dirs — content extracted into knowledge-base/
n8n-mcp-main/
n8n-workflows-main/
```

- [ ] **Step 2: Commit .gitignore**

```bash
git add .gitignore
git commit -m "chore: gitignore n8n-mcp-main and n8n-workflows-main source dirs"
```

- [ ] **Step 3: Run lint**

Run from `opsradar/`:
```bash
npm run lint
```

Expected: no errors. If TypeScript errors appear about missing Supabase imports, they're in the old file — check that `src/lib/knowledge-retrieval.ts` was fully replaced.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: build completes without errors. Watch for any `Cannot find module` or `Property does not exist` errors in files that import from `knowledge-retrieval`.

- [ ] **Step 5: Verify KB files are readable at runtime**

Add a temporary `console.log` at the top of `retrieveRelevantKnowledge` in `src/lib/knowledge-retrieval.ts`:

```typescript
console.log('[kb-check] KB_ROOT =', KB_ROOT, 'exists =', fs.existsSync(KB_ROOT))
```

Start the dev server:
```bash
npm run dev
```

Trigger an audit (or hit any route that calls `generate-audit`). Look for the log line in terminal output. It should show `exists = true`.

Remove the `console.log` line after verifying, then:

```bash
git add src/lib/knowledge-retrieval.ts
git commit -m "chore(kb): remove temp existence check log"
```

---

## Task 9: Cleanup — remove small source dirs

**Files:**
- Delete: `n8n-agent/` (content migrated to knowledge-base)
- Delete: `n8n-skills-main/` (content migrated to knowledge-base)

The two large dirs (`n8n-mcp-main/`, `n8n-workflows-main/`) are already gitignored in Task 8 — leave them on disk.

- [ ] **Step 1: Delete the two small source dirs**

```bash
rm -rf n8n-agent n8n-skills-main
```

- [ ] **Step 2: Verify nothing in `src/` imports from those dirs**

```bash
grep -r "n8n-agent\|n8n-skills-main" src/ || echo "clean"
```

Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(kb): remove n8n-agent and n8n-skills-main source dirs (content migrated)"
```

- [ ] **Step 4: Final build check**

```bash
npm run build
```

Expected: build completes without errors.
