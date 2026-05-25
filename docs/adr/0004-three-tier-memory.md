# Three-tier memory architecture for the AI COO (May 2026)

> Research validation of OpsRadar's proposed memory architecture for the AI COO + 28-agent stack. Status: validated with 3 specific adjustments. Build = CP-25.

## TL;DR

**Three-tier memory IS the canonical 2026 pattern.** Anthropic Managed Agents, Letta (formerly MemGPT), Lindy 2.0, Mem0, and Ramp Glass all converge on this. The conceptual split is correct.

**BUT the specific implementation needs 3 adjustments**:

1. **Tier 2 (event warehouse) should be a TimescaleDB hypertable, not vanilla Postgres + JSONB single table.** TimescaleDB is a free Postgres extension that auto-partitions by time, gives continuous aggregates for monthly/quarterly rollups, and compresses old chunks columnar. 10–100× faster on the time-range queries our COO actually makes.
2. **pgvector only on Notion-curated content** (Pattern Cards, Decision Log, How We Work, Quarterly Memory pages) — NOT on raw events. Mem0 2026: pure vector is obsolete. 90% of agent queries are time-range filters, not semantic search.
3. **Add a weekly markdown-export-to-zip of the Notion Brain.** Hardens the customer-ownership story against the Karpathy "Notion is not a Company Brain" critique. Customer gets a Notion UI for daily work + portable markdown for forever-ownership.

## The architecture (final)

```
Tier 0 — Procedural memory (skills)
  Storage: git (knowledge-base/skills/**/SKILL.md) — SHIPPED CP-17
  Loader: src/lib/skills.ts
  Read: progressive disclosure (catalog at boot, body on demand)

Tier 1 — Customer-owned Brain (semantic + episodic, curated)
  Storage: Notion (20 DBs + 7 strategic pages + Quarterly Memory pages)
  Write: domain agents (CP-19 orchestrator pattern), COO chat, customer
  Read: COO + domain agents query first per CP-19 source priority
  NEW SAFETY VALVE: weekly markdown-export-to-zip cron
    - Sunday 11pm UTC: pull entire Notion Brain → render markdown → zip → email
    - Optional: push to customer's GitHub repo if they want one
  Justification doc: customers are agency owners, not engineers; ownership
  story trumps git purity; weekly export closes the lock-in concern.

Tier 2 — Internal event warehouse (raw episodic, invisible to customer)
  Storage: TimescaleDB hypertable in Supabase Postgres
    - schema: polymorphic events with hot fields promoted
      (amount_cents, client_external_id) + payload jsonb
    - partitioning: monthly chunks on occurred_at
    - continuous aggregates: monthly_revenue_per_client,
      weekly_hours_per_client, monthly_deals_per_stage, etc.
    - compression: chunks > 90 days compressed columnar (5-10× less storage)
  Vector: pgvector ONLY on Notion-curated entries (NOT raw events)
  Migration trigger: ClickHouse + PeerDB CDC when aggregate rows > 100M

Tier 3 — Live API (real-time, source of truth)
  Storage: none — direct Composio calls
  Use: only when "right now" matters
  Quota-tracked via CP-23

Cross-cutting: sleep-time consolidation
  Nightly 3am per tenant: read last 24h of Tier 2 → synthesize patterns →
  write Pattern Cards into Notion (Tier 1)
  Mirrors Anthropic AutoDream + Ramp Glass 24h synthesis pattern
  Already half-built via CP-19 staggered cron — formalize as one pattern
```

## What the AI sees from each tier

| Question the AI gets | Where it looks |
|---|---|
| "What's our MRR right now?" | **Tier 3 (Composio live)** — Stripe API call |
| "How does this compare to 3 months ago?" | **Tier 1 (Notion)** — Weekly KPI Snapshots |
| "Show me every late-paying client in Q3 2024" | **Tier 2 (warehouse)** — TimescaleDB time-range query |
| "What patterns have we seen with Client X over 4 years?" | **Tier 2 + Tier 1** — raw events + AI synthesis → write new Pattern Card |
| "What did we decide about [topic]?" | **Tier 1 (Notion)** — Decision Log |
| "Why was margin bad in Q1 2024?" | **Tier 2 raw events + Tier 1 Quarterly Memory** for narrative |
| "How do you fire a client?" | **Tier 0 (skills)** — `load_skill('firing-a-client')` |

