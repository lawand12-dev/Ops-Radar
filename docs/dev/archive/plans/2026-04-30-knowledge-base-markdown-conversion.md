# Knowledge Base Markdown Conversion & RAG Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 38 research JSON files to organised Obsidian-style markdown notes, add `slug/category/links/updated_at` columns to the `knowledge_base` Supabase table, update retrieval to filter by category, and seed the table from markdown — all without touching the audit pipeline logic or questions.

**Architecture:**  
A one-shot TypeScript conversion script reads each JSON file, determines its category, and writes organised markdown files into `knowledge-base/{benchmarks,tools,patterns,failures,agency-profiles}/`. A separate seeding script reads those markdown files, calls the OpenAI embeddings API, and upserts into the `knowledge_base` Supabase table. The `match_knowledge_base` RPC gets an optional `filter_category` param so `retrieveRelevantKnowledge` can pass the agency's pain category at query time.

**Tech Stack:** Node.js/TypeScript (tsx), Supabase PostgreSQL + pgvector, OpenAI `text-embedding-3-small`, Next.js 16 / React 19

**Constraint:** Do NOT modify `prompts.ts`, `audit-grounding.ts`, the audit questions, or the 5-stage pipeline. Only change how context is retrieved (`knowledge-retrieval.ts`) and seeded.

---

## File Map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/20260430_knowledge_base_v2.sql` |
| Create | `scripts/convert-json-to-markdown.ts` |
| Create | `knowledge-base/benchmarks/*.md` (13 files) |
| Create | `knowledge-base/tools/*.md` (9 files) |
| Create | `knowledge-base/patterns/*.md` (8 files) |
| Create | `knowledge-base/failures/*.md` (2 files) |
| Create | `knowledge-base/agency-profiles/*.md` (11 files) |
| Create | `knowledge-base/index.md` |
| Create | `scripts/seed-knowledge-base.ts` |
| Modify | `src/lib/knowledge-retrieval.ts` |

### Category Assignment

| Category | Research IDs |
|----------|-------------|
| `benchmarks` | research-01, 04, 05, 06, 08, 21, 22, 23, 24, 25, 29, 35 + existing #41.md |
| `tools` | research-11, 13, 17, 19, 20, 27, 30 + existing 42.md, 43.md |
| `patterns` | research-02, 15, 16, 32, 33, 34, 36 + existing research-40.md |
| `failures` | research-12, 18 |
| `agency-profiles` | research-03, 07, 09, 10, 14, 26, 28, 31, 37, 38 + existing research-39.md |

---

## Task 1: Supabase Migration — Add New Columns and Update RPC

**Files:**
- Create: `supabase/migrations/20260430_knowledge_base_v2.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260430_knowledge_base_v2.sql
-- Extends knowledge_base with slug, category, links, updated_at
-- and enhances match_knowledge_base with an optional category filter.

alter table public.knowledge_base
  add column if not exists slug text,
  add column if not exists category text,
  add column if not exists links text[] default '{}',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists knowledge_base_slug_idx
  on public.knowledge_base (slug)
  where slug is not null;

create index if not exists knowledge_base_category_idx
  on public.knowledge_base (category);

-- Replace the RPC to add optional category filter.
create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.0,
  filter_category text default null
)
returns table (
  id uuid,
  source_file text,
  slug text,
  category text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    kb.id,
    kb.source_file,
    kb.slug,
    kb.category,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) >= match_threshold
    and (filter_category is null or kb.category = filter_category)
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the Supabase MCP tool to apply this migration to the project (`nbdcrmepvwbfbcjqfubr`). The SQL is idempotent (`if not exists`, `create or replace`).

- [ ] **Step 3: Commit**

```bash
cd opsradar && git add supabase/migrations/20260430_knowledge_base_v2.sql
git commit -m "feat: add slug/category/links/updated_at to knowledge_base + update RPC with category filter"
```

---

## Task 2: Write the JSON→Markdown Conversion Script

**Files:**
- Create: `scripts/convert-json-to-markdown.ts`

- [ ] **Step 1: Write the conversion script**

```typescript
// scripts/convert-json-to-markdown.ts
// Run with: npx tsx scripts/convert-json-to-markdown.ts
// Reads research-*.json from knowledge-base/ and writes organized markdown notes.

