# Knowledge Base Change Log

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