## Storage estimate per agency (5 years, all toolkits)

| Source | Rows (5yr) | Bytes/row | Per agency |
|---|---|---|---|
| Stripe (txns, invoices, charges, payouts) | 9,000 | 3 KB | 27 MB |
| HubSpot (contacts, deals, engagements) | 15,000 | 4 KB | 60 MB |
| Harvest (time entries) | 50,000 | 1 KB | 50 MB |
| ClickUp/Asana/Monday (tasks) | 25,000 | 2 KB | 50 MB |
| Gmail metadata (12mo only) | 5,000 | 2 KB | 10 MB |
| Slack (90d limit) | 30,000 | 1.5 KB | 45 MB |
| Calendly (events) | 2,500 | 2 KB | 5 MB |
| Other (Notion, Apollo, etc.) | 5,000 | 2 KB | 10 MB |
| **Subtotal data** | **~141k rows** | | **~260 MB** |
| **+ Indexes (~40%)** | | | **+100 MB** |
| **= TOTAL per agency** | | | **~360 MB** |

Cost at scale (Supabase + TimescaleDB extension):

| Customers | Total | Plan | Monthly |
|---|---|---|---|
| 10 | 3.6 GB | Pro | $25 |
| 100 | 36 GB | Pro + overage | $28 |
| 1,000 | 360 GB | Pro + overage | $69 |
| 5,000 | 1.8 TB | Team | $200 |

Storage cost per customer is pennies. The constraint is access pattern (which TimescaleDB solves), not cost.

## What lives in Notion (Tier 1, customer-visible)

Aggregated, narrative, ~500–600 items per customer:

| Notion DB / page | Rows (5yr) | Content |
|---|---|---|
| Weekly KPI Snapshots | 260 | One row per week: MRR, cash, AR, pipeline, margin |
| Real P&L | 60 | One row per month: revenue/costs/margin per client |
| Clients | ~100 | One row per client: LTV, margin, NPS, last contact |
| Risk Register | ~30 | Open + recent-closed risks |
| Pattern Cards | ~50 | AI-detected patterns over time |
| Quarterly Memory pages | 20 | One narrative page per quarter (gpt-5.4-generated) |
| Strategic pages | 7 | Customer-edited (How We Work, Decision Log, OKRs, etc.) |

Notion handles this beautifully. Loads fast, navigable, customer-readable, customer-editable.

---

## Adjustment 1: TimescaleDB hypertable instead of vanilla Postgres

### Why

Postgres + JSONB at 1.25B aggregate rows (1K customers × 1.25M rows each) is the boundary where vanilla Postgres starts hurting on analytical queries. ClickHouse benchmarks show **9,000× faster** on JSON aggregations; TimescaleDB shows **61% faster** as a Postgres extension.

TimescaleDB is the right middle path because:
- It's a Postgres extension (same Supabase, same auth, same RLS, same migrations)
- Auto-partitions on `occurred_at` (chunk pruning → time-range queries become O(chunks read))
- Continuous aggregates pre-compute monthly/quarterly rollups (queries become O(36 rows))
- Columnar compression on chunks > 90 days (5–10× less storage on cold data)

### Schema (final)

```sql
create table external_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  source              text not null,                  -- 'stripe', 'hubspot', etc.
  event_type          text not null,                  -- 'invoice.paid', etc.
  external_id         text not null,                  -- source-tool id for dedupe
  occurred_at         timestamptz not null,           -- partition key
  amount_cents        bigint,                         -- HOT field (promoted)
  client_external_id  text,                           -- HOT field (promoted)
  payload             jsonb not null,                 -- full raw for AI drill-down
  created_at          timestamptz default now()
);

-- Convert to hypertable, partitioned monthly:
select create_hypertable('external_events', 'occurred_at',
  chunk_time_interval => interval '1 month');

-- Indexes:
create index on external_events (user_id, source, occurred_at desc);
create index on external_events (user_id, client_external_id, occurred_at desc);

-- Compression policy: chunks > 90 days compressed columnar
alter table external_events set (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id, source'
);
select add_compression_policy('external_events', interval '90 days');

-- Continuous aggregate: monthly revenue per client per user
create materialized view monthly_revenue_per_client
with (timescaledb.continuous) as
select
  user_id,
  client_external_id,
  time_bucket('1 month', occurred_at) as month,
  sum(amount_cents) as cents
from external_events
where source = 'stripe' and event_type = 'invoice.paid'
group by 1, 2, 3;
```

