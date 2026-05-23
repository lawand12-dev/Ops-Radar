# n8n Node: Slack

**Category:** Tools
**Node Type:** `n8n-nodes-base.slack`
**Version:** 2.4 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Slack`
**Updated:** 2026-04-30

## Overview

Sends messages, manages channels, reads users, and interacts with Slack workspaces. The most common notification and team communication node in n8n — used as the output target in 32% of all n8n workflow templates.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Interfaces with the Slack Web API to post messages, manage channels, upload files, add reactions, and read workspace data. Supports both Bot Token (app) and OAuth2 authentication. Messages can include Block Kit formatting, attachments, threads, and file references.

## Authentication

**Credential Types (choose one):**

| Type | Credential Name | Token Type |
|------|----------------|-----------|
| Bot Token | `slackApi` | `xoxb-...` Bot User OAuth Token |
| OAuth2 | `slackOAuth2Api` | OAuth2 flow (installs Slack app to workspace) |

**Required OAuth Scopes** (from credential source):
- `channels:read` — list channels
- `channels:write` — create/archive channels
- `channels:history` — read message history
- `chat:write` — post messages
- `files:write` — upload files
- `reactions:write` — add/remove reactions
- `users:read` — list users

**Recommended**: Use Bot Token (`xoxb-...`) for most agency automation. Create a Slack App in api.slack.com/apps, install to workspace, copy Bot Token.

## Resources & Operations

| Resource | Operations |
|----------|-----------|
| Channel | Archive, Close, Create, Get, Get Many, History, Invite, Join, Kick, Leave, Member, Open, Rename, Replies, Set Purpose, Set Topic, Unarchive |
| File | Get, Get Many, Upload |
| Message | Delete, Get Permalink, Post, Search, Update |
| Reaction | Add, Get, Remove |
| Star | Add, Delete, Get Many |
| User | Get, Get Many, Get Profile |
| User Group | Create, Disable, Enable, Get Many, Update |

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | options | Yes | Channel, Message, File, Reaction, etc. |
| `operation` | options | Yes | The action to perform |
| `channel` | string | Yes (most message ops) | Channel name (`#general`) or ID (`C01234ABC`) |
| `text` | string | Yes (post message) | Message text — supports Slack markdown |
| `blocksUi` | collection | No | Block Kit blocks for rich message formatting |
| `attachmentsUi` | collection | No | Legacy attachment objects |
| `threadTs` | string | No | Thread timestamp to reply in a thread |
| `username` | string | No | Override the bot display name |
| `iconEmoji` / `iconUrl` | string | No | Override the bot avatar |
| `mrkdwn` | boolean | No | Enable Slack markdown parsing |

## Rate Limits

Slack Web API rate limits by tier:
- **Tier 1** (Get Many, History): 1 call/minute per method
- **Tier 2** (Get, Join, Leave): 20 calls/minute
- **Tier 3** (Post message, Update): 50 calls/minute
- **Tier 4** (reactions.add): 100 calls/minute

For bulk messaging, add Wait nodes (1-2s) between messages to avoid hitting Tier 3 limits.

## Common Errors & Fixes

- **`channel_not_found`**: Channel doesn't exist or bot not a member. Invite the bot to the channel first (`/invite @BotName`).
- **`not_in_channel`**: Bot must be invited to private channels explicitly. Public channels can be joined automatically.
- **`invalid_auth`**: Bot token (`xoxb-...`) is wrong or revoked. Regenerate under api.slack.com → App → OAuth & Permissions.
- **`missing_scope`**: Token lacks the required permission. Reinstall app with updated scopes.
- **`ratelimited` (429)**: Too many API calls. Add Wait node between calls (especially for bulk operations).
- **`no_text`**: Message post with empty text and no blocks. Always provide either `text` or blocks.
- **Wrong channel format**: Channel parameter accepts both `#channel-name` and `CXXXXXXXX` ID. Prefer the ID in production (channel can be renamed, ID never changes).

## Typical Workflow Pattern

```
Webhook (alert trigger)
  → IF (is critical severity?)
    → [True] Slack (post to #alerts with @channel mention)
    → [False] Slack (post to #notifications without mention)
```

## Agency Use Cases

- **Client alert system**: Monitor metrics → Slack notification when threshold exceeded
- **Daily standup bot**: Schedule → pull Jira/Asana tasks → post morning summary to team channel
- **New lead notification**: CRM webhook → Slack post to #sales with lead details and Calendly link
