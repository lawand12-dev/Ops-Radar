# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

This project uses Next.js 16 with React 19 and the React Compiler. APIs and conventions may differ from training data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (uses --webpack flag)
npm run lint         # ESLint (flat config, next core-web-vitals + typescript)
npm run types:supabase  # Regenerate Supabase types → src/lib/database.types.ts
```

No test runner is currently configured. Playwright is installed as a dev dependency but no test scripts are defined.

## Path Alias

TypeScript paths use `<npm>/*` → `./src/*` (configured in tsconfig.json). Use `<npm>/lib/...`, `<npm>/components/...` etc. in imports.

## Architecture

**OpsRadar** is an AI Chief of Staff for marketing agencies. It connects a customer's business tools via **Composio OAuth** (Stripe, HubSpot, ClickUp, Harvest, Gmail, Notion, etc.) and runs a stack of AI agents that surface revenue health, client profitability, scope creep, delivery status, and automated COO-style insights — with a customer-owned Notion brain as the persistent knowledge layer.

### Single-system architecture (CP-15)

OpsRadar is one Next.js app on Vercel + Supabase. The previously separate `chatv2` Hono.js service was severed in CP-15 — see [`docs/adr/0001-composio-broker.md`](./docs/adr/0001-composio-broker.md) for the architectural rationale. **There is no second backend, no n8n integration, no workflow generator.** Everything runs from this repo.

### The 3-layer agent stack

```
Customer talks to /dashboard/coo (AI Chief of Staff)
   ↓
Agent loop (Vercel AI SDK v6, generateText / streamText)
   ↓
Composio tool brokerage (500+ integrations, OAuth)
   ↓
Approval gate → agent_actions queue → /dashboard/actions
```

Plus 10 cron agents that run on schedule:

| Agent | Schedule | Purpose |
|-------|----------|---------|
| `revenue` | 7am daily | MRR, cash collected, overdue invoices |
| `collections` | 9am daily | Overdue invoice follow-ups |
| `scope` | Mon 8am weekly | Scope creep per client |
| `delivery` | 10am daily | Project delivery health |
| `briefing` | 6am daily | Daily AI COO briefing |
| `profitability` | Mon 9am weekly | Per-client margin |
| `team` | Mon 11am weekly | Burnout / capacity / utilization |
| `growth` | Mon 10am weekly | Pipeline, marketing funnel |
| `renewal` | Mon 12pm weekly | Contract expiry watch |
| `stack` | 1st of month | Software stack audit |

### App Routes (`src/app/`)

**Marketing / Public**

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/product` | Product page (AI COO positioning) |
| `/pricing` | Pricing page (4 tiers) |
| `/about`, `/how-it-works`, `/faq` | Marketing pages |
| `/for/[vertical]` | Vertical-specific landing pages |
| `/audit` | "Coming soon: live demo" placeholder. The prospect-facing automation audit funnel was retired in CP-16 along with the chatv2 sever. URL is preserved so the ~10 marketing CTAs across the site still resolve. `/results` and `/share/[id]` are deleted. |
| `/login`, `/auth`, `/forgot-password` | Customer authentication |

**Customer Dashboard** (`/dashboard/*`)

Sidebar groups (CP-33 reorg): TODAY / OPERATIONS / BRAIN / PARTNER (FO only) / WORKSPACE.

Customer mental model (research-backed — Lindy, Devin, BOND patterns):
- Dashboard = **doing today** (chat doorway + queues + history)
- Notion = **the reference archive** (deep data, customer-owned, standalone-useful)
- Deleted in CP-33 (now live in Notion brain): `/dashboard/profitability`, `/dashboard/scope`, `/dashboard/retainer`, `/dashboard/performance`, `/dashboard/score`, `/dashboard/briefings`, `/dashboard/business`, `/dashboard/benchmarks`. Permanent redirects to `/dashboard/brain` are wired in `next.config.ts`.

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview cockpit — KPI strip + today's briefing card + activity feed |
| `/dashboard/coo` | Ask COO — chat agent (Vercel AI SDK + Composio sub-agents). The **doorway**: create automations, dispatch agents (`run_agent_now`), Q&A. |
| `/dashboard/actions` | Agentic action queue (cron agent + COO writes + automation runs) |
| `/dashboard/automations` | Customer-built automations registry — Lindy-style "when X, do Y" (CP-20) |
| `/dashboard/automations/[id]` | Automation detail — trigger config, read-only spec graph, run history, pause/resume, autonomy toggle (CP-20) |
| `/dashboard/agents` | 28-agent status grid (AI Ops Team) |
| `/dashboard/runs` | Every agent run with status + drawer detail (CP-14) |
| `/dashboard/brain` | Customer-owned Notion Brain entry page (20 DBs + 7 strategic pages — the deep archive) |
| `/dashboard/integrations` | Connect tools via Composio OAuth |
| `/dashboard/webhooks` | Outgoing webhook configurations (kept as power-user endpoint, no sidebar entry) |
| `/dashboard/settings` | Account settings |
| `/dashboard/settings/automation` | Per-tool autonomy (Ask / Auto / Off) — sidebar label is "Tool Autonomy" (CP-14, renamed in CP-20) |
| `/dashboard/settings/usage` | Per-customer API usage + monthly caps across OpenAI/Composio/Tavily/Anthropic (CP-23) |
| `/dashboard/settings/team` | Team members + invitations |
| `/dashboard/settings/mcp` | MCP token + install snippet |
| `/dashboard/fo` | Fractional Operator multi-client aggregate |
| `/dashboard/fo/*` | FO-specific surfaces (clients, branding, audit) |

**Admin**

| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard (password-protected) |
| `/dev` | Internal dev/debug tools |

### Dashboard API Routes (`src/app/api/dashboard/`)

**Business Intelligence** — live-fetched via Composio:

| Route | Source | Purpose |
|-------|--------|---------|
| `finance/` | Stripe | MRR, paid/invoiced MTD, overdue invoices |
| `sales/`, `sales-live/`, `sales-pipedrive/` | HubSpot / Pipedrive | Pipeline, deals |
| `marketing/` | HubSpot / Apollo / Calendly | Funnel metrics |
| `time-tracking/`, `time-harvest/` | Harvest / ClickUp | Logged hours |
| `delivery/` | ClickUp | Project delivery |
| `profitability/`, `scope/` | Stripe + Harvest | Per-client computed metrics |
| `benchmarks/`, `benchmarks/cohorts/` | Supabase | Peer benchmarks |

**AI / Agent:**

| Route | Purpose |
|-------|---------|
| `coo/` | AI COO agent — Vercel AI SDK streamText with Composio sub-agent tools, SSE stream, session persistence (CP-14) |
| `coo/sessions/`, `coo/sessions/[id]/` | Session CRUD |
| `briefing/` | Daily AI-generated operations briefing |
| `narrative/` | Short AI narrative for cockpit |
| `score/` | Agency health score |
| `runs/`, `runs/[id]/` | Agent run history + drawer detail (CP-14) |
| `tool-policies/` | Per-tool Ask/Auto/Off CRUD (CP-14) |

**Supabase-backed:**

| Route | Purpose |
|-------|---------|
| `alerts/`, `alerts-rules/` | Alert rule evaluation + CRUD |
| `actions/`, `actions/usage/`, `actions/[id]/feedback/` | Action queue + approval feedback |
| `retainer/` | Retainer config CRUD |
| `metrics/`, `activity/`, `onboarding-status/` | Aggregations |
| `team/`, `webhooks/` | Team + webhook config |
| `health-report/` | Composite health report |

**Cron:**

| Route | Purpose |
|-------|---------|
| `cron/followups/` | Scheduled follow-up emails |
| `cron/check-outcomes/` | Daily outcome detection at 10:00 UTC (CP-13; throttled from hourly to daily in c8f3a30 — Vercel Hobby plan caps cron frequency at daily) |

### Other API Routes

- `generate-audit/`, `audit-step/`, `audit-result/` — Audit funnel
- `notify/`, `unsubscribe/` — Email
- `build-request/`, `quick-win-onboarding/`, `funnel-event/` — Marketing
- `research-preview/` — Website intel preview
- `admin-auth/`, `admin/data/`, `admin/onboard-customer/` — Admin (CP-15: onboarding stripped of n8n config)
- `composio/connect/`, `composio/callback/`, `composio/connections/`, `composio/disconnect/`, `composio/webhook/`, `composio/available/` — Composio OAuth flow

### Key Libraries (`src/lib/`)

**Auth + DB:**
- `supabase.ts` / `supabase-server.ts` / `supabase-ssr.ts` — Supabase clients
- `database.types.ts` — Auto-generated Supabase types (do not edit manually)

**Composio + Agents:**
- `composio.ts` — Composio client singleton (VercelProvider), COMPOSIO_TOOLS map, `getComposioToolsForUser`, `getConnectedToolSlugs`
- `composio-fetch.ts` — Shared data-fetch helper for dashboard routes
- `agents/loop.ts` — Cron agent runner (generateText loop)
- `agents/approval-gate.ts` — Write classifier + per-tool autonomy enforcement (CP-14)
- `agents/tool-policies.ts` — `loadToolPolicies(userId)` for Ask/Auto/Off resolution
- `agents/tier-gate.ts` — Tier-based agent enablement
- `agents/registry.ts` — All 10 cron agent specs
- `agents/<slug>/index.ts` — Individual agent specs (revenue, collections, etc.)

**Agent Skills (CP-17):**
- `skills.ts` — Anthropic Agent Skills loader. Walks `knowledge-base/skills/<domain>/<name>/SKILL.md`, reads only frontmatter at boot (`name` + `description`), returns full body on demand via `load_skill` tool. Three-tier progressive disclosure pattern.
- `load_skill` tool is exposed in both `coo/ai-sdk-tools.ts` (COO chat) and `agents/loop.ts` (cron agents). The skill catalog is concatenated into every system prompt as `- name: description` lines.

**COO chat:**
- `coo/tools.ts`, `coo/ai-sdk-tools.ts` — COO tool definitions (Vercel AI SDK shape)
- `coo/executor.ts` — Tool dispatch
- `coo/prompts/coo-system-v1.ts` — Versioned system prompt
- `coo/outcomes.ts` — Recent-wins enrichment

**Notion Brain:**
- `notion/create-brain.ts`, `notion/brain-home.ts`, `notion/page-templates.ts` — Provisioning
- `notion/read-how-we-work.ts`, `notion/read-decision-log.ts` — Personalization reads
- `notion/schema-keys.ts` — Database + page slug constants

**Actions:**
- `actions/types.ts` — ActionType union + payload types (incl. `composio_action`)
- `actions/executor.ts` — Approval-then-execute (calls `composio.tools.execute` for `composio_action`)
- `actions/evaluator.ts`, `actions/evaluators/*` — Per-condition action proposers
- `actions/outcome-tracker.ts` — Track action outcomes for COO learning
- `actions/approval-patterns.ts` — Aggregate approve/reject/edit feedback per agent

**Other:**
- `briefing.ts`, `audit-report.ts`, `health-report.ts`, `profitability.ts` — Domain computations
- `openai.ts` — OpenAI client (Vercel AI Gateway preferred over direct)
- `rate-limit.ts`, `security.ts` — Security layer (Upstash Redis)

### Components (`src/components/`)

- `ui/` — Reusable primitives (shadcn-based)
- `animations/` — Animation components
- Dashboard components live in `src/app/dashboard/_components/` and per-route `_components/` subdirectories

### External Services

- **Supabase** — Database, auth, RLS (project ID: `nbdcrmepvwbfbcjqfubr`)
- **Composio** — OAuth broker for 500+ integrations (replaces per-tool key paste)
- **OpenAI** — GPT-4o + gpt-5.4/5.5 for COO chat, cron agents, briefing
- **Notion** — Customer-owned brain (20 DBs + 7 strategic pages per customer)
- **Vercel** — Hosting + AI Gateway + cron
- **Upstash Redis** — Rate limiting + dashboard caching
- **Resend** — Transactional emails
- **Stripe** — Our SaaS billing (separately, customers also connect their own Stripe via Composio)

### Design System

- Dark theme with electric blue (`#0066FF`) and cyan (`#00D4FF`) accents
- Fonts: NotoSansDisplay (body) + NotoSerifDisplay (headings)
- Tailwind CSS v4 + `tw-animate-css`
- shadcn/ui with Radix UI primitives
- Three.js via `@react-three/fiber` for 3D
- Framer Motion for page transitions

### Security

- Content Security Policy in `next.config.ts`
- Admin routes use `no-store` cache headers
- Rate limiting via Upstash Redis
- Composio holds OAuth tokens; we never store customer API keys
- Per-tenant RLS scopes everything to `user_id`

### No Client Data Persistence

Customer business data fetched from integrations (Stripe charges, HubSpot deals, ClickUp tasks) is **never stored in Supabase**. Every dashboard request live-fetches from Composio. Only computed metadata (agent actions, alert rules, briefings, retainer configs, run history, approval patterns) lives in Supabase. This is a hard architectural rule.

### CP-14 v1 control surface (May 2026)

5-commit ship of the v1 agent control layer — see [`docs/adr/0005-control-first-approval-gate.md`](./docs/adr/0005-control-first-approval-gate.md):

1. **Approval gate** (3b5a42c) — cron agent writes queue to /dashboard/actions
2. **Vercel AI SDK migration** (1799209) — COO chat moved off raw OpenAI SDK
3. **Composio sub-agents in COO + inline approval cards** (ff1848b)
4. **/dashboard/runs view** (f8bbb1d) — Lindy/Zapier-style runs history
5. **Per-tool autonomy toggle** (64918e6) — Ask / Auto / Off settings