import fs from 'fs'
import path from 'path'

const KB_DIR = path.join(process.cwd(), 'knowledge-base')
const CATEGORIES = ['benchmarks', 'tools', 'patterns', 'failures', 'agency-profiles']

// Category assignment map: research-id → folder
const CATEGORY_MAP: Record<string, string> = {
  'research-01': 'benchmarks',
  'research-02': 'patterns',
  'research-03': 'agency-profiles',
  'research-04': 'benchmarks',
  'research-05': 'benchmarks',
  'research-06': 'benchmarks',
  'research-07': 'agency-profiles',
  'research-08': 'benchmarks',
  'research-09': 'agency-profiles',
  'research-10': 'agency-profiles',
  'research-11': 'tools',
  'research-12': 'failures',
  'research-13': 'tools',
  'research-14': 'agency-profiles',
  'research-15': 'patterns',
  'research-16': 'tools',
  'research-17': 'tools',
  'research-18': 'failures',
  'research-19': 'tools',
  'research-20': 'tools',
  'research-21': 'benchmarks',
  'research-22': 'benchmarks',
  'research-23': 'benchmarks',
  'research-24': 'benchmarks',
  'research-25': 'benchmarks',
  'research-26': 'agency-profiles',
  'research-27': 'tools',
  'research-28': 'agency-profiles',
  'research-29': 'benchmarks',
  'research-30': 'tools',
  'research-31': 'agency-profiles',
  'research-32': 'patterns',
  'research-33': 'patterns',
  'research-34': 'patterns',
  'research-35': 'benchmarks',
  'research-36': 'patterns',
  'research-37': 'agency-profiles',
  'research-38': 'agency-profiles',
}

// Related-note cross-links: research-id → list of linked research-ids
const RELATED_MAP: Record<string, string[]> = {
  'research-01': ['research-04', 'research-05', 'research-08', 'research-21', 'research-22', 'research-23'],
  'research-02': ['research-12', 'research-15', 'research-16', 'research-36'],
  'research-03': ['research-07', 'research-09', 'research-26', 'research-01'],
  'research-04': ['research-01', 'research-08', 'research-05'],
  'research-05': ['research-01', 'research-06', 'research-03'],
  'research-06': ['research-05', 'research-27', 'research-29'],
  'research-07': ['research-03', 'research-09', 'research-14', 'research-26'],
  'research-08': ['research-01', 'research-04', 'research-25'],
  'research-09': ['research-10', 'research-37', 'research-14'],
  'research-10': ['research-09', 'research-37', 'research-12'],
  'research-11': ['research-13', 'research-17', 'research-20', 'research-29'],
  'research-12': ['research-18', 'research-02', 'research-13'],
  'research-13': ['research-11', 'research-12', 'research-17', 'research-20'],
  'research-14': ['research-09', 'research-38', 'research-36'],
  'research-15': ['research-16', 'research-02', 'research-05'],
  'research-16': ['research-15', 'research-19', 'research-18'],
  'research-17': ['research-13', 'research-12', 'research-02'],
  'research-18': ['research-12', 'research-16', 'research-02'],
  'research-19': ['research-16', 'research-20', 'research-11'],
  'research-20': ['research-13', 'research-19', 'research-11'],
  'research-21': ['research-01', 'research-03', 'research-05', 'research-22'],
  'research-22': ['research-01', 'research-03', 'research-05', 'research-21'],
  'research-23': ['research-01', 'research-03', 'research-05', 'research-21'],
  'research-24': ['research-11', 'research-13', 'research-25'],
  'research-25': ['research-24', 'research-08', 'research-36'],
  'research-26': ['research-03', 'research-07', 'research-05'],
  'research-27': ['research-29', 'research-30', 'research-06'],
  'research-28': ['research-31', 'research-27', 'research-03'],
  'research-29': ['research-11', 'research-27', 'research-01'],
  'research-30': ['research-27', 'research-28', 'research-03'],
  'research-31': ['research-28', 'research-30', 'research-27'],
  'research-32': ['research-33', 'research-34', 'research-03'],
  'research-33': ['research-32', 'research-34', 'research-05'],
  'research-34': ['research-33', 'research-32', 'research-15'],
  'research-35': ['research-36', 'research-14', 'research-38'],
  'research-36': ['research-35', 'research-14', 'research-38'],
  'research-37': ['research-09', 'research-10', 'research-36'],
  'research-38': ['research-14', 'research-36', 'research-37'],
}

