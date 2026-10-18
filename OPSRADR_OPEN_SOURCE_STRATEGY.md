# OpsRadr Open-Source Transformation Strategy

> **Status:** Strategic analysis and planning only. No application code was modified.
> **Source of evidence:** `PROJECT_ARCHITECTURE.md` (investigation document at repo root), verified against actual source files under `src/`, `supabase/migrations/`, `vercel.json`, `trigger.config.ts`, `package.json`, and `docs/`. Where a claim rests on inference rather than a directly observed file/symbol, it is labelled **inference** or **uncertain**.

---

## 1. Executive Summary

OpsRadr is not yet a viable open-source product. It is a **large, bleeding-edge, partially demolished codebase** caught between two identities: (a) a hosted AI "operations intelligence" SaaS for client-service businesses, and (b) an open-source "open core" rules engine (`src/lib/open-core/`) being extracted from it. The hosted application's data surfaces are largely stubs (17 of 45 dashboard API routes return `{stub:true, migration:'pending-nango-wire-up', data:null}`), its agent system was torn down and holds only one of ~34 scheduled agents, its documentation (including `AGENTS.md` and `CLAUDE.md`) describes a pre-pivot architecture that no longer exists, and there is no CI, no tests outside the open core, and no public-release hygiene.

If your goals are genuinely useful open source + a frontend portfolio project, the honest recommendation is: **do not release the hosted SaaS as-is.** Release the **open core** (`src/lib/open-core/`) as the first public artifact — it is dependency-free, tested, well-bounded, solves a clear problem (where is my agency losing cash/capacity/margin?), and demonstrates real engineering judgment. Treat the hosted dashboard as a separate, later concern or narrow it drastically.

**Recommended primary direction (Phase 10 detail below):**
1. Open-source `src/lib/open-core/` immediately as a standalone, dependency-free TypeScript rules engine with docs, examples, and a CSV/sample-data on-ramp. This is the smallest thing worth releasing.
2. Keep the hosted dashboard repo but **mark it pre-alpha / reference material**; do not invite real users to depend on it until stubs are resolved.
3. Fix release-blocking security and hygiene issues first (stale env template, no CI, admin auth inconsistency, Sentry PII, submodule-without-.gitmodules, hardcoded DSN).

Detailed reasoning and a prioritized roadmap follow in this document.

---

## 2. What Opsradr Is Today

### 2.1 Confirmed identity (from code and docs)

| Claim | Evidence |
|---|---|
| Two coexisting products | `README.md` + `docs/OPEN_SOURCE.md`: hosted SaaS + open-core extraction in `src/lib/open-core/` |
| Hosted stack | Next.js 16 App Router, React 19, Tailwind v4 (`next.config.ts`, `package.json`, `tsconfig.json`) |
| Backend | Supabase auth/Postgres (`src/lib/supabase-ssr.ts`, `supabase/migrations/`) |
| Integration broker | Nango (`src/lib/nango.ts`, `@nangohq/node` ^0.70.4); Composio removed per ADR 0010 |
| AI models | OpenAI primary → Groq → DigitalOcean fallback (`src/lib/ai/model-provider.ts`, ADR 0012) |
| Background jobs | Vercel Cron (41 entries in `vercel.json`) + Trigger.dev (`trigger.config.ts`, `src/trigger/`) |
| Rate limiting | Upstash Redis (`src/lib/rate-limit.ts`) |
| Observability | Sentry, Statsig, Langfuse (`src/instrumentation*.ts`, `src/lib/flags/index.ts`, `src/lib/observability/langfuse.ts`) |
| Email | Resend (`src/lib/emails/*`) |
| Notion "Brain" | `@notionhq/client` ^5.22.0, `src/lib/notion/*`, `src/lib/brain/*` |
| Stripe dependency installed | `stripe` ^22.1.1 in `package.json`, but **no billing routes exist** in `src/app/api/` |

### 2.2 Primary workflows (intended vs actual)

| Workflow | Status | Evidence |
|---|---|---|
| Connect business tools via OAuth | Partially functional | `src/app/api/nango/connect/route.ts` exists; 17 dashboard consumers are stubs |
| AI "hire" chat → custom employee | Partially functional | `src/app/api/dashboard/hire/route.ts` exists; gated by `custom-employees-enabled` flag (default false); registry holds only `tool-gmail` |
| Approval-gated actions queue | Partially functional | `src/app/api/dashboard/actions/route.ts` exists; `executor.ts` only handles `tool_action`; outcome tracker is a stub |
| Versioned Brain + Notion mirror | Partially functional | `src/lib/brain/store.ts` exists; `create-brain.ts` provisioner has **no caller**; sync/export crons scheduled |
| Diorization (doc ingest → briefs) | Partially functional | `src/lib/diorization/runner.ts` exists; Slack/Gmail adapters return `[]` (stubs) |
| Open-core risk evaluation | **Fully functional** | `src/lib/open-core/evaluate.ts` + 3 tests in `evaluate.test.ts` |

### 2.3 What does NOT exist (despite docs implying it)

