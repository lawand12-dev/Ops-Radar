/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

import { z } from 'zod'
import type { Employee } from './types'

// ─── Local ToolSlug stub (was imported from deleted <npm>/lib/composio) ──
// Kept as a permissive string alias so downstream type checks still pass.
type ToolSlug = string

// ─── Schema: what generateObject returns ────────────────────────────────

const ALLOWED_MODELS = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.5',
  'gpt-4.1-nano',
  'o3',
  'o4-mini',
] as const

export const CustomEmployeeDraftSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z][a-z0-9-]{1,40}$/, 'must be kebab-case, start with a letter, 2-40 chars'),
  name: z.string().min(1).max(30),
  role: z.string().min(3).max(60),
  emoji: z.string().min(1).max(4),
  persona_summary: z
    .string()
    .min(20)
    .max(500)
    .describe('1-2 sentences in plain English describing who this employee is and what they do'),
  schedule_human: z
    .string()
    .describe('Plain-English schedule like "Every day at 8am UTC" or "Chat-only (no schedule)"'),
  schedule_cron: z
    .string()
    .nullable()
    .describe('5-field cron like "0 8 * * *" or null if chat-only. UTC only.'),
  scoped_toolkits: z
    .array(z.string())
    .min(0)
    .max(10)
    .describe(
      'Composio toolkit slugs this employee can call. Empty = chat/brain only. Choose from the AVAILABLE TOOLKITS list.',
    ),
  scoped_brain_prefixes: z
    .array(z.string())
    .min(0)
    .max(8)
    .describe(
      'Brain directory prefixes (with trailing slash) this employee can read/write. Include "employees/<slug>/" for their own private notes. Choose from the AVAILABLE BRAIN DIRECTORIES list.',
    ),
  model_slug: z
    .enum(ALLOWED_MODELS)
    .default('gpt-5.4')
    .describe('Which OpenAI model the employee should use. Default gpt-5.4 unless task is trivial (nano) or complex multi-step (o3/o4-mini).'),
  max_steps: z
    .number()
    .int()
    .min(5)
    .max(50)
    .default(20)
    .describe('Max tool-call steps per run. 20 is the default; raise for complex multi-step employees.'),
  system_prompt: z
    .string()
    .min(150)
    .max(8000)
    .describe(
      "Full system prompt for the employee. Should establish their identity ('You are Sarah...'), responsibilities, decision-making style, and what they should write to the brain after each run.",
    ),
  first_task: z
    .string()
    .min(10)
    .max(200)
    .describe('The first concrete task this employee will do on their next run. Shown on the hire card.'),
  unsupported: z
    .object({
      reason: z.string().describe('Why this employee cannot be hired given current constraints.'),
    })
    .nullable()
    .default(null)
    .describe(
      "Set to {reason: ...} if the customer's request can't be expressed (e.g. requires toolkits they haven't connected, needs sub-minute cron, references built-in slugs that would shadow). null otherwise.",
    ),
})

export type CustomEmployeeDraft = z.infer<typeof CustomEmployeeDraftSchema>

// ─── Inputs the caller assembles ────────────────────────────────────────

export type CompileEmployeeInput = {
  description: string
  connectedToolkits: ToolSlug[]
  existingTeam: Array<Pick<Employee, 'slug' | 'display'>>
  reservedSlugs: string[]
}

// ─── Stubbed compile call ───────────────────────────────────────────────

export async function compileCustomEmployee(
  input: CompileEmployeeInput,
): Promise<CustomEmployeeDraft> {
  void input
  console.warn('[STUB] compileCustomEmployee — composio-to-nango migration in progress')
  return {
    slug: 'stub-employee',
    name: 'Stub',
    role: 'Placeholder',
    emoji: '🛠️',
    persona_summary:
      'Stubbed employee returned during the Composio-to-Nango migration. Real compilation is offline.',
    schedule_human: 'Chat-only (no schedule)',
    schedule_cron: null,
    scoped_toolkits: [],
    scoped_brain_prefixes: [],
    model_slug: 'gpt-5.4',
    max_steps: 20,
    system_prompt:
      'You are a stub employee created during the Composio-to-Nango migration. Real compilation is offline; this is a placeholder so the codebase compiles.',
    first_task: 'Wait for the Nango migration to complete.',
    unsupported: {
      reason: 'Employee compilation is temporarily disabled during the Composio-to-Nango migration.',
    },
  }
}

export function buildEmployeeCompilationPrompt(input: CompileEmployeeInput): string {
  void input
  console.warn('[STUB] buildEmployeeCompilationPrompt — composio-to-nango migration in progress')
  return ''
}
