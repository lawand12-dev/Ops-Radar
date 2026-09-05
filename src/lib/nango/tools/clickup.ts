/**
 * ClickUp tools for hired AI employees, brokered through Nango.
 *
 * Same toolkit shape as Gmail (CP-38 pattern). ClickUp API v2 is REST:
 *   - /api/v2/team                          → workspaces
 *   - /api/v2/list/{list_id}/task           → tasks in a list
 *   - /api/v2/task/{task_id}                → one task
 * Nango injects the OAuth token. userId is closure-bound.
 *
 * Powers the delivery / project-coordinator employees: read project + task
 * status, surface overdue work, create + update + comment on tasks (writes
 * are approval-gated).
 */

import { z } from 'zod'
import { tool } from 'ai'
import { nangoProxy, type NangoToolSlug } from '<npm>/lib/nango'

const CLICKUP: NangoToolSlug = 'clickup'

// ─── CORE TOOLS (always loaded) ────────────────────────────────────────────

export function buildClickupToolsCore(userId: string) {
  return {
    clickup_list_workspaces: tool({
      description:
        'List the workspaces (teams) the account belongs to. Start here to get the team_id you need for spaces/folders/lists.',
      inputSchema: z.object({}),
      execute: async () =>
        nangoProxy({ userId, tool: CLICKUP, method: 'GET', endpoint: '/api/v2/team' }),
    }),

    clickup_list_spaces: tool({
      description: 'List spaces within a workspace. team_id comes from clickup_list_workspaces.',
      inputSchema: z.object({ team_id: z.string() }),
      execute: async ({ team_id }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'GET',
          endpoint: `/api/v2/team/${team_id}/space`,
        }),
    }),

    clickup_list_lists: tool({
      description:
        'List the task lists in a folder, or folderless lists in a space. Pass either folder_id or space_id.',
      inputSchema: z.object({
        folder_id: z.string().optional(),
        space_id: z.string().optional(),
      }),
      execute: async ({ folder_id, space_id }) => {
        const endpoint = folder_id
          ? `/api/v2/folder/${folder_id}/list`
          : `/api/v2/space/${space_id}/list`
        return nangoProxy({ userId, tool: CLICKUP, method: 'GET', endpoint })
      },
    }),

    clickup_get_tasks: tool({
      description:
        'List tasks in a list. Use to read project status, find overdue or unassigned tasks. Set include_closed to also see done tasks.',
      inputSchema: z.object({
        list_id: z.string(),
        include_closed: z.boolean().optional().default(false),
        page: z.number().int().min(0).optional().default(0),
      }),
      execute: async ({ list_id, include_closed, page }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'GET',
          endpoint: `/api/v2/list/${list_id}/task`,
          params: { include_closed: include_closed ? 'true' : 'false', page },
        }),
    }),

    clickup_get_task: tool({
      description: 'Read one task in full — status, assignees, due date, description, custom fields.',
      inputSchema: z.object({ task_id: z.string() }),
      execute: async ({ task_id }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'GET',
          endpoint: `/api/v2/task/${task_id}`,
        }),
    }),

    clickup_create_task: tool({
      description:
        'Create a task in a list. Provide a name; optionally description, assignees (user ids), due_date (unix ms), priority (1=urgent…4=low).',
      inputSchema: z.object({
        list_id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        assignees: z.array(z.number()).optional(),
        due_date: z.number().optional().describe('Unix ms'),
        priority: z.number().int().min(1).max(4).optional(),
      }),
      execute: async ({ list_id, name, description, assignees, due_date, priority }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'POST',
          endpoint: `/api/v2/list/${list_id}/task`,
          data: {
            name,
            ...(description ? { description } : {}),
            ...(assignees ? { assignees } : {}),
            ...(due_date ? { due_date } : {}),
            ...(priority ? { priority } : {}),
          },
        }),
    }),

    clickup_update_task: tool({
      description:
        'Update a task — change status, due date, assignees, priority, or name. Pass only what changes.',
      inputSchema: z.object({
        task_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional().describe('Status name, e.g. "in progress", "complete"'),
        due_date: z.number().optional(),
        priority: z.number().int().min(1).max(4).optional(),
      }),
      execute: async ({ task_id, name, description, status, due_date, priority }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'PUT',
          endpoint: `/api/v2/task/${task_id}`,
          data: {
            ...(name ? { name } : {}),
            ...(description ? { description } : {}),
            ...(status ? { status } : {}),
            ...(due_date ? { due_date } : {}),
            ...(priority ? { priority } : {}),
          },
        }),
    }),

    clickup_comment_task: tool({
      description: 'Add a comment to a task. Use to flag a blocker or note what an employee found.',
      inputSchema: z.object({
        task_id: z.string(),
        comment_text: z.string(),
        notify_all: z.boolean().optional().default(false),
      }),
      execute: async ({ task_id, comment_text, notify_all }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'POST',
          endpoint: `/api/v2/task/${task_id}/comment`,
          data: { comment_text, notify_all },
        }),
    }),
  }
}

// ─── ADVANCED TOOLS (loaded on demand) ─────────────────────────────────────

export function buildClickupToolsAdvanced(userId: string) {
  return {
    clickup_list_folders: tool({
      description: 'List folders within a space.',
      inputSchema: z.object({ space_id: z.string() }),
      execute: async ({ space_id }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'GET',
          endpoint: `/api/v2/space/${space_id}/folder`,
        }),
    }),

    clickup_delete_task: tool({
      description: 'Delete a task. Irreversible — prefer setting status to closed.',
      inputSchema: z.object({ task_id: z.string() }),
      execute: async ({ task_id }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'DELETE',
          endpoint: `/api/v2/task/${task_id}`,
        }),
    }),

    clickup_get_task_comments: tool({
      description: 'Read all comments on a task.',
      inputSchema: z.object({ task_id: z.string() }),
      execute: async ({ task_id }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'GET',
          endpoint: `/api/v2/task/${task_id}/comment`,
        }),
    }),

    clickup_list_members: tool({
      description: 'List members of a workspace (to resolve assignee user ids).',
      inputSchema: z.object({ team_id: z.string() }),
      execute: async ({ team_id }) =>
        nangoProxy({
          userId,
          tool: CLICKUP,
          method: 'GET',
          endpoint: `/api/v2/team/${team_id}`,
        }),
    }),
  }
}

// ─── CATALOG ────────────────────────────────────────────────────────────────

export const CLICKUP_TOOLS_ADVANCED_CATALOG = [
  { name: 'clickup_list_folders', description: 'List folders within a space.' },
  { name: 'clickup_delete_task', description: 'Delete a task (irreversible).' },
  { name: 'clickup_get_task_comments', description: 'Read all comments on a task.' },
  { name: 'clickup_list_members', description: 'List workspace members.' },
  { name: 'clickup_create_list', description: 'Create a new list in a folder/space.' },
  { name: 'clickup_set_custom_field', description: 'Set a custom field value on a task.' },
  { name: 'clickup_add_dependency', description: 'Add a task dependency.' },
  { name: 'clickup_get_time_tracked', description: 'Read time tracked on a task.' },
  { name: 'clickup_create_checklist', description: 'Add a checklist to a task.' },
] as const

export type ClickupCoreToolName = keyof ReturnType<typeof buildClickupToolsCore>
export type ClickupAdvancedToolName = keyof ReturnType<typeof buildClickupToolsAdvanced>

/** Write actions — approval-gated. Read tools (list/get) are auto. */
export const CLICKUP_DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  'clickup_create_task',
  'clickup_update_task',
  'clickup_comment_task',
  'clickup_delete_task',
])
