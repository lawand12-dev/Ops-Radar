# chatv2 — Strengthening Plan & Architecture 2026

*Written 2026-05-22. The plan to take the chatv2 backend from "working production service" to "YC-grade agentic compute layer for OpsRadar."*

> **North star:** The strategic framing for everything below lives in [`ai-native-company-2026.md`](./ai-native-company-2026.md). This doc is the engineering plan. That doc is why the engineering matters.

---

## Where we are (May 2026)

chatv2 is a Hono-on-Bun/Node service backed by MySQL that already does:

- **Chat-to-automation generation** via Anthropic Claude Sonnet 4.5 (default) with DigitalOcean-compatible inference and OpenAI/mock fallbacks
- **n8n deployment** with credential-first deploy flow (`deploy-check` → bind credentials → activate)
- **Workflow validation** that blocks unsafe node types (command execution / file write / ssh / code nodes)
- **Event ingestion** for run/node lifecycle events with optional bearer-token auth
- **Failure analysis** — auto-runs an AI analyzer on failures, writes audit logs
- **Alert management** — high failure rate + workflow failure burst detection with resolution tracking
- **Analytics** — total runs, failures, success rate, avg duration, workflows health summary
- **Knowledge base loader** for RAG context injection (file-based from `knowledge-base/`)
- **Multi-tenant auth** — users table with `rag_agent_flag` + `admin_flag`; projects scoped to `user_id`
- **AI interactions audit log** (migration 010) — model, latency, tokens, prompt, response
- **Credential bindings system** at both project + node level (migrations 003, 004, 008)

That's 14 migrations of production behavior. The code is substantive — `ai-service.ts` alone is 1,897 lines.

**What this means strategically:** chatv2 is not a prototype. It is the **agentic compute layer** that powers OpsRadar's automation generation. The strengthening plan below assumes the foundations work and focuses on what closes the gap to YC-grade AI infrastructure.

---

## The 5 strengthening priorities

| # | Priority | Why now | Effort |
|---|----------|---------|--------|
| 1 | Move chat-to-workflow from one-shot to multi-pass agent (plan → generate → validate → repair) | Production self-correction is now table stakes; one-shot LLM generation has unacceptable failure rate for financial workflows | M |
| 2 | Upgrade RAG from file-based to embeddings + agency-vertical pattern library | The KB has grown to 6 folders; keyword routing won't scale past 50 patterns | M |
| 3 | Tenant-isolated envelope encryption + RLS tested in CI for credential bindings | Multi-tenant security is the single highest YC-partner pushback risk | M-L |
| 4 | Langfuse self-hosted + golden-set regression suite | Without it, model drift will silently degrade quality and you won't notice for weeks | S-M |
| 5 | Make chatv2 MCP-native — expose its tools to external agents | YC RFS #12 explicitly funds "Software for Agents"; MCP at 78% enterprise adoption is the standard | M |

---

# Priority 1 — Multi-pass Agentic Chat-to-Workflow

## What's there today

`POST /chat` is a one-shot pipeline: user message → system prompt + KB context injection → Anthropic Claude Sonnet 4.5 → JSON parse → workflow validator → save. If the model produces malformed JSON, an unsafe node, or a workflow that fails schema validation, the user sees an error.

## What 2026 production looks like

