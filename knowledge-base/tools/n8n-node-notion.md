# n8n Node: Notion

**Category:** Tools
**Node Type:** `n8n-nodes-base.notion`
**Version:** 2.2 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Notion`
**Updated:** 2026-04-30

## Overview

Reads and writes Notion databases, pages, and blocks. Used for project management automation — creating tasks, updating status, reading database rows, and syncing content between Notion and other tools.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Interfaces with the Notion REST API to manage workspace content. Supports creating and updating database entries (rows), reading pages, appending content blocks, and querying databases with filters and sorts. A key node for knowledge base management and project tracking automation.

## Authentication

**Credential Type:** `notionApi`
**Auth Method:** Internal Integration Token (not OAuth2 for most use cases)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the Internal Integration Secret (starts with `secret_`)
4. Share each database/page with the integration (click Share → Invite → select integration)

**Important**: The integration must be explicitly shared with each database/page. Without sharing, all requests return 404.

Also supported: `notionOAuth2Api` for public app OAuth2 flows.

## Resources & Operations

| Resource | Operations |
|----------|-----------|
| Block | Append, Get Many |
| Database | Get, Get Many, Search |
| Database Page | Create, Get, Get Many, Update |
| Page | Archive, Create, Search |
| User | Get, Get Many |

**Primary use case**: Database Page operations — these are the rows in a Notion database.

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | options | Yes | Block, Database, Database Page, Page, User |
| `operation` | options | Yes | The action to perform |
| `databaseId` | resourceLocator | Yes (DB ops) | Notion database ID (from URL or search) |
| `pageId` | resourceLocator | Yes (page ops) | Notion page or database row ID |
| `propertiesUi` | collection | No | Database page properties to set (title, select, date, etc.) |
| `blockValues` | collection | No | Block content to append (paragraph, heading, to-do, etc.) |
| `filterJson` | json | No | Filter object for database queries |
| `sortValues` | array | No | Sort object for database queries |
| `returnAll` | boolean | No | Fetch all pages of results |
| `simplifyOutput` | boolean | No | Flatten Notion's complex property format to simple key-value |

## Common Errors & Fixes

- **404 Page Not Found**: Integration not shared with the database/page. Go to Notion → Share → Invite → add your integration.
- **401 Unauthorized**: Invalid integration token. Regenerate at notion.so/my-integrations.
- **400 Bad Request / property mismatch**: Property type in Notion doesn't match the value being set (e.g. trying to set a number field with a string). Check the database schema.
- **Rate limit (429)**: Notion API allows 3 requests/second average. Add Wait nodes when processing many pages.
- **Complex property format**: Notion returns properties as deeply nested objects. Use `simplifyOutput: true` to get flat key-value format for easier access in subsequent nodes.
- **Database row vs. page**: Notion database rows ARE pages — use Database Page operations to create/update rows, not the Page resource.
- **URL vs. ID**: Database IDs can be extracted from URLs: `https://notion.so/myworkspace/DATABASE_ID?v=...` — use the 32-character hex string (with dashes).

## Typical Workflow Pattern

```
Webhook (client form submission)
  → Notion (Database Page: Create, in "Client Projects" database)
  → Slack (#ops channel: new project created notification)
```

## Agency Use Cases

- **Project intake**: New client enquiry → create Notion database row with project details, status=Pending
- **Task management sync**: Linear/Asana webhook → mirror updates to Notion team dashboard
- **Knowledge base population**: Fetch web content → process with AI → append blocks to Notion page
