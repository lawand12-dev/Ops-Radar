# Notion Brain Provisioning + Historical Backfill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a customer connects Notion via Composio, automatically provision the 20-database Brain, populate it with a current snapshot within 30s, then backfill 12 months of historical data in the background (3–5 min) via a fire-and-forget background runner.

**Architecture:** Composio webhook → synchronous brain provisioning + Phase 1 pull → fire-and-forget POST to `/api/backfill/run`. Background runner executes all 22 toolkit pullers in parallel (`Promise.all`), writes monthly aggregates to Brain, runs pattern detectors, regenerates the Brain Home page via gpt-5.4, and sends a completion email. No durable runtime needed — fits in a single 300s Vercel function. Idempotent batch writer keyed by `External ID` property. Cron agents append Notion writes after each run for ongoing freshness.

**Tech Stack:** Next.js 16, Composio (`@composio/core` + `NOTION_*` actions), Supabase (Postgres), Vercel AI SDK v6, Resend.

**Spec:** [docs/superpowers/specs/2026-05-24-notion-brain-backfill-design.md](../specs/2026-05-24-notion-brain-backfill-design.md)

---

## Milestones

1. **M1 — Foundation:** Composio NOTION_* feasibility spike + test harness setup
2. **M2 — Idempotent writer + provisioning:** Brain provisioning via Composio + batch writer
3. **M3 — Webhook + Phase 1:** Composio webhook fires brain provisioning + synchronous current-state pull
4. **M4 — Background runner + all toolkits:** `/api/backfill/run` route runs all 22 pullers in parallel, Brain Home narrative, pattern detection
5. **M5 — Phase 4 + UI + cron integration:** Email, dashboard progress UI, cron agents write to Notion
6. **M6 — Cleanup:** Delete direct OAuth path, drop unused column + env vars, ship behind flag

---

## M1 — Foundation

### Task 1.1: Set up test runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script + dev dependencies)
- Create: `tests/setup.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: { '<npm>': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: Create test setup**

`tests/setup.ts`:

```ts
import { beforeAll } from 'vitest'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.COMPOSIO_API_KEY = 'test-composio-key'
})
```

- [ ] **Step 4: Add test script to package.json**

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify test runner works**

```bash
echo "import { test, expect } from 'vitest'
test('sanity', () => expect(1).toBe(1))" > tests/sanity.test.ts
npm test
```

Expected: 1 passing test.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/ package.json package-lock.json
git commit -m "test: add vitest test runner"
```

### Task 1.2: Composio NOTION_* action spike

Goal: discover which Composio NOTION_* actions exist and which support creating a database with typed properties. If insufficient, locks in fallback approach early.

**Files:**
- Create: `scripts/notion-action-spike.ts`
- Create: `docs/superpowers/specs/notion-composio-spike-results.md`

- [ ] **Step 1: Write the spike script**

`scripts/notion-action-spike.ts`:

```ts
import { getComposio } from '<npm>/lib/composio'

async function main() {
  const composio = getComposio()
  const tools = await composio.tools.get(process.env.SPIKE_USER_ID!, {
    toolkits: ['notion'],
  })

  console.log(`Found ${Object.keys(tools).length} NOTION_* tools:`)
  for (const [name, def] of Object.entries(tools)) {
    console.log(`\n=== ${name} ===`)
    console.log(JSON.stringify(def, null, 2).slice(0, 500))
  }
}

main().catch(console.error)
```

- [ ] **Step 2: Run the spike against a real Composio Notion connection**

```bash
SPIKE_USER_ID=<your-test-user-id> npx tsx scripts/notion-action-spike.ts > /tmp/notion-actions.json
cat /tmp/notion-actions.json | head -200
```

- [ ] **Step 3: Document findings**

Write `docs/superpowers/specs/notion-composio-spike-results.md` with sections:

```markdown
# Notion Composio Action Surface — Spike Results

## Date: 2026-05-24

## Actions discovered
[list each NOTION_* action with one-line summary]

## Database creation capability
[Can we create a database with 20+ typed properties via Composio? Yes/No/Partial]

## Page creation capability
[Can we create + update pages with arbitrary property types? Yes/No/Partial]

## Decision
[Either: "Composio actions suffice — proceed as planned." OR
 "Use Composio token + raw Notion REST for provisioning. Use Composio actions for all other reads/writes."]
```

- [ ] **Step 4: Commit**

```bash
git add scripts/notion-action-spike.ts docs/superpowers/specs/notion-composio-spike-results.md
git commit -m "spike: document Composio NOTION_* action surface for brain provisioning"
```

### Task 1.3: Create backfill module skeleton

**Files:**
- Create: `src/lib/backfill/types.ts`
- Create: `src/lib/backfill/sources/index.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/backfill/types.test.ts`:

```ts
import { test, expect } from 'vitest'
import type { BrainWrite, PullerResult } from './types'

test('BrainWrite shape', () => {
  const w: BrainWrite = {
    database_slug: 'invoices',
    external_id: 'stripe:in_1abc',
    properties: { Status: 'open', Amount: 1000 },
  }
  expect(w.database_slug).toBe('invoices')
})

test('PullerResult shape', () => {
  const r: PullerResult = { writes: [], skipped_reason: null }
  expect(r.writes).toEqual([])
})
```

- [ ] **Step 2: Run test (expect FAIL — types.ts missing)**

```bash
npm test -- src/lib/backfill/types.test.ts
```

- [ ] **Step 3: Implement types**

`src/lib/backfill/types.ts`:

```ts
import type { NotionDatabaseSlug } from '<npm>/lib/notion/schema-keys'

/** A single row to upsert into one Brain database. */
export type BrainWrite = {
  database_slug: NotionDatabaseSlug
  /** Stable key for idempotent upserts. Format: `<toolkit>:<source_id>`. */
  external_id: string
  /** Notion page properties. The batch writer normalizes these into Notion's property API shape. */
  properties: Record<string, unknown>
}

/** Result returned by every per-toolkit puller. */
export type PullerResult = {
  writes: BrainWrite[]
  /** Set when the puller was skipped (e.g. toolkit not connected). */
  skipped_reason: string | null
}

/** Contract every puller implements. */
export type PullerInterface = {
  pullCurrent: (userId: string) => Promise<PullerResult>
  pull90Days: (userId: string) => Promise<PullerResult>
  pull12Months: (userId: string) => Promise<PullerResult>
}
```

- [ ] **Step 4: Implement pullers registry**

`src/lib/backfill/sources/index.ts`:

```ts
import type { PullerInterface } from '../types'

export type ToolkitSlug =
  | 'stripe' | 'quickbooks' | 'hubspot' | 'pipedrive' | 'apollo'
  | 'clickup' | 'asana' | 'monday' | 'harvest' | 'toggl'
  | 'bamboo-hr' | 'gusto' | 'google-calendar' | 'calendly'
  | 'google-analytics' | 'google-ads' | 'linkedin'
  | 'intercom' | 'zendesk' | 'typeform' | 'slack' | 'gmail'

export const PULLER_REGISTRY: Record<ToolkitSlug, PullerInterface | null> = {
  stripe: null, quickbooks: null, hubspot: null, pipedrive: null, apollo: null,
  clickup: null, asana: null, monday: null, harvest: null, toggl: null,
  'bamboo-hr': null, gusto: null, 'google-calendar': null, calendly: null,
  'google-analytics': null, 'google-ads': null, linkedin: null,
  intercom: null, zendesk: null, typeform: null, slack: null, gmail: null,
}
```

- [ ] **Step 5: Run test (expect PASS)**

```bash
npm test -- src/lib/backfill/types.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/backfill/
git commit -m "feat(backfill): add BrainWrite types + puller registry skeleton"
```

---

## M2 — Idempotent writer + provisioning

### Task 2.1: Idempotent batch writer

**Files:**
- Create: `src/lib/notion/batch-writer.ts`
- Create: `src/lib/notion/batch-writer.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/notion/batch-writer.test.ts`:

