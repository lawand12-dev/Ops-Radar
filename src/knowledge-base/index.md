# OpsRadar Knowledge Base Index

This index links to all research notes used by the audit engine RAG system.
Notes are organized by category and injected into audit prompts via semantic search.

---

## Benchmarks

Industry data, hourly rates, revenue benchmarks, and operational statistics.

- [[research-01-agency-operations-benchmarks-for-marketing-recruiting-and-design-agencies]]
- [[research-04-agency-role-internal-hourly-cost-benchmarks-by-market]]
- [[research-05-hours-wasted-on-manual-work-by-operational-function-and-agency-size]]
- [[research-06-cognitive-cost-of-context-switching-in-knowledge-work]]
- [[research-08-revenue-per-employee-benchmarks-for-agencies]]
- [[research-21-marketing-agency-operational-trends-2025-2026]]
- [[research-22-recruiting-agency-operational-trends-2025-2026]]
- [[research-23-design-and-creative-agency-operational-trends-2025-2026]]
- [[research-24-saas-focused-marketing-agencies-vs-traditional-marketing-agencies]]
- [[research-25-agency-m-a-valuation-drivers-and-operational-metrics]]
- [[research-29-agency-tool-stack-evolution-by-revenue-level]]

---

## Tools

Tool comparisons, platform pricing, n8n ecosystem, build vs buy analysis.

- [[research-11-n8n-vs-zapier-vs-make-vs-pipedream-pricing-comparison-at-scale]]
- [[research-13-build-vs-buy-vs-rent-framework-for-agency-operational-systems]]
- [[research-17-where-llms-add-real-value-vs-where-they-re-overhyped-in-automation]]
- [[research-19-n8n-ecosystem-evolution-2023-to-2025-2026]]
- [[research-20-n8n-self-hosting-vs-cloud-trade-offs-for-agencies]]
- [[research-27-agency-tech-stack-signals-for-automation-readiness]]
- [[research-30-agency-website-red-flags-indicating-operational-chaos]]
- [[research-42-agency-tech-stack-integration-map]]
- [[n8n-nodes]] — Node reference: 1,396 nodes, naming, top 20, expressions, code patterns
- [[n8n-api]] — MCP API tools: search, validate, create, update, templates, audit
- [[n8n-node-webhook]] — Webhook v2.1: HTTP trigger, response modes, inbound auth, body nesting
- [[n8n-node-httprequest]] — HTTP Request v4.4: 8 auth types, 5 body formats, pagination
- [[n8n-node-code]] — Code v2: JS/Python, runOnceForAll vs perItem, return format
- [[n8n-node-if]] — If v2.3: binary routing, typed condition operators (string/number/boolean/dateTime)
- [[n8n-node-switch]] — Switch v3.4: N-output routing, rules mode vs expression mode, fallthrough
- [[n8n-node-merge]] — Merge v3.2: Append, join by key, multiplex, positional, keep/remove matches
- [[n8n-node-set]] — Set v3.4: add/rename/strip fields, manual mode, expression mode
- [[n8n-node-google-ads]] — Google Ads v1: `googleAds` type, OAuth2, Campaign resource, micros values
- [[n8n-node-google-analytics]] — Google Analytics v2: GA4 only, Report/User Activity resources
- [[n8n-node-facebook]] — Facebook Graph API: `facebookGraphApi` type, direct proxy, v16–v23
- [[n8n-node-hubspot]] — HubSpot v2.2: Contact, Company, Deal, Ticket, Contact List, Engagement
- [[n8n-node-klaviyo]] — Klaviyo: community node (not in main repo), HTTP Request pattern, revision header
- [[n8n-node-slack]] — Slack v2.4: Channel, Message, File, Reaction, User; rate limits by tier
- [[n8n-node-gmail]] — Gmail v2.2: Message, Label, Draft, Thread; OAuth2 or Service Account
- [[n8n-node-notion]] — Notion v2.2: Database Page CRUD, must share integration with each DB

### API Behaviour Deep Dives (2026-05-01 batch)