type KeyFact = {
  fact: string
  context?: string
  source?: string
  source_url?: string
  use_case?: string
  quote?: string
  quote_attribution?: string
  [key: string]: unknown
}

type ResearchJson = {
  topic: string
  research_id: string
  research_date: string
  tier: number
  description: string
  key_facts: KeyFact[]
}

function slugify(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function categoryLabel(category: string): string {
  return category.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function formatKeyFact(fact: KeyFact, index: number): string {
  const lines: string[] = []
  lines.push(`### ${index + 1}. ${fact.fact}`)
  lines.push('')
  if (fact.context) lines.push(`**Context:** ${fact.context}`)
  if (fact.quote) {
    const attribution = fact.quote_attribution ? ` — *${fact.quote_attribution}*` : ''
    lines.push(`**Quote:** "${fact.quote}"${attribution}`)
  }
  if (fact.use_case) lines.push(`**Use Case:** ${fact.use_case}`)
  if (fact.source) {
    const sourceLink = fact.source_url
      ? `[${fact.source}](${fact.source_url})`
      : fact.source
    lines.push(`**Source:** ${sourceLink}`)
  }

  // Surface any extra numeric/structured fields
  const skip = new Set(['fact', 'context', 'source', 'source_url', 'use_case', 'quote', 'quote_attribution'])
  for (const [key, value] of Object.entries(fact)) {
    if (skip.has(key) || value == null) continue
    const label = key.replace(/_/g, ' ')
    const formatted = Array.isArray(value) ? value.join(', ') : String(value)
    lines.push(`**${label}:** ${formatted}`)
  }

  return lines.join('\n')
}

function jsonToMarkdown(json: ResearchJson, category: string): string {
  const relatedIds = RELATED_MAP[json.research_id] ?? []
  const relatedLinks = relatedIds.map((id) => `[[${id}]]`).join(' · ')

  const lines: string[] = [
    `# ${json.topic}`,
    '',
    `**Category:** ${categoryLabel(category)}  `,
    `**Research ID:** \`${json.research_id}\`  `,
    `**Tier:** ${json.tier}  `,
    `**Updated:** ${json.research_date}`,
    '',
    '## Overview',
    '',
    json.description,
    '',
  ]

  if (relatedLinks) {
    lines.push('## Related Notes', '', relatedLinks, '')
  }

  lines.push('## Key Facts', '')

  json.key_facts.forEach((fact, i) => {
    lines.push(formatKeyFact(fact, i))
    lines.push('')
  })

  return lines.join('\n')
}

async function main() {
  // Create category subdirectories
  for (const cat of CATEGORIES) {
    fs.mkdirSync(path.join(KB_DIR, cat), { recursive: true })
  }

  const files = fs.readdirSync(KB_DIR).filter((f) => f.match(/^research-\d+.*\.json$/))
  let converted = 0

  for (const file of files) {
    const jsonPath = path.join(KB_DIR, file)
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ResearchJson
    const id = raw.research_id
    const category = CATEGORY_MAP[id]

    if (!category) {
      console.warn(`No category mapped for ${id} — skipping`)
      continue
    }

    const slug = slugify(raw.topic)
    const markdownContent = jsonToMarkdown(raw, category)
    const outFile = path.join(KB_DIR, category, `${id}-${slug}.md`)

    fs.writeFileSync(outFile, markdownContent, 'utf-8')
    console.log(`✓ ${id} → ${category}/${id}-${slug}.md`)
    converted++
  }

  console.log(`\nConverted ${converted} JSON files to markdown.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Install tsx if needed and run the script**

```bash
cd opsradar
npx tsx scripts/convert-json-to-markdown.ts
```

Expected output: 38 lines `✓ research-XX → <category>/research-XX-<slug>.md` followed by `Converted 38 JSON files to markdown.`

- [ ] **Step 3: Verify files were created**

```bash
ls knowledge-base/benchmarks/ | wc -l  # expect 12
ls knowledge-base/tools/ | wc -l       # expect 7
ls knowledge-base/patterns/ | wc -l    # expect 7
ls knowledge-base/failures/ | wc -l    # expect 2
ls knowledge-base/agency-profiles/ | wc -l  # expect 10
```

- [ ] **Step 4: Commit**

```bash
git add scripts/convert-json-to-markdown.ts knowledge-base/
git commit -m "feat: add JSON-to-markdown conversion script and generate organised knowledge-base notes"
```

---

## Task 3: Move Existing Markdown Files Into Category Folders

**Files:**
- Move: `knowledge-base/#41 — Client Onboarding Workflow Blueprints.md` → `knowledge-base/patterns/`
- Move: `knowledge-base/42 — Agency Tech Stack Integration Map.md` → `knowledge-base/tools/`
- Move: `knowledge-base/43 — AI Agent Architecture for Agency Operations .md` → `knowledge-base/tools/`
- Move: `knowledge-base/research-39 - Competitor Teardown. Launching the deep dive now..md` → `knowledge-base/agency-profiles/`
- Move: `knowledge-base/research-40 - Agency Distribution Channels start this.md` → `knowledge-base/patterns/`

- [ ] **Step 1: Move the files**

```bash
cd opsradar/knowledge-base
cp "#41 — Client Onboarding Workflow Blueprints.md" "patterns/research-41-client-onboarding-workflow-blueprints.md"
cp "42 — Agency Tech Stack Integration Map.md" "tools/research-42-agency-tech-stack-integration-map.md"
cp "43 — AI Agent Architecture for Agency Operations .md" "tools/research-43-ai-agent-architecture-for-agency-operations.md"
cp "research-39 - Competitor Teardown. Launching the deep dive now..md" "agency-profiles/research-39-competitor-teardown.md"
cp "research-40 - Agency Distribution Channels start this.md" "patterns/research-40-agency-distribution-channels.md"
```

Note: Keep the original files in place for now (copy, not move) — they can be cleaned up after seeding is confirmed.

- [ ] **Step 2: Commit**

```bash
git add knowledge-base/
git commit -m "feat: organize existing markdown research notes into category folders"
```

---

## Task 4: Create the Knowledge Base Index

**Files:**
- Create: `knowledge-base/index.md`

- [ ] **Step 1: Write index.md**

```markdown
# OpsRadar Knowledge Base Index

This index links to all research notes used by the audit engine RAG system.
Notes are organized by category and injected into audit prompts via semantic search.

---

## Benchmarks

Industry data, hourly rates, revenue benchmarks, and operational statistics.

- [[research-01-agency-operations-benchmarks-for-marketing-recruiting-and-design-agencies]]
- [[research-04-agency-hourly-rate-benchmarks-by-role-and-segment]]
- [[research-05-manual-work-hours-by-agency-function]]
- [[research-06-context-switching-cost-in-multi-tool-agency-environments]]
- [[research-08-revenue-per-employee-benchmarks-for-agencies]]
- [[research-21-marketing-agency-operational-trends-2025]]
- [[research-22-recruiting-agency-operational-trends-2025]]
- [[research-23-design-agency-operational-trends-2025]]
- [[research-24-saas-vs-traditional-agency-operational-models]]
- [[research-25-agency-ma-valuation-and-operational-drivers]]
- [[research-29-tool-stacks-by-agency-revenue-band]]
- [[research-35-done-for-you-market-trends-and-demand-signals]]

---

## Tools

Tool comparisons, platform pricing, n8n ecosystem, build vs buy analysis.

- [[research-11-platform-pricing-comparison-for-agency-automation-tools]]
- [[research-13-build-vs-buy-vs-rent-decision-framework-for-agency-automation]]
- [[research-17-llm-value-vs-hype-for-agency-operations]]
- [[research-19-n8n-ecosystem-2025-nodes-integrations-and-community-resources]]
- [[research-20-self-hosted-vs-cloud-n8n-for-agency-operations]]
- [[research-27-tech-stack-signals-and-agency-automation-readiness-indicators]]
- [[research-30-website-red-flags-and-tech-stack-detection-patterns]]
- [[research-42-agency-tech-stack-integration-map]]
- [[research-43-ai-agent-architecture-for-agency-operations]]

---

## Patterns

Frameworks, workflow blueprints, architecture patterns, methodologies.

- [[research-02-automation-case-studies-and-roi-evidence]]
- [[research-15-most-requested-automation-workflows-for-agencies]]
- [[research-16-n8n-workflow-architecture-best-practices-for-agency-use-cases]]
- [[research-32-eisenhower-matrix-framework-for-agency-operations-prioritization]]
- [[research-33-first-principles-analysis-of-agency-operational-debt]]
- [[research-34-theory-of-constraints-applied-to-agency-operations]]
- [[research-36-productized-services-economics-and-automation-leverage]]
- [[research-40-agency-distribution-channels]]
- [[research-41-client-onboarding-workflow-blueprints]]

---

## Failures

DIY automation failure modes, production failure patterns, prevention.

- [[research-12-why-agencies-fail-at-diy-automation-projects]]
- [[research-18-common-automation-workflow-failure-modes-and-prevention-patterns]]

---

## Agency Profiles

Pain points, buyer psychology, hiring signals, positioning, objection handling.

- [[research-03-top-20-agency-operational-pain-points-ranked-by-frequency-and-cost]]
- [[research-07-client-churn-causes-in-agency-relationships]]
- [[research-09-founder-buying-psychology-for-agency-automation-services]]
- [[research-10-objection-handling-for-agency-automation-sales]]
- [[research-14-first-client-acquisition-strategies-for-new-automation-agencies]]
- [[research-26-agency-burnout-and-operational-stress-indicators]]
- [[research-28-hiring-signals-and-agency-growth-indicators]]
- [[research-31-linkedin-growth-signals-for-agency-prospecting]]
- [[research-37-pricing-psychology-for-agency-automation-services]]
- [[research-38-solo-founder-positioning-for-automation-agencies]]
- [[research-39-competitor-teardown]]
```

- [ ] **Step 2: Commit**

```bash
git add knowledge-base/index.md
git commit -m "feat: add knowledge-base index.md linking all research notes"
```

---

## Task 5: Write the Seeding Script

**Files:**
- Create: `scripts/seed-knowledge-base.ts`

The seeding script reads all markdown files from the category folders, generates OpenAI embeddings, and upserts into Supabase using the `slug` as the upsert key. It chunks long documents into ≤4000-char chunks so each chunk gets its own embedding.

- [ ] **Step 1: Write the seeding script**

```typescript
// scripts/seed-knowledge-base.ts
// Run with: OPENAI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed-knowledge-base.ts
// Reads all markdown notes from knowledge-base/{category}/ and upserts them
// into the Supabase knowledge_base table with embeddings.

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const KB_DIR = path.join(process.cwd(), 'knowledge-base')
const CATEGORIES = ['benchmarks', 'tools', 'patterns', 'failures', 'agency-profiles']
const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_CHUNK_CHARS = 4000
const CHUNK_OVERLAP_CHARS = 200

function chunkText(text: string, maxChars: number, overlap: number): string[] {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    chunks.push(text.slice(start, end))
    start = end - overlap
    if (start >= text.length) break
  }
  return chunks
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '').toLowerCase()
}

function extractLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map((m) => m.replace(/^\[\[|\]\]$/g, ''))
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? ''
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? ''
  const openaiKey = process.env.OPENAI_API_KEY ?? ''

  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required')
    process.exit(1)
  }
  if (!openaiKey) {
    console.error('OPENAI_API_KEY env var is required')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const openai = new OpenAI({ apiKey: openaiKey })

  let totalUpserted = 0

  for (const category of CATEGORIES) {
    const catDir = path.join(KB_DIR, category)
    if (!fs.existsSync(catDir)) {
      console.warn(`Category dir not found: ${catDir}`)
      continue
    }

    const mdFiles = fs.readdirSync(catDir).filter((f) => f.endsWith('.md'))

    for (const file of mdFiles) {
      const filePath = path.join(catDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const slug = slugFromFilename(file)
      const links = extractLinks(content)

      // Extract source_file from the first heading or slug
      const researchIdMatch = slug.match(/^(research-\d+)/)
      const sourceFile = researchIdMatch ? `${researchIdMatch[1]}.json` : `${slug}.md`

      const chunks = chunkText(content, MAX_CHUNK_CHARS, CHUNK_OVERLAP_CHARS)

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]
        const chunkSlug = chunks.length === 1 ? slug : `${slug}--chunk-${chunkIndex + 1}`

        process.stdout.write(`  Embedding ${chunkSlug}...`)

        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: chunk.slice(0, 8000),
        })

        const embedding = embeddingResponse.data[0]?.embedding
        if (!embedding || embedding.length !== 1536) {
          console.error(`\n  ✗ Bad embedding for ${chunkSlug}`)
          continue
        }

        const { error } = await supabase
          .from('knowledge_base')
          .upsert(
            {
              slug: chunkSlug,
              source_file: sourceFile,
              category,
              content: chunk,
              links,
              embedding: embedding as unknown as string,
              metadata: { file, chunk_index: chunkIndex, total_chunks: chunks.length },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'slug' },
          )

        if (error) {
          console.error(`\n  ✗ Supabase upsert failed for ${chunkSlug}:`, error.message)
          continue
        }

        console.log(' ✓')
        totalUpserted++
      }
    }
  }

  console.log(`\nSeeded ${totalUpserted} chunks into knowledge_base.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify the script compiles with no TypeScript errors**

```bash
cd opsradar
npx tsc --noEmit scripts/seed-knowledge-base.ts --moduleResolution bundler --target ESNext --module ESNext 2>&1 | head -30
```

If there are errors about missing types, they will be resolved in Task 7 (build verification).

- [ ] **Step 3: Run the seed script (requires live env vars)**

This command seeds from the `benchmarks` category first to test, then all categories. Run from `opsradar/`:

```bash
OPENAI_API_KEY=$(grep OPENAI_API_KEY .env.local | cut -d= -f2) \
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2) \
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2) \
npx tsx scripts/seed-knowledge-base.ts
```

Expected output: a line per chunk (`Embedding research-01-...-chunk-1... ✓`) and a final count like `Seeded 85 chunks into knowledge_base.`

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-knowledge-base.ts
git commit -m "feat: add seeding script to embed and upsert markdown notes into knowledge_base table"
```

---

## Task 6: Update `knowledge-retrieval.ts` — Add Category Filtering

**Files:**
- Modify: `src/lib/knowledge-retrieval.ts`

The RPC now accepts `filter_category`. We update `retrieveRelevantKnowledge` to optionally accept a `category` string and pass it through. The `KnowledgeChunk` type gains `category` and `slug` fields matching the new RPC return columns.

- [ ] **Step 1: Read the current file**

Read `src/lib/knowledge-retrieval.ts` — already done at planning time. Current interface:

```typescript
export type KnowledgeChunk = {
  id: string
  sourceFile: string
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
}

export async function retrieveRelevantKnowledge(
  query: string,
  topK: number = 5,
): Promise<KnowledgeChunk[]>
```

- [ ] **Step 2: Update `src/lib/knowledge-retrieval.ts`**

Replace the entire file with:

```typescript
import { openai } from './openai'
import { getServerSupabaseClient, hasServerSupabaseClient } from './supabase-server'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536
const MAX_QUERY_CHARS = 8000

export type KnowledgeChunk = {
  id: string
  slug: string | null
  sourceFile: string
  category: string | null
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
}

/**
 * Map from audit pain category keywords to knowledge_base category names.
 * Used to bias retrieval toward relevant research when the pain is known.
 */
function painToCategory(agencyType?: string, automationWish?: string): string | null {
  const pain = (automationWish ?? '').toLowerCase()
  const agency = (agencyType ?? '').toLowerCase()

  if (/fail|break|abandon|orphan|collapse/.test(pain)) return 'failures'
  if (/n8n|zapier|make|platform|tool|stack/.test(pain)) return 'tools'
  if (/onboard|report|invoice|proposal|workflow|process/.test(pain)) return 'patterns'
  if (/churn|burnout|hiring|linkedin|objection/.test(agency + pain)) return 'agency-profiles'
  if (/benchmark|revenue|rate|cost|margin/.test(pain)) return 'benchmarks'
  return null
}

/**
 * Retrieve the top `topK` chunks from the OpsRadar research library whose
 * embeddings are closest to the given query string. Returns an empty array
 * instead of throwing if Supabase or OpenAI is unavailable — RAG is a
 * best-effort augmentation, not a hard dependency of the audit pipeline.
 *
 * Pass `agencyType` and `automationWish` to enable category-biased retrieval.
 */
export async function retrieveRelevantKnowledge(
  query: string,
  topK: number = 5,
  options: { agencyType?: string; automationWish?: string; category?: string } = {},
): Promise<KnowledgeChunk[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (!hasServerSupabaseClient()) {
    console.warn('[knowledge-retrieval] Supabase not configured; returning no chunks')
    return []
  }

  if (!(process.env.OPENAI_API_KEY ?? '').trim()) {
    console.warn('[knowledge-retrieval] OPENAI_API_KEY not set; returning no chunks')
    return []
  }

  let queryEmbedding: number[]
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: trimmed.slice(0, MAX_QUERY_CHARS),
    })
    queryEmbedding = response.data[0]?.embedding ?? []
  } catch (err) {
    console.warn(
      '[knowledge-retrieval] embedding request failed:',
      err instanceof Error ? err.message : err,
    )
    return []
  }

  if (queryEmbedding.length !== EMBEDDING_DIMS) {
    console.warn(
      `[knowledge-retrieval] unexpected embedding dimension ${queryEmbedding.length} (expected ${EMBEDDING_DIMS})`,
    )
    return []
  }

  // Determine category filter: explicit option > pain-derived > null (no filter)
  const filterCategory = options.category
    ?? painToCategory(options.agencyType, options.automationWish)
    ?? null

  if (filterCategory) {
    console.log(`[knowledge-retrieval] applying category filter: ${filterCategory}`)
  }

  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding as unknown as string,
      match_count: topK,
      match_threshold: 0.0,
      filter_category: filterCategory,
    })
    if (error) {
      console.warn('[knowledge-retrieval] match_knowledge_base RPC failed:', error.message)
      return []
    }
    if (!Array.isArray(data)) return []

    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      slug: typeof row.slug === 'string' ? row.slug : null,
      sourceFile: String(row.source_file ?? 'unknown'),
      category: typeof row.category === 'string' ? row.category : null,
      content: String(row.content ?? ''),
      similarity: typeof row.similarity === 'number' ? row.similarity : 0,
      metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    }))
  } catch (err) {
    console.warn(
      '[knowledge-retrieval] Supabase call failed:',
      err instanceof Error ? err.message : err,
    )
    return []
  }
}

