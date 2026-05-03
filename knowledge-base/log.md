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

---

## 2026-05-01 — Wiki Expansion Batch 2 Completed

**Goal**: Finish the 74 remaining pages from the 88-page expansion plan after the previous batch was blocked by usage limits.

**Outcome**: Added 74 new pages across API deep dives, production failure patterns, workflow templates, approval/safety rules, AI integration, agency business operations, and n8n production depth. Updated `index.md` to remove the expansion-in-progress banner and link every new page. No intentional deviations from the handoff brief.

### Pages added (74)

- `tools/api-meta-marketing.md` — Meta Marketing API powers Facebook and Instagram advertising automation, lead ads retrieval, insights reporting, and Conversions API integrations
- `tools/api-google-ads.md` — Google Ads API integrates campaign reporting, conversion uploads, asset management, and account hierarchy operations
- `tools/api-ga4.md` — GA4 reporting splits between the Data API for operational reports and BigQuery export for raw event analysis
- `tools/api-hubspot.md` — HubSpot API spans CRM records, associations, marketing assets, service objects, timeline events, and webhooks
- `tools/api-klaviyo.md` — Klaviyo API handles profiles, events, lists, segments, metrics, flows, and ecommerce marketing data
- `tools/api-shopify.md` — Shopify Admin API now strongly favors GraphQL for new apps while REST remains legacy
- `tools/api-stripe.md` — Stripe API covers payments, subscriptions, refunds, disputes, invoices, and Connect platform flows
- `tools/api-mailchimp.md` — Mailchimp Marketing API manages audiences, members, tags, segments, campaigns, ecommerce stores, and batch jobs
- `tools/api-notion.md` — Notion API is useful for lightweight portals, task databases, report pages, and knowledge-base storage
- `tools/api-airtable.md` — Airtable API is a practical operational datastore for agencies, but it behaves like a collaborative spreadsheet with API constraints rather than a relational database
- `tools/api-slack-deep.md` — Slack API can be a notification channel, approval surface, workflow trigger, and lightweight internal app platform
- `failures/timezone-handling.md` — UTC vs local vs platform-local time breaks reports, schedules, and filters when systems interpret the same date differently
- `failures/currency-conversion.md` — Multi-region money data fails when workflows mix micros, cents, zero-decimal currencies, stale FX rates, and display formatting
- `failures/date-format-mismatches.md` — Systems alternate between ISO 8601, Unix seconds, Unix milliseconds, GA4-style dates, and ambiguous local formats
- `failures/pagination-failures.md` — Pagination breaks at scale through offset drift, cursor expiry, missing next tokens, and workflows that retry from the wrong boundary
- `failures/n8n-memory-limits.md` — Large JSON arrays, binary files, AI prompts, and manual executions can exceed n8n instance memory before a workflow reaches its apparent API limit
- `failures/workflow-execution-timeouts.md` — Long API backfills, LLM calls, file processing, and slow databases can outlive workflow or node-level timeouts
- `failures/concurrent-execution-race-conditions.md` — Simultaneous webhooks and overlapping schedules create duplicate records, double sends, and last-write-wins data loss
- `failures/database-connection-pool.md` — n8n workers, Code nodes, long transactions, and external BI tools can exhaust database connection budgets
- `failures/email-deliverability.md` — SPF, DKIM, DMARC, sender reputation, bounce handling, and client-domain misconfiguration decide whether automations reach inboxes
- `failures/file-handling-failures.md` — Binary handling fails through memory buffering, MIME mismatches, multipart bodies, file-size caps, and temporary URL expiry
- `failures/oauth-refresh-failures.md` — Refresh token rotation, revoked consent, app test mode, SSO changes, and concurrent refreshes can silently break live workflows
- `patterns/workflow-reporting-full-service.md` — Paid, SEO, social, email, CRM, and PM data become one executive report with outage-aware partial reporting
- `patterns/workflow-lead-routing-budget.md` — Inbound leads are routed by declared or inferred budget tier, with deduplication and SLA alerts
- `patterns/workflow-lead-routing-source.md` — UTM and referrer data route leads to the correct owner and sequence while preserving attribution
- `patterns/workflow-lead-routing-service.md` — Service interest from forms or AI classification routes prospects to specialists and proposal templates
- `patterns/workflow-onboarding-paid-media.md` — Contract signature launches project setup, access requests, kickoff scheduling, Slack channel, and first follow-up
- `patterns/workflow-onboarding-seo.md` — SEO onboarding creates audit tasks, GA4/GSC access requests, keyword brief, reporting sheet, and AM review gate
- `patterns/workflow-content-distribution.md` — Published content is adapted to social, newsletter, and tracking formats with approval before scheduling
- `patterns/workflow-proposal-generation.md` — Deal data, case studies, and templates generate a proposal draft, PDF, tracking, and follow-up sequence
- `patterns/workflow-meeting-followup.md` — Meeting notes and transcripts become action items, CRM updates, and approved client follow-up emails
- `patterns/workflow-slack-digest.md` — A scheduled digest combines approvals, overdue tasks, anomalies, new leads, reports due, and on-call info
- `patterns/workflow-client-health-score.md` — NPS, response time, performance, billing, activity, tickets, and renewal proximity become a weekly health score
- `patterns/workflow-churn-detection.md` — Risk signals are scored into intervention levels with AM tasks, director escalation, and win-back context
- `patterns/workflow-upsell-detection.md` — Positive performance and growth signals create timed upsell tasks without surfacing offers during unresolved issues
- `patterns/workflow-capacity-planning.md` — Projects, PTO, pipeline, role estimates, and velocity become a capacity dashboard and feasibility check
- `patterns/workflow-project-status.md` — Task progress, billable hours, milestones, blockers, and budget variance become a reviewed weekly status narrative
- `patterns/workflow-time-tracking.md` — Time entries are mapped to clients/projects, compared with estimates, and routed into utilization and profitability reports
- `patterns/approval-human-decision-framework.md` — Decide when automation must pause for a person using irreversibility, blast radius, confidence, and client visibility
- `patterns/approval-auto-fix-safe.md` — Define when automated correction is acceptable and when the workflow must escalate instead
- `patterns/approval-client-facing-actions.md` — Require review for emails, reports, invoices, ad changes, meeting updates, and portal posts that clients can see
- `patterns/approval-money-touching.md` — Protect charges, refunds, invoices, ad budgets, and performance-fee calculations with thresholds and dual approval
- `patterns/approval-data-deletion.md` — Separate soft delete, unsubscribe, merge, and hard delete paths with backup and escalation rules
- `patterns/approval-bulk-actions.md` — Control high-volume updates with dry runs, progress reporting, abort thresholds, and rollback assessment
- `patterns/approval-anomaly-detection.md` — Define alert thresholds for volume spikes, metric drops, schema changes, and auth failure rates
- `patterns/approval-ai-confidence-scoring.md` — Use confidence, calibration, and validation to route AI outputs between automation and human review
- `patterns/approval-multi-stage.md` — Model sequential and parallel approvals for large budgets, sensitive data, and executive signoff
- `patterns/approval-audit-logging.md` — Capture actor, action, timestamp, before/after state, source IP, and outcome for every important automation decision
- `patterns/ai-prompt-engineering-n8n.md` — Prompts in n8n need versioning, variable hygiene, structured instructions, and test fixtures
- `patterns/ai-structured-output.md` — Structured outputs make AI usable in automation by enforcing JSON schemas, enums, and required fields
- `patterns/ai-cost-optimization.md` — AI cost control comes from model tiering, prompt compression, caching, batching, and per-client attribution
- `patterns/ai-failure-handling.md` — AI nodes fail through rate limits, malformed JSON, timeouts, empty responses, hallucinations, and context overflow
- `patterns/ai-hallucination-prevention.md` — Automation must prevent models from inventing numbers, contacts, dates, or decisions
- `patterns/ai-confidence-scoring.md` — Confidence scores must be calibrated against real outcomes before they control workflow routing
- `patterns/ai-when-not-to-use.md` — Many workflow steps are cheaper, faster, and safer as deterministic code or API queries
- `patterns/ai-rag-vs-finetune.md` — Choose prompt engineering, RAG, or fine-tuning based on knowledge freshness, format consistency, and request volume
- `patterns/ai-vector-search.md` — Vector search supports semantic retrieval, deduplication, similar-client matching, and FAQ routing when thresholds are calibrated
- `agency-profiles/client-tier-patterns.md` — Client tiers define SLA, automation level, approval depth, reporting cadence, and escalation path
- `agency-profiles/retainer-vs-project.md` — Retainers reward recurring automation, while projects need milestone controls and clean closure
- `agency-profiles/white-label-reporting.md` — White-label work hides the delivery agency behind another brand and raises branding, access, and data-isolation stakes
- `agency-profiles/multi-brand-complexity.md` — Multi-brand accounts need isolated reporting, permissions, workflows, and billing namespaces
- `agency-profiles/agency-of-agencies.md` — Holding-company and specialist-collective models require cross-agency handoffs, shared reporting, and clear ownership
- `agency-profiles/performance-pricing-ops.md` — Performance pricing needs attribution evidence, reconciliation, dispute handling, and finance approval
- `agency-profiles/cash-flow-patterns.md` — Cash timing drives ops priorities: dunning, hiring, automation investment, and renewal-risk management
- `agency-profiles/partnership-referral-ops.md` — Referral, white-label, channel, and strategic partnerships need attribution, commission, and portal workflows
- `tools/n8n-version-migration.md` — n8n upgrades require staging, workflow export, credential validation, node typeVersion checks, and rollback plans
- `tools/n8n-credential-management.md` — Credential security depends on encryption keys, sharing rules, rotation, service accounts, and external secret storage
- `tools/n8n-queue-mode.md` — Queue mode separates main, worker, Redis, and database responsibilities for scalable production execution
- `tools/n8n-monitoring.md` — Production n8n monitoring combines execution logs, metrics, health checks, queue depth, memory, and workflow-level alerts
- `tools/n8n-backup-recovery.md` — Recoverability depends on workflow exports, database backups, encryption keys, environment variables, and credential rotation procedures
- `tools/n8n-testing-strategies.md` — n8n testing uses pinned data, staging workflows, schema validation, canaries, and regression checklists
- `tools/n8n-performance.md` — Performance is controlled by node count, item volume, batching, binary handling, expressions, and external API behavior
- `tools/n8n-security-hardening.md` — Hardening covers webhooks, credentials, risky nodes, network isolation, auth, CORS, audit, and instance updates
- `tools/n8n-cost-management.md` — n8n cost control requires execution accounting, workflow design, self-hosted TCO, AI cost attribution, and pruning
