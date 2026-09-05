/**
 * Slack tools for hired AI employees, brokered through Nango.
 *
 * Mirrors the Gmail toolkit shape exactly (CP-38 toolkit pattern):
 *   - buildSlackToolsCore(userId): the ~95%-of-use tools, always loaded.
 *   - buildSlackToolsAdvanced(userId): on-demand tools + SLACK_TOOLS_ADVANCED_CATALOG.
 *   - SLACK_DESTRUCTIVE_TOOLS: write actions the approval gate must catch.
 *
 * The Slack Web API is method-style: every call is POST/GET to
 * `/api/<method>` and returns `{ ok: boolean, ... }`. Nango injects the
 * bot token. userId is closure-bound — the model never sees it.
 */

import { z } from 'zod'
import { tool } from 'ai'
import { nangoProxy, type NangoToolSlug } from '<npm>/lib/nango'

const SLACK: NangoToolSlug = 'slack'

// ─── CORE TOOLS (always loaded) ────────────────────────────────────────────

export function buildSlackToolsCore(userId: string) {
  return {
    slack_post_message: tool({
      description:
        'Post a message to a Slack channel or user. Use the channel id (e.g. "C0123") or a DM/user id. For threaded replies, pass thread_ts.',
      inputSchema: z.object({
        channel: z.string().describe('Channel id (C…), DM id, or #channel-name'),
        text: z.string().describe('Message text. Supports Slack mrkdwn.'),
        thread_ts: z.string().optional().describe('Parent message ts to reply in-thread'),
      }),
      execute: async ({ channel, text, thread_ts }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'POST',
          endpoint: '/api/chat.postMessage',
          data: { channel, text, ...(thread_ts ? { thread_ts } : {}) },
        }),
    }),

    slack_list_channels: tool({
      description:
        'List channels in the workspace (public + private the bot is in). Use to resolve a channel name to its id before posting.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(200).optional().default(100),
        cursor: z.string().optional().describe('Pagination cursor from a prior call'),
        types: z
          .string()
          .optional()
          .describe('Comma list: public_channel,private_channel,mpim,im'),
      }),
      execute: async ({ limit, cursor, types }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'GET',
          endpoint: '/api/conversations.list',
          params: {
            limit,
            ...(cursor ? { cursor } : {}),
            types: types ?? 'public_channel,private_channel',
          },
        }),
    }),

    slack_get_channel_history: tool({
      description:
        "Read recent messages from a channel. Use to catch up on a channel's activity, detect after-hours posting, or summarize a discussion.",
      inputSchema: z.object({
        channel: z.string().describe('Channel id (C…)'),
        limit: z.number().int().min(1).max(200).optional().default(50),
        oldest: z.string().optional().describe('Only messages after this ts'),
      }),
      execute: async ({ channel, limit, oldest }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'GET',
          endpoint: '/api/conversations.history',
          params: { channel, limit, ...(oldest ? { oldest } : {}) },
        }),
    }),

    slack_get_thread: tool({
      description: 'Read all replies in a thread, given the channel and the parent message ts.',
      inputSchema: z.object({
        channel: z.string(),
        ts: z.string().describe('Parent message timestamp'),
        limit: z.number().int().min(1).max(200).optional().default(100),
      }),
      execute: async ({ channel, ts, limit }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'GET',
          endpoint: '/api/conversations.replies',
          params: { channel, ts, limit },
        }),
    }),

    slack_list_users: tool({
      description:
        'List workspace members (id, name, real name, email if visible). Use to resolve a person to their Slack id for DMs/mentions.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(200).optional().default(100),
        cursor: z.string().optional(),
      }),
      execute: async ({ limit, cursor }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'GET',
          endpoint: '/api/users.list',
          params: { limit, ...(cursor ? { cursor } : {}) },
        }),
    }),

    slack_open_dm: tool({
      description:
        'Open (or fetch) a direct-message channel with one or more users, returning its channel id so you can slack_post_message to it.',
      inputSchema: z.object({
        users: z.string().describe('Comma-separated user ids (U…)'),
      }),
      execute: async ({ users }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'POST',
          endpoint: '/api/conversations.open',
          data: { users },
        }),
    }),
  }
}

// ─── ADVANCED TOOLS (loaded on demand via load_tool) ───────────────────────

export function buildSlackToolsAdvanced(userId: string) {
  return {
    slack_update_message: tool({
      description: 'Edit a message you previously posted (channel + ts + new text).',
      inputSchema: z.object({ channel: z.string(), ts: z.string(), text: z.string() }),
      execute: async ({ channel, ts, text }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'POST',
          endpoint: '/api/chat.update',
          data: { channel, ts, text },
        }),
    }),

    slack_delete_message: tool({
      description: 'Delete a message you posted (channel + ts).',
      inputSchema: z.object({ channel: z.string(), ts: z.string() }),
      execute: async ({ channel, ts }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'POST',
          endpoint: '/api/chat.delete',
          data: { channel, ts },
        }),
    }),

    slack_add_reaction: tool({
      description: 'Add an emoji reaction to a message (channel + ts + emoji name, no colons).',
      inputSchema: z.object({ channel: z.string(), timestamp: z.string(), name: z.string() }),
      execute: async ({ channel, timestamp, name }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'POST',
          endpoint: '/api/reactions.add',
          data: { channel, timestamp, name },
        }),
    }),

    slack_set_channel_topic: tool({
      description: 'Set a channel topic.',
      inputSchema: z.object({ channel: z.string(), topic: z.string() }),
      execute: async ({ channel, topic }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'POST',
          endpoint: '/api/conversations.setTopic',
          data: { channel, topic },
        }),
    }),

    slack_get_user_info: tool({
      description: 'Read one user profile by id.',
      inputSchema: z.object({ user: z.string() }),
      execute: async ({ user }) =>
        nangoProxy({
          userId,
          tool: SLACK,
          method: 'GET',
          endpoint: '/api/users.info',
          params: { user },
        }),
    }),
  }
}

// ─── CATALOG (name + description only) ──────────────────────────────────────

export const SLACK_TOOLS_ADVANCED_CATALOG = [
  { name: 'slack_update_message', description: 'Edit a message you posted.' },
  { name: 'slack_delete_message', description: 'Delete a message you posted.' },
  { name: 'slack_add_reaction', description: 'Add an emoji reaction to a message.' },
  { name: 'slack_set_channel_topic', description: 'Set a channel topic.' },
  { name: 'slack_get_user_info', description: 'Read one user profile by id.' },
  { name: 'slack_create_channel', description: 'Create a new channel.' },
  { name: 'slack_invite_to_channel', description: 'Invite users to a channel.' },
  { name: 'slack_archive_channel', description: 'Archive a channel.' },
  { name: 'slack_pin_message', description: 'Pin a message to a channel.' },
  { name: 'slack_upload_file', description: 'Upload a file to a channel.' },
  { name: 'slack_schedule_message', description: 'Schedule a message for later (post_at unix ts).' },
  { name: 'slack_set_status', description: 'Set the bot/user custom status.' },
] as const

export type SlackCoreToolName = keyof ReturnType<typeof buildSlackToolsCore>
export type SlackAdvancedToolName = keyof ReturnType<typeof buildSlackToolsAdvanced>

/**
 * Slack tools that write to the workspace. Read-only tools (list/get/history)
 * are omitted — always 'auto' in the approval gate.
 */
export const SLACK_DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  'slack_post_message',
  'slack_open_dm',
  'slack_update_message',
  'slack_delete_message',
  'slack_add_reaction',
  'slack_set_channel_topic',
])
