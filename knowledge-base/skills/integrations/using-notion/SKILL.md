---
name: using-notion
description: How the agent reads and writes the customer's Notion Brain — inserting agent findings, updating KPI snapshots, querying databases, reading How-We-Work and Decision Log pages. Use when the agent needs to log an action finding, update a Risk Register row, write a Pattern Card, query the Agent Action Log, read the client profile, or provision a new Brain. Triggers on "log this to Notion", "update the brain", "write to the Risk Register", "what's in our Decision Log", "check the Notion brain for this client", "log agent findings", "insert to the KPI snapshot".
---

# Using Notion

*"The agent just ran and found three at-risk clients — where does this go so next week's agent doesn't re-discover the same thing?"*

Composio exposes ~48 Notion tools. Most of them you'll never touch. This skill tells you which ones matter and in what order to call them so the Brain stays clean.

## The Brain schema (know this first)

The customer Brain has 20 databases + 7 strategic pages. The database IDs live in `notion_workspaces.databases` in Supabase (keyed by slug). Never hardcode a database ID — read it from the workspace row.

Key databases the agent touches:
| Slug | Purpose |
|------|---------|
| `agent_action_log` | Every agent-proposed action (row per action) |
| `risk_register` | Flagged risks per client, with status + severity |
| `kpi_snapshots` | Weekly KPI checkpoint rows per metric |
| `pattern_cards` | Cross-client patterns the agent has identified |
| `client_profiles` | One row per client — health, tier, ARR, notes |
| `decision_log` | Strategic decisions with context + outcome |
| `toolbox` | Connected integrations + their health |

Strategic pages (read-only for agents):
- `how_we_work` — agency's operating playbook, SLAs, escalation rules
- `coo_briefing_latest` — latest COO briefing (agents write; COO chat reads)

## Tool selection guide

### Reading data

**Query a database with filters:**
```
NOTION_QUERY_DATABASE
  database_id: <from notion_workspaces.databases[slug]>
  filter: { property: "Status", select: { equals: "Active" } }
  sorts: [{ property: "Created", direction: "descending" }]
  page_size: 20
```
Or with complex filters use `NOTION_QUERY_DATABASE_WITH_FILTER`.
Use for: finding at-risk clients, querying Risk Register by severity, getting open actions.

**Read a page's full content (markdown):**
```
NOTION_GET_PAGE_MARKDOWN
  page_id: <page_id from query result>
```
Use for: reading How-We-Work, reading a client profile narrative, reading a Decision Log entry. Returns clean markdown — no property parsing needed.

**Get a database's property schema:**
```
NOTION_FETCH_DATABASE
  database_id: <id>
```
Use this FIRST before any insert/update — it tells you the exact property names and accepted values for select/multi-select fields. Without it you're guessing property names and the write fails silently.

### Writing data

**Insert a new row (non-idempotent):**
```
NOTION_INSERT_ROW_DATABASE
  database_id: <id>
  row: { "Client": "Acme Corp", "Status": "Active Risk", ... }
```
Use for: logging a new Agent Action, creating a new Pattern Card, adding a KPI snapshot.

**Create a new top-level page:**
```
NOTION_CREATE_NOTION_PAGE
  parent_id: <parent page or DB id>
  title: "..."
  content: "..."   ← markdown accepted
```
Use for: creating standalone strategy pages, provisioning Brain pages. Not for database rows — use INSERT_ROW for that.

**Add content blocks to an existing page:**
```
NOTION_ADD_MULTIPLE_PAGE_CONTENT
  page_id: <id>
  blocks: [...]
```
Use for: appending bullet points, headings, or paragraphs to an existing page.

## Standard workflow for agent findings

Every cron agent that writes to Notion should follow this sequence:

1. **Load workspace** — `SELECT databases FROM notion_workspaces WHERE user_id = $1`
2. **FETCH_DATABASE target** — get property schema before first write of the session
3. **NOTION_QUERY_DATABASE** — check if a row already exists (dedup by client + date)
4. **NOTION_INSERT_ROW_DATABASE** — write findings; if already exists, insert a new timestamped row (Notion has no built-in upsert)

## Triggers

Composio exposes 13 Notion triggers. The two wired in `composio-catalog.ts`:

| Trigger | When to use |
|---------|------------|
| `NOTION_PAGE_CREATED` | Fire an automation when a new brief/SOW page lands in the Brain |
| `NOTION_PAGE_PROPERTIES_UPDATED` | Fire when a client status changes (e.g. "Active" → "At Risk") |

Remaining 11 triggers (page deleted, database updated, block changed, etc.) are available via Composio but not in the static catalog — use `getCachedTriggers(userId)` to get the user's live list.

## Common errors

**Property name mismatch** — Notion property names are case-sensitive and include spaces. Always call `NOTION_FETCH_DATABASE` first to get exact names. `"client"` fails when the DB has `"Client"`.

**Select option doesn't exist** — Can't set a select/multi-select to a value that's not in the option list. `NOTION_FETCH_DATABASE` returns the valid options. If a new value is needed, use `NOTION_UPDATE_NOTION_PAGE` with `create_missing_options: true` where supported.

**Rate limits** — Composio/Notion enforces 3 requests/second per integration. If the agent is writing to 15 clients at once, add 350ms delays between rows or batch them. Symptoms: silent 429s with no rows written.

**Workspace not provisioned** — If `notion_workspaces` row doesn't exist for the user, all Brain writes silently fail. Check `SELECT id FROM notion_workspaces WHERE user_id = $1` first; return a "Brain not connected" message if missing.

**Wrong parent for page creation** — Pages created under a database parent appear as database rows (which is correct). Pages created under another page appear as child pages (also correct). Never use the Brain's root page ID as parent for database rows.

## What NOT to do

- Don't hardcode database IDs. They differ per customer Brain; read from `notion_workspaces.databases`.
- Don't INSERT without checking for duplicates. Use UPSERT with a unique key (client name, client+date, etc.) to avoid duplicate Risk Register rows on re-runs.
- Don't skip `NOTION_FETCH_DATABASE`. Property name guessing creates silent failures and leaves blank rows with no useful data.
- Don't call `NOTION_GET_PAGE_MARKDOWN` on a database (it's for pages). Query the DB with `NOTION_QUERY_DATABASE` first, then `GET_PAGE_MARKDOWN` on individual result pages if you need their content.
- **THESE TOOLS DO NOT EXIST — never call them:** `NOTION_SEARCH_NOTION_PAGE`, `NOTION_QUERY_NOTION_DATABASE`, `NOTION_UPDATE_NOTION_PAGE`, `NOTION_UPSERT_ROW_DATABASE`, `NOTION_ADD_PAGE_PROPERTY`. They are hallucinated names. The correct alternatives: search → `NOTION_QUERY_DATABASE`; update → re-insert with `NOTION_INSERT_ROW_DATABASE`.
- Don't write the same finding twice in one agent run. Log findings to a local set first, then write once at the end. Notion writes cost tokens and rate-limit budget.
- Don't assume the Brain is provisioned for every user. Not every user has connected Notion — check the workspace row before attempting any Notion tool call.

## Related skills

- `notion-brain-schema` — full 20-database schema with field definitions and the 7 strategic pages. Read this when you need the complete property list for a specific database.
- `using-hubspot` — HubSpot deals and contacts cross-reference Notion client profiles; when syncing data, the client name in Notion must match the HubSpot company name exactly.
- `using-stripe` — Stripe MRR per client maps to the `client_profiles` ARR field; keep them in sync on each revenue agent run.
