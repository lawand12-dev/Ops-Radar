# OpsRadar v1 integration blueprint for 5–20 person agencies

**Start with a tight anchor stack of 10 integrations — HubSpot, Pipedrive, Slack, Google Workspace (Gmail/Calendar/Sheets/Drive-file-scope), Outlook, ClickUp, Asana, Notion, Airtable, Webflow, Stripe, QuickBooks Online — plus GA4 and Google Search Console for marketing-vertical clients.** These have mature native n8n nodes, production-grade webhooks, rate limits that won't bite 10-person agencies, and reasonably stable roadmaps through 2026. Everything else in the 30+ tool landscape is either (a) gated behind painful OAuth/partner approval (Meta, Google Ads, LinkedIn, Salesforce), (b) ratcheting down access faster than a productized service can absorb (Slack non-Marketplace, Figma, Twitter/X), or (c) niche enough to defer. Architect self-hosted n8n on Hetzner with Projects-based tenancy from day one — it's the only way to stay under $5/customer/month on infrastructure while n8n Cloud would cost $60/customer/month at the same tier. The single biggest latent failure mode is OAuth token silent expiry at 50+ customer scale, so ship a self-service re-authentication page in v1, not v2. The market's entire reporting-aggregation category is already saturated by Supermetrics and AgencyAnalytics, so don't compete there — OpsRadar's defensible wedge is connecting reporting *outputs* to client-facing *workflows*.

## How the tool universe breaks into four realistic tiers

After profiling 32 tools against n8n node maturity, webhook reliability, OAuth complexity, rate limit headroom, and 2024–2026 breaking-change risk, they cluster into four distinct tiers. The key insight: **API quality correlates loosely with agency adoption but strongly with integration pain.** Figma has near-universal adoption and a dreadful automation API in 2026; Webflow has moderate adoption and an excellent one. Decisions should be driven by the pain curve, not the adoption curve.

| Tier | Meaning | Tools |
|---|---|---|
| **Tier 1 — v1 must-have** | Mature n8n node, reliable webhooks, stable roadmap, broad adoption | HubSpot, Pipedrive, Slack (via workspace-internal apps), Gmail, Google Calendar, Google Sheets, Google Drive (drive.file scope), Outlook, ClickUp, Asana, Notion, Airtable, Webflow, Stripe, QuickBooks Online |
| **Tier 2 — v1 vertical-dependent** | Ship if the target vertical demands it | Linear + Jira (dev agencies), Monday.com (creative agencies), Harvest (time-billable agencies), GA4 + Search Console + Mailchimp (marketing agencies), Klaviyo (ecommerce agencies), Bullhorn (recruiting agencies), DocuSign or PandaDoc (pick one) |
| **Tier 3 — v2+ / defer** | Real demand but high engineering cost or niche | Microsoft Teams, OneDrive, Google Docs, Toggl Track, Clockify, Close.com, Xero, Frame.io, Figma (read-only notifications only) |
| **Tier 4 — skip or HTTP-only in v1** | Gated access, declining relevance, or unstable APIs | Meta Ads, Google Ads, LinkedIn Ads, Twitter/X, Reddit, Salesforce, Productive.io (competitor), Copper, Bonsai (post-Zoom), Trello, SharePoint |

## The Tier 1 integrations that anchor the product

**HubSpot is the single highest-leverage integration** because 40–55% of 5–20 person US/CA agencies run on it. The native n8n node is mature but has two quirks worth designing around: only one active HubSpot Trigger webhook registers per app (activating a second kills the first), and the `tickets` scope was historically missing. The practitioner workaround — bypass the Trigger node entirely and use HubSpot's native "Send a webhook" workflow action pointing at a plain n8n Webhook node — is more reliable at scale. The economic catch is that workflow-driven webhooks require Operations Hub Pro at $800/month or a Sales/Marketing Pro plan; free-tier HubSpot cannot send them. Plan v1 templates for clients on Pro+ plans, and document a polling fallback for free-tier clients.

**Pipedrive is the cleanest CRM API in the group** and the #2 agency default (~15–20% adoption). Its v2 API became webhook default on March 17, 2025, and the native n8n node is the rare integration where n8n is economically *better* than Zapier — Zapier polls (burning Token-Based Rate Limit budget), while n8n uses webhooks. The one trap: Pipedrive's webhook "Ban System" suspends delivery for 30 minutes after 10 consecutive failures and does **not** retry during the ban, so idempotency is required.