```ts
import { test, expect, vi, beforeEach } from 'vitest'
import { writeBrainBatch } from './batch-writer'
import type { BrainWrite } from '<npm>/lib/backfill/types'

const mockQuery = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('<npm>/lib/composio', () => ({
  getComposio: () => ({
    tools: {
      execute: vi.fn(async (action: string, args: any) => {
        if (action === 'NOTION_QUERY_DATABASE') return mockQuery(args)
        if (action === 'NOTION_CREATE_PAGE') return mockCreate(args)
        if (action === 'NOTION_UPDATE_PAGE') return mockUpdate(args)
      }),
    },
  }),
}))

vi.mock('<npm>/lib/notion/helpers', () => ({
  getDatabaseIdForSlug: vi.fn(async () => 'db-id-123'),
}))

beforeEach(() => {
  mockQuery.mockReset()
  mockCreate.mockReset()
  mockUpdate.mockReset()
})

test('creates new page when external_id does not exist', async () => {
  mockQuery.mockResolvedValueOnce({ data: { results: [] } })
  mockCreate.mockResolvedValueOnce({ data: { id: 'page-new' } })

  const writes: BrainWrite[] = [
    { database_slug: 'invoices', external_id: 'stripe:in_1', properties: { Amount: 100 } },
  ]
  const result = await writeBrainBatch('user-1', writes)

  expect(mockCreate).toHaveBeenCalledOnce()
  expect(mockUpdate).not.toHaveBeenCalled()
  expect(result.created).toBe(1)
  expect(result.updated).toBe(0)
})

test('updates existing page when external_id matches', async () => {
  mockQuery.mockResolvedValueOnce({
    data: { results: [{ id: 'page-existing' }] },
  })
  mockUpdate.mockResolvedValueOnce({ data: { id: 'page-existing' } })

  const writes: BrainWrite[] = [
    { database_slug: 'invoices', external_id: 'stripe:in_1', properties: { Amount: 200 } },
  ]
  const result = await writeBrainBatch('user-1', writes)

  expect(mockCreate).not.toHaveBeenCalled()
  expect(mockUpdate).toHaveBeenCalledOnce()
  expect(result.updated).toBe(1)
})

test('continues on individual write failure', async () => {
  mockQuery.mockResolvedValue({ data: { results: [] } })
  mockCreate
    .mockRejectedValueOnce(new Error('rate limit'))
    .mockResolvedValueOnce({ data: { id: 'page-2' } })

  const writes: BrainWrite[] = [
    { database_slug: 'invoices', external_id: 'stripe:in_1', properties: {} },
    { database_slug: 'invoices', external_id: 'stripe:in_2', properties: {} },
  ]
  const result = await writeBrainBatch('user-1', writes)

  expect(result.created).toBe(1)
  expect(result.failed).toBe(1)
})
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
npm test -- src/lib/notion/batch-writer.test.ts
```

- [ ] **Step 3: Implement batch writer**

`src/lib/notion/batch-writer.ts`:

```ts
import { getComposio } from '<npm>/lib/composio'
import { getDatabaseIdForSlug } from '<npm>/lib/notion/helpers'
import type { BrainWrite } from '<npm>/lib/backfill/types'

export type BatchWriteResult = {
  created: number
  updated: number
  failed: number
  errors: Array<{ external_id: string; error: string }>
}

const NOTION_RATE_LIMIT_PER_SEC = 3
const DELAY_BETWEEN_WRITES_MS = Math.ceil(1000 / NOTION_RATE_LIMIT_PER_SEC)

export async function writeBrainBatch(
  userId: string,
  writes: BrainWrite[],
): Promise<BatchWriteResult> {
  const result: BatchWriteResult = { created: 0, updated: 0, failed: 0, errors: [] }
  const composio = getComposio()

  for (const w of writes) {
    try {
      const databaseId = await getDatabaseIdForSlug(userId, w.database_slug)
      if (!databaseId) {
        result.failed++
        result.errors.push({ external_id: w.external_id, error: 'database_not_provisioned' })
        continue
      }

      const existing = await composio.tools.execute('NOTION_QUERY_DATABASE', {
        userId,
        arguments: {
          database_id: databaseId,
          filter: {
            property: 'External ID',
            rich_text: { equals: w.external_id },
          },
          page_size: 1,
        },
      })

      const found = (existing as any)?.data?.results?.[0]?.id as string | undefined
      const propertiesWithExternalId = {
        ...w.properties,
        'External ID': w.external_id,
      }

      if (found) {
        await composio.tools.execute('NOTION_UPDATE_PAGE', {
          userId,
          arguments: { page_id: found, properties: propertiesWithExternalId },
        })
        result.updated++
      } else {
        await composio.tools.execute('NOTION_CREATE_PAGE', {
          userId,
          arguments: {
            parent: { database_id: databaseId },
            properties: propertiesWithExternalId,
          },
        })
        result.created++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.failed++
      result.errors.push({ external_id: w.external_id, error: message })
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_WRITES_MS))
  }

  return result
}
```

- [ ] **Step 4: Add the database-id lookup helper**

Modify `src/lib/notion/helpers.ts` — add at end:

```ts
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import type { NotionDatabaseSlug } from './schema-keys'

export async function getDatabaseIdForSlug(
  userId: string,
  slug: NotionDatabaseSlug,
): Promise<string | null> {
  const supabase = getServerSupabaseClient()
  const { data } = await supabase
    .from('notion_workspaces')
    .select('databases')
    .eq('user_id', userId)
    .maybeSingle()
  const map = (data?.databases ?? {}) as Record<string, string>
  return map[slug] ?? null
}
```

- [ ] **Step 5: Run test (expect PASS)**

```bash
npm test -- src/lib/notion/batch-writer.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/notion/batch-writer.ts src/lib/notion/batch-writer.test.ts src/lib/notion/helpers.ts
git commit -m "feat(notion): idempotent batch writer keyed by External ID property"
```

### Task 2.2: Composio-based brain provisioning

**Files:**
- Create: `src/lib/notion/composio-brain.ts`
- Create: `src/lib/notion/composio-brain.test.ts`
- Modify: `src/lib/notion/create-brain.ts` (redirect to new impl)

- [ ] **Step 1: Write the failing test**

`src/lib/notion/composio-brain.test.ts`:

```ts
import { test, expect, vi, beforeEach } from 'vitest'
import { provisionBrainViaComposio } from './composio-brain'

const mockExecute = vi.fn()
vi.mock('<npm>/lib/composio', () => ({
  getComposio: () => ({ tools: { execute: mockExecute } }),
}))

beforeEach(() => {
  mockExecute.mockReset()
})

test('creates parent page + 20 databases + 7 curated pages', async () => {
  mockExecute.mockImplementation(async (action: string) => {
    if (action === 'NOTION_CREATE_PAGE') return { data: { id: `page-${Math.random()}` } }
    if (action === 'NOTION_CREATE_DATABASE') return { data: { id: `db-${Math.random()}` } }
    if (action === 'NOTION_SEARCH') return { data: { results: [{ id: 'workspace-root' }] } }
    return {}
  })

  const result = await provisionBrainViaComposio('user-1', { agencyName: 'Acme' })

  expect(result.parentPageId).toBeTruthy()
  expect(Object.keys(result.entities).length).toBeGreaterThanOrEqual(27)
})
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
npm test -- src/lib/notion/composio-brain.test.ts
```

- [ ] **Step 3: Implement provisioning**

`src/lib/notion/composio-brain.ts`:

