/**
 * Zod schemas for the COO compilation flow.
 *
 * `AutomationDraftSchema` is the structured output the COO's `generateObject`
 * call returns. Mirrors `AutomationSpec` from ./types.ts but constrained to the
 * subset the synchronous executor (Phase 3) can run today — no `wait`, `loop`,
 * or `agent_step`. The draft is shown inline to the customer for confirmation
 * before any row is written.
 *
 * Keep this in sync with src/lib/automations/types.ts. The Zod side is the
 * runtime guard; the .d.ts side is the editor surface.
 */

import { z } from 'zod'

const JsonScalar = z.union([z.string(), z.number(), z.boolean(), z.null()])
const JsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([JsonScalar, z.array(JsonValue), z.record(z.string(), JsonValue)]),
)

const ComposioActionStep = z.object({
  kind: z.literal('composio_action'),
  toolkit: z.string(),
  action_slug: z.string(),
  arguments: z.record(z.string(), JsonValue),
  ref: z.string().optional(),
})

const NotionWriteStep = z.object({
  kind: z.literal('notion_write'),
  database_slug: z.string(),
  properties: z.record(z.string(), JsonValue),
  ref: z.string().optional(),
})

const SetStep = z.object({
  kind: z.literal('set'),
  key: z.string(),
  value: z.string(),
})

const QueueActionStep = z.object({
  kind: z.literal('queue_action'),
  action_type: z.string(),
  payload_template: z.record(z.string(), JsonValue),
})

// `condition` allows nested steps — declare recursively. We cap the union to
// v1-executable kinds so an LLM can't draft something the executor will reject.
type V1Step =
  | z.infer<typeof ComposioActionStep>
  | z.infer<typeof NotionWriteStep>
  | z.infer<typeof SetStep>
  | z.infer<typeof QueueActionStep>
  | {
      kind: 'condition'
      branches: Array<{ when: string; steps: V1Step[] }>
    }

export const AutomationStepSchema: z.ZodType<V1Step> = z.lazy(() =>
  z.union([
    ComposioActionStep,
    NotionWriteStep,
    SetStep,
    QueueActionStep,
    z.object({
      kind: z.literal('condition'),
      branches: z.array(
        z.object({
          when: z.string(),
          steps: z.array(AutomationStepSchema),
        }),
      ),
    }),
  ]),
)

export const AutomationDraftSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  name: z.string().min(3).max(80),
  description: z.string().min(10).max(500),
  trigger: z.object({
    kind: z.enum(['composio_event', 'schedule', 'manual', 'webhook']),
    toolkit: z.string().nullable(),
    slug: z.string().nullable(),
    filter: z.record(z.string(), JsonValue).default({}),
    schedule_cron: z.string().nullable().optional(),
  }),
  spec: z.object({
    version: z.literal(1),
    steps: z.array(AutomationStepSchema),
  }),
  autonomy: z.enum(['ask', 'auto', 'off']).default('ask'),
  duplicates_of: z.array(z.string()).default([]),
})

export type AutomationDraft = z.infer<typeof AutomationDraftSchema>