**Stripe is the gold standard** and should ship with v1 templates for `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`, and `charge.dispute.created`. The new `invoice.payment_attempt_required` event (added Oct 29, 2025) is worth surfacing for agencies on recurring retainers. The native n8n Stripe Trigger is best-in-class.

**QuickBooks Online is essential and dangerous in equal measure.** Dominant US/CA accounting platform for this segment, mature n8n node, but OAuth is the highest-pain of the Tier 1 group. The November 12, 2025 refresh-token policy change capped all refresh tokens at a 5-year maximum — the first large wave of mandatory reconnects hits in February 2027 for granular-scope tokens and October 2028 for the common `com.quickbooks.accounting` scope. **Build a 30-day-before-expiry alert into v1**; Intuit will also mandate a "Reconnect URL" field in the developer portal starting January 2026.

**Slack is a v1 must — but only deployed as a per-customer internal app.** The May 29, 2025 rate-limit changes dropped `conversations.history` and `conversations.replies` from Tier 3 (~50 req/min) to Tier 1 (1 req/min, 15 messages/call) for non-Marketplace commercially-distributed apps. The limits extend to existing installations on March 3, 2026 (rescheduled from September 2025). **Do not ship a single OpsRadar-branded Slack app that gets installed across 50 clients** — that model is effectively dead. Instead, each agency installs either the official n8n Marketplace Slack app or a custom internal app in their own workspace, and OpsRadar ships the workflow templates. This is the single most important architectural constraint in the entire product.

**Google Workspace dominates the comms/storage layer** (~60–70% of 5–20 person agencies) and the OAuth strategy here determines the product's launch timeline. Restricted scopes (`gmail.readonly`, `drive.readonly`, full mail.google.com) now require **CASA Tier 2 assessment at $500–$4,500/year** with self-scan eliminated and PwC backing out of new assessments. The right move for v1 is surgical: use only `gmail.send` / `gmail.modify` / `gmail.labels` / `calendar` / `spreadsheets` / `drive.file` (only files n8n creates). This eliminates CASA entirely, preserves one-click install UX, and covers 90% of real agency use cases. Pursue full CASA certification only after ~$50K MRR justifies the annual operations load.