- The original "operations audit funnel" referenced by `AGENTS.md` — `src/app/api/generate-audit/`, `src/lib/knowledge-retrieval.ts`, `agency-submissions.ts`, `prompts.ts`, `website-intel.ts` are all absent (verified by file absence; retired in CP-16).
- Composio runtime — `.env.example` still lists 28 `COMPOSIO_*` vars, but **no code reads any `COMPOSIO_*` variable** (grep confirmed zero matches); only the legacy `composio_connections` table type remains in `database.types.ts`.
- Stripe billing — dependency installed, pricing page exists, but no billing route or `STRIPE_*`-reading code in `src/`.
- Tavily web search — `TAVILY_API_KEY` documented in `.env.example`, but **no code reads it**; `src/lib/coo/research.ts` is a stub.
- Custom build/CI pipeline — no `.github/` directory; no workflows; `next dev --webpack` and `next build --webpack` are the only dev/build scripts.

### 2.4 Honest current-state assessment

OpsRadr today is a **large codebase (~53k LOC, 78 routes, 44 pages, 40 migrations) whose hosted product is substantially non-functional**, plus one small, clean, tested, dependency-free open-core rules engine. It is **not** a tutorial project (it uses real, modern tooling and real architecture decisions documented in ADRs), but it is also **not** a product ready for public users. Its strongest capability is the open core; its weakest aspect is the gap between the marketing/pricing surface (which promises a full SaaS) and the stubbed reality underneath.

---

## 3. Current Project Strengths and Weaknesses

### 3.1 Strengths (confirmed)

| # | Strength | Evidence | Why it matters |
|---|---|---|---|
| 1 | Clean, dependency-free open core with tests | `src/lib/open-core/` (4 files, `evaluate.test.ts` 76 lines), only test suite in repo | Immediate open-source release candidate; demonstrates deterministic, evidence-backed logic |
| 2 | Modern, intentional tech stack | Next.js 16, React 19, Tailwind v4, Supabase, Upstash, Nango | Portfolio-relevant frontend/backend skills; decisions are deliberate (stack-reference.md) |
| 3 | Architecture documented via ADRs | `docs/adr/0001–0012` | Rare for a solo project; shows reasoning behind choices (Composio→Nango, Trigger.dev, skills-over-RAG) |
| 4 | "No client data persistence" rule | `CLAUDE.md`, ADR 0010 | Reduces data-liability surface; customers' business data stays with them |
| 5 | Approval-gated write pattern | `src/lib/actions/executor.ts`, `approval-patterns.ts`, ADR 0005 | Sensible safety layer for AI write proposals |
| 6 | Fail-open quota design | `src/lib/usage/track.ts` | Better to over-allow than block a customer on a logging bug |
| 7 | Observability triangle wired | Sentry + Statsig + Langfuse configs | Error tracking, feature flags, LLM tracing all present |
| 8 | RLS on Supabase tables | `supabase/migrations/*.sql` | Row-level security enabled on tracked tables |

### 3.2 Weaknesses (confirmed)

| # | Weakness | Evidence | Severity |
|---|---|---|---|
| 1 | Hosted product mostly stubs | 17 of 45 `/api/dashboard/*` routes return `{stub:true, migration:'pending-nango-wire-up'}` | Critical for SaaS release |
| 2 | Agent system demolished | Registry holds only `tool-gmail`; 33 of 34 scheduled cron agents return 404 (`src/app/api/cron/agents/[agent]/route.ts`, `vercel.json`) | Critical |
| 3 | No CI / no tests outside open core | No `.github/`; only `src/lib/open-core/evaluate.test.ts` | Critical for trust |
| 4 | Stale top-level docs | `AGENTS.md` lists 5 nonexistent files; `CLAUDE.md` describes Composio broker + 3 dashboard surfaces + "no test runner" | High (misleads contributors and AI agents) |
| 5 | Stale env template | `.env.example`: 28 `COMPOSIO_*` vars, **0 `NANGO_*`**; lists `JWT_SECRET`/`BACKFILL_SECRET` which no code reads | High (breaks fresh deploy) |
| 6 | Admin auth inconsistency | 3 mechanisms: session cookie (`admin-auth`), `Bearer ADMIN_PASSWORD` (`set-plan`), `x-admin-password` plain `!==` (`onboard-customer`) | High (security) |
| 7 | Sentry PII + 100% traces | `sendDefaultPii: true` on server/edge/client configs | Medium-high (privacy) |
| 8 | Service-role fallback to anon key | `supabase-server.ts` warns and proceeds without service role | Medium (silent RLS bypass) |
| 9 | Rate-limit drift | `kpi-trends` passes unregistered limiter name → effectively unlimited; `mcp` has no limiter despite `rate_limited` audit enum | Medium |
| 10 | Dead code / orphaned components | Orphaned marketing components, unused `framer-motion` except orphaned `WorkflowDiagram.tsx`, unreferenced TTFs, dead `widget-fallback.tsx` | Medium (noise) |
| 11 | Repo hygiene for public release | Submodule pointers without `.gitmodules`; historical material in git history | High (blocks public gate per OPEN_SOURCE.md) |
| 12 | Pricing/copy inconsistency | Homepage says "$499/mo Growth"; `pricing/page.tsx` lists $750/$1500/$3000 | Low-medium |
| 13 | Marketing CTAs to retired surfaces | `/audit` placeholder, `/waitlist` no form, `/api/funnel-event` nonexistent | Medium |
| 14 | Bleeding-edge stack | Next 16 / React 19 / Tailwind 4 / AI SDK 6 — all newer than typical AI training data | Medium (debug difficulty) |