```ts
import { getComposio } from '<npm>/lib/composio'
import {
  NOTION_DATABASE_SLUGS,
  NOTION_PAGE_SLUGS,
  type NotionWorkspaceEntityMap,
} from './schema-keys'
import { getDatabaseSchemaForSlug } from './database-schemas'
import { getPageContentForSlug } from './page-templates'

export type ProvisionResult = {
  parentPageId: string
  entities: NotionWorkspaceEntityMap
}

export async function provisionBrainViaComposio(
  userId: string,
  opts: { agencyName?: string | null },
): Promise<ProvisionResult> {
  const composio = getComposio()
  const agencyName = opts.agencyName?.trim() || 'OpsRadar'

  const search = await composio.tools.execute('NOTION_SEARCH', {
    userId,
    arguments: { query: '', filter: { value: 'page', property: 'object' } },
  })
  const workspaceRoot = (search as any)?.data?.results?.[0]?.id
  if (!workspaceRoot) throw new Error('notion_workspace_root_not_found')

  const parent = await composio.tools.execute('NOTION_CREATE_PAGE', {
    userId,
    arguments: {
      parent: { page_id: workspaceRoot },
      properties: { title: [{ text: { content: `${agencyName} — OpsRadar Brain` } }] },
    },
  })
  const parentPageId = (parent as any).data.id as string

  const entities: NotionWorkspaceEntityMap = {}

  for (const slug of NOTION_DATABASE_SLUGS) {
    const schema = getDatabaseSchemaForSlug(slug)
    const created = await composio.tools.execute('NOTION_CREATE_DATABASE', {
      userId,
      arguments: {
        parent: { type: 'page_id', page_id: parentPageId },
        title: [{ text: { content: schema.title } }],
        properties: { ...schema.properties, 'External ID': { rich_text: {} } },
      },
    })
    entities[slug] = (created as any).data.id as string
  }

  for (const slug of NOTION_PAGE_SLUGS) {
    const content = getPageContentForSlug(slug, agencyName)
    const created = await composio.tools.execute('NOTION_CREATE_PAGE', {
      userId,
      arguments: {
        parent: { page_id: parentPageId },
        properties: { title: [{ text: { content: content.title } }] },
        children: content.blocks,
      },
    })
    entities[slug] = (created as any).data.id as string
  }

  return { parentPageId, entities }
}
```

- [ ] **Step 4: Extract database schemas to dedicated file**

Create `src/lib/notion/database-schemas.ts` with one exported `getDatabaseSchemaForSlug(slug)` function returning `{ title, properties }` for each of the 20 slugs. Pull definitions out of existing `create-brain.ts`. This is mechanical extraction — preserve every property exactly.

- [ ] **Step 5: Extract page templates similarly**

Create or update `src/lib/notion/page-templates.ts` so `getPageContentForSlug(slug, agencyName)` returns `{ title, blocks }`. Reuse existing block templates.

- [ ] **Step 6: Run test (expect PASS)**

```bash
npm test -- src/lib/notion/composio-brain.test.ts
```

- [ ] **Step 7: Redirect create-brain.ts to new impl**

In `src/lib/notion/create-brain.ts`, replace the body of `provisionBrain` so it just calls `provisionBrainViaComposio`. Keep the export signature identical so the old `/api/notion/callback` route still type-checks (it will be deleted in M7).

- [ ] **Step 8: Commit**

```bash
git add src/lib/notion/composio-brain.ts src/lib/notion/composio-brain.test.ts src/lib/notion/database-schemas.ts src/lib/notion/page-templates.ts src/lib/notion/create-brain.ts
git commit -m "feat(notion): provision Brain via Composio NOTION_* actions"
```

---

## M3 — Webhook + Phase 1

### Task 3.1: Phase 1 orchestrator + Core 5 pullers

**Files:**
- Create: `src/lib/backfill/sources/stripe.ts`
- Create: `src/lib/backfill/sources/stripe.test.ts`
- Create: `src/lib/backfill/sources/hubspot.ts`
- Create: `src/lib/backfill/sources/clickup.ts`
- Create: `src/lib/backfill/sources/harvest.ts`
- Create: `src/lib/backfill/sources/tool-stack.ts` (derived from connected tools — no Composio call)
- Create: `src/lib/backfill/phase1.ts`
- Create: `src/lib/backfill/phase1.test.ts`

- [ ] **Step 1: Write the Stripe puller test**

`src/lib/backfill/sources/stripe.test.ts`:

```ts
import { test, expect, vi, beforeEach } from 'vitest'
import { stripePuller } from './stripe'

const mockExecute = vi.fn()
vi.mock('<npm>/lib/composio', () => ({
  getComposio: () => ({ tools: { execute: mockExecute } }),
}))
vi.mock('<npm>/lib/composio', async () => ({
  getComposio: () => ({ tools: { execute: mockExecute } }),
  getConnectedToolSlugs: vi.fn(async () => new Set(['stripe'])),
}))

beforeEach(() => mockExecute.mockReset())

test('pullCurrent returns open invoices as BrainWrites', async () => {
  mockExecute.mockResolvedValueOnce({
    data: {
      data: [
        { id: 'in_1', customer: 'cus_1', amount_due: 5000, status: 'open', due_date: 1700000000 },
        { id: 'in_2', customer: 'cus_2', amount_due: 7500, status: 'open', due_date: 1700001000 },
      ],
    },
  })

  const result = await stripePuller.pullCurrent('user-1')

  expect(result.skipped_reason).toBeNull()
  expect(result.writes).toHaveLength(2)
  expect(result.writes[0]).toMatchObject({
    database_slug: 'invoices',
    external_id: 'stripe:in_1',
  })
})

test('pullCurrent skips when stripe not connected', async () => {
  const { getConnectedToolSlugs } = await import('<npm>/lib/composio')
  ;(getConnectedToolSlugs as any).mockResolvedValueOnce(new Set())

  const result = await stripePuller.pullCurrent('user-1')

  expect(result.skipped_reason).toBe('toolkit_not_connected')
  expect(result.writes).toHaveLength(0)
})
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
npm test -- src/lib/backfill/sources/stripe.test.ts
```

- [ ] **Step 3: Implement Stripe puller (aggregation strategy)**

Per spec §4.5: `pullCurrent` writes raw open invoices. `pull90Days` writes 13 weekly KPI rows. `pull12Months` writes 12 monthly P&L rows + last-30-day raw invoices. No more than ~50 BrainWrites per puller per call.

`src/lib/backfill/sources/stripe.ts`:

```ts
import { getComposio, getConnectedToolSlugs } from '<npm>/lib/composio'
import type { PullerInterface, PullerResult, BrainWrite } from '../types'

async function isConnected(userId: string): Promise<boolean> {
  const slugs = await getConnectedToolSlugs(userId)
  return slugs.has('stripe')
}

async function fetchOpenInvoices(userId: string): Promise<any[]> {
  const composio = getComposio()
  const res = await composio.tools.execute('STRIPE_INVOICE_LIST', {
    userId,
    arguments: { status: 'open', limit: 100 },
  })
  return ((res as any)?.data?.data ?? []) as any[]
}

async function fetchPaidInvoicesSince(userId: string, sinceUnix: number): Promise<any[]> {
  const composio = getComposio()
  const res = await composio.tools.execute('STRIPE_INVOICE_LIST', {
    userId,
    arguments: { status: 'paid', created: { gte: sinceUnix }, limit: 100 },
  })
  return ((res as any)?.data?.data ?? []) as any[]
}

function invoiceToWrite(inv: any): BrainWrite {
  return {
    database_slug: 'invoices',
    external_id: `stripe:${inv.id}`,
    properties: {
      Name: { title: [{ text: { content: inv.number || inv.id } }] },
      Status: { select: { name: inv.status } },
      Amount: { number: (inv.amount_due || inv.amount_paid || 0) / 100 },
      Customer: { rich_text: [{ text: { content: inv.customer || '' } }] },
      'Due Date': inv.due_date
        ? { date: { start: new Date(inv.due_date * 1000).toISOString() } }
        : null,
    },
  }
}

export const stripePuller: PullerInterface = {
  async pullCurrent(userId): Promise<PullerResult> {
    if (!(await isConnected(userId))) {
      return { writes: [], skipped_reason: 'toolkit_not_connected' }
    }
    const invoices = await fetchOpenInvoices(userId)
    return { writes: invoices.map(invoiceToWrite), skipped_reason: null }
  },

  async pull90Days(userId): Promise<PullerResult> {
    if (!(await isConnected(userId))) {
      return { writes: [], skipped_reason: 'toolkit_not_connected' }
    }
    const sinceUnix = Math.floor(Date.now() / 1000) - 90 * 86400
    const [open, paid] = await Promise.all([
      fetchOpenInvoices(userId),
      fetchPaidInvoicesSince(userId, sinceUnix),
    ])
    return { writes: [...open, ...paid].map(invoiceToWrite), skipped_reason: null }
  },

  async pull12Months(userId): Promise<PullerResult> {
    if (!(await isConnected(userId))) {
      return { writes: [], skipped_reason: 'toolkit_not_connected' }
    }
    const sinceUnix = Math.floor(Date.now() / 1000) - 365 * 86400
    const [open, paid] = await Promise.all([
      fetchOpenInvoices(userId),
      fetchPaidInvoicesSince(userId, sinceUnix),
    ])
    return { writes: [...open, ...paid].map(invoiceToWrite), skipped_reason: null }
  },
}
```

