# OpsRadar Knowledge Base Index

This index links to all research notes used by the audit engine RAG system.
Notes are organized by category and injected into audit prompts via semantic search.

> **Wiki expansion plan (started 2026-04-30, paused 2026-05-01)**: Target ~88 new pages across API deep-dives, production failures, workflow templates, approval/safety, AI integration, agency operations, and n8n production depth. **14 written so far (in commit `52501a3`); 74 remaining.** The 2026-05-01 batch was blocked by an org monthly usage limit before any agent produced output; remaining batches resume after reset. See [[log]] for the breakdown.

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

### API Behaviour Deep Dives (2026-05-01 batch — partial)

- [[api-google-workspace]] — Sheets/Drive/Gmail: service account, batch requests, Drive resumable upload, Gmail 250 quota units/sec
- [[api-microsoft-graph]] — App registration, delegated vs application perms, per-service throttling, delta queries, 4230-min webhook renewal
- [[api-linkedin-marketing]] — Marketing Developer Platform partner tiers, OAuth, Campaign Manager API, Lead Gen Forms, polling-based webhooks
- [[api-tiktok-marketing]] — Marketing API approval tiers (basic 10 QPS / standard 20 QPS), async reporting, Events API server-side tracking

### n8n Production Depth (2026-05-01 batch — partial)

- [[n8n-cloud-vs-self-hosted]] — Decision framework: pricing tiers, execution limits, TCO, when each model wins

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

### Workflow Templates (2026-05-01 batch — partial)

- [[workflow-reporting-paid-media]] — Multi-platform paid media reporting: Google Ads + Meta + LinkedIn/TikTok, KPI calc, PDF, approval gate
- [[workflow-reporting-seo]] — SEO reporting: GSC + GA4 + rank tracker → Notion/Sheets digest, GSC 3-day data lag handling
- [[workflow-invoicing-retainer]] — Recurring retainer invoicing: schedule trigger, generation, dunning sequence, multi-currency
- [[workflow-invoicing-performance]] — Performance-based invoicing: KPI calc, evidence package, two-stage approval (AM → finance)

### AI Integration (2026-05-01 batch — partial)

- [[ai-model-selection]] — Claude vs GPT-4 vs smaller models: task fit, cost, latency, context window comparison

---

## Failures

DIY automation failure modes, production failure patterns, prevention.

- [[research-12-why-agencies-fail-at-diy-automation-projects]]
- [[research-18-common-automation-workflow-failure-modes-and-prevention-patterns]]
- [[n8n-common-failures]] — n8n-specific failures: expression errors, config mistakes, runtime, validation

### Production Failure Patterns (2026-05-01 batch — partial)

- [[token-expiration-patterns]] — Token lifetimes by platform, refresh rotation races, service account alternatives
- [[rate-limit-recovery]] — Exponential backoff with jitter, leaky/fixed/sliding window detection, platform-specific recovery
- [[webhook-reliability]] — Delivery guarantees by platform, silent failures, dedup requirement, signature verification
- [[data-sync-drift]] — How drift happens (missed webhooks, partial batches), detection (checksum/count), reconciliation patterns

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
