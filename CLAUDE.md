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
| `/audit` → `/results` → `/share/[id]` | Free automation audit funnel |
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
| `cron/check-outcomes/` | Hourly outcome detection (CP-13) |

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