### 3.3 Strengths-to-leverage vs weaknesses-to-fix

**Preserve:** open core, ADR docs, approval-gate pattern, fail-open quota, RLS, observability wiring, Supabase auth model, path-alias convention (`<npm>`), `stack-reference.md`.

**Fix before release:** env template, admin auth consistency, CI + tests, stub resolution decision, public-release hygiene (submodules, history scrub), Sentry PII.

---

## 4. Architecture Audit

### 4.1 Structural quality

The codebase follows a **modular monolith** pattern: one Next.js app on Vercel + Supabase, with business logic concentrated in `src/lib/` (~120 files) and thin HTTP orchestration in `src/app/api/**` route handlers (78 routes). This is **appropriate for the project's current size** — a microservices or elaborate layered architecture would be over-engineering.

**What works well:**
- Clear separation: pages/routes → `src/lib/` domain modules → external services (Supabase, Nango, model providers).
- `src/lib/open-core/` is a genuine dependency-free island — ideal for extraction.
- Path alias `<npm>/*` → `./src/*` is unusual but consistent and documented.

**Problems:**
- **No enforced module boundaries.** `src/lib/` modules import each other freely; hubs (`nango.ts`, `supabase-ssr.ts`, `security.ts`, `rate-limit.ts`, `ai/model-provider.ts`, `usage/track.ts`) create implicit coupling.
- **Duplicate button/card systems** in dashboard (`ui/button.tsx` vs `dashboard/_components/buttons.tsx`; `ui/card.tsx` vs `dashboard/_components/card.tsx`).
- **Two integration stacks coexist:** legacy `integrations` table (encrypted tokens keyed `client_id`) vs Nango connections (`user_id`-tagged). Dual source of truth.
- **Two schedulers coexist:** Vercel Cron (41 entries) + Trigger.dev schedules; ADR 0009 itself flags this as drift.

### 4.2 Frontend architecture

- Marketing pages are almost entirely Server Components (`page.tsx` files with no `"use client"`).
- Dashboard split: ~10 server `page.tsx` shells + ~8 client pages; widgets are client components fetching `/api/dashboard/*` JSON.
- No global client state (no Redux/Zustand/React Query). Client state is local `useState` + `useEffect` fetch per widget.
- No route-level `loading.tsx`/`error.tsx` boundaries exist anywhere; only `global-error.tsx`.
- Theme is attribute-based (`data-theme`) decided by `src/proxy.ts` cookie header; client sync via localStorage/cookies can flash.
- UI primitives are shadcn-style wrappers over `radix-ui` (unified package) + `sonner` + `lucide`.
- Tailwind v4 CSS-first (`@theme {}` in `globals.css`, no `tailwind.config.js`).
- Dead marketing components and orphaned `src/app/components/*` exist.

### 4.3 Backend & infrastructure

- API routes self-authenticate (proxy only gates `/dashboard/*` and `/admin/*`). New API families must implement their own auth — copy `getCurrentUserId()` → 401 pattern or `CRON_SECRET` bearer.
- Response conventions are ad-hoc (318 `NextResponse.json` calls; error keys vary). No universal envelope.
- Input validation is manual everywhere (no zod in route handlers; zod only in AI tool/compiler schemas).
- Supabase: session-scoped client (RLS) for reads, service-role client (bypasses RLS) for writes/crons; fallback to anon key with warning.
- Rate limiting via Upstash sliding window; fail-closed set vs fail-open default; drift issues confirmed.
- Background jobs split between Vercel Cron routes and Trigger.dev tasks.
- No Docker, no CI/CD, no codegen pipeline. Deployment = push to Vercel + separate Trigger.dev task deploy.

### 4.4 Engineering quality

- **Testing:** Only `src/lib/open-core/evaluate.test.ts` (3 tests). Playwright installed but unused; no config. No component/route/integration/e2e tests.
- **Type checking:** `tsc` runs only as part of `next build --webpack`; no standalone `tsc` script. `skipLibCheck: true`.
- **Linting:** ESLint 9 flat config (`eslint-config-next`); `npm run lint` = bare `eslint`.
- **CI/CD:** Absent (no `.github/`).
- **Docs:** ADRs + stack-reference are excellent; `AGENTS.md`/`CLAUDE.md` are stale.
- **Reproducibility:** `.env.local` not tracked; `.env.example` stale; Supabase project ref hardcoded in `package.json` types script; Sentry DSN hardcoded.

---

## 5. Recommended Architecture

**Keep the existing modular monolith.** Do not introduce microservices, monorepos, or complex abstractions. The specific recommendations:

1. **Extract `src/lib/open-core/` as a standalone package** (or keep it as a clearly bounded folder) — this is the open-source release unit. No changes to its internals needed beyond docs/examples.
2. **Decide the hosted dashboard's fate.** Options: (a) mark pre-alpha and stop feature work, (b) narrow to a single working surface (hire chat + actions queue), or (c) freeze it entirely while open core ships. **Recommendation: (a) for now**, do not invite users.
3. **Unify API auth.** All `/api/*` routes should use one documented pattern (session `getCurrentUserId()` + 401; cron via `CRON_SECRET`; admin via signed cookie). Eliminate the three admin mechanisms.
4. **Consolidate schedulers.** Pick Trigger.dev as the durable scheduler; reduce Vercel Cron to health checks only. Or vice versa — but not both for the same work.
5. **Retire the legacy `integrations` table** once Nango consumers are wired; do not build new features on it.
6. **Add CI + tests.** GitHub Actions workflow running `npm run lint`, `npm run build`, `npm run test:open-core`. Add route-handler tests for the stubs you choose to un-stub.
7. **Fix env template.** Remove dead `COMPOSIO_*`/`JWT_SECRET`/`BACKFILL_SECRET`; add `NANGO_SECRET_KEY`, `GROQ_*`, `STATSIG_*`, `LANGFUSE_*`.

Do **not** introduce: Redux/React Query, microservices, a monorepo, a second backend, n8n, or workflow generators (ADR 0001 explicitly rejects these).

---

## 6. Changes to Make and Changes to Avoid

### Changes to make (with priority)

**P0 — essential for a viable release:**
- Fix `.env.example` to match actual code reads (remove Composio/JWT/backfill; add Nango/GROQ/STATSIG/LANGFUSE).
- Add CI workflow (lint + build + open-core tests).
- Resolve admin auth inconsistency (one mechanism, constant-time compare).
- Address Sentry `sendDefaultPii: true` (decide consciously; document).
- Public-release hygiene: add `.gitmodules` or remove submodule pointers; scrub historical material from git history before making public.

**P1 — important for maintainability/UX:**
- Add tests for at least one un-stubbed dashboard route and the rate limiter.
- Document the "no client data persistence" rule and approval gate in contributor-facing docs.
- Remove or clearly gate `/dev/primitives` (currently public on any non-production deploy).
- Fix rate-limit drift (`kpi-trends`, `mcp`).

**P2 — valuable after core works:**
- Unify response envelope convention across API routes.
- Consolidate duplicate button/card primitives.
- Add route-level `error.tsx`/`loading.tsx` boundaries.

### Changes to AVOID

- **Do not rewrite the hosted SaaS.** The effort is not justified for a portfolio/open-source-first goal.
- **Do not add React Query/Zustand/Redux.** Current local-state pattern is sufficient for widget-scale dashboards.
- **Do not introduce a monorepo or separate packages** beyond possibly open-core extraction.
- **Do not resurrect Composio, n8n, or a second backend** (ADR 0001/0010 settled these).
- **Do not add features to stubbed dashboard surfaces** (finance, sales, marketing, etc.) until you decide the hosted product's scope. Stubs are honest placeholders; filling them without a product decision creates more unfinished surface.
- **Do not change the path alias `<npm>`** — it's consistent and documented; renaming is a large mechanical change with no benefit.
- **Do not "fix" Langfuse 3.x with OTel/v4 patterns** — repo is intentionally on 3.x.
- **Do not simplify `.chat()` away on Groq/DigitalOcean** — they don't support OpenAI's `/responses` API (ADR 0012).

---

## 7. Open-Source Product Evaluation

| Evaluation question | Assessment | Evidence |
|---|---|---|
| Does Opsradr solve a real problem? | **Partially.** The open core answers "where is my agency losing cash/capacity/margin?" — a real, painful problem for service businesses. The hosted SaaS vision is real but unsubstantiated (no users, stubbed surfaces). | `docs/OPEN_SOURCE.md`, `src/lib/open-core/evaluate.ts` |
| Is there a clearly defined user? | **No.** README targets "agencies, consultancies, dev studios, recruiters, accounting practices" — too broad. No ICP, no pricing validated, no user interviews documented. | `README.md` |
| How painful/frequent is the problem? | High for agencies at month-end, but solvable via spreadsheets/accounting software today. Differentiation is weak without evidence. | Inference (no market research in repo) |
| Existing alternatives | Harvest, Toggl Track, Clockify, Float, Teamwork, Mosaic, plus agency-specific ERP. None combine deterministic rules + optional AI explanation in an open core — a plausible niche, but unproven. | External knowledge only (no competitor research in repo) |
| Why choose Opsradr? | Open core is dependency-free, transparent, auditable, AI-optional. Strong for teams that distrust black-box AI. | `docs/OPEN_SOURCE.md` |
| What prevents adoption? | Hosted SaaS stubs, no CI/tests, stale docs, bleeding-edge stack, no clear on-ramp (no CSV importer, no sample data), self-hosting story absent. | Code inspection |
| Realistic for solo developer? | Open core: **yes.** Hosted SaaS: **no** (too much surface, too many external integrations). | Scope analysis |

**Verdict:** The open core is a plausible open-source product. The hosted SaaS is not, in its current state, and probably never should be the portfolio centerpiece.

