# n8n Node: Gmail

**Category:** Tools
**Node Type:** `n8n-nodes-base.gmail`
**Version:** 2.2 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Google/Gmail`
**Updated:** 2026-04-30

## Overview

Sends, reads, labels, and manages Gmail messages and threads. Used for automated email workflows — sending transactional emails, reading inbound enquiries, managing labels, and processing threads.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Interfaces with the Gmail REST API to perform email operations: send messages, fetch messages by filter or ID, manage labels, draft emails, and work with email threads. Supports HTML email composition with attachments.

Tip: For scheduled email fetching (e.g. read unread emails every 5 minutes), use the **Gmail Trigger** node (`n8n-nodes-base.gmailTrigger`) instead — it's simpler than combining Schedule Trigger with Gmail Get Many.

## Authentication

**Credential Types (choose one):**

| Type | Credential Name | Method |
|------|----------------|--------|
| OAuth2 (recommended) | `gmailOAuth2` | OAuth2 with Gmail API scopes |
| Service Account | `googleApi` | Service Account JSON key |

**Required Scopes** (from credential source):
- `https://www.googleapis.com/auth/gmail.labels`
- `https://www.googleapis.com/auth/gmail.addons.current.action.compose`
- `https://mail.google.com/` (full access)

**Recommended**: OAuth2 for personal Gmail accounts; Service Account with domain-wide delegation for G Suite/Workspace.

## Resources & Operations

| Resource | Operations |
|----------|-----------|
| Message | Add Label, Delete, Get, Get Many, Mark as Read, Mark as Unread, Remove Label, Reply, Send, Send and Wait for Response |
| Label | Create, Delete, Get, Get Many |
| Draft | Create, Delete, Get, Get Many, Send |
| Thread | Add Label, Delete, Get, Get Many, Remove Label, Reply, Trash |

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | options | Yes | Message, Label, Draft, Thread |
| `operation` | options | Yes | The action to perform |
| `sendTo` | string | Yes (send) | Recipient email address |
| `subject` | string | Yes (send) | Email subject line |
| `message` | string | Yes (send) | Email body (plain text or HTML) |
| `emailType` | options | No | `text` or `html` — controls Content-Type |
| `attachmentsUi` | collection | No | File attachments (binary data from previous nodes) |
| `messageId` | string | Yes (get/delete/mark) | Gmail message ID (from previous getAll or trigger) |
| `filters.labelIds` | array | No | Filter getAll by labels (e.g. `INBOX`, `UNREAD`) |
| `filters.q` | string | No | Gmail search query (e.g. `from:example@gmail.com`) |

## Common Errors & Fixes

- **401 Unauthorized / token expired**: Gmail OAuth2 tokens expire. For production, use a long-lived token via Google Cloud Console. Set up a "production" OAuth2 app (not test mode) — test app tokens expire after 7 days.
- **403 Forbidden / access denied**: Service Account not granted domain-wide delegation, or OAuth scope not granted. Check Google Workspace Admin → Security → API Controls.
- **Daily sending limit exceeded**: Free Gmail allows 500 emails/day; Workspace allows 2,000/day. Use Resend or SendGrid for bulk email.
- **Attachment size limit**: 25MB per message. Compress large files or link to Drive instead.
- **HTML not rendering**: Email client strips styles. Use inline CSS and avoid external stylesheets.
- **Rate limit (429)**: Gmail API allows 250 quota units/second. Reading messages costs 5 units each; sending costs 100. Add Wait nodes for bulk operations.

## Typical Workflow Pattern

```
Gmail Trigger (new email in INBOX with label "Client")
  → Code (parse email content, extract key info)
  → HubSpot (create/update contact)
  → Gmail (send acknowledgement reply)
```

## Agency Use Cases

- **Lead acknowledgement**: New enquiry email arrives → auto-reply within minutes → create CRM record
- **Client report delivery**: Schedule → generate PDF report → Gmail send to client list with attachment
- **Invoice processing**: Read incoming invoices via label → extract amounts → update accounting sheet → reply with receipt