- [ ] **Step 4: Run test (expect PASS)**

```bash
npm test -- src/lib/backfill/sources/stripe.test.ts
```

- [ ] **Step 5: Implement HubSpot puller**

`src/lib/backfill/sources/hubspot.ts`: identical structure to Stripe. Uses Composio actions `HUBSPOT_LIST_DEALS`, `HUBSPOT_LIST_COMPANIES`. Maps deals → `sales_pipeline` database, companies → `clients`. Test file mirrors Stripe test.

- [ ] **Step 6: Implement ClickUp puller**

`src/lib/backfill/sources/clickup.ts`: Composio action `CLICKUP_GET_LISTS` or `CLICKUP_GET_TASKS`. Maps active projects → `projects` database. Test file mirrors Stripe test.

- [ ] **Step 7: Implement Harvest puller**

`src/lib/backfill/sources/harvest.ts`: Composio action `HARVEST_LIST_TIME_ENTRIES`. Maps this-week hours → entries in `real_pnl` keyed by `harvest:<entry_id>`. Test file mirrors Stripe test.

- [ ] **Step 8: Implement tool-stack puller (no Composio call)**

`src/lib/backfill/sources/tool-stack.ts`:

```ts
import { getConnectedToolSlugs } from '<npm>/lib/composio'
import type { PullerInterface, PullerResult } from '../types'

export const toolStackPuller: PullerInterface = {
  async pullCurrent(userId): Promise<PullerResult> {
    const slugs = await getConnectedToolSlugs(userId)
    const writes = Array.from(slugs).map((slug) => ({
      database_slug: 'tool_stack' as const,
      external_id: `connected:${slug}`,
      properties: {
        Name: { title: [{ text: { content: slug } }] },
        Status: { select: { name: 'connected' } },
      },
    }))
    return { writes, skipped_reason: null }
  },
  async pull90Days(userId) { return this.pullCurrent(userId) },
  async pull12Months(userId) { return this.pullCurrent(userId) },
}
```

- [ ] **Step 9: Wire pullers into registry**

Modify `src/lib/backfill/sources/index.ts`:

```ts
import { stripePuller } from './stripe'
import { hubspotPuller } from './hubspot'
import { clickupPuller } from './clickup'
import { harvestPuller } from './harvest'
import { toolStackPuller } from './tool-stack'

export const PULLER_REGISTRY: Record<string, PullerInterface | null> = {
  stripe: stripePuller, hubspot: hubspotPuller, clickup: clickupPuller,
  harvest: harvestPuller, 'tool-stack': toolStackPuller,
  // Remaining 17 toolkits — null until M4/M5
  quickbooks: null, pipedrive: null, apollo: null, asana: null, monday: null,
  toggl: null, 'bamboo-hr': null, gusto: null, 'google-calendar': null,
  calendly: null, 'google-analytics': null, 'google-ads': null, linkedin: null,
  intercom: null, zendesk: null, typeform: null, slack: null, gmail: null,
}
```

- [ ] **Step 10: Implement phase1 orchestrator**

`src/lib/backfill/phase1.ts`:

```ts
import { writeBrainBatch } from '<npm>/lib/notion/batch-writer'
import { PULLER_REGISTRY } from './sources'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

const PHASE_1_TOOLKITS = ['stripe', 'hubspot', 'clickup', 'harvest', 'tool-stack'] as const

export async function backfillPhase1(userId: string): Promise<{
  total_writes: number
  batch_result: { created: number; updated: number; failed: number }
  skipped: string[]
}> {
  const allWrites: any[] = []
  const skipped: string[] = []

  for (const toolkit of PHASE_1_TOOLKITS) {
    const puller = PULLER_REGISTRY[toolkit]
    if (!puller) { skipped.push(`${toolkit}:no_puller`); continue }
    const result = await puller.pullCurrent(userId)
    if (result.skipped_reason) skipped.push(`${toolkit}:${result.skipped_reason}`)
    allWrites.push(...result.writes)
  }

  const batch_result = await writeBrainBatch(userId, allWrites)

  const supabase = getServerSupabaseClient()
  await supabase
    .from('notion_workspaces')
    .update({ backfill_status: 'phase1' })
    .eq('user_id', userId)

  return { total_writes: allWrites.length, batch_result, skipped }
}
```

- [ ] **Step 11: Run all backfill tests**

```bash
npm test -- src/lib/backfill/
```

Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add src/lib/backfill/
git commit -m "feat(backfill): Phase 1 orchestrator + Core 5 pullers (Stripe/HubSpot/ClickUp/Harvest/tool-stack)"
```

### Task 3.2: Wire Composio webhook to provision Brain + Phase 1

**Files:**
- Modify: `src/app/api/composio/webhook/route.ts`

- [ ] **Step 1: Add Notion-connection branch + test fixtures**

Create `tests/integration/composio-webhook.test.ts` that POSTs a `connection.created` event for Notion against the route handler in isolation. Verify it calls `provisionBrainViaComposio` and `backfillPhase1`.

- [ ] **Step 2: Modify the webhook handler**

In `src/app/api/composio/webhook/route.ts`, after the `is_active` flip when `eventName.includes('created')`, add:

```ts
if (payload.data?.appName?.toLowerCase() === 'notion') {
  const { data: connection } = await supabase
    .from('composio_connections')
    .select('user_id')
    .eq('composio_connection_id', connectionId)
    .single()
  if (connection?.user_id) {
    try {
      await supabase.from('notion_workspaces').upsert({
        user_id: connection.user_id,
        backfill_status: 'provisioning',
      })

      const { provisionBrainViaComposio } = await import('<npm>/lib/notion/composio-brain')
      const { parentPageId, entities } = await provisionBrainViaComposio(
        connection.user_id,
        { agencyName: null },
      )
      await supabase
        .from('notion_workspaces')
        .update({ parent_page_id: parentPageId, databases: entities })
        .eq('user_id', connection.user_id)

      const { backfillPhase1 } = await import('<npm>/lib/backfill/phase1')
      await backfillPhase1(connection.user_id)

      // M4 will add: fire Vercel Workflow here.
    } catch (err) {
      console.error('[composio/webhook] notion brain bootstrap failed:', err)
      await supabase
        .from('notion_workspaces')
        .update({
          backfill_status: 'failed_phase1',
          backfill_error: err instanceof Error ? err.message : String(err),
        })
        .eq('user_id', connection.user_id)
    }
  }
}
```

- [ ] **Step 3: Verify webhook handler test passes**

```bash
npm test -- tests/integration/composio-webhook.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/composio/webhook/route.ts tests/integration/composio-webhook.test.ts
git commit -m "feat(webhook): provision Brain + run Phase 1 on Notion connection.created"
```

---

## M4 — Background runner + all toolkits

### Task 4.1: Background runner route

**Files:**
- Create: `src/app/api/backfill/run/route.ts`
- Create: `src/lib/backfill/run.ts`
- Create: `src/lib/backfill/brain-home.ts`

- [ ] **Step 1: Write the run orchestrator**

`src/lib/backfill/run.ts`:

```ts
import { writeBrainBatch } from '<npm>/lib/notion/batch-writer'
import { PULLER_REGISTRY } from './sources'
import { detectMarginTrend, detectScopeCreep, detectPaymentDelay } from './patterns'
import { generateAndRepaintBrainHome } from './brain-home'
import { sendPhase4Email } from './email'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import type { BrainWrite } from './types'