---

## 8. Target Audience and Problem Definition

### Recommended target (open core)

**User:** Owner/operator of a small client-service business (agency, consultancy, dev studio) who tracks projects, time, and invoices in disparate tools and fears month-end surprises.

**Problem:** They cannot answer "where are we losing cash, capacity, or margin?" before month-end because data is scattered and risk rules are implicit.

**Current solutions:** Spreadsheets, accounting software, manual review — all slow and error-prone.

**Opsradr open core value:** Drop in a JSON/CSV dataset, get four transparent, evidence-backed risk rules (overdue receivables, unbilled work, budget burn, low delivery margin) with explicit thresholds and assumptions they can inspect and override.

**Not for:** Enterprises needing multi-tenant SaaS, real-time sync, or AI automation — that's the stalled hosted product.

---

## 9. Product Positioning and Strategic Alternatives

| Option | Problem clarity | Evidence strength | Usefulness | Differentiation | Solo-dev feasibility | Portfolio value | Community potential | Maintenance burden | Score (1-5) |
|---|---|---|---|---|---|---|---|---|---|
| A. Keep current concept (hosted SaaS + open core) | Low | Low | Low | Low | Low | Medium | Low | High | ~2 |
| B. Narrow to one user/problem (open core for agencies) | Medium | Medium | Medium | Medium | High | High | Medium | Low | ~4 |
| C. Transform into focused library/tool | Medium | Medium | High | Medium | High | High | Medium | Low | ~4 |
| D. Developer tool / integration library | Low | Low | Low | Low | Medium | Medium | Medium | Low | ~3 |
| E. Separate reusable core from app | High | High | High | Medium | High | High | Medium | Low | ~4.5 |
| F. Pause and validate | N/A | N/A | N/A | N/A | High | Low | Low | Low | N/A |
| G. Different project | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

Scores are reasoned, not precise measurements. Option E (separate open core from app) is essentially Option B with cleaner boundaries.

### Recommended: Option E / B — Open core as the product; hosted app as reference material

**Intended user:** Small agency/consultancy owner who wants transparent, auditable operations-risk rules without black-box AI.

**Problem:** Month-end cash/capacity/margin surprise from scattered project/time/invoice data.

**Solution:** Dependency-free TypeScript rules engine (`src/lib/open-core/`) + docs + CSV/sample-data on-ramp. AI is optional and never the sole basis for a finding.

**Main reason to choose it:** Open, inspectable, dependency-free; no vendor lock-in; runs anywhere Node runs.

**Smallest version worth releasing:** `src/lib/open-core/` published as an npm package (or GitHub-published TypeScript) with README, API docs, one worked example, CSV import helper, and tests.

**Deliberately NOT attempt:** Hosted multi-tenant SaaS, OAuth integrations, AI employees, Notion sync, real-time dashboards, billing, team seats.

**Most important assumption to validate:** That agency owners will actually run a rules engine over their own data rather than just using spreadsheets. Cheapest validation: publish open core, collect GitHub stars/issues, and see if anyone files a feature request or contributes a rule.

---

## 10. Recommended Product Direction

**Primary direction:** Release `src/lib/open-core/` as the first public open-source artifact; treat the hosted dashboard as pre-alpha reference material.

| Element | Detail |
|---|---|
| Intended user | Small agency/consultancy owner/operator |
| Specific problem | Unseen cash/capacity/margin risk before month-end |
| Proposed solution | Dependency-free TypeScript rules engine with 4 transparent, evidence-backed rules |
| Main differentiator | Open, auditable, AI-optional, no vendor lock-in |
| Smallest release | `src/lib/open-core/` + README + examples + CSV/sample-data on-ramp + tests |
| Deliberately NOT | Hosted SaaS, integrations, AI employees, billing, multi-tenant |
| Key assumption | Users will self-host/run a rules engine over their data |

**Portfolio angle:** For frontend job applications, the open core demonstrates TypeScript, deterministic logic, testing, and API design. The hosted Next.js dashboard (if you choose to keep developing it) demonstrates modern frontend skills — but only if you finish one surface (hire chat or actions queue) end-to-end rather than leaving stubs.

---

## 11. Minimum Viable Open-Source Product

### Must have before release

| Feature | User problem solved | Difficulty | Dependencies | Verification |
|---|---|---|---|---|
| `src/lib/open-core/` published (npm/GitHub) | Core risk evaluation | Small | None (already exists) | `npm run test:open-core` passes |
| README explaining what it does and who it's for | Discoverability | Small | None | New user can run example in <5 min |
| Worked example + sample dataset | "How do I use this?" | Small | None | Example runs end-to-end |
| Clear contribution guidelines | Contributor onboarding | Small | None | CONTRIBUTING.md exists |
| License (Apache-2.0 already in repo) | Legal clarity | Small | None | LICENSE present |
| CI running tests | Trust in correctness | Small | GitHub Actions | Workflow passes on push |

### Should have soon after release