/**
 * Format retrieved chunks into the block that gets appended to the audit
 * system prompt. Returns an empty string when there are no chunks, so callers
 * can unconditionally concatenate.
 */
export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return ''

  const body = chunks
    .map((chunk) => `[Source: ${chunk.sourceFile}]\n${chunk.content.trim()}`)
    .join('\n\n')

  return [
    'RELEVANT KNOWLEDGE FROM OPSRADAR RESEARCH LIBRARY:',
    body,
    '',
    "Use this knowledge to support your analysis. Cite specific findings when relevant. Never fabricate — only reference what's in the knowledge above.",
  ].join('\n')
}
```

- [ ] **Step 3: Update the caller in `src/app/api/generate-audit/route.ts`**

The `retrieveRelevantKnowledge` call in route.ts (line ~313) needs to pass the new options. Find:

```typescript
const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5)
```

Replace with:

```typescript
const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5, {
  agencyType,
  automationWish,
})
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/knowledge-retrieval.ts src/app/api/generate-audit/route.ts
git commit -m "feat: add category-biased RAG filtering to knowledge-retrieval — routes by agency pain to relevant research category"
```

---

## Task 7: Run Build — Verify Zero TypeScript Errors

**Files:**
- No new files — verification step

- [ ] **Step 1: Run the Next.js production build**

```bash
cd opsradar
npm run build 2>&1 | tail -40
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 2: If TypeScript errors appear, fix them**

