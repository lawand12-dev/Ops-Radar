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

OpsRadar is one Next.js app on Vercel + Supabase. The previously separate `chatv2` Hono.js service was severed in CP-15 — see [`docs/strategy/composio-vs-n8n-decision-2026.md`](./docs/strategy/composio-vs-n8n-decision-2026.md) for the architectural rationale. **There is no second backend, no n8n integration, no workflow generator.** Everything runs from this repo.

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

Sidebar groups: Overview / TODAY / CLIENTS / INTELLIGENCE / OPERATIONS / PARTNER (FO only) / WORKSPACE.

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview cockpit — KPI strip + narrative + activity feed |
| `/dashboard/actions` | Agentic action queue (cron agent + COO writes) |
| `/dashboard/briefings` | Daily AI-generated readouts |
| `/dashboard/profitability` | Client profitability |
| `/dashboard/scope` | Scope creep detection |
| `/dashboard/retainer` | Retainer configs |
| `/dashboard/coo` | Ask COO — chat agent (Vercel AI SDK + Composio sub-agents) |
| `/dashboard/brain` | Customer-owned Notion Brain (20 DBs + 7 strategic pages) |
| `/dashboard/performance` | 5-dimension agency health + peer benchmarks |
| `/dashboard/runs` | Every agent run with status + drawer detail (CP-14) |
| `/dashboard/business` | Live Data — raw per-integration explorer |
| `/dashboard/integrations` | Connect tools via Composio OAuth |
| `/dashboard/webhooks` | Outgoing webhook configurations |
| `/dashboard/settings` | Account settings |
| `/dashboard/settings/automation` | Per-tool autonomy (Ask / Auto / Off) — CP-14 |
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

5-commit ship of the v1 agent control layer — see [`docs/strategy/control-surface-research-2026.md`](./docs/strategy/control-surface-research-2026.md):

1. **Approval gate** (3b5a42c) — cron agent writes queue to /dashboard/actions
2. **Vercel AI SDK migration** (1799209) — COO chat moved off raw OpenAI SDK
3. **Composio sub-agents in COO + inline approval cards** (ff1848b)
4. **/dashboard/runs view** (f8bbb1d) — Lindy/Zapier-style runs history
5. **Per-tool autonomy toggle** (64918e6) — Ask / Auto / Off settings

### CP-15 chatv2 sever (May 2026)

Severed all chatv2 / n8n connections — see [`docs/strategy/composio-vs-n8n-decision-2026.md`](./docs/strategy/composio-vs-n8n-decision-2026.md) for the architectural decision. If durable workflow primitives are ever needed (high-volume triggers, multi-day waits), use **Inngest** or **Trigger.dev**, not n8n / chatv2.

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

**Why this pattern wins:** matches Anthropic's published Agent Skills spec, Ramp Glass / Block / Anthropic's own production usage, and the post-RAG canonical pattern Karpathy + Tom Blomfield (YC RFS #4 author) publicly described. Earns YC #4 "Company Brain" by construction, not by claim. See research basis in [`docs/strategy/agent-skills-architecture-2026.md`](./docs/strategy/agent-skills-architecture-2026.md) (newly added in this commit).

**Authoring guidelines** are in [`knowledge-base/skills/INDEX.md`](./knowledge-base/skills/INDEX.md). Headline rules: only `name` + `description` in frontmatter (no `tags`, `category`, `coo_relevance`, `when_to_use`); body ≤ 250 lines; open with italic anxious-question opener; include conversation scripts; end with "What NOT to do".