| Feature | User problem solved | Difficulty | Dependencies | Verification |
|---|---|---|---|---|
| CSV/JSON import helper | Getting real data in without manual JSON | Medium | None | Import parses real export |
| Vertical rule packs (e.g., agency-specific thresholds) | Different business types need different defaults | Medium | Open core | New rules evaluate correctly |
| Self-hosting / standalone run docs | Users don't want Vercel/Supabase | Medium | None | `node` script runs open core |
| Changelog / versioning | Trust and upgrade path | Small | None | Releases tagged |

### Could have later

| Feature | Why later | Difficulty |
|---|---|---|
| AI explanation layer (optional) | Core must be solid first | Medium |
| Hosted dashboard demo | Requires resolving stubs | Large |
| Notion/Brain sync | Hosted-app concern | Large |
| Multi-team/org support | Not needed for open core | Medium |

### Should not build yet

- Any hosted SaaS feature (integrations, AI employees, billing, team seats) — no validated demand, stubbed reality.
- More dashboard routes beyond the open core scope.
- Mobile apps, desktop apps, CLI beyond a simple runner.

---

## 12. Public Repository and Contribution Readiness

### Necessary before first public release

| Item | Status | Action |
|---|---|---|
| README (what/ who/ why/ how to run) | Partial (marketing-focused) | Rewrite for open core |
| Installation instructions | Absent for open core | Add |
| Quick-start guide | Absent | Add |
| Architecture docs | Partial (PROJECT_ARCHITECTURE.md) | Keep, simplify |
| Environment setup | Stale `.env.example` | Fix (see §6) |
| Contribution guidelines | Partial (`CONTRIBUTING.md` exists, marketing-focused) | Rewrite for open core |
| License | Present (Apache-2.0) | Keep |
| Code of conduct | Present (`CODE_OF_CONDUCT.md`) | Keep |
| Issue templates | Absent | Add |
| Pull request templates | Absent | Add |
| Automated checks (lint/build/test) | Absent (no CI) | Add GitHub Actions |
| Tests | Only open core | Keep; add for any new code |
| Security reporting | Partial (`SECURITY.md` exists) | Keep |
| Versioning / changelog | Absent | Add |
| Roadmap | Absent | Add (this document) |
| Good first issues | Absent | Create after release |
| Documented dev workflow | Partial (`CONTRIBUTING.md`) | Expand |

### What the repository currently communicates

- What it does: mixed message (SaaS marketing + open-core extraction)
- Who it's for: undefined (too broad)
- Why it exists: partially clear via OPEN_SOURCE.md
- How to run it: `npm install; cp .env.example .env.local; npm run dev` — but `.env.example` is stale (broken)
- What's implemented today: misleading (marketing promises full SaaS; reality is stubs)
- What's planned: ADRs describe pre-pivot plans; open-core roadmap in OPEN_SOURCE.md

### License note

Apache-2.0 is already present — a solid, business-friendly choice. Do not change without understanding that dependencies (Supabase, Nango, OpenAI, etc.) carry their own terms; Apache-2.0 is compatible with most. No legal recommendation made here beyond "keep Apache-2.0 unless you have a reason to change."

---

## 13. Security and Release Readiness

### Findings by severity

**Critical (must fix before public release):**
1. Stale `.env.example` (dead Composio vars; missing Nango/GROQ/STATSIG/LANGFUSE) — fresh deploy will fail. **Fix: align template with actual `process.env` reads.**
2. No CI / no tests beyond open core — no safety net for contributors. **Fix: add GitHub Actions.**
3. Admin auth inconsistency (3 mechanisms; non-constant-time `!==` comparisons). **Fix: one mechanism, `timingSafeEqual`.**

**High:**
4. Sentry `sendDefaultPii: true` + 100% trace sampling on all runtimes — customer data may flow to Sentry, contradicting "no client data persistence" positioning. **Fix: consciously disable PII or document the tradeoff.**
5. Service-role client silently falls back to anon key when `SUPABASE_SERVICE_ROLE_KEY` missing — silent RLS bypass. **Fix: fail hard in production.**
6. Repo hygiene: submodule pointers without `.gitmodules`; historical material in git history. **Fix per OPEN_SOURCE.md public-release gate.**

**Medium:**
7. Rate-limit drift (`kpi-trends` effectively unlimited; `mcp` no limiter). **Fix: register limiters.**
8. Raw `error.message` leakage in some routes (webhooks, FO). **Fix: coarse error codes.**
9. `/dev/primitives` public on non-production deploys. **Fix: add auth or remove.**
10. CSP `script-src` includes `unsafe-inline` in production; no HSTS. **Fix: consider tightening.**

**Low:**
11. Dead code/orphaned components — cleanup, not blocking.
12. Pricing/copy inconsistency — fix copy.

### Limits of this review

- Static analysis only; no runtime penetration testing, no dependency vulnerability scan (`npm audit` not run), no live environment inspection.
- Supabase project settings (RLS enforcement, JWT algorithm) are dashboard-managed, not in-repo.
- Cannot verify production env var values or deployed `vercel.json`.

### Release gate

Do **not** invite real users to depend on the hosted SaaS. The open core can be released publicly once P0 security/hygiene items are fixed and CI is green. The hosted dashboard remains pre-alpha reference material.

---

## 14. Prioritized Technical Recommendations