Most likely issues and fixes:

**Issue A:** `filter_category` parameter not in Supabase generated types  
Fix: The `supabase.rpc()` call uses `unknown` for the RPC params — no types change needed. If `database.types.ts` has the RPC signature, run `npm run types:supabase` to regenerate it after applying the migration.

```bash
npm run types:supabase
```

**Issue B:** `slug` or `category` fields on `KnowledgeChunk` cause type errors downstream  
These fields are only used in `knowledge-retrieval.ts` and `route.ts`. Since they're typed as `string | null`, they won't break existing callers that don't destructure them.

**Issue C:** `scripts/` directory is included in the TS project scope  
Fix: Add `scripts/` to `tsconfig.json` exclude array if tsc picks it up. Open `tsconfig.json` and add:

```json
{
  "exclude": ["node_modules", ".next", "scripts"]
}
```

- [ ] **Step 3: Confirm build passes and commit if any tsconfig fix was needed**

```bash
npm run build 2>&1 | grep -E "(error|warning|compiled)" | head -20
```

```bash
git add tsconfig.json  # only if changed
git commit -m "fix: exclude scripts/ from Next.js TypeScript compilation"
```

---

## Task 8: Outer Repo Submodule Bump

**Files:**
- Modify: outer repo `opsradar` pointer

