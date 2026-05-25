# Observability + production-safety stack decision (May 2026)

> Compiled: 2026-05-25 · Purpose: capture the verified picks for OpsRadar's pre-launch observability and risk-mitigation stack — agent traces, error tracking, feature flags, and the pgvector / brain-search question (Karpathy-way vs hybrid). These are the items flagged in the architecture audit ([`./architecture-audit-2026.md`](./architecture-audit-2026.md)) as "ship before CP-34 hits production."

---

## TL;DR — The verified picks

| Layer | Pick | Why |
|---|---|---|
| **Agent + LLM observability** | **Langfuse** | MIT-licensed, unlimited self-host, 20K+ GitHub stars, native Vercel AI SDK integration. Our own moats doc already named it. |
| **Application error tracking** | **Sentry** | Default for Next.js + Vercel. 5K errors/mo free. One-line wizard install. |
| **Feature flags / kill switches** | **`@vercel/flags` SDK + Statsig backend** | Vercel-native ergonomics; Statsig's 2M events/mo free tier covers us through ~50 customers. |
| **Brain semantic search** | **Karpathy way (path-based) NOW. pgvector LATER** (CP-35 prereq). | Karpathy's own gist defers pgvector — *"at small scale, the markdown approach avoids the need for embedding-based RAG infrastructure"*. We're at small scale. |

**Total install effort: ~1.5 days for all three of Langfuse + Sentry + flags.**

---

## 1. Brain search: Karpathy way (now) vs pgvector (later)

### Karpathy's exact position (verified from his gist)

The most-cited misreading of Karpathy is "he rejects RAG and embeddings." **He does not.** From his [LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):

> *"At small scale (~100 sources, ~hundreds of pages) [the markdown approach] avoids the need for embedding-based RAG infrastructure."*
>
> *"qmd is a good option: it's a local search engine for markdown files with hybrid BM25/vector search and LLM re-ranking."*

His real philosophy is **pragmatic maintenance over infrastructure complexity** — use simple tools first, graduate to vector search only when genuinely needed.

### The 2026 industry consensus