| Priority | Recommendation | Files/modules | Rationale | Release-blocking? |
|---|---|---|---|---|
| P0 | Align `.env.example` with actual `process.env` reads | `.env.example`, `src/lib/nango.ts`, `src/lib/ai/model-provider.ts`, `src/lib/flags/index.ts`, `src/lib/observability/langfuse.ts` | Fresh deploy currently breaks | Yes |
| P0 | Add CI: lint + build + open-core tests | `.github/workflows/ci.yml` | No safety net today | Yes |
| P0 | Unify admin auth to one mechanism | `src/lib/admin-session.ts`, `src/lib/security-server.ts`, `src/app/api/admin-*` | 3 mechanisms + non-constant-time compare | Yes |
| P0 | Public-release hygiene: `.gitmodules` + history scrub | Root, `superpowers/`, `andrej-karpathy-skills/`, `design-libraries/` | Blocks public gate per OPEN_SOURCE.md | Yes |
| P1 | Fix Sentry PII setting (disable or document) | `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts` | Privacy contradiction | Yes (if releasing open core with telemetry) |
| P1 | Fail hard when service-role key missing | `src/lib/supabase-server.ts` | Silent RLS bypass | Yes |
| P1 | Register missing rate limiters; fix `kpi-trends`/`mcp` | `src/lib/rate-limit.ts`, `src/app/api/dashboard/kpi-trends/route.ts`, `src/app/api/mcp/route.ts` | Abuse/cost exposure | No |
| P1 | Add tests for one un-stubbed route + rate limiter | `src/app/api/` tests | Current test coverage is 1 file | No |
| P2 | Unified API response envelope | `src/app/api/*` | Ad-hoc conventions today | No |
| P2 | Consolidate duplicate button/card primitives | `src/components/ui/button.tsx`, `src/app/dashboard/_components/buttons.tsx` | Duplication | No |
| P3 | Remove/gate `/dev/primitives` | `src/app/dev/primitives/page.tsx` | Public on preview deploys | No |
| P3 | Fix pricing/copy consistency | `src/app/page.tsx`, `src/app/pricing/page.tsx` | Trust/conversion | No |

**Do not change:** path alias `<npm>`, Langfuse 3.x pin, `.chat()` on Groq/DO, `skipLibCheck`, open-core internals (beyond docs).

---

## 15. Implementation Roadmap

### Phase 0 — Understand and validate (Weeks 0–1)
- Read `PROJECT_ARCHITECTURE.md` and `src/lib/open-core/` end-to-end. Run `npm run test:open-core`.
- Confirm open-core rules are correct for your target user (conceptually; no real data needed yet).
- **Acceptance:** You can explain the four rules and run the test suite locally.
- **Difficulty:** Small. **You should understand:** deterministic rule evaluation, policy overrides, `skippedRecords`.

### Phase 1 — Release-blocking problems (Weeks 1–3)
1. Fix `.env.example` (remove dead vars, add real ones). *(Small)*
2. Add GitHub Actions CI (lint, build, open-core tests). *(Small)*
3. Unify admin auth mechanism. *(Medium)*
4. Fix Sentry PII + service-role fallback. *(Medium)*
5. Public-release hygiene (`.gitmodules`, history scrub decision). *(Medium)*
- **Milestone M1:** `git push` to a public repo with green CI, working `.env.example`, and no obvious security hygiene issues.

### Phase 2 — Improve architecture where justified (Weeks 3–5)
6. Extract/publish `src/lib/open-core/` as standalone (npm or GitHub package). *(Small)*
7. Add worked example + sample dataset + CSV import helper. *(Medium)*
8. Write open-core README + API docs + contribution guidelines. *(Small)*
- **Milestone M2:** First public open-core release; a stranger can install and run it.

### Phase 3 — Complete the core user experience (Weeks 5–8)
9. Decide hosted dashboard fate (mark pre-alpha / freeze / narrow to one surface). *(Decision, Small)*
10. If keeping dashboard: un-stub ONE surface end-to-end (e.g., hire chat → custom employee install → run). *(Large)*
11. Add route-level `error.tsx`/`loading.tsx` boundaries. *(Medium)*
12. Fix rate-limit drift + register limiters. *(Medium)*
- **Milestone M3:** Either a frozen pre-alpha dashboard or one complete working surface.

### Phase 4 — Prepare the public repository (Weeks 8–9)
13. Issue templates, PR templates, good first issues, roadmap doc. *(Small)*
14. Changelog + versioning. *(Small)*
15. Final security review (raw error messages, CSP, `/dev/primitives`). *(Medium)*
- **Milestone M4:** Repository looks like a serious open-source project.

### Phase 5 — Release and collect feedback (Week 10+)
16. Announce open-core release; monitor GitHub issues/stars/contributions. *(Ongoing)*
17. Validate key assumption: do users file feature requests / contribute rules? *(Ongoing)*
- **Milestone M5:** Real signal (or silence) on whether the product has traction.

### Phase 6 — Iterate based on real usage (Ongoing)
- Prioritize features only after validated demand. Do not build ahead of evidence.

