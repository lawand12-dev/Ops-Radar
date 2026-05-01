# Knowledge Base Change Log

---

## 2026-05-01 — Wiki Expansion Batch 1 (BLOCKED by usage limit) + Indexing Pass

**Goal**: Add ~88 new wiki pages across 7 sections (API deep-dives, production failures, workflow templates, approval/safety, AI integration, agency business operations, n8n production depth).

**Method**: Dispatched 7 parallel research agents, each scoped to one section cluster, with WebSearch/WebFetch instructions for current API docs, error codes, rate limits, and community-reported gotchas.

**Outcome**: **0 new pages produced today.** All background agents were killed by the org monthly usage limit before writing any files. Original prompts are preserved in conversation history and can be redispatched after the limit resets.

### What this commit actually contains

An **indexing pass**, not a content pass. The 14 pages listed below were written yesterday in commit `52501a3 (2026-04-30 21:28) feat: expand markdown knowledge base` but were never linked from `index.md`, so the RAG system was not surfacing them. This commit adds those entries to `index.md` and records a clear status of the 88-page plan.

### Pages indexed (14 — written previously, indexed today)

**Tools — API behaviour deep dives** (5 of 15):
- `tools/api-google-workspace.md` — Sheets/Drive/Gmail: service account, batch requests, Drive resumable upload, Gmail 250 quota units/sec
- `tools/api-microsoft-graph.md` — App registration, delegated vs application perms, per-service throttling, delta queries, 4230-min webhook renewal
- `tools/api-linkedin-marketing.md` — Marketing Developer Platform partner tiers, OAuth, Campaign Manager API, Lead Gen Forms
- `tools/api-tiktok-marketing.md` — Marketing API approval tiers (basic 10 QPS / standard 20 QPS), async reporting, Events API server-side tracking

**Tools — n8n Production Depth** (1 of 10):
- `tools/n8n-cloud-vs-self-hosted.md` — Decision framework: pricing tiers, execution limits, TCO, when each model wins

**Failures — Production failure patterns** (4 of 15):
- `failures/token-expiration-patterns.md` — Token lifetimes by platform, refresh rotation races, service account alternatives
- `failures/rate-limit-recovery.md` — Exponential backoff with jitter, leaky/fixed/sliding window detection, platform-specific recovery
- `failures/webhook-reliability.md` — Delivery guarantees by platform, silent failures, dedup requirement, signature verification
- `failures/data-sync-drift.md` — How drift happens, detection (checksum/count), reconciliation patterns

**Patterns — Workflow templates** (4 of 20):
- `patterns/workflow-reporting-paid-media.md` — Multi-platform paid media reporting workflow
- `patterns/workflow-reporting-seo.md` — SEO reporting workflow (GSC + GA4 + rank tracker)
- `patterns/workflow-invoicing-retainer.md` — Recurring retainer invoicing
- `patterns/workflow-invoicing-performance.md` — Performance-based invoicing with two-stage approval

**Patterns — AI integration** (1 of 10):
- `patterns/ai-model-selection.md` — Claude vs GPT-4 vs smaller models decision framework

### Pages remaining (74)

| Section | Total | Done | Remaining | Folder |
|---|---|---|---|---|
| 1. Tool API Behaviour Deep Dives | 15 | 4 | 11 (Meta, Google Ads, GA4, HubSpot, Klaviyo, Slack-deep, Shopify, Stripe, Mailchimp, Notion, Airtable) | `tools/` |
| 2. Production Failure Patterns | 15 | 4 | 11 (timezone, currency, date-format, pagination, n8n-memory, exec-timeouts, race-conditions, db-pool, email-deliverability, file-handling, oauth-refresh) | `failures/` |
| 3. Agency Workflow Templates | 20 | 4 | 16 (full-service reporting, 3× lead-routing, 2× onboarding, content-distribution, proposal-gen, meeting-followup, slack-digest, client-health, churn, upsell, capacity, project-status, time-tracking) | `patterns/` |
| 4. Approval & Safety Rules | 10 | 0 | 10 (all) | `patterns/` |
| 5. AI Integration Deep Dives | 10 | 1 | 9 (prompt-eng, structured-output, cost-opt, failure-handling, hallucination, confidence-scoring, when-not-to-use, RAG-vs-finetune, vector-search) | `patterns/` |
| 6. Agency Business Operations | 8 | 0 | 8 (all) | `agency-profiles/` |
| 7. n8n Production Depth | 10 | 1 | 9 (version-migration, credential-mgmt, queue-mode, monitoring, backup-recovery, testing, performance, security-hardening, cost-mgmt) | `tools/` |
| **Total** | **88** | **14** | **74** | |

### Next steps when usage limit resets