From [Mem0's State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026):

> *"The 2026 pattern is hybrid: production agents that survive contact with real users combine two or three architectural approaches, route queries to the store best suited to them, and treat the memory layer as a first-class system."*

And from [DigitalApplied — Agent Memory Architectures 2026](https://www.digitalapplied.com/blog/agent-memory-architectures-vector-graph-episodic):

> *"By early 2026, the practitioner community has largely converged on a pattern: vectors for semantic entry-point retrieval, graphs for relational depth. Vector search answers 'what is like this?' while graph traversal answers 'what is connected to this?'"*

### What this means for OpsRadar

We are NOT making an either/or choice. We're sequencing:

| Phase | Brain search approach | When |
|---|---|---|
| **Today (already shipped CP-27)** | Path-based + prefix filter (`listBrainPaths({ userId, prefix })`) | All current use cases |
| **CP-35 Apprentice Mode** | **Add pgvector on selected paths** (Pattern Cards, Decision Log, learned-rules.md per employee) | When employees need "find similar past rejections" |
| **Post-PMF (50+ customers)** | Consider hybrid BM25 + vector + LLM re-rank (qmd-style) | If customers' brains grow past ~200 docs and path-based gets slow |

**Our own [`three-tier-memory-architecture-2026.md`](./three-tier-memory-architecture-2026.md) §Adjustment 2 already documented this exact sequencing:**

> *"pgvector ONLY on Notion-curated content (Pattern Cards, Decision Log, How We Work, Quarterly Memory pages) — NOT on raw events. Mem0 2026: pure vector is obsolete. 90% of agent queries are time-range filters, not semantic search."*

### Implementation when CP-35 needs it

```sql
-- migration: add pgvector column for selective embedding
alter extension pgvector add column embedding vector(1536);  -- conceptual

alter table brain_documents
  add column embedding vector(1536),
  add column embedding_model text;

-- Index ONLY on paths matching these prefixes:
create index idx_brain_documents_embedding on brain_documents using hnsw (embedding vector_cosine_ops)
  where path ~ '^(pattern-cards|decision-log|risk-register|employees/[^/]+/learned-rules)/';
```

```ts
// On brain commit, if path matches the embedded set, embed + write
async function maybeEmbed(path: string, content: string) {
  if (!EMBED_PREFIXES.some(p => path.startsWith(p))) return null
  const { embedding } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
  })
  return embedding
}
```

This is the **Karpathy + pgvector hybrid** — keep markdown as truth, add embeddings as a fast lookup index over curated subsets.

### Cost of doing it now vs later

| Cost | Karpathy-only (now) | Hybrid (when CP-35 ships) |
|---|---|---|
| pgvector extension | Not enabled | Enable on Supabase (free, 1-click) |
| Embedding API costs | $0 | ~$0.02 per 100 docs (text-embedding-3-small) |
| Migration complexity | Already shipped | 1 day to add + backfill |
| Query latency at our scale (~50 docs/customer) | Fine | Identical |
| Query latency at 500 docs/customer | Slower (full table scan) | Fast (HNSW index) |

**Verdict: Path-based today. Add pgvector with CP-35 (when we need "find similar past learning"). Skip the in-between.**

---

## 2. LLM observability: Langfuse

### The market in 2026

Six 2026 LLM observability tools dominate. Verified pricing:

| Tool | Free tier | First paid tier | Self-host |
|---|---|---|---|
| **Langfuse** | **Open source, unlimited self-host** | $59/mo cloud Pro | ✅ MIT license |
| LangSmith (LangChain) | 5K traces/mo | $39/mo | ❌ Cloud only |
| Helicone | 10K requests/mo, 7-day retention | $79/mo | ⚠️ Partial |
| Braintrust | 1M spans/mo, 10K eval runs | $249/mo Pro | ❌ Cloud only |
| Maxim AI | Beta-free | TBD enterprise | ❌ |
| Arize Phoenix | Open source | Cloud paid | ✅ |

### Why Langfuse wins for OpsRadar

| Criterion | Langfuse | Best alternative | Why Langfuse wins |
|---|---|---|---|
| Open source + self-host | ✅ MIT | Phoenix (Apache 2.0) | Same escape valve as Trigger.dev |
| Free at our scale | ✅ Unlimited self-host or generous cloud | LangSmith free 5K traces | Cloud version covers 50+ customers free |
| Vercel AI SDK integration | ✅ First-class (`@langfuse/vercel-ai-sdk`) | Mixed | Drop-in: one import, one wrap |
| Production deployments | ✅ 20K+ GitHub stars, 12M SDK downloads/mo | LangSmith | Most-adopted OSS option |
| Agent trace modeling (multi-step) | ✅ Sessions, traces, observations | Braintrust (better for evals) | Sessions match our agent_runs shape |
| Our own moats doc already chose it | ✅ Named explicitly | — | "Per-tenant Langfuse traces as the audit moat" |

### What we instrument

```ts
// src/lib/agents/loop.ts — wrap the existing generateText / streamText
import { observeOpenAI } from "@langfuse/vercel-ai-sdk"

const traced = observeOpenAI(model, {
  sessionId: agentRunId,                  // ties all tool calls in one run
  userId,
  metadata: { agentSlug: spec.slug, employeeOrigin: spec.origin },
  tags: [`agent:${spec.slug}`, `tier:${userTier}`],
})

const result = await generateText({
  model: traced,                          // every tool call now logged
  tools, system, prompt, stopWhen: stepCountIs(spec.maxSteps),
})
```

Per-trace data captured:
- Full prompt (system + user + tool messages)
- Every tool call + arguments + result
- Token usage per step
- Latency per step
- Cost estimate
- User feedback (tied via sessionId to `agent_runs.feedback`)

### Why this is the YC pitch unlock

Without observability, the answer to *"how do you know your agents are getting better?"* is *"we don't, really."*

With Langfuse, the answer becomes:
> *"60% reduction in tool-call errors over 4 weeks. Here are 100 representative traces. Here's the regression test set."*

**Same architecture point as our moats doc**: per-tenant agent traces are the kind of compounding data competitors don't have because they didn't instrument from day one.

### Implementation effort

- Install: `npm install langfuse @langfuse/vercel-ai-sdk` (1 min)
- Wire in `loop.ts` + `coo/route.ts` (~30 min)
- Set env vars: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` (5 min)
- Verify traces appear in Langfuse cloud dashboard (5 min)
- Total: **~1 day including testing and documentation**

---

## 3. Error tracking: Sentry

### Why Sentry, not alternatives

Sentry is the default for Next.js + Vercel — no real competition for our use case. Verified:

| Factor | Sentry |
|---|---|
| Free tier | 5K errors/mo, 30-day retention |
| Next.js wizard | `npx @sentry/wizard@latest -i nextjs` — installs in 5 min |
| Vercel Marketplace integration | 1-click, unified billing |
| First paid tier | $26/mo per seat (we'd start with 1 seat) |
| Vercel AI SDK integration | Native via `@sentry/nextjs` |
| Source map upload | Automatic via Vercel integration |

Alternatives we briefly considered:
- **LogRocket**: session-replay-first, $69/mo entry. Overkill for backend error tracking.
- **Datadog**: $15/mo per host. Powerful but kitchen-sink. Overkill at our scale.
- **Bugsnag**: 7,500 events/mo free. Similar to Sentry, less Next.js integration.

### What gets instrumented

- Client-side React errors (dashboard widgets that crash in customer browsers)
- Server-side API route errors (agent runs that crash mid-step)
- Edge function errors (middleware, auth callbacks)
- Performance traces (slow API routes, slow LCP on key pages)

### Why this matters specifically for AI agents

When Sarah-the-Bookkeeper crashes at 3am because Composio returned an unexpected schema, today we have:
- A console.log in Vercel function logs
- Nothing else

With Sentry:
- Real-time alert in our inbox + Slack
- Stack trace
- Customer affected
- Frequency of the error across customers
- Auto-grouping (if 10 customers hit the same Composio schema issue, one issue, not 10)

**Implementation effort:** ~30 minutes via the wizard + Vercel integration.

---

## 4. Feature flags: `@vercel/flags` SDK + Statsig backend

### Surprise: Vercel doesn't have native flags

Verified from [Vercel's own blog post on toolbar feature flags](https://vercel.com/blog/toolbar-feature-flags):

> *"You can manage flags set in any provider including LaunchDarkly, Optimizely, Statsig, Hypertune, or Split — and additionally you can integrate any other provider or even your own custom flag setup."*

Vercel offers:
- **`@vercel/flags` SDK** — a thin wrapper for displaying flag values in React + the toolbar
- **Toolbar UI** — for overriding flags during development
- **No flag storage** — you bring your own backend

### Comparison of backend providers

| Provider | Free tier | Notes |
|---|---|---|
| **Statsig** ✅ | **2M events/mo free** | Best for AI/SaaS — has experimentation + analytics bolted on |
| LaunchDarkly | 1K MAUs free | Enterprise-skewed, $$$$ past free |
| PostHog | 1M events/mo free | Good if you also want product analytics, slightly heavier SDK |
| Split | Free dev plan | Enterprise-y onboarding |
| Hypertune | Free starter | Newer, less battle-tested |

### Why Statsig + Vercel

| Factor | Statsig |
|---|---|
| Free tier covers us through | ~50 paying customers |
| Vercel integration | First-party via `@vercel/flags` |
| AI-friendly | Built for SaaS experimentation |
| Bonus | Experimentation framework included (A/B test prompt versions, model choices) |

### What flags we'll add for CP-34

| Flag | Purpose |
|---|---|
| `custom-employees-enabled` | Global kill switch — flip off if CP-34 misbehaves |
| `custom-employees-per-customer:<userId>` | Per-customer kill switch |
| `consult-coo-enabled` | Kill switch for Option C escalation if it generates bad outputs |
| `apprentice-mode-enabled` | Kill switch for CP-35 (when we ship it) |
| `live-workforce-view-enabled` | Roll out CP-36 to one customer at a time |
| `model-experiment:agent-loop` | A/B gpt-5.4 vs gpt-5.4-mini in agent loop |

### Implementation pattern

```ts
// src/lib/flags/index.ts
import { unstable_flag } from "@vercel/flags/next"
import { statsigAdapter } from "@vercel/flags/providers/statsig"

export const customEmployeesEnabled = unstable_flag<boolean>({
  key: "custom-employees-enabled",
  adapter: statsigAdapter,
  defaultValue: false,         // safe default — opt-in
})

// In API route:
if (!(await customEmployeesEnabled())) {
  return Response.json({ error: "feature_disabled" }, { status: 403 })
}
```

**Implementation effort:** ~2 hours including Statsig account setup and SDK install.

---

## 5. Combined integration order

Recommend shipping in this order **before CP-34 hits production**:

| Order | Item | Effort | Why first |
|---|---|---|---|
| 1 | Sentry | 30 min | If anything crashes during the next 3 items, we want to know |
| 2 | Feature flags (Statsig) | 2 hr | Need flags to gate CP-34 behind |
| 3 | Langfuse | 1 day | Instrument the 28 agents first, observe baseline, then ship CP-34 with traces |
| 4 | CP-34 chat tools (CP-34b) | 2 days | Build on top of safe foundation |
| 5 | CP-34 UI (CP-34c) | 2 days | Customer surface |
| 6 | pgvector for CP-35 | 1 day | After CP-34 ships and we need Apprentice Mode |

**Total prerequisite work before CP-34b: ~1.5 days.** Acceptable.

---

## 6. Cost summary at three growth stages

| Stage | Sentry | Langfuse | Statsig | Combined |
|---|---|---|---|---|
| Beta (10 customers) | $0 | $0 | $0 | **$0** |
| Growth (50 customers) | $0 (still free) | $0 (still free) | $0 | **$0** |
| Post-PMF (200 customers) | $26/mo | $59/mo cloud OR self-host | $0 (still under 2M events) | **~$85/mo** |
| Scale (1000 customers) | $52/mo | self-host on $20 VPS | $150/mo | **~$220/mo** |

**All three layers stay near-zero-cost through PMF.** None of them get expensive until we're at $50K+ MRR.

---

## Sources

### Karpathy + brain search
- [Karpathy LLM Wiki gist (April 3, 2026)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Venturebeat — Karpathy LLM Wiki coverage](https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an)
- [MindStudio — Karpathy Wiki vs RAG: 95% less token use](https://www.mindstudio.ai/blog/llm-wiki-vs-rag-markdown-knowledge-base-comparison)
- [Mem0 — State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- [DigitalApplied — Agent Memory Architectures 2026](https://www.digitalapplied.com/blog/agent-memory-architectures-vector-graph-episodic)
- [Vector Database Benchmarks 2026 — pgvector, Qdrant, etc.](https://callsphere.ai/blog/vector-database-benchmarks-2026-pgvector-qdrant-weaviate-milvus-lancedb)

### Observability
- [AppScale — Langfuse vs LangSmith vs Braintrust vs Helicone (2026)](https://appscale.blog/en/blog/langfuse-vs-langsmith-vs-braintrust-vs-helicone-2026)
- [Cekura — 10 Best Langfuse Alternatives 2026](https://www.cekura.ai/blogs/langfuse-alternative)
- [Latitude — Best AI Agent Observability Tools 2026](https://latitude.so/blog/best-ai-agent-observability-tools-2026-comparison)
- [Langfuse — Vercel AI SDK integration](https://langfuse.com/docs/integrations/vercel-ai-sdk)

### Error tracking
- [Sentry — NextJS Error and Performance Monitoring](https://sentry.io/for/nextjs/)
- [Sentry — Vercel integration docs](https://docs.sentry.io/organization/integrations/deployment/vercel/)
- [BuildMVPFast — Monitoring pricing comparison April 2026](https://www.buildmvpfast.com/api-costs/monitoring)

### Feature flags
- [Vercel — Introducing feature flag management from the Vercel Toolbar](https://vercel.com/blog/toolbar-feature-flags)
- [PostHog — Best LaunchDarkly Alternatives 2026](https://posthog.com/blog/best-launchdarkly-alternatives)
- [Flagsmith — Statsig Alternatives 2026](https://www.flagsmith.com/blog/statsig-alternatives)

### Internal cross-references
- [`./architecture-audit-2026.md`](./architecture-audit-2026.md) — flagged these gaps
- [`./moats-and-friction-2026.md`](./moats-and-friction-2026.md) — Langfuse named as moat
- [`./three-tier-memory-architecture-2026.md`](./three-tier-memory-architecture-2026.md) — pgvector sequencing already documented
- [`./scheduler-decision-2026.md`](./scheduler-decision-2026.md) — same open-source-escape philosophy applied here