**Critical path:** Phase 0 → Phase 1 (P0 items) → Phase 2 (open-core release) → Phase 5 (feedback).
**Can safely wait:** All hosted-dashboard feature work, AI explanation layer, Notion sync, billing, multi-tenant org support.

---

## 16. Learning Plan for the Developer

For each high-priority change, here is what to understand first and how to verify independently.

| Change | Concept to understand | Why current state is problematic | Trade-offs | Verification |
|---|---|---|---|---|
| Fix `.env.example` | How `process.env` is consumed across `src/`; which vars are actually read | Template lists dead Composio vars and misses Nango; fresh deploy breaks | Removing docs vs. keeping misleading docs | `grep process.env` inventory matches template |
| Add CI | GitHub Actions workflow syntax; Next.js build caching | No CI exists today | CI minutes cost vs. safety | Workflow passes on push |
| Unify admin auth | Constant-time comparison (`timingSafeEqual`); session vs. bearer vs. header auth | 3 mechanisms; non-constant-time `!==` | Slight UX change for admin flows | All admin routes use one verified path |
| Fix Sentry PII | What `sendDefaultPii` sends; privacy vs. debuggability | Contradicts "no client data persistence" rule | Less debug info vs. privacy commitment | Config audited; PII off or documented |
| Service-role fallback | RLS bypass implications; fail-hard vs. fail-soft | Silent degradation masks misconfiguration | More errors surfaced vs. hidden data exposure | Missing key → hard failure in prod |
| Publish open core | npm packaging / GitHub releases; TypeScript declaration files | Currently folder-in-repo, not consumable | Package maintenance vs. copy-paste usage | `npm install` works in a clean test project |

**Portfolio-worthy engineering judgment** to demonstrate:
- Knowing **not** to rewrite the hosted SaaS (scope discipline).
- Choosing **open core** as the release unit (bounded, valuable, testable).
- Fixing **security hygiene** before features (maturity).
- Writing **honest docs** that admit stubs rather than marketing over promises (credibility).

---

## 17. Risks, Assumptions, and Unanswered Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Open core gets no adoption | Medium | Low (it's code you own) | Validate via GitHub issues; don't over-invest before signal |
| Hosted dashboard remains a confusing "dead" surface in the repo | High | Medium | Explicitly mark pre-alpha; link to open core as the product |
| Bleeding-edge stack hard to debug (AI training data stale) | Medium | Medium | Rely on `docs/dev/stack-reference.md`; avoid copy-pasting from generic tutorials |
| Sentry PII creates privacy liability | Low | Medium | Disable PII or document consciously before release |
| Submodule/history issues block public release | High | High (stated gate) | Address in Phase 1 |

### Key assumptions (unverified)

1. **Agency owners will run a self-serve rules engine over their data.** Cheapest test: publish open core, watch for issues/feature requests/contributions.
2. **The hosted SaaS vision is not worth completing.** Based on stub count and lack of users; revisit only if open core gains traction and you want to rebuild intentionally.
3. **Apache-2.0 is the right license.** Already in place; reasonable default but not legally audited here.

### Unanswered questions (would change recommendations if answered)

- Does the live production deployment match this tree (env vars, `vercel.json` schedules, Nango keys)? **Would change:** confidence in hosted-product viability.
- What is the live Supabase schema/RLS state vs. migrations? **Would change:** trust in database layer.
- Which of the 34 scheduled agents should be rebuilt vs. retired? **Would change:** Phase 3 scope.
- Is Stripe billing planned or abandoned? **Would change:** monetization story.
- What is "diorization" product intent (name/positioning not documented)? **Would change:** whether to keep or remove that subsystem.

---

## 18. Immediate Next Steps

**This week (do these in order, do not skip):**

1. **Read** `src/lib/open-core/evaluate.ts`, `types.ts`, `index.ts`, and `evaluate.test.ts` (≈150 lines total). Run `npm run test:open-core` and confirm green. This is your release unit.
2. **Create** `OPSRADR_OPEN_SOURCE_STRATEGY.md` (this document) in the repo root — already done.
3. **Fix `.env.example`** to match actual `process.env` reads (remove 28 `COMPOSIO_*` vars + `JWT_SECRET` + `BACKFILL_SECRET`; add `NANGO_SECRET_KEY`, `GROQ_API_KEY`, `STATSIG_SERVER_SECRET`, `NEXT_PUBLIC_STATSIG_CLIENT_KEY`, `LANGFUSE_*`). Verify with `grep -rhoE "process\.env\.[A-Z_]+" src | sort -u`.
4. **Add CI:** a GitHub Actions workflow running `npm run lint`, `npm run build`, `npm run test:open-core`.
5. **Decide** whether to make the repo public with open core only, or keep private while you finish Phase 1. Recommendation: public open core, pre-alpha dashboard.

**Do not** touch hosted-dashboard features, add new integrations, resurrect Composio/n8n, or introduce new dependencies until M1 is complete.

---

**Bottom line:** OpsRadr's open core is its only release-ready, valuable asset today. Release that first, honestly, with CI and fixed configuration. Treat the hosted dashboard as a separate, unfinished concern — do not market it as a product until the stubs are resolved or intentionally retired.
