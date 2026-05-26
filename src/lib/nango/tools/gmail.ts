/**
 * Gmail tools for hired AI employees, brokered through Nango.
 *
 * Two-tier disclosure (mirrors CP-17 Skills pattern):
 *   - buildGmailToolsCore(userId): 14 tools that cover ~95% of employee use.
 *     Always loaded into the model's context when an employee has 'gmail'
 *     in their toolkit list. ~3k tokens total.
 *   - buildGmailToolsAdvanced(userId): 6 implemented advanced tools, plus
 *     GMAIL_TOOLS_ADVANCED_CATALOG which lists ~19 catalog-only entries
 *     loaded on demand via the `load_tool` discovery tool.
 *
 * Why factories, not static maps:
 *   The userId is bound by closure when the agent loop starts a session.
 *   The model NEVER sees the userId — it only sees per-call inputs
 *   (to, subject, body, etc.). This matches Vercel AI SDK + OpenAI Agents
 *   SDK + LangChain production patterns.
 *
 * Approval gating happens upstream of these functions in runAgent. By the
 * time `execute` runs, the gate has already decided this action is allowed.
 */

import { z } from 'zod'
import { tool } from 'ai'
import { nangoProxy, type NangoToolSlug } from '<npm>/lib/nango'

const GMAIL: NangoToolSlug = 'gmail'

/**
 * Build a base64url-encoded RFC 2822 message. Gmail's API expects the raw
 * MIME message in this format.
 */
function encodeRfc2822({
  to,
  subject,
  body,
  cc,
  bcc,
  threadId,
  fromName,
}: {
  to: string | string[]
  subject: string
  body: string
  cc?: string | string[]
  bcc?: string | string[]
  threadId?: string
  fromName?: string
}): { raw: string; threadId?: string } {
  const headers: string[] = []
  headers.push(`To: ${Array.isArray(to) ? to.join(', ') : to}`)
  if (cc) headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
  if (bcc) headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
  headers.push(`Subject: ${subject}`)
  if (fromName) headers.push(`From: ${fromName}`)
  headers.push('Content-Type: text/plain; charset=UTF-8')
  headers.push('MIME-Version: 1.0')

  const message = `${headers.join('\r\n')}\r\n\r\n${body}`
  const raw = Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return threadId ? { raw, threadId } : { raw }
}

// ─── CORE TOOLS (always loaded) ────────────────────────────────────────────

