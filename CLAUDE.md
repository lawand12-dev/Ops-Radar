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

**OpsRadar** is an AI-powered operations platform (AI COO) for digital agencies. It connects a customer's business tools (Stripe, HubSpot, ClickUp, Harvest, etc.) and surfaces revenue health, client profitability, scope creep, delivery status, and automated COO-style insights on a single dashboard.

### Two-System Architecture

OpsRadar is composed of two completely separate systems:

| | **OpsRadar** (`main` branch, this repo) | **chatv2** (CTO's separate repo) |
|---|---|---|
| Framework | Next.js 16 + React 19 | Hono 4 + Bun/Node |
| Database | Supabase (PostgreSQL) | MySQL (14 migrations) |
| Hosting | Vercel (auto-deploy) | opstest.atta.codes (CTO-deployed) |
| Customer-facing? | Yes — the full product UI | No — team-only, customers never see it |
| Auth | Supabase SSR (email + password) | JWT (team operators + customers via service key) |
| Purpose | Customer identity, business tool integrations, dashboard UI | n8n workflow management, AI/RAG, workflow health monitoring |

**Domain boundary rule:** Customer state the customer sees and manages → Supabase (`main`). Platform compute, n8n workflow monitoring, AI inference → chatv2 (MySQL).

See `docs/dev/branch-organization.md` for the full domain ownership matrix.

### What chatv2 Owns

The CTO's chatv2 backend is a complete Hono.js server with:
- **Chat-to-automation generation** — AI (Claude via DigitalOcean RAG or Anthropic direct) creates n8n workflow definitions from natural language
- **n8n deployment** — deploys workflows to each customer's own n8n instance (per-user encrypted API keys)
- **Workflow health monitoring** — polls n8n executions on a scheduler, creates health snapshots, deduplicates alerts by fingerprint
- **AI interactions audit log** — logs every LLM call (model, latency, tokens, prompt, response)
- **Admin console** — user management, cross-tenant analytics, AI interaction viewer
- **Multi-tenant** — each user has their own row in MySQL `users` with AES-256-encrypted n8n and Anthropic API keys

OpsRadar consumes chatv2 via two proxied API routes using a shared `CHATV2_SERVICE_API_KEY` bearer. Customers never make requests to opstest.atta.codes — all chatv2 traffic is server-side from Next.js API routes.

### App Routes (`src/app/`)

**Marketing / Public**

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/product` | Product page (AI COO positioning) |
| `/pricing` | Pricing page (4 tiers) |
| `/about` | About page |
| `/how-it-works` | How it works |
| `/for/[vertical]` | Vertical-specific landing pages |
| `/audit` | Free automation audit (multi-step questionnaire → GPT-4o report) |
| `/results` | Audit results display |
| `/share/[id]` | Shared audit results (public) |
| `/faq` | FAQ |
| `/login`, `/auth`, `/forgot-password` | Customer authentication |

**Customer Dashboard** (`/dashboard/*`)

The sidebar is grouped into 7 sections to give the nav a narrative arc
(2026-05-23): Overview / TODAY (Actions, Briefings) / CLIENTS / INTELLIGENCE
(Ask COO, Brain, Performance) / OPERATIONS / PARTNER (FO only) / WORKSPACE.

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview cockpit — KPI strip, alerts ribbon, narrative, activity feed + integration health |
| `/dashboard/actions` | Agentic action queue (invoice reminders, margin alerts, etc.) |
| `/dashboard/briefings` | COO Briefings inbox — daily AI-generated readouts |
| `/dashboard/profitability` | Client profitability by retainer vs actual hours |
| `/dashboard/scope` | Scope creep detection per client |
| `/dashboard/retainer` | Retainer configs (monthly rates, hour budgets) |
| `/dashboard/coo` | Ask COO — chat agent with sidebar of saved sessions |
| `/dashboard/brain` | Company Brain — living brief + pattern cards + breadcrumb upload |
| `/dashboard/performance` | Merged tabbed page: **Health** (5-dimension score) and **Peers** (cohort benchmarks). Replaces the standalone `/score` and `/benchmarks` pages, which now 301 here. |
| `/dashboard/automations` | Workflow health from n8n (via chatv2) |
| `/dashboard/business` | Live Data — raw per-integration explorer (Stripe rows, HubSpot deals, Pipedrive, Apollo, Calendly, ClickUp/Asana/Monday, Toggl, Harvest). Renamed from "Business"; top-line KPIs were dropped because they duplicate Overview. |
| `/dashboard/integrations` | Connect/manage API keys for Stripe, HubSpot, ClickUp, Harvest, etc. |
| `/dashboard/webhooks` | Outgoing webhook configurations |
| `/dashboard/settings` | Account settings |
| `/dashboard/settings/team` | Team members + invitations |
| `/dashboard/settings/mcp` | MCP token + install snippet |
| `/dashboard/fo` | Fractional Operator (FO) multi-client aggregate dashboard |
| `/dashboard/fo/clients` | FO managed client list |
| `/dashboard/fo/clients/[id]` | Per-client dashboard for FO |
| `/dashboard/fo/branding` | White-label branding settings |
| `/dashboard/fo/audit` | FO audit tools |

**Admin**

| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard (password-protected) |
| `/dev` | Internal dev/debug tools |

### Dashboard API Routes (`src/app/api/dashboard/`)

**Business Intelligence — live-fetched from customer's connected tools:**

| Route | Data source | Purpose |
|-------|-------------|---------|
| `finance/` | Stripe | MRR, paid/invoiced MTD, overdue invoices, 30-day sparkline |
| `sales/` | HubSpot | Pipeline summary, deal counts, stage breakdown |
| `sales-live/` | HubSpot | Real-time open deals |
| `sales-pipedrive/` | Pipedrive | Pipeline via Pipedrive adapter |
| `marketing/` | HubSpot | Marketing funnel metrics |
| `time-tracking/` | Harvest / ClickUp | Logged hours per project |
| `time-harvest/` | Harvest | Harvest-specific time data |
| `delivery/` | ClickUp | Project delivery status |
| `profitability/` | Stripe + Harvest | Per-client revenue vs cost |
| `scope/` | ClickUp + Harvest | Scope creep signals per client |
| `benchmarks/` | Internal + Supabase | Agency peer benchmarks |
| `benchmarks/cohorts/` | Supabase | Cohort bucket lookup |

**AI-Powered:**

| Route | Purpose |
|-------|---------|
| `coo/` | AI COO agent — GPT-4o function-calling loop, SSE stream, accepts `session_id`, persists user + assistant messages to Supabase as it streams |
| `coo/sessions/` | `GET` lists the user's chat sessions (last_message_at desc, limit 50). `POST` creates an empty session |
| `coo/sessions/[id]/` | `GET` returns session metadata + ordered messages. `PATCH` renames. `DELETE` cascades to messages |
| `briefing/` | Daily AI-generated operations briefing |
| `narrative/` | Short AI narrative summary for dashboard overview |
| `score/` | Agency health score computation |

**Supabase-backed:**

| Route | Purpose |
|-------|---------|
| `alerts/` | Alert rules evaluation + notification dispatch |
| `alerts-rules/` | CRUD for user-defined alert thresholds |
| `actions/` | Agentic action queue (create, read, execute) |
| `actions/usage/` | Monthly action count vs tier limit |
| `retainer/` | Retainer config CRUD (Pro+ tier) |
| `metrics/` | Dashboard KPI aggregation |
| `activity/` | Activity feed (recent events across integrations) |
| `onboarding-status/` | Integration onboarding completion state |
| `team/` | Team member list |
| `webhooks/` | Outgoing webhook registration + test |
| `health-report/` | Composite health report for score page |
| `backfill-complete/` | Marks historical data backfill as done |

**chatv2 Proxies:**

| Route | chatv2 endpoint | Purpose |
|-------|----------------|---------|
| `workflow-health/` | `GET /service/projects/:id/workflows/health` | n8n workflow health strip |
| `automation-roi/` | `GET /service/projects/:id/analytics` | Automation ROI card (Redis fresh/stale cache) |

### Other API Routes (`src/app/api/`)

- `generate-audit/` — Core audit endpoint: calls OpenAI to generate the automation audit
- `notify/` — Email notifications via Resend on new audits
- `build-request/` — Automation build request submissions
- `quick-win-onboarding/` — Quick-win onboarding emails
- `audit-step/`, `audit-result/` — Audit persistence endpoints
- `funnel-event/` — Analytics funnel tracking
- `research-preview/` — Website research intelligence preview
- `admin-auth/`, `admin/data/` — Admin authentication and data access
- `admin/onboard-customer/` — Provision new customer account + send invite
- `cron/followups/` — Scheduled follow-up emails
- `unsubscribe/` — Email unsubscribe handling
- `internal/chatv2-ping/` — Admin-gated health check for chatv2 connectivity

### Integration Adapters (`src/lib/integrations/`)

Each adapter follows the same pattern: a `validate*Key()` function and a `fetch*Data()` function. No data is persisted — all adapters live-fetch on every dashboard request.

| Directory | Service | Data returned |
|-----------|---------|--------------|
| `stripe/` | Stripe | Finance data, invoices, profitability per client |
| `hubspot/` | HubSpot | Sales pipeline, deals, marketing funnel |
| `clickup/` | ClickUp | Project delivery, task completion, scope data |
| `harvest/` | Harvest | Time tracking, logged hours, project billing |
| `pipedrive/` | Pipedrive | Pipeline data (alternative to HubSpot) |
| `apollo/` | Apollo | Prospecting / outbound data |
| `asana/` | Asana | Project management |
| `monday/` | Monday.com | Project management |
| `toggl/` | Toggl | Time tracking (alternative to Harvest) |
| `calendly/` | Calendly | Meeting bookings |

### Key Libraries (`src/lib/`)

- `supabase.ts` / `supabase-server.ts` / `supabase-ssr.ts` — Supabase clients (browser, server, SSR with session)
- `database.types.ts` — Auto-generated Supabase types (do not edit manually)
- `integrations/crypto.ts` — AES-256-GCM encrypt/decrypt for customer API keys stored in Supabase
- `chatv2/client.ts`, `chatv2/errors.ts`, `chatv2/project-mapping.ts` — Typed HTTP client for chatv2 proxy calls
- `client-n8n.ts` — Reads customer's `chatv2_project_id` from `client_n8n_config` Supabase table
- `briefing.ts` — Generates daily AI COO briefing
- `actions/` — Agentic action evaluators (margin-alert, invoice-reminder, scope-alert, etc.) and executor
- `benchmarks/` — Peer benchmark cohort bucketing logic
- `profitability.ts` — Client profitability computation (Stripe revenue vs Harvest cost)
- `openai.ts` — OpenAI client setup
- `rate-limit.ts`, `abuse-protection.ts`, `security.ts` — Security layer (Upstash Redis rate limiting)
- `constants.ts` — Centralized URLs and config
- `prompts.ts` — AI prompt templates for audit generation
- `website-intel.ts`, `website-research-agent.ts` — Website analysis pipeline (for audit)
- `knowledge-retrieval.ts` — File-based KB retrieval for audit grounding
- `agency-submissions.ts` — Quality filter + fire-and-forget save of qualifying audit inputs

### Components (`src/components/`)

- `ui/` — Reusable UI primitives (shadcn-based: button, card, dialog, badge, etc.) plus custom (pricing, hero banner, shader background)
- `animations/` — Animation components (typewriter, stagger, fade-in, floating particles, glow card, count-up)
- Dashboard components live in `src/app/dashboard/_components/` and per-route `_components/` subdirectories

### External Services

- **Supabase** — Database, auth, RLS (project ID: `nbdcrmepvwbfbcjqfubr`)
- **chatv2** — CTO's Hono.js backend on opstest.atta.codes — n8n workflow management, AI/RAG, monitoring
- **OpenAI** — GPT-4o for audit generation, COO chat, briefing, narrative
- **Upstash Redis** — Rate limiting + dashboard caching (fresh 3–5 min, stale 24h)
- **Resend** — Transactional emails
- **Vercel** — Hosting, analytics, speed insights
- **Stripe** — Customer billing (Model C: customers bring their own key)

### Design System

- Dark theme with electric blue (`#0066FF`) and cyan (`#00D4FF`) accents
- Fonts: NotoSansDisplay (body) and NotoSerifDisplay (headings), loaded as local fonts
- Tailwind CSS v4 with `tw-animate-css` for animations
- shadcn/ui components with Radix UI primitives
- Three.js via @react-three/fiber for 3D elements
- Framer Motion for page transitions and animations

### Security

Content Security Policy in `next.config.ts`. Admin routes use `no-store` cache headers. Rate limiting via Upstash Redis. Customer API keys are AES-256-GCM encrypted in Supabase — never stored in plaintext. chatv2 traffic is server-side only (customers never call opstest.atta.codes directly).

### No Client Data Persistence

Customer business data fetched from integrations (Stripe charges, HubSpot deals, ClickUp tasks) is **never stored in Supabase**. Every dashboard request live-fetches from the source API. Only computed metadata (agent actions, alert rules, briefing summaries, retainer configs) lives in Supabase. This is a hard architectural rule.