### CP-15 chatv2 sever (May 2026)

Severed all chatv2 / n8n connections — see [`docs/adr/0001-composio-broker.md`](./docs/adr/0001-composio-broker.md) for the architectural decision. If durable workflow primitives are ever needed (high-volume triggers, multi-day waits), use **Inngest** or **Trigger.dev**, not n8n / chatv2.

### CP-16 audit takedown + KB disconnect (May 2026)

The prospect-facing automation audit funnel (`/audit`, `/results`, `/share/`, `/api/generate-audit`, `/api/audit-step`, `/api/audit-result`, `/api/build-request`, `/api/quick-win-onboarding`, `/api/notify`, `/api/funnel-event`, `/api/research-preview`) was retired in `aca9dbe`. The `/audit` URL was preserved as a "Coming soon: live demo" placeholder so the ~10 marketing CTAs across the site still resolve. The previously-mixed knowledge base was disconnected from all consumers (`search_kb` removed from COO + MCP) and the clearly-dead n8n folders (`n8n-core/`, `n8n-workflows/`, `n8n-troubleshooting/`) were archived. KB stayed dormant pending CP-17.

### CP-17 / CP-17b / CP-17c — Anthropic Agent Skills migration (May 2026)

Migrated the knowledge base from RAG (vector embeddings + retrieval) to Anthropic Agent Skills (`SKILL.md` files in git, progressively disclosed via the `load_skill` tool). Catalog: **46 skills across 9 domains** in `knowledge-base/skills/`:

| Domain | Skill count |
|---|---|
| `integrations/` | 10 (per major toolkit) |
| `revenue/` | 6 |
| `profitability/` | 5 |
| `delivery/` | 5 |
| `client-comms/` | 7 |
| `coo-briefings/` | 4 |
| `agency-types/` | 3 |
| `benchmarks/` | 2 (lookup-style) |
| `agency-ops/` | 4 |

**Three commits, four moves:**

1. `f3f5118` (CP-17) — Wrote the loader (`src/lib/skills.ts`), wired `load_skill` into COO + cron agents, hand-wrote 10 priority seed skills (`notion-brain-schema`, `projecting-cash-runway`, `firing-a-client`, `raising-retainer-prices`, etc.), archived the n8n build-time content, deduped 30 exact byte-for-byte triplicates.
2. `5aa124d` (CP-17b) — Bulk-converted 36 legacy files into SKILL.md via parallel subagent dispatch. Each subagent received the conversion prompt validated in a 5-skill batch, plus pre-curated source files (never let the model decide whether to merge across buckets).
3. `b2ce0b3` (CP-17c) — Polish pass: added `## Related skills` cross-references to the top-10 most-likely-to-be-called skills so the agent composes skills properly mid-turn (e.g. `firing-a-client` → `diagnosing-difficult-clients` → `discussing-margin-with-client`).
4. `c8f3a30` (post-deploy fix) — `check-outcomes` cron throttled from hourly to daily (Vercel Hobby plan).