export function buildGmailToolsCore(userId: string) {
  return {
    gmail_send: tool({
      description:
        'Send a new email via the customer\'s Gmail account. Use for outbound contact (follow-ups, alerts, status updates). For replies in an existing thread, use gmail_reply instead.',
      inputSchema: z.object({
        to: z.string().describe('Recipient email or comma-separated list'),
        subject: z.string(),
        body: z.string().describe('Plain-text body. Use \\n for newlines.'),
        cc: z.string().optional(),
        bcc: z.string().optional(),
      }),
      execute: async ({ to, subject, body, cc, bcc }) => {
        const message = encodeRfc2822({ to, subject, body, cc, bcc })
        return nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: '/gmail/v1/users/me/messages/send',
          data: message,
        })
      },
    }),

    gmail_reply: tool({
      description:
        'Reply within an existing Gmail thread. Preserves conversation context so the recipient sees it threaded in their inbox.',
      inputSchema: z.object({
        threadId: z.string().describe('Thread id from gmail_list_messages or gmail_get_thread'),
        to: z.string(),
        subject: z.string().describe('Should start with "Re: " for proper threading'),
        body: z.string(),
      }),
      execute: async ({ threadId, to, subject, body }) => {
        const message = encodeRfc2822({ to, subject, body, threadId })
        return nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: '/gmail/v1/users/me/messages/send',
          data: message,
        })
      },
    }),

    gmail_create_draft: tool({
      description:
        'Save an email as a draft (not sent). Use when the customer\'s autonomy is "ask" and you want to prepare something for their review, or when you\'re unsure about content.',
      inputSchema: z.object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
        cc: z.string().optional(),
        threadId: z.string().optional(),
      }),
      execute: async ({ to, subject, body, cc, threadId }) => {
        const message = encodeRfc2822({ to, subject, body, cc, threadId })
        return nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: '/gmail/v1/users/me/drafts',
          data: { message },
        })
      },
    }),

    gmail_list_messages: tool({
      description:
        'Search the customer\'s Gmail. Returns up to 50 message ids matching the query. Use Gmail\'s search syntax: from:, to:, subject:, has:attachment, newer_than:7d, label:unread, etc.',
      inputSchema: z.object({
        query: z.string().describe('Gmail search — e.g. "from:client@acme.com newer_than:30d"'),
        maxResults: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ query, maxResults }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: '/gmail/v1/users/me/messages',
          params: { q: query, maxResults: String(maxResults) },
        }),
    }),

    gmail_get_message: tool({
      description:
        'Read a single email by id. Returns headers + body. Use after gmail_list_messages to see content.',
      inputSchema: z.object({
        messageId: z.string(),
        format: z.enum(['minimal', 'metadata', 'full']).default('full'),
      }),
      execute: async ({ messageId, format }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: `/gmail/v1/users/me/messages/${messageId}`,
          params: { format },
        }),
    }),

    gmail_get_thread: tool({
      description:
        'Read all messages in a Gmail thread (a full conversation). Use when you need back-and-forth context for a reply.',
      inputSchema: z.object({ threadId: z.string() }),
      execute: async ({ threadId }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: `/gmail/v1/users/me/threads/${threadId}`,
        }),
    }),

    gmail_modify_message: tool({
      description:
        'Add or remove labels on a message. Use to archive (remove INBOX), mark read (remove UNREAD), star, or apply custom labels.',
      inputSchema: z.object({
        messageId: z.string(),
        addLabelIds: z.array(z.string()).default([]),
        removeLabelIds: z.array(z.string()).default([]),
      }),
      execute: async ({ messageId, addLabelIds, removeLabelIds }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: `/gmail/v1/users/me/messages/${messageId}/modify`,
          data: { addLabelIds, removeLabelIds },
        }),
    }),

    gmail_trash_message: tool({
      description:
        'Move a message to Trash (soft-delete, recoverable for 30 days). Prefer this over delete — never permanently destroy customer email.',
      inputSchema: z.object({ messageId: z.string() }),
      execute: async ({ messageId }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: `/gmail/v1/users/me/messages/${messageId}/trash`,
        }),
    }),

    gmail_list_threads: tool({
      description:
        'List threads (conversations) matching a query. Same syntax as gmail_list_messages, but groups by conversation.',
      inputSchema: z.object({
        query: z.string(),
        maxResults: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ query, maxResults }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: '/gmail/v1/users/me/threads',
          params: { q: query, maxResults: String(maxResults) },
        }),
    }),

    gmail_list_drafts: tool({
      description: 'List all drafts in the customer\'s Gmail.',
      inputSchema: z.object({
        maxResults: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ maxResults }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: '/gmail/v1/users/me/drafts',
          params: { maxResults: String(maxResults) },
        }),
    }),

    gmail_send_draft: tool({
      description:
        'Send a previously-created draft (by id). Use when the customer approved a draft in the action queue.',
      inputSchema: z.object({ draftId: z.string() }),
      execute: async ({ draftId }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: '/gmail/v1/users/me/drafts/send',
          data: { id: draftId },
        }),
    }),

    gmail_update_draft: tool({
      description: 'Edit an existing draft\'s subject/body/recipients.',
      inputSchema: z.object({
        draftId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
      execute: async ({ draftId, to, subject, body }) => {
        const message = encodeRfc2822({ to, subject, body })
        return nangoProxy({
          userId,
          tool: GMAIL,
          method: 'PUT',
          endpoint: `/gmail/v1/users/me/drafts/${draftId}`,
          data: { message },
        })
      },
    }),

    gmail_list_labels: tool({
      description:
        'List all available labels in the customer\'s Gmail (system + custom). Use before gmail_modify_message to find label ids.',
      inputSchema: z.object({}),
      execute: async () =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: '/gmail/v1/users/me/labels',
        }),
    }),

    gmail_create_label: tool({
      description: 'Create a new custom label (e.g. "Followed-up", "Awaiting reply").',
      inputSchema: z.object({
        name: z.string(),
        labelListVisibility: z
          .enum(['labelShow', 'labelHide', 'labelShowIfUnread'])
          .default('labelShow'),
        messageListVisibility: z.enum(['show', 'hide']).default('show'),
      }),
      execute: async ({ name, labelListVisibility, messageListVisibility }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: '/gmail/v1/users/me/labels',
          data: { name, labelListVisibility, messageListVisibility },
        }),
    }),
  } as const
}

// ─── ADVANCED TOOLS (load on demand via `load_tool`) ───────────────────────