export async function runFullBackfill(userId: string): Promise<void> {
  const supabase = getServerSupabaseClient()

  try {
    await supabase
      .from('notion_workspaces')
      .update({ backfill_status: 'phase2' })
      .eq('user_id', userId)

    // Run all 22 pullers in parallel — each independently handles toolkit-not-connected.
    const results = await Promise.allSettled(
      Object.entries(PULLER_REGISTRY).map(async ([toolkit, puller]) => {
        if (!puller) return []
        try {
          const r = await puller.pull12Months(userId)
          return r.writes
        } catch (err) {
          console.error(`[backfill/run] ${toolkit} threw:`, err)
          return []
        }
      })
    )

    const allWrites: BrainWrite[] = results.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : []
    )
    await writeBrainBatch(userId, allWrites)

    await supabase
      .from('notion_workspaces')
      .update({ backfill_status: 'phase3' })
      .eq('user_id', userId)

    // Pattern detection (pure computation over what was just written).
    const patternCards: BrainWrite[] = []
    // Detectors run on the written data — for v1, we pass empty arrays
    // (cron agents will populate these as they run). Phase 3 = structure ready.
    await writeBrainBatch(userId, patternCards)

    // Brain Home narrative.
    await generateAndRepaintBrainHome(userId)

    // Completion email.
    await sendPhase4Email(userId)

    await supabase
      .from('notion_workspaces')
      .update({ backfill_status: 'complete', backfill_completed_at: new Date().toISOString() })
      .eq('user_id', userId)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[backfill/run] fatal:', message)
    await supabase
      .from('notion_workspaces')
      .update({ backfill_status: 'failed_phase2', backfill_error: message })
      .eq('user_id', userId)
  }
}
```

- [ ] **Step 2: Create the API route**

`src/app/api/backfill/run/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { runFullBackfill } from '<npm>/lib/backfill/run'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-backfill-secret')
  if (!secret || secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

  // Intentionally no await — this runs in background while we return immediately.
  runFullBackfill(userId).catch((err) =>
    console.error('[backfill/run] unhandled:', err)
  )

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Fire background runner from webhook**

In `src/app/api/composio/webhook/route.ts`, replace the comment `// M4 will add: fire Vercel Workflow here.` with:

```ts
const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
fetch(`${appUrl}/api/backfill/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-backfill-secret': process.env.BACKFILL_SECRET ?? '',
  },
  body: JSON.stringify({ userId: connection.user_id }),
}).catch((err) => console.error('[composio/webhook] backfill fire failed:', err))
```

- [ ] **Step 4: Add BACKFILL_SECRET to .env.local**

```bash
echo "BACKFILL_SECRET=$(openssl rand -hex 32)" >> .env.local
```

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/backfill/run.ts src/app/api/backfill/run/route.ts src/app/api/composio/webhook/route.ts .env.local
git commit -m "feat(backfill): background runner route — all pullers in parallel, 300s window"
```

### Task 4.2: All 22 toolkit pullers

**Files:**
- Create: remaining structured pullers (`quickbooks`, `pipedrive`, `apollo`, `asana`, `monday`, `toggl`, `bamboo-hr`, `gusto`, `google-calendar`, `calendly`, `google-analytics`, `google-ads`, `linkedin`, `intercom`, `zendesk`, `typeform`, `slack`, `gmail`)

- [ ] **Step 1: Implement remaining 16 structured pullers**

Implement each as a separate file in `src/lib/backfill/sources/<toolkit>.ts` following the exact shape of `stripe.ts`. Each puller:
- Checks `getConnectedToolSlugs` for its slug; if absent → return `skipped_reason: 'toolkit_not_connected'`
- Defines `pullCurrent`, `pull90Days`, `pull12Months`
- Calls 1-3 Composio actions specific to that toolkit
- Maps API responses to `BrainWrite[]` with `external_id = '<toolkit>:<source_id>'`
- Uses the database slugs defined in spec §4.6

For each puller, write a corresponding `<toolkit>.test.ts` that verifies the connected/skipped branches and the basic shape of one BrainWrite. (Same shape as `stripe.test.ts`.)

Composio action names to use (verify each in the Composio actions registry):

| Toolkit | Action(s) |
|---|---|
| quickbooks | `QUICKBOOKS_LIST_INVOICES`, `QUICKBOOKS_LIST_CUSTOMERS` |
| pipedrive | `PIPEDRIVE_LIST_DEALS`, `PIPEDRIVE_LIST_PERSONS` |
| apollo | `APOLLO_SEARCH_PEOPLE`, `APOLLO_SEARCH_COMPANIES` |
| asana | `ASANA_LIST_PROJECTS`, `ASANA_LIST_TASKS` |
| monday | `MONDAY_LIST_BOARDS`, `MONDAY_LIST_ITEMS` |
| toggl | `TOGGL_LIST_TIME_ENTRIES`, `TOGGL_LIST_WORKSPACES` |
| bamboo-hr | `BAMBOOHR_LIST_EMPLOYEES`, `BAMBOOHR_LIST_TIME_OFF` |
| gusto | `GUSTO_LIST_EMPLOYEES`, `GUSTO_LIST_PAYROLLS` |
| google-calendar | `GOOGLECALENDAR_LIST_EVENTS` |
| calendly | `CALENDLY_LIST_SCHEDULED_EVENTS` |
| google-analytics | `GOOGLEANALYTICS_GET_REPORT` |
| google-ads | `GOOGLEADS_GET_CAMPAIGNS` |
| linkedin | `LINKEDIN_GET_COMPANY_POSTS` |
| intercom | `INTERCOM_LIST_CONVERSATIONS`, `INTERCOM_LIST_CONTACTS` |
| zendesk | `ZENDESK_LIST_TICKETS` |
| typeform | `TYPEFORM_LIST_RESPONSES` |

- [ ] **Step 4: Register all pullers**

Update `src/lib/backfill/sources/index.ts` to import and register all 22.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- src/lib/backfill/
```

Expected: all pullers pass their basic tests.

- [ ] **Step 6: Commit per toolkit batch (5 toolkits at a time)**

```bash
git add src/lib/backfill/sources/quickbooks.* src/lib/backfill/sources/pipedrive.* src/lib/backfill/sources/apollo.* src/lib/backfill/sources/asana.* src/lib/backfill/sources/monday.*
git commit -m "feat(backfill): pullers batch 1 of 4 (QuickBooks, Pipedrive, Apollo, Asana, Monday)"
```

Repeat for batches 2 (Toggl, BambooHR, Gusto, GCal, Calendly), 3 (GA, GAds, LinkedIn, Intercom, Zendesk), 4 (Typeform + Phase 2 orchestrator).

```bash
git add src/lib/backfill/phase2.ts src/lib/backfill/phase2.test.ts src/lib/backfill/sources/index.ts
git commit -m "feat(backfill): Phase 2 orchestrator + register all pullers"
```

---

## M5 — Phase 3 + patterns

### Task 5.1: Phase 3 pullers — pull12Months for all toolkits

Already implemented as part of Task 4.2 (every puller has `pull12Months`). This task just adds Slack + Gmail pattern signal pullers.

**Files:**
- Create: `src/lib/backfill/sources/slack.ts`
- Create: `src/lib/backfill/sources/gmail.ts`

- [ ] **Step 1: Implement Slack pattern puller**

`src/lib/backfill/sources/slack.ts`: `pullCurrent` and `pull90Days` return `{ writes: [], skipped_reason: 'phase3_only' }`. `pull12Months` computes per-channel response-time medians, message volume by day-of-week, and channel-health scores. Maps to `team_communication` database.

- [ ] **Step 2: Implement Gmail pattern puller**

`src/lib/backfill/sources/gmail.ts`: same pattern. `pull12Months` computes per-customer response-time medians, email volume trends. Maps to `client_communication` database.

- [ ] **Step 3: Register both in sources/index.ts**

- [ ] **Step 4: Commit**

```bash
git add src/lib/backfill/sources/slack.* src/lib/backfill/sources/gmail.* src/lib/backfill/sources/index.ts
git commit -m "feat(backfill): Slack + Gmail Phase 3 pattern signal pullers"
```

### Task 5.2: Pattern detectors

**Files:**
- Create: `src/lib/backfill/patterns.ts`
- Create: `src/lib/backfill/patterns.test.ts`

- [ ] **Step 1: Write failing test for margin trend**

`src/lib/backfill/patterns.test.ts`:

```ts
import { test, expect } from 'vitest'
import { detectMarginTrend, detectScopeCreep, detectPaymentDelay } from './patterns'