Per the [Self-Correction Survey (arXiv 2406.01297)](https://arxiv.org/pdf/2406.01297):
> "Single-pass LLM output is rarely sufficient for correctness or robustness. The most successful systems incorporate external tools such as static analyzers, execution engines, and retrieval modules into procedural repair workflows."

Per [Addy Osmani's 2026 LLM coding workflow](https://addyo.substack.com/p/my-llm-coding-workflow-going-into):
> "Begin by defining the problem and planning a solution. The first step should be brainstorming a detailed specification with the AI, then outlining a step-by-step plan, before writing any actual code."

## The redesigned pipeline

```
USER MESSAGE
    ↓
[Plan] Claude Sonnet 4.5 — outputs a structured plan:
    { goal, triggers[], nodes[], data_flow[], success_criteria[] }
    ↓
[Critique] Same model, different prompt — checks plan against:
    - KB pattern library (does this match a known-good pattern?)
    - Common failure modes (missing error handling? circular dependencies?)
    - User's actual stack (does the user have IMAP credentials configured?)
    ↓
[Generate] Claude Sonnet 4.5 — produces workflow JSON
    ↓
[Validate] Existing workflow-validator.ts + Zod schema
    ↓
IF validation fails:
    [Repair] LLM gets the validation error + original plan + bad output → tries again
    Max 2 repair iterations, then fail with diagnostic
    ↓
[Schema-validated workflow]
    ↓
[Pre-deploy check] Existing deploy-check.ts
    ↓
[Persist] Save plan + critique + workflow + repair-loop trace to ai_interactions
```

**Key changes from current implementation:**

1. **Plan as first-class artifact** — store the plan in a new `workflow_plans` table. Future requests can reuse plans as starting points.
2. **Repair loop with bounded iterations** — max 2 retries; track repair attempts per session in `ai_interactions` for cost analysis.
3. **Critique step uses the KB** — RAG-augmented critique is the cheapest way to catch design mistakes (Priority 2 makes this powerful).
4. **Each stage emits a structured event** — `plan_emitted`, `critique_completed`, `repair_attempted` — feeds Priority 4 observability.

## Code-level changes

| File | Change |
|------|--------|
| `src/modules/chat/chat-service.ts` (currently 199 lines) | Refactor into a state machine: PLAN → CRITIQUE → GENERATE → VALIDATE → REPAIR → DONE |
| `src/modules/ai/ai-service.ts` (currently 1,897 lines) | Extract per-stage prompt builders into separate files; this file is too big to safely modify |
| **New** `src/modules/chat/pipeline/` | One file per stage: `plan.ts`, `critique.ts`, `generate.ts`, `repair.ts` |
| **New** `migrations/015_workflow_plans.sql` | `workflow_plans` table with `chat_session_id`, `plan_json`, `critique_json` |
| **New** `migrations/016_chat_pipeline_events.sql` | Event log per stage with `stage`, `duration_ms`, `tokens_in`, `tokens_out`, `cost_usd` |

---

# Priority 2 — RAG Upgrade: From File Loader to Vertical Pattern Library

## What's there today

`knowledge-base-loader.ts` reads from `knowledge-base/` folders (`agency-profiles`, `benchmarks`, `patterns`, `failures`, `tools`). Likely keyword-routed by folder name based on user intent. `index.md` is 18KB — meaningful but small.

## What 2026 production looks like

OpsRadar's main repo `docs/yc/build-architecture.md` already laid out the 3-tier hybrid GraphRAG pattern. For chatv2, apply the same model but specifically for **workflow generation context**:

### The 3-tier KB for chatv2

| Tier | Purpose | Storage | Refresh |
|------|---------|---------|---------|
| **Patterns** (static) | Known-good workflow templates: "send weekly Slack report from HubSpot deals", "alert when ClickUp task overdue", etc. Embedded once. | MySQL with vector column (or sidecar Qdrant/pgvector) | When `knowledge-base/patterns/` changes |
| **Tools** (static) | n8n node capabilities, credential types, common parameter shapes | MySQL embeddings | When n8n version upgrades |
| **Failures** (live, per-user) | This user's past failed workflows + analyzer output + repair history | MySQL embeddings, scoped by user_id | After every failure |

### Why this architecture matters

The Failures tier is the moat. A user's 5th attempt to build "Slack notifications for HubSpot deals" should be informed by their 4 prior attempts (and the analyzer notes on what broke). Generic RAG can't do that.

### Embedding model choice

| Model | Cost per 1M tokens | Dim | Pick when |
|-------|---------------------|-----|-----------|
| OpenAI `text-embedding-3-small` | $0.02 | 1536 | Default — cheapest at quality |
| OpenAI `text-embedding-3-large` | $0.13 | 3072 | Higher recall needed |
| Voyage AI `voyage-3-large` | $0.18 | 1024 | Best for code/technical text |
| Cohere `embed-v4.0` | $0.10 | 1536 | Multilingual support needed |

**Recommendation:** start with `text-embedding-3-small`. Migrate later if recall is an issue. Don't over-engineer.

### Vector store choice

**Use MySQL with vector column (MySQL 9+ supports VECTOR type natively as of 2025)** rather than introducing a new dependency. chatv2 already uses MySQL. Don't add Pinecone/Weaviate/Qdrant unless you hit 100K+ vectors and the latency budget breaks.

### Code-level changes

| File | Change |
|------|--------|
| `src/modules/ai/knowledge-base-loader.ts` | Replace file-walk with vector retrieval; preserve keyword routing as a fallback |
| **New** `src/modules/ai/embedding-service.ts` | Wraps the embedding model; handles batching + retries |
| **New** `migrations/017_kb_embeddings.sql` | `kb_embeddings` table with `source_path`, `chunk_index`, `chunk_text`, `embedding VECTOR(1536)` |
| **New** `scripts/embed-kb.ts` | One-shot script to embed/re-embed the `knowledge-base/` folder; runs on KB changes |

---

# Priority 3 — Multi-Tenant Security: Envelope Encryption + RLS in CI

## What's there today

- Users table exists (migration 011)
- Projects scoped to user_id (migration 012)
- Admin + RAG agent flags (migrations 013-014)
- Credential bindings exist at project + node level (migrations 003, 004, 008)
- n8n credentials are referenced by ID/name, not stored in chatv2 plaintext

What's NOT confirmed from the code skim:
- Are user passwords hashed properly? (Need to check `src/modules/auth/`)
- Are n8n API keys per-user encrypted? Or shared `N8N_API_KEY` from env?
- Is there RLS-equivalent enforcement at the application layer?
- Is there per-tenant data isolation in audit_logs and ai_interactions?

## What 2026 production looks like

Per [Awssome on Multi-Tenant SaaS Encryption](https://www.awssome.io/blog/multi-tenant-saas-security-encryption-faqs):
> "In multi-tenant environments, tenant-specific key management assigns unique keys to each tenant, ensuring that even if one tenant's data is compromised, other tenants remain unaffected. Each tenant's data is encrypted with a distinct key managed in a key management service, and key rotation must not require re-encryption of existing data using the envelope encryption pattern."

### The envelope encryption pattern (industry standard)

```
[KEK — Key Encryption Key]  ← lives in env vars only, never DB
       ↓ encrypts ↓
[DEK — Data Encryption Key] ← per-tenant, AES-256, stored in DB encrypted-by-KEK
       ↓ encrypts ↓
[Tenant's sensitive data]   ← credentials, API keys, secret bindings
```

When a tenant's data needs to be read:
1. Load encrypted DEK from `users.encrypted_dek` column
2. Decrypt DEK using KEK from env
3. Decrypt tenant's data using DEK
4. KEK rotation = re-encrypt only the DEKs (fast), not the data (slow)

### What to implement

| File | Change |
|------|--------|
| **New** `src/lib/envelope-crypto.ts` | KEK/DEK abstraction; `encryptForTenant(userId, plaintext)` / `decryptForTenant(userId, ciphertext)` |
| `migrations/011_users.sql` schema | Add `encrypted_dek VARBINARY(64) NOT NULL` column |
| **New** `migrations/018_credential_bindings_encrypted.sql` | Migrate existing credential bindings to encrypted-at-rest |
| **New** `src/lib/tenant-isolation.test.ts` | Tests that fail loudly if a query is missing `WHERE user_id = ?` (or equivalent scoping) |
| **New** `.github/workflows/rls-tests.yml` (or equivalent CI) | Run tenant-isolation tests on every PR; **block merge if any test fails** |

### Per the Northflank 2026 production guide:

> "Row-Level Security in PostgreSQL for shared schema models is powerful, but it's easy to misconfigure, requiring RLS policy tests in CI pipelines."

MySQL doesn't have native RLS. The equivalent is **application-layer enforcement** plus **CI tests that assert no query escapes tenant scope**. Implement this as middleware in Hono that:
1. Extracts `user_id` from JWT
2. Stamps it onto the request context
3. Every repository function takes `user_id` as a required first argument
4. A linter rule (or runtime assertion in dev) flags any query missing the scope

---

# Priority 4 — Observability: Langfuse Self-Hosted + Golden-Set Replay

## What's there today

- `ai_interactions` table logs model, latency, tokens, prompt, response (migration 010)
- `LOG_AI_RAW_RESPONSE`, `LOG_AI_OUTPUT_TEXT`, `LOG_CHAT_PROGRESS` debug flags

That's good local observability. Production needs more.

## What 2026 production looks like

Per [Laminar's 2026 Agent Observability Platforms ranking](https://laminar.sh/article/2026-04-23-top-6-agent-observability-platforms):
> "Drift is the silent killer in agent systems. Model versions shift under you, prompt edits have unexpected downstream effects, tool schemas change, and the input distribution you see in production moves away from the data your eval set was built from. Without active drift detection, teams learn about regressions from user complaints rather than dashboards."

> "The most reliable drift signal is a scheduled replay of a curated golden set (50-500 traces with expected outputs or rubric scores) through your current production pipeline."

### The recommended stack

**Langfuse self-hosted** for chatv2 because:
- MIT-licensed; self-host on the existing CTO infrastructure (no vendor data exposure)
- Framework-agnostic (chatv2 uses Hono + raw Anthropic SDK, not LangChain)
- Covers traces + datasets + evals (LLM-as-judge) + prompt management + cost tracking
- One pattern documented in 2026: send all traces to self-hosted Langfuse for long-term retention; sample interesting traces to Braintrust for eval development

### What to ship

| Component | Effort | Value |
|-----------|--------|-------|
| Self-hosted Langfuse on the existing chatv2 infra (docker-compose) | S | Enables everything below |
| Hono middleware that wraps every AI call to emit Langfuse traces | S | Full visibility into every chat session |
| `tools/golden-set/` directory with 100 curated workflow generation examples | M | Foundation for regression detection |
| Nightly cron that replays the golden set against current model + deployed prompts | M | Catches regressions same-day |
| Cost dashboard: per-user $/month spent on AI; per-feature breakdown | S | Critical for pricing/margin |

### Golden set example structure

```
tools/golden-set/
├── 001-slack-deal-alert.json      { input, expected_plan, expected_workflow_shape, must_have_nodes, must_not_have_nodes }
├── 002-clickup-overdue-notice.json
├── 003-stripe-payment-retry.json
...
```

Replay job scores each example:
- **Validation pass rate** — did the generated workflow pass schema?
- **Node-set similarity** — does the generated workflow use the expected nodes?
- **Cost regression** — did this example get more expensive than baseline?
- **Latency regression** — did this example get slower?

---

# Priority 5 — Make chatv2 MCP-Native

## Why

The OpsRadar `yc/build-architecture.md` already commits to an OpsRadar MCP server. chatv2 needs to be the **same shape**:

- 78% of enterprise AI teams have at least one MCP-backed agent in production (April 2026)
- MCP is now a Linux Foundation Agentic AI Foundation standard
- 41% of MCP servers still lack any authentication — being one of the secure ones is a differentiator

## The chatv2 MCP server

Expose chatv2's existing capabilities as MCP tools that external agents (Claude Desktop, ChatGPT, OpsRadar's COO agent on the main app) can invoke:

| Tool | Scope | Maps to existing endpoint |
|------|-------|---------------------------|
| `chatv2.generate_workflow` | `workflows:write` | `POST /chat` |
| `chatv2.deploy_workflow` | `workflows:deploy` | `POST /projects/:id/deploy` |
| `chatv2.list_projects` | `projects:read` | `GET /projects` |
| `chatv2.get_workflow_status` | `workflows:read` | `GET /workflows/:id/status` |
| `chatv2.get_analytics` | `analytics:read` | `GET /analytics` |
| `chatv2.list_n8n_credentials` | `credentials:read` | `GET /n8n/credentials` |

All gated by OAuth 2.1 with per-tenant scoped tokens (see Priority 3).

## Why this is YC-grade

The OpsRadar app on `main` is the customer-facing dashboard. chatv2 is the platform compute layer. If chatv2 is MCP-native:
- The OpsRadar COO agent uses chatv2 via MCP (not via the existing service-key REST proxy) — cleaner boundary
- Claude Desktop users can build n8n workflows by talking to chatv2 directly
- Partner agencies can integrate chatv2 into their own agent stacks
- This is literally what YC RFS #12 is asking for

---

# Section 6 — The 5 AI-Native Loops in chatv2 Modules

The 5 priorities above are the foundational engineering. They unlock the 5 recursive loops described in [`ai-native-company-2026.md`](./ai-native-company-2026.md). This section is the explicit mapping — which chatv2 modules implement which loop, and in what order.

| Loop | New chatv2 module(s) | Builds on which priority | Migration(s) |
|------|----------------------|--------------------------|--------------|
| **1. Autonomous Engineering** | `src/modules/learning/{diagnose-agent,author-agent,reviewer-agent}.ts` + GitHub API integration | Priority 1 (pipeline events), Priority 4 (Langfuse traces for reviewer scoring) | 019_autonomous_actions |
| **2. Diorization** | `src/modules/ingestion/{slack,gmail,notion,zoom-transcript}.ts` + `src/modules/diorization/{synthesizer,pattern-detector}.ts` | Priority 2 (vector store) | 020_diorization_sources, 021_breadcrumbs, 022_pattern_cards |
| **3. Disposable Software, Permanent Data** | `src/modules/regeneration/{prompt-versioner,model-tracker,diff-offer}.ts` | Priority 1 (plan/critique persisted), Priority 4 (cost tracking) | 023_prompt_versions, 024_artifact_lineage |
| **4. Token-Maxing Culture** | `src/modules/metrics/{cost-attribution,revenue-per-token}.ts` + analytics-routes additions | Priority 4 (Langfuse) | 025_cost_per_action_view |
| **5. Human at the Edge** | `src/lib/escalation-rules.ts` + `src/modules/escalation/escalation-log.ts` | None (pre-req: typed config + audit logging) | 026_escalation_log |

### Why these modules sit alongside the existing structure

The current chatv2 module layout is verb-centric (`chat`, `workflows`, `events`, `n8n`). The new modules are loop-centric (`learning`, `diorization`, `regeneration`, `metrics`, `escalation`). That's deliberate — the new layer doesn't replace the old one. It runs on top of it.

```
src/modules/
├── chat/             ← existing: handles user → workflow
├── workflows/        ← existing: persistence + state
├── n8n/              ← existing: deployment surface
├── events/           ← existing: ingestion
├── ai/               ← existing: model abstraction
├── auth/             ← existing: tenant model
├── analytics/        ← existing: reporting
├── alerts/           ← existing: failure detection
├── audit/            ← existing: per-failure analyzer
│
├── learning/         ← NEW (Loop 1) — autonomous code/pattern PRs
├── ingestion/        ← NEW (Loop 2 input) — Slack/email/meeting connectors
├── diorization/      ← NEW (Loop 2) — synthesise + detect patterns
├── regeneration/     ← NEW (Loop 3) — prompt + model upgrade cycles
├── metrics/          ← NEW (Loop 4) — token/revenue attribution
└── escalation/       ← NEW (Loop 5) — typed rules + log
```

### The kill switches (mandatory)

Every loop ships with one env-var kill switch that turns it off entirely. Default to OFF for the first 90 days of production. Each loop is enabled per-tenant before global enable.

| Loop | Env var | Default | Per-tenant override |
|------|---------|---------|---------------------|
| 1 | `AUTONOMOUS_LEARNING_ENABLED` | `false` | `users.autonomous_learning_enabled` |
| 2 | `DIORIZATION_ENABLED` | `false` | `users.diorization_enabled` |
| 3 | `REGENERATION_OFFERS_ENABLED` | `false` | `users.regeneration_offers_enabled` |
| 4 | `COST_ATTRIBUTION_ENABLED` | `true` | always on |
| 5 | `STRICT_ESCALATION_ENABLED` | `true` | always on (never disable) |

### How Loop 5's escalation log feeds Loop 1's reviewer agent

When the Loop 5 escalation log records a pattern of human reviewers rejecting agent-proposed PRs for a specific reason (e.g., "agent kept proposing credentials in plaintext"), Loop 1's reviewer agent gets that signal injected as a new safety rule. The five loops are not isolated — they teach each other.

---

# Section 7 — Cloud Infrastructure Patterns: chatv2 as a Control Plane

YC's cloud infrastructure guidance (May 2026, from the "Building the Modern Internet" talk) describes the exact pattern chatv2 should evolve toward: a **Sovereign-style control plane** that abstracts complex underlying systems (Envoy proxies in their case; n8n workers in ours) and exposes them through a **self-service broker** with a **sidecar security model**.

## chatv2 mapped to the Sovereign/OSB/Envoy pattern

| YC infrastructure concept | Where it already exists in chatv2 (or should) |
|--------------------------|------------------------------------------------|
| **AMI / immutable image** built by Packer + SaltStack | n8n workflow JSON + credential bindings (immutable artifact, regenerable from prompt) |
| **CloudFormation** for IaC deployment | `deploy-check` → `deploy` flow already gates and provisions to n8n |
| **Envoy** (commodity proxy) | n8n itself is our commodity execution engine — open source, swappable in principle |
| **Sovereign** (rendering engine, control plane) | **chatv2 IS this** — it merges user intent + KB context + templates into deployable workflow JSON |
| **Listeners / Routes / Clusters** (Sovereign primitives) | chatv2's equivalents: `chat_sessions` (listener), workflow JSON (routes), n8n credential pools (clusters) |
| **Open Service Broker** (FastAPI self-service API) | chatv2's `/chat` + `/projects/:id/deploy` API surface — already a self-service broker |
| **SQS queue + worker** (async heavy lifting) | Currently inline in `/chat`; should be async (see Production Reliability — durable session state below) |
| **Sidecars for auth/ratelimit/logging** | Should be **Hono middleware**, not in-line in routes — auth-middleware.ts is already this pattern |

The takeaway: chatv2 already has the architectural skeleton of a Sovereign-style control plane. The strengthening work in Priorities 1–5 makes that skeleton complete.

## The sidecar discipline (preventing coupling)

YC's warning: *"Don't let infrastructure logic become intertwined with application code. Use sidecars that are 'bolted on' as separate containers/middleware."*

Audit of current chatv2 surface for coupling violations:

| Concern | Where it lives today | Where it should live |
|---------|----------------------|----------------------|
| Authentication | `src/modules/auth/auth-middleware.ts` | ✅ Already a sidecar |
| Rate limiting | Not implemented yet | New `src/modules/rate-limit/` middleware sidecar |
| Logging / observability | Scattered across services via `LOG_*` flags | Unified Langfuse middleware (Priority 4) — sidecar |
| DOS protection | Reverse proxy / Cloudflare layer assumed | Verify with infra owner; document |
| Tenant scoping | Should be middleware (per Section 6) | New `src/modules/tenant-scope/` middleware that stamps `user_id` onto every request context |

**Rule:** if a piece of logic appears in more than one route, it has to become a middleware sidecar. No exceptions. This is what prevents the "code churn smell" YC describes — the symptom of a system getting too tightly coupled to maintain over a decade.

## What chatv2 is NOT trying to become

- Not a generic IaC tool (CloudFormation already exists)
- Not a generic proxy (Envoy already exists)
- Not a generic SaaS broker (Crossplane, Backstage already exist)

chatv2's surface is **deliberately narrow**: it is the control plane for **AI-generated n8n workflows** for **agencies**. Every other capability described in YC's cloud talk is a pattern to borrow, not a feature to build.

---

# Production reliability gaps to close

Beyond the 5 priorities, smaller wins worth committing:

### Idempotency on `POST /chat`
Today, a duplicate request creates duplicate projects. Add `Idempotency-Key` header support — if seen in the last 24h, return the prior result. Pattern is well-trodden (Stripe API does this).

### Durable workflow generation
Chat generation can take 5-30s. If the Hono process restarts mid-generation, work is lost. Two options:
- **Inngest-style background job** (overkill for chatv2's volume right now)
- **Resumable session state** (lighter; checkpoint after each pipeline stage so a crash can resume from CRITIQUE if PLAN already wrote)

### Rate limiting
No evidence of per-user rate limits on `/chat`. Without this, a runaway loop in a partner integration could exhaust the AI budget. Add per-user-per-minute limits in Redis (compatible with what main does for OpsRadar).

### n8n deployment rollback
Per the [n8n community thread on workflow drift](https://community.n8n.io/t/way-to-handle-workflow-version-drift-across-multiple/296380):
> "Users running multiple n8n workers behind a load balancer have experienced issues where during workflow updates, some executions run the old workflow version while others pick up the new version immediately, causing inconsistent behavior in long-running executions after deployment."

And per the [n8n best practices for production AI agents](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/):
> "Rollback should take less than 5 minutes, and teams should practice the rollback at least once in staging."

**What to add:** `POST /projects/:id/rollback` endpoint that:
1. Looks up the previous deployed workflow JSON from `workflows` table
2. Re-deploys it to n8n
3. Records the rollback in audit_logs

---

# Build sequencing

| Sprint | Ship | Priority |
|--------|------|----------|
| **Sprint 1** | Refactor `chat-service.ts` into multi-pass pipeline (PLAN → CRITIQUE → GENERATE → VALIDATE → REPAIR) | Priority 1 |
| **Sprint 1** | Langfuse self-hosted + middleware tracing | Priority 4 (foundation) |
| **Sprint 2** | Envelope encryption (KEK/DEK) for credential bindings + tenant-isolation tests in CI | Priority 3 |
| **Sprint 2** | KB embeddings + vector retrieval (replace file-walker) | Priority 2 (tier 1: patterns) |
| **Sprint 3** | Failures tier of RAG (per-user history) | Priority 2 (tier 3) |
| **Sprint 3** | Golden-set regression suite + nightly replay | Priority 4 |
| **Sprint 4** | chatv2 MCP server with OAuth 2.1 scoped tokens | Priority 5 |
| **Sprint 4** | Idempotency on /chat + per-user rate limits + rollback endpoint | Production reliability |
| **Sprint 5** | Loop 5 escalation rules in typed config + escalation_log table | Loop 5 (safest foundation for Loop 1) |
| **Sprint 5** | Loop 4 cost-per-action + revenue-per-token dashboards | Loop 4 (informs investment in Loops 1/3) |
| **Sprint 6** | Loop 2 ingestion adapters (Slack, Gmail) + diorization synthesiser (alpha behind flag, 3 pilot tenants) | Loop 2 |
| **Sprint 6** | Loop 2 pattern detector + monthly refresh job | Loop 2 |
| **Sprint 7** | Loop 3 prompt versioning + model-tracker + regeneration offer flow | Loop 3 |
| **Sprint 8** | Loop 1 diagnose + author + reviewer agents (autonomous learning OFF by default; per-tenant opt-in) | Loop 1 (highest reward, highest risk; ships last) |

**By end of Sprint 4 chatv2 is a YC-grade agentic compute layer.**
**By end of Sprint 8 chatv2 is an AI-native system that learns, regenerates, and pushes its own capability surface forward.**

---

# What this does NOT include (YAGNI)

- **Multi-LLM routing** — Claude Sonnet 4.5 is the right default; add Vercel AI Gateway later if needed
- **Custom fine-tuning** — RAG + good prompts beats fine-tuning at this scale
- **Real-time chat (WebSocket)** — current SSE/polling pattern is sufficient
- **Migrating MySQL to Postgres for native RLS** — application-layer scoping with CI tests is equally safe and avoids a multi-week migration
- **Embedding alternative vector stores** — MySQL 9+ vector column is sufficient until 100K+ vectors
- **n8n alternatives (Pipedream, Make, Zapier)** — n8n's open-source self-hostable model is a moat

---

# Talent/skill gap

Per [Thinking Company on Agentic Engineers](https://thinking.inc/en/pillar-pages/ai-native-product-building/):
> "An Agentic Engineer is a hybrid role combining software engineering with applied AI who designs prompt architectures, builds orchestration logic, and optimizes inference pipelines. In 2026, these hybrid profiles are the most sought-after roles in the market."

chatv2's CTO already operates as an agentic engineer. The strengthening plan above is sized to be achievable by 1 senior engineer + Claude Code in 4 sprints.

---

# Sources

- [Self-Correction of LLMs Survey (arXiv 2406.01297)](https://arxiv.org/pdf/2406.01297)
- [Addy Osmani — LLM coding workflow 2026](https://addyo.substack.com/p/my-llm-coding-workflow-going-into)
- [Laminar — Top 6 Agent Observability Platforms 2026](https://laminar.sh/article/2026-04-23-top-6-agent-observability-platforms)
- [Awssome — Multi-Tenant SaaS Encryption FAQs](https://www.awssome.io/blog/multi-tenant-saas-security-encryption-faqs)
- [Northflank — Multi-tenant SaaS platform deployment 2026](https://northflank.com/blog/multi-tenant-saas-platform-deployment)
- [n8n Community — Workflow version drift thread](https://community.n8n.io/t/way-to-handle-workflow-version-drift-across-multiple/296380)
- [n8n Blog — 15 best practices for deploying AI agents in production](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/)
- [Braintrust — AI observability tools 2026 buyer's guide](https://www.braintrust.dev/articles/best-ai-observability-tools-2026)
- [Awesome LLM JSON (GitHub)](https://github.com/imaurer/awesome-llm-json)
- [HatchWorks — n8n Guide 2026](https://hatchworks.com/blog/ai-agents/n8n-guide/)
- [CData Software — Multi-Tenant Data Integration Playbook 2026](https://medium.com/@cdatasoftware/the-2026-multi-tenant-data-integration-playbook-for-scalable-saas-1371986d2c2c)
- [Prefactor — Ultimate Guide to Multi-Tenant AI Systems](https://prefactor.tech/blog/ultimate-guide-to-multi-tenant-ai-systems/)