- [ ] **Step 1: Return to outer repo and commit the submodule bump**

```bash
cd ..  # back to /home/lawand/Desktop/my-startup
git add opsradar
git commit -m "feat: update opsradar submodule — knowledge base markdown conversion, category-biased RAG, Supabase schema v2"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Covered By |
|-------------|-----------|
| Read every JSON file | Task 2 — conversion script reads all research-*.json |
| Convert to markdown with clear headings, sections, data preserved, [[links]] | Task 2 — `jsonToMarkdown()` function |
| Create folder structure: benchmarks/tools/patterns/failures/agency-profiles | Task 2 — `fs.mkdirSync` for each category |
| Place each note in correct folder | Task 2 — `CATEGORY_MAP` routing |
| Create index.md linking all notes | Task 4 |
| Update audit retrieval logic | Task 6 — `knowledge-retrieval.ts` updated, category filtering added |
| Add knowledge_base columns: slug, category, content, links, updated_at | Task 1 — migration adds all four missing columns |
| Run npm run build, zero TS errors | Task 7 |
| Show full diff before committing | Each task commits individually with git add + git commit — run `git diff HEAD~N HEAD` to review any step |
| Preserve benchmark numbers | Conversion script preserves all fields from key_facts verbatim |
| Do not change 5-stage pipeline | Not touched — only `knowledge-retrieval.ts` and `route.ts` retrieval call modified |
| Do not touch audit questions | Not touched |

### Placeholder Scan

No TBD/TODO/placeholder patterns detected in this plan.

### Type Consistency

- `KnowledgeChunk.slug` added in Task 6 Step 2 — matches `slug` column added in Task 1
- `KnowledgeChunk.category` added in Task 6 Step 2 — matches `category` column added in Task 1
- `match_knowledge_base` RPC `filter_category` parameter added in Task 1 — called in Task 6 Step 2
- `retrieveRelevantKnowledge` new `options` third parameter is optional — existing callers with 2 args still compile
- Route.ts call updated in Task 6 Step 3 to pass `{ agencyType, automationWish }` — those variables are already in scope at that point in `route.ts`