- [[api-google-workspace]] — Sheets/Drive/Gmail: service account, batch requests, Drive resumable upload, Gmail 250 quota units/sec
- [[api-microsoft-graph]] — App registration, delegated vs application perms, per-service throttling, delta queries, 4230-min webhook renewal
- [[api-linkedin-marketing]] — Marketing Developer Platform partner tiers, OAuth, Campaign Manager API, Lead Gen Forms, polling-based webhooks
- [[api-tiktok-marketing]] — Marketing API approval tiers (basic 10 QPS / standard 20 QPS), async reporting, Events API server-side tracking
- [[api-meta-marketing]] — Meta Marketing API powers Facebook and Instagram advertising automation, lead ads retrieval, insights reporting, and Conversions API integrations
- [[api-google-ads]] — Google Ads API integrates campaign reporting, conversion uploads, asset management, and account hierarchy operations
- [[api-ga4]] — GA4 reporting splits between the Data API for operational reports and BigQuery export for raw event analysis
- [[api-hubspot]] — HubSpot API spans CRM records, associations, marketing assets, service objects, timeline events, and webhooks
- [[api-klaviyo]] — Klaviyo API handles profiles, events, lists, segments, metrics, flows, and ecommerce marketing data
- [[api-shopify]] — Shopify Admin API now strongly favors GraphQL for new apps while REST remains legacy
- [[api-stripe]] — Stripe API covers payments, subscriptions, refunds, disputes, invoices, and Connect platform flows
- [[api-mailchimp]] — Mailchimp Marketing API manages audiences, members, tags, segments, campaigns, ecommerce stores, and batch jobs
- [[api-notion]] — Notion API is useful for lightweight portals, task databases, report pages, and knowledge-base storage
- [[api-airtable]] — Airtable API is a practical operational datastore for agencies, but it behaves like a collaborative spreadsheet with API constraints rather than a relational database
- [[api-slack-deep]] — Slack API can be a notification channel, approval surface, workflow trigger, and lightweight internal app platform

### n8n Production Depth (2026-05-01 batch)

- [[n8n-cloud-vs-self-hosted]] — Decision framework: pricing tiers, execution limits, TCO, when each model wins
- [[n8n-version-migration]] — n8n upgrades require staging, workflow export, credential validation, node typeVersion checks, and rollback plans
- [[n8n-credential-management]] — Credential security depends on encryption keys, sharing rules, rotation, service accounts, and external secret storage
- [[n8n-queue-mode]] — Queue mode separates main, worker, Redis, and database responsibilities for scalable production execution
- [[n8n-monitoring]] — Production n8n monitoring combines execution logs, metrics, health checks, queue depth, memory, and workflow-level alerts
- [[n8n-backup-recovery]] — Recoverability depends on workflow exports, database backups, encryption keys, environment variables, and credential rotation procedures
- [[n8n-testing-strategies]] — n8n testing uses pinned data, staging workflows, schema validation, canaries, and regression checklists
- [[n8n-performance]] — Performance is controlled by node count, item volume, batching, binary handling, expressions, and external API behavior
- [[n8n-security-hardening]] — Hardening covers webhooks, credentials, risky nodes, network isolation, auth, CORS, audit, and instance updates
- [[n8n-cost-management]] — n8n cost control requires execution accounting, workflow design, self-hosted TCO, AI cost attribution, and pruning

---

## Patterns

Frameworks, workflow blueprints, architecture patterns, methodologies.

- [[research-02-real-agency-automation-case-studies-with-quantified-roi]]
- [[research-15-most-requested-agency-automation-workflows-2025-2026]]
- [[research-16-n8n-workflow-architecture-best-practices-for-agency-use-cases]]
- [[research-32-eisenhower-matrix-applied-to-agency-operational-tasks]]
- [[research-33-first-principles-thinking-for-identifying-agency-operational-debt]]
- [[research-34-theory-of-constraints-applied-to-agency-bottlenecks]]
- [[research-41-client-onboarding-workflow-blueprints]]
- [[research-43-ai-agent-architecture-for-agency-operations]]
- [[n8n-workflow-patterns]] — 5 core patterns: webhook, HTTP API, DB, AI agent, scheduled
- [[n8n-best-practices]] — Build discipline, validation, security, MCP tooling efficiency

### Workflow Templates (2026-05-01 batch)