**Why this pattern wins:** matches Anthropic's published Agent Skills spec, Ramp Glass / Block / Anthropic's own production usage, and the post-RAG canonical pattern Karpathy + Tom Blomfield (YC RFS #4 author) publicly described. Earns YC #4 "Company Brain" by construction, not by claim. See research basis in [`docs/adr/0003-skills-over-rag.md`](./docs/adr/0003-skills-over-rag.md) (newly added in this commit).

**Authoring guidelines** are in [`knowledge-base/skills/INDEX.md`](./knowledge-base/skills/INDEX.md). Headline rules: only `name` + `description` in frontmatter (no `tags`, `category`, `coo_relevance`, `when_to_use`); body ≤ 250 lines; open with italic anxious-question opener; include conversation scripts; end with "What NOT to do".

### CP-18 — 28-agent architecture (May 2026)

Expanded from the original 10 domain agents to a full **28-agent stack** (`502d942` / `0ad1f46`):

- **10 domain agents** (existing): `revenue`, `collections`, `scope`, `delivery`, `briefing`, `profitability`, `team`, `growth`, `renewal`, `stack`
- **17 tool agents** (new): one per Composio integration — `tool-gmail`, `tool-hubspot`, `tool-pipedrive`, `tool-clickup`, `tool-asana`, `tool-monday`, `tool-harvest`, `tool-toggl`, `tool-slack`, `tool-calendly`, `tool-notion`, `tool-apollo`, `tool-stripe`, `tool-quickbooks`, `tool-google-calendar`, `tool-google-analytics`, `tool-google-ads`, `tool-linkedin`, `tool-bamboo-hr`, `tool-gusto`, `tool-typeform`, `tool-intercom`, `tool-zendesk`
- **1 evaluator agent**: daily 2pm quality audit over every other agent's proposed actions

Each tool agent specializes deeply in one toolkit. Each writes findings to Notion (`Agent Action Log` rows). Domain agents (CP-19) read those findings to synthesize cross-tool insights. See [`src/lib/agents/registry.ts`](./src/lib/agents/registry.ts), [`src/lib/agents/tools/*`](./src/lib/agents/tools/), and [`src/lib/agents/evaluator/`](./src/lib/agents/evaluator/).

Three integrations excluded from agent coverage by architectural decision: `docusign`, `xero`, `facebook_ads` (toolkits remain connectable but no dedicated agent).

Approval-gate adds **confidence scoring** (heuristic 0–100 per queued action) and per-tool autonomy resolution stays unchanged.

### CP-19 — Domain agents become orchestrators (May 2026)

Rewrote all 10 domain agents from "standalone synthesizers" to **orchestrator-worker pattern** (Anthropic published spec). Each domain agent now:

1. Reads from Notion FIRST (its tool agents' findings + Risk Register + Pattern Cards + KPI Snapshots)
2. Only calls live Composio tools to fill gaps
3. Writes higher-level cross-tool synthesis back to the Brain
4. Queues a max of 3 strategic actions per cycle, each citing the threshold that triggered it

Adopts Anthropic's 4-field subagent contract: Objective / Source priority / Output format / Boundaries. Adds outcome tracking (`entity_type`/`entity_id`/`entity_tool_slug`/`expected_outcome`) to all 10. Crons staggered so domain agents run AFTER their tool-agent inputs finish (revenue 7→9am, briefing Mon 6am→Mon 12pm, etc.).

Two critical bugs fixed in the same pass: every domain agent now has `notion` in its `composioApps` (silently missing before, so every Notion-write instruction was dead code), and cron schedules don't race with their upstream tool agents.

Research basis: [`docs/adr/0006-orchestrator-worker-pattern.md`](./docs/adr/0006-orchestrator-worker-pattern.md) (Anthropic Multi-Agent Research, Cognition "Don't Build Multi-Agents" Flappy Bird failure, arXiv 2510.01285 blackboard pattern, Karpathy LLM Wiki, Claude Code /goals + Bloom).

### CP-20 — Customer-built automations, Lindy-style (May 2026)

Customer talks to the AI COO → describes an automation in plain English → COO compiles it to a typed spec → customer confirms → row inserted in `customer_automations` → fires real-time on Composio webhooks → queues each action through the existing approval gate. **Every agent in the system is aware of active automations** (catalog injected into every prompt, mirroring the skills pattern).

Components:

| Piece | Where |
|---|---|
| Schema (4 tables) | `supabase/migrations/20260524_customer_automations.sql` — `customer_automations`, `automation_trigger_instances`, `automation_runs`, `automation_event_idempotency` |
| Spec IR | [`src/lib/automations/types.ts`](./src/lib/automations/types.ts) — `composio_action`, `notion_write`, `agent_step`, `condition`, `loop`, `wait`, `set`, `queue_action` |
| Registry + catalog injection | [`src/lib/automations/registry.ts`](./src/lib/automations/registry.ts) — `loadAutomationCatalog`, `listAutomations`, `inspectAutomation`, `findAutomationsForEvent`, `buildAutomationsSystemBlock` |
| Synchronous executor | [`src/lib/automations/execute.ts`](./src/lib/automations/execute.ts) — walks the spec, fires through approval gate. Rejects specs with `wait`/`loop`/`agent_step` (Phase 7 = durable, deferred) |
| Composio webhook ingress | [`src/app/api/automations/webhook/composio/route.ts`](./src/app/api/automations/webhook/composio/route.ts) — HMAC-SHA256 verified, replay-protected, deduped |
| Trigger registration | [`src/lib/automations/composio-triggers.ts`](./src/lib/automations/composio-triggers.ts) — `registerComposioTrigger` / `deactivateComposioTrigger` |
| Natural-language compilation | [`src/lib/automations/compile.ts`](./src/lib/automations/compile.ts) + [`src/lib/automations/draft-schema.ts`](./src/lib/automations/draft-schema.ts) — Zod schema, model picks from enumerable catalog |
| 5 COO tools | `propose_automation`, `install_automation`, `list_automations`, `inspect_automation`, `pause_automation` in [`src/lib/coo/ai-sdk-tools.ts`](./src/lib/coo/ai-sdk-tools.ts) |
| Inline draft card | [`src/components/dashboard/automation-draft-card.tsx`](./src/components/dashboard/automation-draft-card.tsx) — Lindy-style trigger → then → then preview |
| List + detail UI | [`/dashboard/automations`](./src/app/dashboard/automations/) — registry view with status / autonomy / runs history, pause/resume/delete, autonomy toggle (Ask/Auto/Off per-automation) |

Approval-gate `ApprovalSource` union extended with `'automation'`. Resolution: per-automation autonomy ('off' blocks, 'auto' fires immediately, 'ask' falls through to per-tool policy).

**Naming disambiguation**: the existing CP-14 page at `/dashboard/settings/automation` was renamed in the sidebar to **"Tool Autonomy"** so it doesn't collide with the new **"Automations"** entry under OPERATIONS.

Research basis: [`docs/specs/automations.md`](./docs/specs/automations.md) (Lindy 2.0 architecture lessons, Anthropic Agent Skills standard, Vercel Workflows for Phase 7, Anti-patterns from n8n/Zapier 2026 critiques).

### CP-21 — Senior-COO playbook embedded in 10 domain agents (May 2026)

Rewrote all 10 domain agent prompts (`6849101`) with **senior fractional COO operator judgment** distilled from agency-operator publications (Sakas, Petitpas, Swenk, McLellan, AgencyAnalytics, Promethean, SparkToro, Focus Digital 2026 churn report, HubSpot State of Service, Yuktis).

Each domain agent now contains:

- **Signals + thresholds table** (healthy / caution / emergency zones) with cited industry benchmarks
- **Constrained decision tree** — agents may ONLY recommend actions from the published playbook, no novel inventions
- **Conversation scripts** (verbatim, fillable brackets) for the most common owner-facing moments
- **Anti-patterns** section as guardrails
- Cross-cutting principles in every prompt: lead with the most fragile number, name $/day/client at stake, trends over snapshots, cite the threshold, triage tier every output, max 3 strategic actions per cycle

Generic framing: agencies + services businesses broadly (design, marketing, dev shops, recruiting, consulting, accounting, PR, content studios). Vertical-specific judgment lives in `knowledge-base/skills/agency-types/*`.

Competitive context: **BOND (YC X25)** is the closest horizontal competitor — "AI Chief of Staff for CEOs/busy execs." OpsRadar's wedge is vertical depth + operator judgment embedded in agents (BOND has none of this published).

Research basis: [`docs/adr/0007-senior-coo-playbook.md`](./docs/adr/0007-senior-coo-playbook.md).

### CP-22 — AI COO replaces ChatGPT/Perplexity for business research (May 2026)

Added three tools (`757b419`) so the customer doesn't need another AI surface for business questions, competitor intel, or contract review:

- **`web_search`** — single-query Tavily search (purpose-built for LLM agents, free tier). Returns top 5 results + one-paragraph synthesis.
- **`research_competitor`** — multi-step deep research: 4-6 targeted searches, fetch top hits, structured extraction via `generateObject`. Returns positioning / pricing / strengths / weaknesses / threat-level brief in 10–20s.
- **`analyze_document`** — paste a contract / RFP / proposal / NDA / MSA → structured COO review: document type, summary, key terms, obligations per side, financial terms, risk flags, recommended action, questions to ask the counterparty.

Implementation: [`src/lib/coo/research.ts`](./src/lib/coo/research.ts). Wired in [`src/lib/coo/ai-sdk-tools.ts`](./src/lib/coo/ai-sdk-tools.ts). System prompt updated to claim THREE sources of truth (integrations, brain, public web) and explicitly told not to punt customers to ChatGPT/Perplexity.

Requires `TAVILY_API_KEY` env var. Without it, the three tools return a graceful "search disabled" error; the rest of chat keeps working.

### CP-23 — Multi-tenant API quota + usage tracking (May 2026)

One shared third-party API key per provider, many customers, no cost blowups. Every external API call across all four providers (OpenAI, Composio, Tavily, Anthropic) is quota-checked, logged, and visible to the customer (`23fb18a`).

Components:

| Piece | Where |
|---|---|
| Schema | `supabase/migrations/20260524_external_api_usage.sql` — `external_api_usage` (one row per external call, RLS, service-role write only) |
| Tracking lib | [`src/lib/usage/`](./src/lib/usage/) — `types` (Provider, Operation, TierCaps per plan), `track` (`recordUsage`, `checkQuota`, `withQuota` wrapper) |
| Per-tier caps | starter: 100 Tavily / 5M OpenAI tokens / 2k Composio · growth: 500 / 25M / 10k · pro: 2.5k / 100M / 50k · fo: 5k / 200M / 100k |
| Wired call sites | Tavily — `webSearch` / `researchCompetitor` / `analyzeDocument`. OpenAI — cron agent loop (skip with reason if blocked), COO chat (429 with reset date), `generateObject` extraction calls. Composio — every `tools.execute()` in `approval-gate.ts` (auto), `actions/executor.ts` (customer-approved), `automations/execute.ts` (auto). |
| Customer UI | `/dashboard/settings/usage` — per-provider progress bars, % used, reset date. Sidebar: **WORKSPACE → Usage**. |
| API | `GET /api/dashboard/usage` returns tier + caps + current usage. |

Fail-open: quota-check failures log and allow the call (better to over-allow than block a paying customer because of a logging bug).

Foundation for usage-based pricing later if needed.