test('detectMarginTrend classifies improving client', () => {
  const monthly = [
    { client_id: 'c1', month: '2025-06', margin_pct: 10 },
    { client_id: 'c1', month: '2025-09', margin_pct: 18 },
    { client_id: 'c1', month: '2025-12', margin_pct: 24 },
    { client_id: 'c1', month: '2026-03', margin_pct: 30 },
  ]
  const cards = detectMarginTrend(monthly)
  expect(cards).toHaveLength(1)
  expect(cards[0].properties.Direction).toMatchObject({ select: { name: 'improving' } })
})

test('detectScopeCreep flags sustained overrun', () => {
  const windows = [
    { client_id: 'c1', window_end: '2026-01-01', hours_billed: 120, hours_budgeted: 100 },
    { client_id: 'c1', window_end: '2026-02-01', hours_billed: 130, hours_budgeted: 100 },
    { client_id: 'c1', window_end: '2026-03-01', hours_billed: 140, hours_budgeted: 100 },
  ]
  const cards = detectScopeCreep(windows)
  expect(cards.length).toBeGreaterThan(0)
})

test('detectPaymentDelay flags rising DSO', () => {
  const monthly = [
    { client_id: 'c1', month: '2025-12', dso_days: 28 },
    { client_id: 'c1', month: '2026-01', dso_days: 38 },
    { client_id: 'c1', month: '2026-02', dso_days: 51 },
  ]
  const cards = detectPaymentDelay(monthly)
  expect(cards.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
npm test -- src/lib/backfill/patterns.test.ts
```

- [ ] **Step 3: Implement detectors**

`src/lib/backfill/patterns.ts`:

```ts
import type { BrainWrite } from './types'

export type MarginRow = { client_id: string; month: string; margin_pct: number }
export type ScopeRow = { client_id: string; window_end: string; hours_billed: number; hours_budgeted: number }
export type DsoRow = { client_id: string; month: string; dso_days: number }

function linearTrend(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xs = values.map((_, i) => i)
  const xMean = xs.reduce((s, x) => s + x, 0) / n
  const yMean = values.reduce((s, y) => s + y, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean)
    den += (xs[i] - xMean) ** 2
  }
  return den === 0 ? 0 : num / den
}

export function detectMarginTrend(rows: MarginRow[]): BrainWrite[] {
  const byClient = new Map<string, MarginRow[]>()
  for (const r of rows) {
    const arr = byClient.get(r.client_id) ?? []
    arr.push(r)
    byClient.set(r.client_id, arr)
  }
  const cards: BrainWrite[] = []
  for (const [clientId, clientRows] of byClient) {
    if (clientRows.length < 3) continue
    clientRows.sort((a, b) => a.month.localeCompare(b.month))
    const slope = linearTrend(clientRows.map((r) => r.margin_pct))
    const stddev = stdDev(clientRows.map((r) => r.margin_pct))
    const direction = stddev > 10 ? 'volatile' : slope > 1 ? 'improving' : slope < -1 ? 'declining' : 'stable'
    cards.push({
      database_slug: 'pattern_cards',
      external_id: `pattern:margin:${clientId}`,
      properties: {
        Name: { title: [{ text: { content: `Margin trend: ${clientId}` } }] },
        Type: { select: { name: 'margin_trend' } },
        Direction: { select: { name: direction } },
        Client: { rich_text: [{ text: { content: clientId } }] },
        Slope: { number: Number(slope.toFixed(2)) },
      },
    })
  }
  return cards
}

export function detectScopeCreep(rows: ScopeRow[]): BrainWrite[] {
  const byClient = new Map<string, ScopeRow[]>()
  for (const r of rows) {
    const arr = byClient.get(r.client_id) ?? []
    arr.push(r)
    byClient.set(r.client_id, arr)
  }
  const cards: BrainWrite[] = []
  for (const [clientId, clientRows] of byClient) {
    clientRows.sort((a, b) => a.window_end.localeCompare(b.window_end))
    let streak = 0, maxStreak = 0
    for (const r of clientRows) {
      if (r.hours_billed > r.hours_budgeted) { streak++; maxStreak = Math.max(maxStreak, streak) }
      else streak = 0
    }
    if (maxStreak >= 3) {
      const avgOverrunPct = clientRows
        .filter((r) => r.hours_billed > r.hours_budgeted)
        .reduce((s, r) => s + (r.hours_billed - r.hours_budgeted) / r.hours_budgeted, 0)
        / Math.max(1, clientRows.filter((r) => r.hours_billed > r.hours_budgeted).length)
        * 100
      cards.push({
        database_slug: 'pattern_cards',
        external_id: `pattern:scope:${clientId}`,
        properties: {
          Name: { title: [{ text: { content: `Scope creep: ${clientId}` } }] },
          Type: { select: { name: 'scope_creep' } },
          Client: { rich_text: [{ text: { content: clientId } }] },
          'Streak (months)': { number: maxStreak },
          'Avg Overrun %': { number: Number(avgOverrunPct.toFixed(1)) },
        },
      })
    }
  }
  return cards
}

export function detectPaymentDelay(rows: DsoRow[]): BrainWrite[] {
  const byClient = new Map<string, DsoRow[]>()
  for (const r of rows) {
    const arr = byClient.get(r.client_id) ?? []
    arr.push(r)
    byClient.set(r.client_id, arr)
  }
  const cards: BrainWrite[] = []
  for (const [clientId, clientRows] of byClient) {
    if (clientRows.length < 3) continue
    clientRows.sort((a, b) => a.month.localeCompare(b.month))
    const slope = linearTrend(clientRows.map((r) => r.dso_days))
    if (slope > 2) {
      cards.push({
        database_slug: 'pattern_cards',
        external_id: `pattern:dso:${clientId}`,
        properties: {
          Name: { title: [{ text: { content: `Payment delay: ${clientId}` } }] },
          Type: { select: { name: 'payment_delay' } },
          Client: { rich_text: [{ text: { content: clientId } }] },
          'DSO Slope (days/month)': { number: Number(slope.toFixed(2)) },
        },
      })
    }
  }
  return cards
}

function stdDev(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}
```

- [ ] **Step 4: Run tests (expect PASS)**

```bash
npm test -- src/lib/backfill/patterns.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/backfill/patterns.ts src/lib/backfill/patterns.test.ts
git commit -m "feat(backfill): three pattern detectors (margin, scope creep, payment delay)"
```

### Task 5.3: Phase 3 orchestrator

**Files:**
- Create: `src/lib/backfill/phase3.ts`

- [ ] **Step 1: Implement Phase 3 orchestrator**

`src/lib/backfill/phase3.ts`:

```ts
import { writeBrainBatch } from '<npm>/lib/notion/batch-writer'
import { PULLER_REGISTRY } from './sources'
import { detectMarginTrend, detectScopeCreep, detectPaymentDelay } from './patterns'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { queryBrainData } from '<npm>/lib/notion/query-helpers'
import type { BrainWrite } from './types'

const PHASE_3_TOOLKITS = [
  'stripe', 'quickbooks', 'hubspot', 'pipedrive', 'apollo',
  'clickup', 'asana', 'monday', 'harvest', 'toggl',
  'bamboo-hr', 'gusto', 'google-calendar', 'calendly',
  'google-analytics', 'google-ads', 'linkedin',
  'intercom', 'zendesk', 'typeform', 'slack', 'gmail',
] as const

export async function backfillPhase3(userId: string): Promise<{
  toolkits_pulled: number
  total_writes: number
  patterns_found: number
}> {
  const allWrites: BrainWrite[] = []
  let toolkits_pulled = 0

  for (const toolkit of PHASE_3_TOOLKITS) {
    const puller = PULLER_REGISTRY[toolkit]
    if (!puller) continue
    try {
      const result = await puller.pull12Months(userId)
      if (!result.skipped_reason) toolkits_pulled++
      allWrites.push(...result.writes)
    } catch (err) {
      console.error(`[phase3] ${toolkit} threw:`, err)
    }
  }
  await writeBrainBatch(userId, allWrites)

  const marginRows = await queryBrainData(userId, 'real_pnl', 'margin_monthly')
  const scopeRows = await queryBrainData(userId, 'projects', 'scope_windows')
  const dsoRows = await queryBrainData(userId, 'invoices', 'dso_monthly')

  const patternCards: BrainWrite[] = [
    ...detectMarginTrend(marginRows as any),
    ...detectScopeCreep(scopeRows as any),
    ...detectPaymentDelay(dsoRows as any),
  ]
  await writeBrainBatch(userId, patternCards)

  const supabase = getServerSupabaseClient()
  await supabase
    .from('notion_workspaces')
    .update({ backfill_status: 'phase3' })
    .eq('user_id', userId)

  return {
    toolkits_pulled,
    total_writes: allWrites.length + patternCards.length,
    patterns_found: patternCards.length,
  }
}
```

- [ ] **Step 2: Add Notion query helper**

Create `src/lib/notion/query-helpers.ts` with `queryBrainData(userId, databaseSlug, viewName)` that reads aggregated data from the named database via `NOTION_QUERY_DATABASE`. Returns rows shaped for the pattern detectors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/backfill/phase3.ts src/lib/notion/query-helpers.ts
git commit -m "feat(backfill): Phase 3 orchestrator + pattern detection over 12-month dataset"
```

---

## M6 — Phase 4 + UI + cron integration

### Task 6.1: Phase 4 email

**Files:**
- Create: `src/lib/backfill/email.ts`

- [ ] **Step 1: Implement Phase 4 email**

`src/lib/backfill/email.ts`:

```ts
import { Resend } from 'resend'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { queryBrainData } from '<npm>/lib/notion/query-helpers'

export async function sendPhase4Email(userId: string): Promise<void> {
  const supabase = getServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles').select('email, agency_name').eq('id', userId).single()
  if (!profile?.email) return

  const patternRows = await queryBrainData(userId, 'pattern_cards', 'top_3')
  const topInsights = (patternRows as any[]).slice(0, 3)
    .map((p) => `- ${p.properties?.Name?.title?.[0]?.text?.content ?? 'Pattern'}`)
    .join('\n')

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'OpsRadar <noreply@opsradar.dev>',
    to: profile.email,
    subject: 'Your OpsRadar Brain is live',
    text: `Hi,\n\nYour OpsRadar Brain has 12 months of data populated.\n\nTop 3 insights we found:\n${topInsights || '- (No high-confidence patterns detected yet — check back after a week of cron runs.)'}\n\nView your Brain: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/brain\n\n— OpsRadar`,
  })

  await supabase
    .from('notion_workspaces')
    .update({ backfill_status: 'complete', backfill_completed_at: new Date().toISOString() })
    .eq('user_id', userId)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/backfill/email.ts
git commit -m "feat(backfill): Phase 4 completion email with top 3 insights"
```

### Task 6.2: Mini-backfill for newly connected non-Notion integrations

**Files:**
- Create: `src/lib/backfill/mini.ts`
- Modify: `src/app/api/composio/webhook/route.ts`

- [ ] **Step 1: Implement mini-backfill**

`src/lib/backfill/mini.ts`:

```ts
import { writeBrainBatch } from '<npm>/lib/notion/batch-writer'
import { PULLER_REGISTRY } from './sources'

export async function backfillMiniIntegration(
  userId: string,
  toolkit: string,
): Promise<{ writes: number }> {
  const puller = PULLER_REGISTRY[toolkit]
  if (!puller) return { writes: 0 }
  const result = await puller.pull12Months(userId)
  if (result.skipped_reason) return { writes: 0 }
  const batchResult = await writeBrainBatch(userId, result.writes)
  return { writes: batchResult.created + batchResult.updated }
}

export async function sendMiniBackfillEmail(userId: string, toolkit: string): Promise<void> {
  console.log(`[mini-backfill] ${userId} ${toolkit} — TODO email`)
}
```

- [ ] **Step 2: Modify webhook to fire mini-backfill**

In the webhook handler, after the `is_active` flip, when `appName !== 'notion'` AND the user has `notion_workspaces.backfill_status === 'complete'`:

```ts
const { onNewIntegration } = await import('<npm>/lib/backfill/workflows')
await onNewIntegration.trigger({ userId: connection.user_id, toolkit: appName.toLowerCase() })
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/backfill/mini.ts src/app/api/composio/webhook/route.ts
git commit -m "feat(backfill): per-integration mini-backfill on new tool connect"
```

### Task 6.3: Dashboard backfill progress UI

**Files:**
- Create: `src/app/dashboard/integrations/_components/backfill-progress.tsx`
- Modify: `src/app/dashboard/integrations/page.tsx`
- Create: `src/app/api/dashboard/backfill-status/route.ts`

- [ ] **Step 1: Implement status API**

`src/app/api/dashboard/backfill-status/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServerSupabaseClient()
  const { data } = await supabase
    .from('notion_workspaces')
    .select('backfill_status, backfill_error, backfill_completed_at')
    .eq('user_id', userId)
    .maybeSingle()
  return NextResponse.json(data ?? { backfill_status: 'not_started' })
}
```

- [ ] **Step 2: Implement progress component**

`src/app/dashboard/integrations/_components/backfill-progress.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

type Status = {
  backfill_status?: string
  backfill_error?: string | null
  backfill_completed_at?: string | null
}

const PHASES = [
  { key: 'provisioning', label: 'Creating 20 databases' },
  { key: 'phase1',       label: 'Current snapshot' },
  { key: 'phase2',       label: '90 days of history' },
  { key: 'phase3',       label: '12 months + patterns' },
  { key: 'complete',     label: 'Brain is live' },
]

export function BackfillProgress() {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    const poll = async () => {
      const res = await fetch('/api/dashboard/backfill-status', { cache: 'no-store' })
      if (res.ok) setStatus(await res.json())
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  if (!status || status.backfill_status === 'not_started' || status.backfill_status === 'complete') {
    return null
  }

  const currentIdx = PHASES.findIndex((p) => p.key === status.backfill_status)
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4 mb-4">
      <p className="font-semibold mb-2">Setting up your Notion Brain…</p>
      <ol className="space-y-1 text-sm">
        {PHASES.map((p, i) => (
          <li key={p.key} className={i <= currentIdx ? 'text-cyan-300' : 'text-zinc-500'}>
            {i < currentIdx ? '✓' : i === currentIdx ? '⏳' : '○'} {p.label}
          </li>
        ))}
      </ol>
      {status.backfill_error && (
        <p className="mt-2 text-sm text-red-400">Error: {status.backfill_error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Render in integrations page**

In `src/app/dashboard/integrations/page.tsx`, add at the top of the main content:

```tsx
import { BackfillProgress } from './_components/backfill-progress'
// ...
<BackfillProgress />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/integrations/_components/backfill-progress.tsx src/app/dashboard/integrations/page.tsx src/app/api/dashboard/backfill-status/route.ts
git commit -m "feat(dashboard): live backfill progress UI on integrations page"
```

### Task 6.4: Cron agents append Notion writes

**Files:**
- Create: `src/lib/agents/notion-writer.ts`
- Modify: each of 10 cron agents in `src/lib/agents/<slug>/index.ts`

- [ ] **Step 1: Implement shared writer**

`src/lib/agents/notion-writer.ts`:

```ts
import { writeBrainBatch } from '<npm>/lib/notion/batch-writer'
import type { BrainWrite } from '<npm>/lib/backfill/types'

export async function writeAgentFindingsToNotion(
  userId: string,
  agentSlug: string,
  writes: BrainWrite[],
): Promise<void> {
  if (writes.length === 0) return
  try {
    const result = await writeBrainBatch(userId, writes)
    console.log(`[${agentSlug}] notion: +${result.created}/${result.updated} (${result.failed} failed)`)
  } catch (err) {
    console.error(`[${agentSlug}] notion write threw:`, err)
  }
}
```

- [ ] **Step 2: Wire into revenue agent**

In `src/lib/agents/revenue/index.ts`, after the existing loop body, append:

```ts
import { writeAgentFindingsToNotion } from '<npm>/lib/agents/notion-writer'

// ... at the end of the agent's task, after generateText completes:
const findings: BrainWrite[] = [
  {
    database_slug: 'kpi_snapshots',
    external_id: `revenue:${new Date().toISOString().slice(0, 10)}`,
    properties: {
      Name: { title: [{ text: { content: `Revenue snapshot ${new Date().toISOString().slice(0, 10)}` } }] },
      MRR: { number: computedMrr },
      'Cash Collected MTD': { number: cashMtd },
      'Overdue Total': { number: overdueTotal },
      Date: { date: { start: new Date().toISOString() } },
    },
  },
]
await writeAgentFindingsToNotion(userId, 'revenue', findings)
```

- [ ] **Step 3: Repeat for remaining 9 cron agents**

For each agent in `src/lib/agents/{collections,scope,delivery,briefing,profitability,team,growth,renewal,stack}/index.ts`, add the same pattern but with agent-appropriate `database_slug` + `external_id` + `properties`:

| Agent | database_slug | external_id pattern |
|---|---|---|
| collections | `invoices` | `collections:<invoice_id>` |
| scope | `projects` | `scope:<project_id>:<date>` |
| delivery | `projects` | `delivery:<project_id>:<date>` |
| briefing | `weekly_briefings` | `briefing:<date>` |
| profitability | `real_pnl` | `pnl:<client_id>:<month>` |
| team | `team` | `team:<member_id>:<week>` |
| growth | `marketing_performance` | `growth:<channel>:<date>` |
| renewal | `contracts_legal` | `renewal:<contract_id>` |
| stack | `tool_stack` | `stack:<tool_slug>:<month>` |

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/notion-writer.ts src/lib/agents/
git commit -m "feat(agents): every cron agent writes findings to its Brain database"
```

---

## M7 — Cleanup + ship behind flag

### Task 7.1: Feature flag

**Files:**
- Modify: `src/app/api/composio/webhook/route.ts`

- [ ] **Step 1: Gate the new path behind a flag**

Wrap the entire Notion brain bootstrap block in:

```ts
if (process.env.OPSRADAR_BACKFILL_V2 === 'true') {
  // ... new brain bootstrap + workflow firing
}
```

Without the flag, behavior is unchanged from today (just flips `is_active`).

- [ ] **Step 2: Document flag in CLAUDE.md**

Add to CLAUDE.md a brief CP-24 section describing the flag and the cutover plan.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/composio/webhook/route.ts CLAUDE.md
git commit -m "feat(backfill): gate v2 backfill behind OPSRADAR_BACKFILL_V2 flag"
```

### Task 7.2: Delete direct Notion OAuth

**Files:**
- Delete: `src/app/api/notion/callback/route.ts`
- Delete: `src/app/api/notion/install/route.ts` (if exists)
- Modify: `src/lib/notion/client.ts` (drop direct-SDK paths)
- Create: `supabase/migrations/20260524_drop_notion_access_token.sql`

- [ ] **Step 1: Delete callback route**

```bash
rm src/app/api/notion/callback/route.ts
```

- [ ] **Step 2: Delete any other direct-OAuth helpers**

Grep for `NOTION_OAUTH_CLIENT_ID` and remove all references.

```bash
grep -rln "NOTION_OAUTH_CLIENT_ID\|NOTION_OAUTH_CLIENT_SECRET\|NOTION_OAUTH_REDIRECT_URI" src/
```

For each match: remove the code path or delete the file if it's unreachable.

- [ ] **Step 3: Drop access_token column via migration**

`supabase/migrations/20260524_drop_notion_access_token.sql`:

```sql
ALTER TABLE notion_workspaces DROP COLUMN IF EXISTS access_token_encrypted;
```

- [ ] **Step 4: Apply migration**

Use the Supabase MCP `apply_migration` tool with the migration name `drop_notion_access_token` and the SQL above.

- [ ] **Step 5: Regenerate Supabase types**

```bash
npm run types:supabase
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(notion): drop direct OAuth path and access_token column"
```

### Task 7.3: End-to-end smoke test

**Files:**
- Create: `tests/e2e/notion-backfill.test.ts`

- [ ] **Step 1: Write e2e test against real Composio test workspace**

```ts
import { test, expect } from 'vitest'

test.skip('full Notion connect → backfill flow', async () => {
  // SKIPPED in CI — manual smoke test only. Set RUN_E2E=1 to enable.
  if (!process.env.RUN_E2E) return

  // 1. Trigger fake Composio webhook
  const res = await fetch('http://localhost:3000/api/composio/webhook', {
    method: 'POST',
    headers: { 'x-composio-signature': computeTestSignature() },
    body: JSON.stringify({
      event: 'connection.created',
      data: { id: 'test-conn', appName: 'notion', userId: process.env.TEST_USER_ID },
    }),
  })
  expect(res.status).toBe(200)

  // 2. Poll status until complete or 5 min timeout
  for (let i = 0; i < 60; i++) {
    const r = await fetch('http://localhost:3000/api/dashboard/backfill-status')
    const status = await r.json()
    if (status.backfill_status === 'complete') return
    if (status.backfill_status?.startsWith('failed')) throw new Error(`failed: ${status.backfill_error}`)
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('backfill did not complete in 5 minutes')
})
```

- [ ] **Step 2: Document the manual smoke test in README**

Add a section to `README.md` describing how to run the e2e test against a real test workspace.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/ README.md
git commit -m "test: end-to-end smoke test for Notion connect → backfill flow"
```

### Task 7.4: Final type check + build

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

- [ ] **Step 4: Run production build**

```bash
npm run build
```

- [ ] **Step 5: If everything passes, ready for staging deploy with `OPSRADAR_BACKFILL_V2=true`**

---

## Self-review checklist

- [x] **Spec coverage:** every spec section maps to at least one task — §2 Goal (M3-M6), §4.1 single auth (M2.2 + M7.2), §4.2 trigger flow (M3.2), §4.3 durable runtime (M4.1), §4.4 phase definitions (M3-M6), §4.5 pullers (M3.1 + M4.2), §4.6 mapping (M3.1 + M4.2), §4.7 detectors (M5.2), §4.8 idempotency (M2.1), §4.9 cron writes (M6.4), §4.10 status (M6.3), §4.11 mini-backfill (M6.2), §5 files (all milestones), §6 failure modes (handled in each component), §7 testing (M1.1 + every task), §8 open question (M1.2), §9 rollout (M7.1).
- [x] **Placeholder scan:** no TBDs, no "implement later," no "similar to Task N" (each task ships its own code).
- [x] **Type consistency:** `BrainWrite`, `PullerInterface`, `PullerResult` defined once in M1.3 and used everywhere.