- [[workflow-reporting-paid-media]] — Multi-platform paid media reporting: Google Ads + Meta + LinkedIn/TikTok, KPI calc, PDF, approval gate
- [[workflow-reporting-seo]] — SEO reporting: GSC + GA4 + rank tracker → Notion/Sheets digest, GSC 3-day data lag handling
- [[workflow-invoicing-retainer]] — Recurring retainer invoicing: schedule trigger, generation, dunning sequence, multi-currency
- [[workflow-invoicing-performance]] — Performance-based invoicing: KPI calc, evidence package, two-stage approval (AM → finance)
- [[workflow-reporting-full-service]] — Paid, SEO, social, email, CRM, and PM data become one executive report with outage-aware partial reporting
- [[workflow-lead-routing-budget]] — Inbound leads are routed by declared or inferred budget tier, with deduplication and SLA alerts
- [[workflow-lead-routing-source]] — UTM and referrer data route leads to the correct owner and sequence while preserving attribution
- [[workflow-lead-routing-service]] — Service interest from forms or AI classification routes prospects to specialists and proposal templates
- [[workflow-onboarding-paid-media]] — Contract signature launches project setup, access requests, kickoff scheduling, Slack channel, and first follow-up
- [[workflow-onboarding-seo]] — SEO onboarding creates audit tasks, GA4/GSC access requests, keyword brief, reporting sheet, and AM review gate
- [[workflow-content-distribution]] — Published content is adapted to social, newsletter, and tracking formats with approval before scheduling
- [[workflow-proposal-generation]] — Deal data, case studies, and templates generate a proposal draft, PDF, tracking, and follow-up sequence
- [[workflow-meeting-followup]] — Meeting notes and transcripts become action items, CRM updates, and approved client follow-up emails
- [[workflow-slack-digest]] — A scheduled digest combines approvals, overdue tasks, anomalies, new leads, reports due, and on-call info
- [[workflow-client-health-score]] — NPS, response time, performance, billing, activity, tickets, and renewal proximity become a weekly health score
- [[workflow-churn-detection]] — Risk signals are scored into intervention levels with AM tasks, director escalation, and win-back context
- [[workflow-upsell-detection]] — Positive performance and growth signals create timed upsell tasks without surfacing offers during unresolved issues
- [[workflow-capacity-planning]] — Projects, PTO, pipeline, role estimates, and velocity become a capacity dashboard and feasibility check
- [[workflow-project-status]] — Task progress, billable hours, milestones, blockers, and budget variance become a reviewed weekly status narrative
- [[workflow-time-tracking]] — Time entries are mapped to clients/projects, compared with estimates, and routed into utilization and profitability reports

### Approval & Safety Rules (2026-05-01 batch)

- [[approval-human-decision-framework]] — Decide when automation must pause for a person using irreversibility, blast radius, confidence, and client visibility
- [[approval-auto-fix-safe]] — Define when automated correction is acceptable and when the workflow must escalate instead
- [[approval-client-facing-actions]] — Require review for emails, reports, invoices, ad changes, meeting updates, and portal posts that clients can see
- [[approval-money-touching]] — Protect charges, refunds, invoices, ad budgets, and performance-fee calculations with thresholds and dual approval
- [[approval-data-deletion]] — Separate soft delete, unsubscribe, merge, and hard delete paths with backup and escalation rules
- [[approval-bulk-actions]] — Control high-volume updates with dry runs, progress reporting, abort thresholds, and rollback assessment
- [[approval-anomaly-detection]] — Define alert thresholds for volume spikes, metric drops, schema changes, and auth failure rates
- [[approval-ai-confidence-scoring]] — Use confidence, calibration, and validation to route AI outputs between automation and human review
- [[approval-multi-stage]] — Model sequential and parallel approvals for large budgets, sensitive data, and executive signoff
- [[approval-audit-logging]] — Capture actor, action, timestamp, before/after state, source IP, and outcome for every important automation decision

### AI Integration (2026-05-01 batch)

- [[ai-model-selection]] — Claude vs GPT-4 vs smaller models: task fit, cost, latency, context window comparison
- [[ai-prompt-engineering-n8n]] — Prompts in n8n need versioning, variable hygiene, structured instructions, and test fixtures
- [[ai-structured-output]] — Structured outputs make AI usable in automation by enforcing JSON schemas, enums, and required fields
- [[ai-cost-optimization]] — AI cost control comes from model tiering, prompt compression, caching, batching, and per-client attribution
- [[ai-failure-handling]] — AI nodes fail through rate limits, malformed JSON, timeouts, empty responses, hallucinations, and context overflow
- [[ai-hallucination-prevention]] — Automation must prevent models from inventing numbers, contacts, dates, or decisions
- [[ai-confidence-scoring]] — Confidence scores must be calibrated against real outcomes before they control workflow routing
- [[ai-when-not-to-use]] — Many workflow steps are cheaper, faster, and safer as deterministic code or API queries
- [[ai-rag-vs-finetune]] — Choose prompt engineering, RAG, or fine-tuning based on knowledge freshness, format consistency, and request volume
- [[ai-vector-search]] — Vector search supports semantic retrieval, deduplication, similar-client matching, and FAQ routing when thresholds are calibrated