**Microsoft 365 (Outlook + Teams + OneDrive) is v1 for Outlook, v2 for everything else.** Outlook mail + calendar webhooks max out at 7-day subscriptions requiring auto-renewal; the native n8n node is moderately mature but has known limitations on shared mailboxes (can't specify *which* shared mailbox). Teams is a v2 target because channel messaging requires either Resource-Specific Consent (RSC) app manifests installed into each team or delegated permissions — multiple open n8n issues from 2025 (#16613, #17260) document the permission errors. Ship Teams after building a productized RSC onboarding flow.

## The PM layer has clear vertical splits

ClickUp, Asana, Notion, and Airtable are the four PM-adjacent tools every vertical touches, each with mature native n8n nodes. ClickUp's 100 req/min rate limit on Free/Unlimited/Business plans is the practical ceiling for sync-heavy workflows; Business Plus ($19/user/month) unlocks 1,000/min. The n8n ClickUp node has recurring bugs around custom-field relationships and webhook re-registration on workflow republish — **expect HTTP Request node fallback for custom field operations**.

Notion quietly became webhook-capable in 2024 (page.created, page.updated, comment.created, data_source.schema_updated), but the 3 req/sec-ish rate limit is the tightest in the PM layer. The September 3, 2025 multi-source database refactor migrated `database_id` to `data_source_id` with breaking changes — any older Notion template code needs an audit. Notion's 100-relation-per-update limit will bite anyone trying to sync large client rosters.

Airtable is indispensable as an ops database (~30–40% adoption) but the **5 req/sec per-base hard cap is the silent killer** on bulk imports. Team plan's 100k-calls/month ceiling throttles to 2/sec when exceeded. Legacy API keys were fully deprecated February 2024 — PAT-only now.

**Linear and Jira are dev-agency-specific v1 must-haves.** Linear has the cleanest GraphQL API in the stack with robust webhooks (Issue, Comment, Project, Cycle, IssueSLA) and HMAC-SHA256 signing; the native n8n node covers 80% of use cases with HTTP Request filling GraphQL edge cases. Jira's situation is more precarious: the **March 2, 2026 points-based rate limit enforcement** adds a 65,000-point hourly quota shared across *all* apps on a tenant, meaning one noisy OpsRadar workflow can throttle every app on the client's Jira. The mitigation — use API token auth instead of OAuth 3LO, since token traffic is exempt — is non-obvious and should be baked into templates.

Monday.com's GraphQL-only API with its complexity-budget model (10M points/minute account-wide, 5M per-query cap introduced 2024) is manageable but trips up agencies doing bulk item creation (300k points per item). The 2024 migration from `items` to `items_page` cursor pagination is complete, but older tutorials still reference dead endpoints.

Trello is the explicit v2 deprioritization: OAuth 1.0a (not 2.0), declining share (~15% adoption, mostly legacy), and a thin n8n node. Document via HTTP Request node, don't invest engineering time.

## The marketing vertical demands a different strategy than direct ads API integration

**The most important strategic finding in this research: for 5–20 person marketing agencies, OpsRadar should not compete on "we integrate Meta Ads / Google Ads."** That category is owned by Supermetrics (138+ connectors), AgencyAnalytics (7,000+ agency customers), and Whatagraph. They handle the deprecation treadmill that killed three major Google Ads versions in 2025 (v17, v18, v19 all sunset between June and December) and forced Meta's September 9, 2025 v22+ enforcement wave. Meta ships a new major Graph API version every quarter with a ~2-year retirement window — v21.0 (Oct 2024), v22.0 (Jan 2025), v23.0 (May 2025), v24.0 (Oct 2025). Meta's OAuth is the single most painful in marketing (System Users, App Review, Business Verification, appsecret_proof, asset-level permissions). A solo founder running a productized service cannot keep up without an engineer dedicated to version migration.

**What OpsRadar should build instead: GA4 + Google Search Console + Mailchimp + conditional Klaviyo.** These four anchor the marketing-agency tier:

- **GA4 Data API** uses service account auth (not OAuth) — the easiest auth model in marketing. Native n8n node exists, rate limits are generous (200K tokens/day per property for standard, 10 concurrent requests). Stable since launch; no breaking changes in 2024–2026.
- **Google Search Console API** has the most generous rate limits in the entire research (1,200 QPM/site, 30M QPD/project), service account auth, stable since years.
- **Mailchimp** API v3 has been stable since 2016, mature n8n node with Trigger, simple API-key auth. The March 2024 DKIM/DMARC enforcement affected deliverability but not API structure.
- **Klaviyo** is a conditional target — dominant in ecommerce/DTC agencies but system webhooks are paywalled behind Advanced Customer Data Platform (Klaviyo CDP add-on); only flow webhooks work at base tier. The v1/v2 endpoint retirement June 30, 2024 was the last big breaking wave; the ongoing revision-header model (2-year retirement per revision) requires annual pinning discipline.

OpsRadar's defensible marketing workflows are: GA4 traffic-anomaly → Slack alert, GSC ranking-drop → ClickUp/Asana task, form-capture → CRM enrichment → lead routing, scheduled client-facing Google Doc summary report (pulled from data the agency already has in Looker Studio). None of these compete with Supermetrics; all of them *use* Supermetrics/Looker outputs as inputs.

## Design, video, and web-dev tools have one breakout winner

**Webflow is the highest-ROI design/web-agency integration by a wide margin** and deserves v1 must-have status alongside the core CRMs. The official built-in n8n Webflow node plus Webflow Trigger covers all major events (form_submission, site_publish, collection_item_created/changed/deleted, ecomm_new_order). The form submission → CRM + Slack routing workflow is the universally-demanded killer automation among design/marketing agencies running client sites. Rate limit (60 req/min per API token) is fine for forms; bulk CMS operations require batching. v1 API is fully sunset as of March 31, 2025 — v2 only now.

**Figma is the opposite case: near-universal adoption but sharply degraded automation utility in 2026.** The November 17, 2025 rate limit tightening pushes Pro users into 4–5 day Retry-After lockouts after as few as 5–10 requests on cross-plan files (multiple forum reports). The OAuth re-publishing deadline that same day broke every legacy app. The REST API remains read-heavy with no meaningful write capability (can't create frames, components, or fills programmatically). The native Figma Trigger in n8n works for FILE_COMMENT and FILE_UPDATE webhook events, which is enough for "design handoff" notifications, but the larger automation vision is dead until Figma reverses course. **Ship only read/notify templates against Figma-paid-plan files; do not promise bulk asset export.**

**Frame.io is v2+ niche specialty.** Adobe's V4 API launched 2024 with breaking changes from the Legacy V3 API; OAuth now runs through Adobe IMS, not Frame.io's own server, and multiple public threads document developers stuck on 401 errors with valid tokens. No native n8n node exists (Frame.io staff confirmed in late 2025 they're "working on a community node"). Only relevant for the ~10–20% of creative agencies doing video work, and the engineering cost is real.

## Time tracking and billing have one stable anchor and several traps

Harvest is the US/CA agency default for time tracking (~40% adoption among billable-hours agencies), but it's **polling-only** — the public V2 API does not support webhooks. Workflows must use the 100 req/15-sec rate limit budget for incremental polling or accept 1–15 minute lag via Zapier intermediary. The native n8n node is functional; Harvest Forecast is a separate product with a separate API and is probably not worth v1 investment.

Toggl Track's **September 5, 2025 rate limit tightening is devastating for multi-client use**: Free tier is now 30 requests/hour/user/org, Starter 240, Premium 600. Workspace-scoped webhook API exists (limit 5 webhooks/user, 3 consecutive failures auto-disables) but the hourly caps make heavy polling untenable. Reserve Toggl for v2 and only in workflows where per-client events are infrequent.

Clockify is a viable v2 option with a more generous 50 req/sec per-addon limit and native webhooks with HMAC-SHA256 signatures (10 webhooks per workspace admin, 100 per workspace). Free tier remains strong.

**Productive.io is a strategic tension point**: it's both an OpsRadar competitor (agency all-in-one ops platform) and a potential integration target for agencies already on it. Webhooks require the Ultimate plan (HMAC-SHA256, 25 active max, 1,000 fires per 5 minutes). No native n8n node; HTTP Request only. The right posture is to treat Productive.io customers as "already solved" and not invest in deep integration — focus OpsRadar on agencies still stitching together ClickUp + Harvest + QBO + Slack themselves.

**Xero's thin native n8n node (only Contacts and Invoices exposed) is a surprise gap.** Full Xero coverage requires HTTP Request fallback for reports, bank transactions, payroll, etc. US/CA adoption is low vs QBO but the integration gap matters for the AU/NZ/UK subset of the ICP. The rumored March 2, 2026 usage-based pricing move (five tiers, charging by connection count + data egress) needs verification on developer.xero.com before quoting to clients.

**Bonsai: skip entirely.** Acquired by Zoom November 5, 2025, closed December 2025. No public REST API for third parties (Zapier integration only); integration roadmap is frozen as Bonsai folds into Zoom Workplace over the next 12–18 months. Migrate existing Bonsai-using clients to QBO + Stripe + HoneyBook instead of building dependency.

DocuSign vs PandaDoc is effectively a pick-one decision for v1. DocuSign has stronger enterprise presence but pricier plans ($25–40/user/month) and OAuth 2.0/JWT complexity; PandaDoc's `document_state_changed` webhook is simpler and the native rate limit was recently increased to 300/min on Create-from-PDF. **Default to PandaDoc for v1 — better fit for the $500–2,000/month agency tier**.

## Agency stacks vary more by vertical than expected

The five agency verticals diverge meaningfully in stack composition, which means OpsRadar v1 should not try to serve all five equally. Based on 2024–2026 data from Lenny's Newsletter tool survey, Bullhorn GRID reports, HubSpot Agency Partners, and Reddit community threads:

| Vertical | Core CRM | PM | Billing | Comms | Critical non-obvious tool |
|---|---|---|---|---|---|
| **Marketing** | HubSpot | ClickUp or Asana + Notion | QBO + Stripe + Harvest | Slack (~75%) | AgencyAnalytics or Supermetrics |
| **Design** | HubSpot free or Pipedrive | Notion + Asana | QBO/Xero + Stripe + Harvest | Slack (~80%) | Dropbox (~30–40% alongside Google) |
| **Dev/software** | HubSpot or Pipedrive | Linear (growing) or Jira (dominant) + ClickUp | QBO + Stripe + Harvest | Slack (~72%) + Teams (~20%) | GitHub (~65% adoption) |
| **Recruiting** | Bullhorn (dominant), not generic CRM | Asana or Trello + Notion | QBO + Bullhorn Back Office | Teams (~35–45%) + Slack | LinkedIn Recruiter ($8,999/seat/yr) |
| **Content/editorial** | HubSpot | Notion (dominant) + Airtable | QBO + Stripe + Bonsai (legacy) | Slack (~80%) | SurferSEO or Clearscope |

The **marketing vertical is the largest addressable ICP** (broadest Tier 1 integration overlap, most automation-hungry, clearest pain points around multi-platform reporting consolidation and lead attribution). The **recruiting vertical requires Bullhorn integration**, which has no native n8n node and a proprietary ecosystem — defer unless the founder has recruiting-agency relationships. The **dev vertical is the second-best first target** if the founder has technical credibility, with Linear + Jira + GitHub + Harvest being the stack-defining integrations.

## The API breaking-change calendar to build into the product

Ten integrations have 2024–2026 changes severe enough to shape architecture decisions. Rank-ordered by instability:

1. **Twitter/X** — pay-per-use default for all new signups as of February 6, 2026; $0.005/post read caps workflows financially. Treat as optional, client BYO-credentials.
2. **Slack non-Marketplace apps** — 1 req/min on `conversations.history` from March 3, 2026 for existing installs. Per-customer internal apps are the only viable pattern.
3. **Meta Graph API** — quarterly major versions, ~2-year retirement. Centralize all Meta calls in one sub-workflow, 90-day upgrade cadence.
4. **Google restricted scopes (CASA)** — Tier 2 self-scan eliminated, paid assessors only ($500–$4,500/year). Avoid restricted scopes in v1.
5. **Figma** — November 17, 2025 rate limit tightening causes multi-day Retry-After on cross-plan file reads. Read-only notifications only.
6. **Atlassian Jira/Confluence** — March 2, 2026 65,000-point hourly quota shared across tenant. Use API tokens (exempt), not OAuth 3LO.
7. **Reddit** — commercial reads priced out since 2023. Skip.
8. **Klaviyo** — 2-year revision-retirement cycle; v1/v2 killed June 2024. Parameterize revision header.
9. **Webflow** — v1 killed March 2025; User Accounts API sunset January 29, 2026. v2-only, canary test site.
10. **Bonsai (Zoom)** — API direction frozen post-December 2025 acquisition. Skip.

Non-ranked but schedule-worthy: **QuickBooks Online refresh token 5-year cap** (first wave February 2027 for granular scopes, October 2028 for accounting scopes); **Atlassian Connect end-of-support December 2026** (force Forge migration); **Slack classic apps deprecation** November 16, 2026.

## The infrastructure decision that determines unit economics

**Self-host n8n from day one — n8n Cloud is fatal to agency margins at this price point.** A single Hetzner CX32 (2 vCPU, 8 GB RAM) running Docker Compose with n8n + Postgres + Redis + Caddy costs €10–15/month and handles 10–30 customers comfortably. n8n Cloud Pro at $50/month per customer reaches $3,000/month at 50 customers — 30x the self-hosted cost. The community-edition trap is that credential isolation requires Projects (Team/Business tier or self-hosted Enterprise license), so plan to either (a) use a naming-convention hack for the first 10 clients or (b) graduate to queue mode + Enterprise license around 50 customers.

At scale, the three multi-tenancy patterns with honest trade-offs:

- **Single instance + Projects** (~€15–30/month, 10–50 customers) — soft isolation in the same Postgres. Cheapest, hardest to migrate off.
- **Per-customer Docker containers** (~€3–6/customer at 50+) — hard isolation, easy handoff, but upgrade operations multiply by N.
- **Kubernetes queue mode with tagged workflows** (~€200–500/month at 200 customers) — single deployment, tenant-tagged workflows routed to tier-specific worker pools. Right answer at 100+ customers.

**The silent failure mode that breaks productized n8n services is OAuth token refresh at scale.** Multiple known bugs in n8n's refresh handling (GitHub issues #17450, #18517, #22893): some APIs return 403 instead of 401, bypassing refresh; Google OAuth apps in "Testing" mode have hard 7-day expiry; Client Credentials grant doesn't always respect `expires_in`. **At 50 customers × 5 OAuth connections, expect silent auth failures weekly.** Two architectural requirements for v1 launch: (1) a catch-all Error Trigger workflow that detects auth errors and posts to Slack with customer context, (2) a self-service re-authentication web page (or n8n Form Trigger) that emails the client a magic OAuth reconnect link. Without this, the founder becomes the manual helpdesk for every token expiry.

Monitoring architecture should tier alerts to avoid fatigue: P1 (SMS or phone via Twilio/Better Stack) for process down, Postgres unreachable, >5% global failure rate; P2 (Slack DM) for single-workflow repeat failures or OAuth re-auth needed; P3 (daily digest email) for transient errors. n8n's Prometheus metrics endpoint (`N8N_METRICS=true`) exposes the right signals (`n8n_execution_failed_total`, `n8n_scaling_mode_queue_jobs_waiting`, event loop lag); ready-made Grafana dashboards exist at github.com/thenguyenvn90/n8n-observability. Sentry integration via `N8N_SENTRY_DSN` catches unhandled exceptions. Per-customer health dashboards come from tagging workflows `client:acme` and querying the `execution_entity` Postgres table by tag — this becomes a customer-facing trust-building status page shared read-only with each client.

SOC 2/HIPAA reality: n8n Cloud offers SOC 2 Type 2 (report available to Enterprise customers) and HIPAA only on Enterprise with a signed BAA. Self-hosted inherits the compliance responsibility entirely — Hetzner is GDPR-friendly but **does not sign BAAs**, making it unsuitable for US PHI. For agencies serving healthcare clients, budget for AWS-with-BAA or n8n Cloud Enterprise; for GDPR-only clients, Hetzner Germany/Finland is fine. n8n Cloud hosts on Azure Frankfurt only — no US region as of April 2026.

## The v1 launch recipe

Ship the following and nothing else: **HubSpot, Pipedrive, Stripe, Gmail, Google Calendar, Google Sheets, Google Drive (drive.file scope), Outlook, Slack (per-customer-internal-app model), ClickUp, Asana, Notion, Airtable, Webflow, QuickBooks Online, PandaDoc**. Add **GA4 + Search Console + Mailchimp** if targeting marketing agencies, or **Linear + Jira + GitHub + Harvest** if targeting dev agencies. Skip all ads APIs, LinkedIn, Salesforce, Figma-beyond-notifications, Frame.io, Bonsai, Twitter/X, Reddit, and Productive.io.

Infrastructure: Hetzner CX32 with Docker Compose, Postgres, Redis, Caddy, Healthchecks.io for heartbeats, Sentry free tier, Better Stack for uptime and SMS routing. Self-service re-auth page from day one. One catch-all Error Trigger workflow routing to Slack with customer context. Monthly "API hazard calendar" review covering the Meta quarterly release, the Slack March 3, 2026 date, the Atlassian March 2, 2026 date, and the QBO February 2027 refresh-token wave.

The product's defensible wedge is narrow and clear: **connect reporting outputs to client workflows, not replace reporting tools; use webhooks not polling where possible; keep OAuth scopes narrow to avoid verification pain; deploy Slack apps per-customer not distributed; price against the 30-minute/week of founder time each workflow saves the agency, not against Zapier.**

## Closing insights that reshape the strategy

Three findings deserve to change the founder's mental model. First, **OpsRadar is not in the automation-tool market — it's in the OAuth-management market.** At 50 customers the infrastructure and workflow-building costs are trivial; what grinds solo founders into the ground is the steady stream of expired Google tokens, Slack re-auths, and HubSpot scope updates. The founder who builds the best re-authentication UX wins.

Second, **the "integrates with 30+ tools" framing is a trap.** Zapier integrates with 7,000+ tools and the agency market has already decided that's not enough — what agencies actually buy is opinionated, working end-to-end workflows. OpsRadar v1 should ship with 15–20 pre-built templates (lead capture → CRM → Slack routing; deal won → project provisioning → kickoff email; invoice paid → thank-you sequence) covering the Tier 1 integrations deeply, rather than shallow coverage of 30 tools.

Third, **the API landscape is ratcheting toward larger customers, not smaller ones.** CASA Tier 2, Slack non-Marketplace throttling, Meta System User requirements, LinkedIn Marketing Developer Platform approval, Jira points-based quotas, and Atlassian Connect EOL all point in one direction: platforms are pricing out unverified multi-tenant apps and pushing commercial use toward formal Marketplace programs or per-customer internal apps. The productized-service model survives this by structuring every integration as *client's own credentials, client's own workspace app, our templates and orchestration* — never "our app on your workspace." That architecture choice, made upfront, determines whether OpsRadar can still exist at 200 customers.