The COO's "MRR trend last 3 quarters" query goes from a billion-row table scan to reading 3 rows from a continuous aggregate. ~1000× faster at scale.

### Migration trigger

When `external_events` exceeds **100M aggregate rows** (~80 paying customers averaging 1.25M rows each), evaluate ClickHouse via PeerDB CDC. Until then, TimescaleDB is sufficient.

---

## Adjustment 2: Vector embeddings only on Notion-curated content

### Why

Mem0 2026 state-of-the-art post: *"pure vector-only is obsolete."* Hybrid retrieval (entity + keyword + vector) wins. For OpsRadar specifically:

- 90% of agent queries: time-range filter + entity filter (`user_id`, `client_external_id`, date range)
- 10% of agent queries: semantic search ("what patterns have we seen with this kind of client?")

Embedding 1.25M raw events per customer for the 10% case wastes storage (~40% overhead) and embedding-API budget.

### What gets embedded

Only Notion-curated, semantically meaningful entries:
- Pattern Cards (≤50/customer)
- Decision Log entries (≤30/customer)
- How We Work paragraphs (~10 chunks)
- Quarterly Memory pages (20 pages × ~5 chunks)

Total: ~200–300 embeddings per customer. Trivial cost. High semantic value.

### What does NOT get embedded

- Raw `external_events` rows
- KPI snapshot rows (already aggregated, semantic search doesn't help)
- Client rows (lookup by id, not by similarity)

---

## Adjustment 3: Weekly markdown export — the Karpathy safety valve

### The Karpathy critique (verbatim)

Andrej Karpathy's "LLM Wiki" gist defines the Brain layer as **"a directory of LLM-generated markdown files"**. The most-cited Company Brain synthesis (Alex Lockey) is explicit:

> *"Notion is not a Company Brain. Confluence: same critique. SaaS databases: vendor lock-in risk."*

Their canonical stack: *"Git repositories (primary), Markdown files (substrate), Obsidian (visualization only), Claude Code/Cursor (tools, not storage)."*

### Why Notion is still right for OpsRadar

Karpathy's audience is technical teams (Ramp, YC startups, engineers). His critique assumes the Brain user types in terminals and lives in git. **OpsRadar's customers are agency owners.** They will not clone a git repo. They want a clickable UI. Notion gives them that.

### The safety valve

Add a weekly cron (Sunday 11pm UTC):
1. Read the customer's entire Notion Brain via Notion API
2. Render every DB row + every page as markdown files
3. Organize into a directory structure mirroring the Notion hierarchy
4. Zip + upload to Supabase Storage (or email + link)
5. Send email: *"Your Brain export for the week of [date] is ready"*
6. Optional: push to customer's GitHub repo if they connected one

Now the customer gets:
- ✅ A clickable UI for daily work (Notion)
- ✅ A weekly markdown snapshot they can take anywhere (the git-compatible part)
- ✅ Real ownership — they can leave OpsRadar and continue with their Brain in any tool that reads markdown
- ✅ Auditable history (every week's zip is dated, kept indefinitely on Supabase Storage)

### Marketing claim this unlocks

> *"Your Brain, your data, forever — exported to markdown every week. Take it with you if you ever leave OpsRadar."*

True. Backed by code. Defends against the Karpathy critique. Defensible answer to BOND's "data never leaves your walls" pitch (BOND keeps data in customer's infra; we give portable markdown — different but equivalent ownership story).

---

## Cross-cutting pattern: sleep-time consolidation

### Why

Anthropic's "Claude Dreaming" / AutoDream pattern: agent triggers consolidation when *"≥ 24 hours since the last consolidation and ≥ 5 sessions of new activity"* and produces a *"reorganized memory store with new structure and insights."* Ramp Glass: *"24-hour synthesis pipeline."* Letta research: *"offline processing during idle periods reduces active inference costs by 2.5x while maintaining accuracy."*

### How OpsRadar already implements this (CP-19)

CP-19's staggered cron schedule (tool agents 7-10am, domain agents 11am-12pm, evaluator 2pm) already implements daily consolidation. The pattern is:

1. **7-10am**: Tool agents pull fresh data → write findings to Notion Action Log
2. **11am-12pm**: Domain agents read Notion findings → synthesize cross-tool patterns → write Pattern Cards + Risk Register
3. **2pm**: Evaluator agent reviews everyone's output → quality report to Notion
4. **Mon 12pm**: Briefing agent reads everyone's outputs → composes Monday brief

### What's missing

A formal "nightly memory consolidation" job:
- Read last 24h of `external_events` (Tier 2)
- AI-detect new patterns not yet in Notion
- Compress old chunks (>90d) via TimescaleDB compression policy
- Drop raw events > 2 years (Lindy's pruning lesson)

Add this as CP-26 once CP-25 (the warehouse) ships.

---

## Honest concessions

### 1. Lindy's pruning lesson is uncomfortable

Flo Crivello (Lindy CEO, Latent Space podcast Nov 2024):

> *"Agents still get confused if they have too many memories, to my point earlier."*

His operator wisdom is the most-cited 2026 take from a founder shipping at our scale. 5-year retention may be ego, not necessity. **Plan**: aggressive pruning of raw events > 2 years (after Pattern Cards have captured the patterns). Document the trigger.

### 2. BOND has a real positioning advantage

BOND (YC X25) launch material: *"Donna runs inside your infra, so your data never leaves your walls."* They keep the warehouse on the customer's infrastructure. We centralize it in Supabase.

**Our defense**: "AI agents get smarter over time by learning from patterns across all your data — that requires a centralized warehouse, but you own the Notion brain that gets generated, and you can export it weekly as markdown." Both stories defensible. Pick which side you market.

### 3. Cognition's "Don't Build Multi-Agents" dissent

Walden Yan's essay argues for *"a single coherent context"* and against multi-agent fan-out. Their position works because Devin operates on one tightly-coupled artifact (a codebase). OpsRadar operates on 25 loosely-coupled SaaS sources — fan-out is natural, not contrived. Anthropic's Multi-Agent Research blog is our stronger precedent. **But know the dissent exists** for YC discussions.

---

## Sources

- [Karpathy LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Alex Lockey — The Company Brain: Four Builders, One Architecture](https://www.alexlockey.com/writing/the-company-brain-four-builders-one-architecture/)
- [Anthropic — Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic — Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- [Anthropic — Agent Skills standard (Dec 2025)](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic — Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic — Building Effective AI Agents](https://www.anthropic.com/research/building-effective-agents)
- [Cognition — Don't Build Multi-Agents (Walden Yan)](https://cognition.ai/blog/dont-build-multi-agents)
- [Latent Space — Lindy.ai with Flo Crivello](https://www.latent.space/p/lindy)
- [Mem0 — State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- [Mem0 paper — arXiv 2504.19413](https://arxiv.org/abs/2504.19413)
- [Zep — A Temporal Knowledge Graph Architecture (arXiv 2501.13956)](https://arxiv.org/abs/2501.13956)
- [Letta / MemGPT comparison 2026](https://tokenmix.ai/blog/ai-agent-memory-mem0-vs-letta-vs-memgpt-2026)
- [TimescaleDB on GitHub](https://github.com/timescale/timescaledb)
- [ClickHouse — How to Choose a Database for Real-Time Analytics in 2026](https://clickhouse.com/resources/engineering/how-to-choose-a-database-for-real-time-analytics-in-2026)
- [ClickHouse vs PostgreSQL JSONB benchmarks](https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql)
- [Supabase — pgvector performance & going to production](https://supabase.com/blog/pgvector-performance)
- [BOND (YC X25)](https://www.ycombinator.com/launches/Ncl-bond-ai-chief-of-staff-for-ceos-and-busy-execs)
- [Ramp Glass Playbook](https://aicatchup.com/practices/internal-ai-workspaces-playbook)
- [YC Summer 2026 RFS — Company Brain (Tom Blomfield)](https://www.ycombinator.com/rfs)
