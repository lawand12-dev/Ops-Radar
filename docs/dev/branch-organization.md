# Branch Organization — What Lives Where

> **Authoritative reference.** Every new feature must be slotted against this matrix before any code is written. If a feature doesn't fit, the matrix is wrong — update it before coding.

## The Two Branches

| | `main` (this repo) | `chatv2` (CTO's deploy) |
|---|---|---|
| Framework | Next.js 16 + React 19 | Hono 4 + Node/Bun |
| DB | Supabase (Postgres) | MySQL |
| Hosting | Vercel | opstest.atta.codes |
| Customer-facing? | Yes — the whole product UI | No — team-only, customer never sees it |
| Auth | Supabase SSR (email + magic link) | JWT (team operators only) |
| Encryption | AES-256-GCM via `src/lib/integrations/crypto.ts` | AES-256-GCM via `src/lib/crypto.ts` |
| Who deploys? | Lawand (auto via Vercel) | CTO (manual on opstest) |

## The One-Sentence Rule

**If it's customer state the customer sees on their dashboard → `main` / Supabase. If it's a platform service doing compute or cross-tenant coordination → `chatv2` / MySQL.**

## Domain Ownership Matrix

| Concern | Branch | Already shipped? |
|---|---|---|
| Customer auth + session | `main` | ✅ |
| Customer profile + plan tier | `main` (user_metadata) | ❌ Building now (Phase A) |
| Customer Model C integration keys (Stripe, Harvest, ClickUp, …) | `main` (`integrations` table) | ✅ |
| Briefings, profitability snapshots, scope cache, alert_notifications | `main` (Supabase per-user tables) | ✅ |
| Agent actions (invoice reminders, margin alerts, etc.) | `main` (`agent_actions` table) | ✅ |
| Agency score, benchmarks (peer cohorts) | `main` (Supabase) | ✅ |
| **Retainer configs + retainer-overage action** | **`main`** (new `retainer_configs` table) | ❌ Building now (Phase B) |
| **FO multi-client dashboard (managed agencies, per-agency keys, aggregate)** | **`main`** (new `fo_clients` + `fo_integrations` tables) | ❌ Building now (Phase C) |
| **Action limits (50/Growth, 200/Pro) + monthly counting** | **`main`** (Supabase `agent_actions` query + tier matrix) | ❌ Building now (Phase D) |
| **Slack webhook routing** | **`main`** (user_metadata `slack_webhook_url` + dispatch lib) | ❌ Building now (Phase E) |
| **Outgoing custom webhooks** | **`main`** (new `outgoing_webhooks` table + delivery worker) | ❌ Building now (Phase F) |
| n8n workflow analytics + health monitoring | `chatv2` (proxied via service key) | ✅ Bridge centralized in this session |
| **AI / RAG / chat completions (COO chat backend)** | **`chatv2`** (`ai-service` + RAG over `knowledge-base/`) | ⚠️ Bridge wrapper exists, COO route still hits OpenAI direct — Phase G later |
| Multi-tenant projects (raw primitive) | `chatv2` (`projects` table) | ✅ Exists, currently used 1-project-per-customer via `chatv2_project_id` |
| Audit / events log (cross-tenant team-ops) | `chatv2` (`events` module) | ✅ Exists on chatv2, not surfaced in main yet |

## Why Each Call

### Tier enforcement → `main`
A customer's plan is **customer state**, not a platform concern. Lives in Supabase `user_metadata.plan`. Every gated API route reads it via `getUserPlan()` and rejects with 402 if the tier doesn't match. UI shows upgrade prompts via `<PlanGate>`. chatv2 never needs to know about plans.

### Retainer surface → `main`
Retainers are customer-specific contract terms (client X pays $5K/mo for 40 hrs). They:
- Are entered by the customer on their dashboard → Supabase form data
- Are referenced by computations that already live in main (profitability uses Stripe + Harvest data fetched per-customer via Model C keys in Supabase)
- Are surfaced as agentic actions in the existing `agent_actions` queue → already a Supabase table

Putting retainers in chatv2 would force a roundtrip for every read, and chatv2 has no customer-specific business data today. Wrong place.

### FO multi-client → `main` (v1)
The architecturally pure answer is "FO uses chatv2's existing `projects` table as the multi-tenant primitive." That's correct long-term but blocks on the CTO building an `agency_integrations` table on chatv2.

**Pragmatic v1:** build `fo_clients` + `fo_integrations` in Supabase. The FO directly enters each managed agency's API keys. Aggregate dashboard runs the same `computeClientProfitability` / `computeScopeCreep` logic main already runs for single-tenant Growth/Pro customers, just looped over N agencies. **Zero CTO dependency. Ships in this session.**

**Future migration path (v2):** when chatv2 adds `agency_integrations`, we move FO keys out of Supabase and into chatv2 projects. The Next.js UI doesn't change — only the API route's data source. This is a one-week migration when we're ready.

### Action limits → `main`
The `agent_actions` table is in Supabase. Counting actions per user per month is a Supabase query. Enforcement happens in the evaluator before `INSERT`. No reason to involve chatv2.

### Slack routing → `main`
Slack webhook URL is per-customer configuration (Supabase `user_metadata.slack_webhook_url`). The senders that currently dispatch email (threshold alerts, briefings, action notifications) all live in main. They become: send email AND POST to Slack if configured.

### Outgoing webhooks → `main`
Events fire from main (action created, alert sent, briefing ready). The webhook registration UI is a customer-facing settings page → main. Delivery is `fetch(customer_url, { body: event })` — pure Node, no reason to involve chatv2.

### AI / RAG → `chatv2`
This is the one that genuinely belongs on chatv2:
- The RAG knowledge base is already embedded under `src/knowledge-base/` on chatv2
- The Anthropic API key is centralized on chatv2 (`users.anthropic_api_key_encrypted`)
- Inference cost lives on the chatv2 server, not Vercel's function billing
- Multiple customers can share retrieval infrastructure

The COO chat in main calls OpenAI directly today. **Phase G (later):** swap it to `chatV2Fetch('/chat', { projectId, body: { messages } })` using the bridge we just built. Needs CTO confirmation of the service-route AI endpoint contract first.

### Workflow monitoring → `chatv2` (already shipped)
n8n analytics and workflow health monitoring already proxy through chatv2 via the bridge. Don't rebuild.

## What Goes on Which Branch — Action List

### This session, `main` only (no CTO blocker):

1. **Phase A** — Tier enforcement
2. **Phase B** — Retainer surface
3. **Phase C** — FO multi-client dashboard (v1 — Supabase-only)
4. **Phase D** — Action limits per tier
5. **Phase E** — Slack webhook routing
6. **Phase F** — Outgoing webhooks

### Future, `chatv2` (CTO checklist):

1. **AI route exposure** — confirm `POST /service/projects/:id/chat` accepts `{ messages: [...] }` and returns `{ reply, interaction_id, citations? }`
2. **Health endpoint** — `GET /` returns JSON `{ status, service, ... }` for the ping route to verify
3. **(v2) Agency integrations table** — for FO migration when we centralize keys
4. **(v2) Cross-tenant audit log** — for admin tooling

### Future, both branches together:

1. **Phase G** — COO chat → chatv2 RAG (1-line swap in `/api/dashboard/coo/route.ts` once chatv2 confirms contract)
2. **Phase H** — Surface chatv2 audit log on the admin tools in main

## What's NOT Being Built This Session

| Feature | Why deferred |
|---|---|
| Multi-user seats (per-tier seat limits, team invitations, role permissions) | Requires a full organization/team data model — 1–2 weeks of work. Current 1 user = 1 account model is wrong for this; needs design first. |
| White-label for FO | UI lift; nice-to-have not blocker |
| Partner referral commission tracking | Billing concern, not backend feature |
| Service-mix benchmark cohort dimension | Requires capturing service-mix on signup; agency_submissions schema change |
| Founder pricing discount enforcement | Billing concern (Stripe Connect blocked by country per memory) |
| Annual prepay billing | Same as above |

These are flagged on the pricing page but require billing/team infrastructure that's a separate buildout.