---

## Failures

DIY automation failure modes, production failure patterns, prevention.

- [[research-12-why-agencies-fail-at-diy-automation-projects]]
- [[research-18-common-automation-workflow-failure-modes-and-prevention-patterns]]
- [[n8n-common-failures]] — n8n-specific failures: expression errors, config mistakes, runtime, validation

### Production Failure Patterns (2026-05-01 batch)

- [[token-expiration-patterns]] — Token lifetimes by platform, refresh rotation races, service account alternatives
- [[rate-limit-recovery]] — Exponential backoff with jitter, leaky/fixed/sliding window detection, platform-specific recovery
- [[webhook-reliability]] — Delivery guarantees by platform, silent failures, dedup requirement, signature verification
- [[data-sync-drift]] — How drift happens (missed webhooks, partial batches), detection (checksum/count), reconciliation patterns
- [[timezone-handling]] — UTC vs local vs platform-local time breaks reports, schedules, and filters when systems interpret the same date differently
- [[currency-conversion]] — Multi-region money data fails when workflows mix micros, cents, zero-decimal currencies, stale FX rates, and display formatting
- [[date-format-mismatches]] — Systems alternate between ISO 8601, Unix seconds, Unix milliseconds, GA4-style dates, and ambiguous local formats
- [[pagination-failures]] — Pagination breaks at scale through offset drift, cursor expiry, missing next tokens, and workflows that retry from the wrong boundary
- [[n8n-memory-limits]] — Large JSON arrays, binary files, AI prompts, and manual executions can exceed n8n instance memory before a workflow reaches its apparent API limit
- [[workflow-execution-timeouts]] — Long API backfills, LLM calls, file processing, and slow databases can outlive workflow or node-level timeouts
- [[concurrent-execution-race-conditions]] — Simultaneous webhooks and overlapping schedules create duplicate records, double sends, and last-write-wins data loss
- [[database-connection-pool]] — n8n workers, Code nodes, long transactions, and external BI tools can exhaust database connection budgets
- [[email-deliverability]] — SPF, DKIM, DMARC, sender reputation, bounce handling, and client-domain misconfiguration decide whether automations reach inboxes
- [[file-handling-failures]] — Binary handling fails through memory buffering, MIME mismatches, multipart bodies, file-size caps, and temporary URL expiry
- [[oauth-refresh-failures]] — Refresh token rotation, revoked consent, app test mode, SSO changes, and concurrent refreshes can silently break live workflows

---

## Agency Profiles

Pain points, buyer psychology, hiring signals, positioning, objection handling.

- [[research-03-top-20-agency-operational-pain-points-ranked-by-frequency-and-cost]]
- [[research-07-agency-client-churn-rates-and-operational-causes]]
- [[research-09-agency-founder-psychology-when-buying-automation-services]]
- [[research-10-agency-objections-to-automation-services-and-response-frameworks]]
- [[research-14-how-successful-automation-agencies-acquired-their-first-clients]]
- [[research-26-agency-owner-and-employee-burnout-operational-causes-and-interventions]]
- [[research-28-job-posting-patterns-that-signal-agency-operational-pain]]
- [[research-31-linkedin-growth-signals-indicating-urgent-automation-need]]
- [[research-37-done-for-you-services-vs-saas-market-trends-2024-2026]]
- [[research-38-productized-services-vs-hourly-consulting-economics]]
- [[research-39-competitor-teardown]]
- [[research-40-agency-distribution-channels]]

### Agency Business Operations (2026-05-01 batch)

- [[client-tier-patterns]] — Client tiers define SLA, automation level, approval depth, reporting cadence, and escalation path
- [[retainer-vs-project]] — Retainers reward recurring automation, while projects need milestone controls and clean closure
- [[white-label-reporting]] — White-label work hides the delivery agency behind another brand and raises branding, access, and data-isolation stakes
- [[multi-brand-complexity]] — Multi-brand accounts need isolated reporting, permissions, workflows, and billing namespaces
- [[agency-of-agencies]] — Holding-company and specialist-collective models require cross-agency handoffs, shared reporting, and clear ownership
- [[performance-pricing-ops]] — Performance pricing needs attribution evidence, reconciliation, dispute handling, and finance approval
- [[cash-flow-patterns]] — Cash timing drives ops priorities: dunning, hiring, automation investment, and renewal-risk management
- [[partnership-referral-ops]] — Referral, white-label, channel, and strategic partnerships need attribution, commission, and portal workflows