1. Re-dispatch the 6 interrupted agents (or split into more agents per section to reduce per-agent load).
2. Original prompts are preserved in conversation history; can be reused verbatim minus the pages already done.
3. After all batches land, replace this entry's "(partial — interrupted)" header with a completion entry, and drop the "expansion in progress" banner from `index.md`.

---

## 2026-04-30 — n8n Knowledge Ingestion

**Source repos**: `opsradar/n8n-mcp-main` (n8n-mcp v2.14.2) and `opsradar/n8n-skills-main` (7-skill suite)

**Pages created**:
- `tools/n8n-nodes.md` — Node reference: 1,396 nodes, naming conventions, top 20, expression syntax, code node patterns, AI connection types, auto-sanitization
- `tools/n8n-api.md` — MCP server tool reference: discovery, validation, workflow management, templates, credentials, security audit, data tables
- `patterns/n8n-workflow-patterns.md` — 5 core architectural patterns with node chains, real examples, data flow diagrams, creation checklist, statistics from 2,709 templates
- `failures/n8n-common-failures.md` — 5 failure categories: expression errors, node configuration, validation loops, runtime/API, workflow structure — each with root cause, prevention, fix
- `patterns/n8n-best-practices.md` — 9 practice areas: build discipline, node config, validation, expressions, code nodes, workflow structure, security, lifecycle, MCP efficiency

**Pages updated**:
- `index.md` — Added 5 new pages to Tools, Patterns, Failures sections

**Coverage from source**:
- All 7 n8n-skills SKILL.md files fully read and synthesised
- n8n-mcp README (full MCP tool reference including 20 management tools)
- n8n-mcp CLAUDE.md (architecture, validation profiles, diff operations)
- n8n-skills CLAUDE.md (MCP tool usage patterns with telemetry data)

---

## 2026-04-30 — n8n Node Pages from n8n-io/n8n GitHub

**Source**: `https://github.com/n8n-io/n8n` — `packages/nodes-base/nodes/` and `packages/nodes-base/credentials/`

**Pages created** (15 node-specific pages):

Core nodes (source-verified):
- `tools/n8n-node-webhook.md` — Webhook v2.1: HTTP trigger, 4 methods, 2 response modes, 3 inbound auth modes, `.body` nesting rule
- `tools/n8n-node-httprequest.md` — HTTP Request v4.4: 8 auth types, 5 body content types, pagination, full response mode, 50+ predefined credential types
- `tools/n8n-node-code.md` — Code v2: JS and Python, runOnceForAll vs runOnceForEachItem, `[{json:{}}]` return format, webhook `.body` gotcha
- `tools/n8n-node-if.md` — If v2.3: binary routing to true/false outputs, typed condition operators (string, number, boolean, dateTime, array, object)
- `tools/n8n-node-switch.md` — Switch v3.4: N-output routing, rules mode vs expression mode, fallthrough output, first-match-wins evaluation
- `tools/n8n-node-merge.md` — Merge v3.2: Append, Combine By Fields (join), Multiplex, By Position, Keep Key Matches, Remove Key Matches
- `tools/n8n-node-set.md` — Set v3.4: add/rename/strip fields, manual UI mode, jsonOutput expression mode, includeOtherFields strip behaviour

Service nodes (source-verified from GitHub TypeScript + credential files):
- `tools/n8n-node-google-ads.md` — `googleAds` type, `googleAdsOAuth2Api` credential, `adwords` scope, Campaign resource, micros conversion (÷1,000,000), API v20
- `tools/n8n-node-google-analytics.md` — `googleAnalytics` v2, `googleAnalyticsOAuth2Api` credential, GA4 only, Report and User Activity resources
- `tools/n8n-node-facebook.md` — `facebookGraphApi` type, Access Token auth, direct Graph API proxy, v16–v23, key params: node/edge/fields/graphApiVersion
- `tools/n8n-node-hubspot.md` — `hubspot` v2.2, Private App token (API key deprecated Nov 2022), Resources: Company/Contact/Contact List/Deal/Engagement/Form/Ticket
- `tools/n8n-node-klaviyo.md` — NOT in n8n-io/n8n main repo; community node or HTTP Request; Klaviyo REST API v2024, `revision: 2024-10-15` header required
- `tools/n8n-node-slack.md` — `slack` v2.4, Bot Token (`xoxb-`) or OAuth2, Resources: Channel/File/Message/Reaction/Star/User/User Group; Tier 1–4 rate limits
- `tools/n8n-node-gmail.md` — `gmail` v2.2, OAuth2 or Service Account, Resources: Message/Label/Draft/Thread; Send and Wait for Response operation
- `tools/n8n-node-notion.md` — `notion` v2.2, Internal Integration Token (`secret_`), Resources: Block/Database/Database Page/Page/User; integration must be shared per DB

**Pages updated**:
- `index.md` — Added 15 new node page entries to the Tools section