export function buildGmailToolsAdvanced(userId: string) {
  return {
    gmail_untrash_message: tool({
      description: 'Restore a trashed message to inbox.',
      inputSchema: z.object({ messageId: z.string() }),
      execute: async ({ messageId }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: `/gmail/v1/users/me/messages/${messageId}/untrash`,
        }),
    }),

    gmail_modify_thread: tool({
      description: 'Add/remove labels on an entire thread.',
      inputSchema: z.object({
        threadId: z.string(),
        addLabelIds: z.array(z.string()).default([]),
        removeLabelIds: z.array(z.string()).default([]),
      }),
      execute: async ({ threadId, addLabelIds, removeLabelIds }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: `/gmail/v1/users/me/threads/${threadId}/modify`,
          data: { addLabelIds, removeLabelIds },
        }),
    }),

    gmail_trash_thread: tool({
      description: 'Move an entire thread to Trash.',
      inputSchema: z.object({ threadId: z.string() }),
      execute: async ({ threadId }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'POST',
          endpoint: `/gmail/v1/users/me/threads/${threadId}/trash`,
        }),
    }),

    gmail_get_draft: tool({
      description: 'Read a single draft by id.',
      inputSchema: z.object({ draftId: z.string() }),
      execute: async ({ draftId }) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: `/gmail/v1/users/me/drafts/${draftId}`,
        }),
    }),

    gmail_get_vacation_settings: tool({
      description: 'Read vacation responder config.',
      inputSchema: z.object({}),
      execute: async () =>
        nangoProxy({
          userId,
          tool: GMAIL,
          endpoint: '/gmail/v1/users/me/settings/vacation',
        }),
    }),

    gmail_update_vacation_settings: tool({
      description: 'Turn on/off vacation responder.',
      inputSchema: z.object({
        enableAutoReply: z.boolean(),
        responseSubject: z.string().optional(),
        responseBodyPlainText: z.string().optional(),
        startTime: z.string().optional().describe('ISO timestamp'),
        endTime: z.string().optional(),
      }),
      execute: async (rest) =>
        nangoProxy({
          userId,
          tool: GMAIL,
          method: 'PUT',
          endpoint: '/gmail/v1/users/me/settings/vacation',
          data: rest,
        }),
    }),
  } as const
}

// ─── CATALOG (name + description only — visible to the model so it knows
// what's available; full schema loads via `load_tool` only when needed) ────

export const GMAIL_TOOLS_ADVANCED_CATALOG = [
  { name: 'gmail_untrash_message', description: 'Restore a trashed message to inbox.' },
  { name: 'gmail_delete_message', description: 'PERMANENTLY delete a message. Cannot be undone. Prefer gmail_trash_message.' },
  { name: 'gmail_batch_modify_messages', description: 'Add/remove labels on up to 1000 messages in one call.' },
  { name: 'gmail_batch_delete_messages', description: 'PERMANENTLY delete up to 1000 messages. Dangerous.' },
  { name: 'gmail_get_draft', description: 'Read a single draft by id.' },
  { name: 'gmail_delete_draft', description: 'Discard a draft.' },
  { name: 'gmail_modify_thread', description: 'Add/remove labels on an entire thread.' },
  { name: 'gmail_trash_thread', description: 'Move an entire thread to Trash.' },
  { name: 'gmail_untrash_thread', description: 'Restore a trashed thread.' },
  { name: 'gmail_delete_thread', description: 'PERMANENTLY delete a thread.' },
  { name: 'gmail_create_filter', description: 'Create a server-side filter rule (auto-label, archive, forward, delete).' },
  { name: 'gmail_delete_filter', description: 'Delete a filter rule.' },
  { name: 'gmail_get_filter', description: 'Read one filter rule by id.' },
  { name: 'gmail_list_filters', description: 'List all filter rules.' },
  { name: 'gmail_get_label', description: 'Read one label by id.' },
  { name: 'gmail_update_label', description: 'Rename or update a label\'s visibility.' },
  { name: 'gmail_delete_label', description: 'Delete a label.' },
  { name: 'gmail_get_attachment', description: 'Download a specific attachment from a message.' },
  { name: 'gmail_get_vacation_settings', description: 'Read vacation responder (out-of-office) config.' },
  { name: 'gmail_update_vacation_settings', description: 'Turn on/off vacation responder or change message.' },
  { name: 'gmail_list_send_as', description: 'List send-as aliases (alternate from addresses).' },
  { name: 'gmail_create_send_as', description: 'Add a send-as alias.' },
  { name: 'gmail_update_send_as', description: 'Update a send-as alias\'s display name or signature.' },
  { name: 'gmail_delete_send_as', description: 'Remove a send-as alias.' },
  { name: 'gmail_verify_send_as', description: 'Send verification email for a new send-as alias.' },
] as const

export type GmailCoreToolName = keyof ReturnType<typeof buildGmailToolsCore>
export type GmailAdvancedToolName = keyof ReturnType<typeof buildGmailToolsAdvanced>
