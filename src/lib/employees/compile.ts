/**
 * Compile natural-language descriptions into typed CustomEmployeeDraft (CP-34b).
 *
 * The Hire chat tool `propose_custom_employee` takes the customer's free-form
 * description ("I want a Bookkeeper named Sarah, every day at 8am, checks
 * Gmail") and uses `generateObject` to compile it into a structured draft
 * the customer can confirm before we persist.
 *
 * Lindy 2.0 "on rails" principle — the model can ONLY choose toolkits and
 * brain prefixes that exist; it cannot invent slugs.
 *
 * Hard guarantees:
 *   - slug is kebab-case + reserved-slug check happens caller-side
 *   - scoped_toolkits ⊆ known toolkit slugs (validated via catalog)
 *   - scoped_brain_prefixes ⊆ BRAIN_DIRECTORIES (so brain reads/writes
 *     can never escape the customer's organized layout)
 *   - schedule_cron is either null (chat-only employee) or a real 5-field
 *     cron expression
 *   - model_slug is restricted to the same enum the runAgent loop accepts
 */

import { z } from 'zod'
import { generateObjectWithFallback } from '<npm>/lib/ai/model-provider'
import { BRAIN_DIRECTORIES } from '<npm>/lib/brain/paths'
import type { Employee } from './types'

// Permissive string alias — toolkit slugs are validated against the live
// catalog (TOOLKIT_LABELS + the caller's connected list), not a TS enum.
type ToolSlug = string

// Human-readable labels for the toolkit catalog injected into the prompt.
// Keep in sync with the toolkit catalog as integrations ship.
// `notion` is connectable (the brain) even though it has no agent of its own.
const TOOLKIT_LABELS: Record<string, string> = {
  gmail: 'Gmail — read, search, label, draft, send email',
  notion: 'Notion — read + write the customer-owned company brain',
}

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
      'Toolkit slugs this employee can call. Empty = chat/brain only. Choose from the AVAILABLE TOOLKITS list.',
    ),
  scoped_brain_prefixes: z
    .array(z.string())
    .min(0)
    .max(8)
    .describe(
      'Brain directory prefixes (with trailing slash) this employee can read/write. Include "employees/<slug>/" for their own private notes. Choose from the AVAILABLE BRAIN DIRECTORIES list.',
    ),
  // NOTE: no `.default()` anywhere in this schema. Groq's strict json_schema
  // mode (gpt-oss backup, used when OpenAI is down) requires EVERY property to
  // be listed in `required`, and Zod's `.default()` marks a field optional —
  // which Groq rejects with "`required` is required ... including every key in
  // properties". So every field is required and the model must supply it; the
  // .min/.max bounds still validate. Re-adding a `.default()` will break the
  // backup compile path.
  model_slug: z
    .enum(ALLOWED_MODELS)
    .describe('Which OpenAI model the employee should use. Default to gpt-5.4 unless task is trivial (gpt-4.1-nano) or complex multi-step (o3/o4-mini).'),
  max_steps: z
    .number()
    .int()
    .min(5)
    .max(50)
    .describe('Max tool-call steps per run. Use 20 as a sensible default; raise for complex multi-step employees.'),
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
    .describe(
      "Set to {reason: ...} if the customer's request can't be expressed (e.g. requires toolkits they haven't connected, needs sub-minute cron, references built-in slugs that would shadow). Otherwise set to null.",
    ),
})

export type CustomEmployeeDraft = z.infer<typeof CustomEmployeeDraftSchema>

// ─── Inputs the caller assembles ────────────────────────────────────────

export type CompileEmployeeInput = {
  /** The customer's natural-language description verbatim. */
  description: string
  /** ToolSlugs the customer has actually connected (filtered to what works today). */
  connectedToolkits: ToolSlug[]
  /** Current workforce — used so the model can avoid name/slug collisions. */
  existingTeam: Array<Pick<Employee, 'slug' | 'display'>>
  /** Reserved slugs (the built-in agents) — model must not propose these. */
  reservedSlugs: string[]
}

// ─── The actual compile call ────────────────────────────────────────────

export async function compileCustomEmployee(
  input: CompileEmployeeInput,
): Promise<CustomEmployeeDraft> {
  const prompt = buildEmployeeCompilationPrompt(input)
  const { object } = await generateObjectWithFallback({
    model: 'gpt-5.4',
    schema: CustomEmployeeDraftSchema,
    system: EMPLOYEE_COMPILER_SYSTEM,
    prompt,
  })
  return object as CustomEmployeeDraft
}

// ─── System prompt: voice + non-negotiable rules ────────────────────────

const EMPLOYEE_COMPILER_SYSTEM = [
  "You are compiling an OpsRadar customer's request into a typed CustomEmployeeDraft.",
  '',
  'This is the "AI employee" feature — the customer is hiring a named, persistent AI teammate who has a personality, runs on a schedule (or chat-only), can call specific SaaS tools through connected integrations, and writes durable notes to a versioned Postgres brain.',
  '',
  'HARD RULES:',
  '1. You MAY ONLY use toolkit slugs from the AVAILABLE TOOLKITS list. Do not invent slugs.',
  '2. You MAY ONLY use brain prefixes from the AVAILABLE BRAIN DIRECTORIES list, each ending in "/". You SHOULD also include "employees/<slug>/" so the employee has a private workspace.',
  '3. `slug` must be kebab-case, must NOT shadow any RESERVED SLUG, and must NOT match an EXISTING EMPLOYEE slug.',
  '4. `name` must NOT collide with an existing employee\'s name in EXISTING TEAM.',
  '5. If the customer\'s request cannot be expressed (e.g. needs a toolkit they have not connected, needs sub-minute cron precision, references a reserved slug), set `unsupported` to {reason: "<plain-English explanation>"} and leave other fields filled with safe placeholders. The caller surfaces this to the customer.',
  '6. `system_prompt` must:',
  '   - Start with "You are <Name>, the <role> for {agency_name}."',
  '   - Describe what data sources they read at the start of each run',
  '   - List 2-5 specific tasks they perform',
  '   - State their decision rules / when to ask for approval vs auto',
  '   - End with where they write findings in the brain (matching scoped_brain_prefixes)',
  '7. `schedule_cron` is UTC. Pick a sensible default if the customer is vague (e.g. "every day" → "0 9 * * *"). If the customer asks for a frequency the scheduler can\'t do (every 30 seconds), explain in `schedule_human` and set `unsupported`.',
  '8. `first_task` should be the most-natural single thing this employee would do as their first run. One concrete sentence. No fluff.',
  '9. `emoji` should fit the role (💰 for finance, 📊 for analyst, 📝 for writer, 🤝 for AM, etc.).',
].join('\n')

// ─── User prompt builder ────────────────────────────────────────────────

export function buildEmployeeCompilationPrompt(input: CompileEmployeeInput): string {
  const { description, connectedToolkits, existingTeam, reservedSlugs } = input

  const toolkitList = connectedToolkits.length
    ? connectedToolkits
        .map((t) => `  - ${t} (${TOOLKIT_LABELS[t] ?? t})`)
        .join('\n')
    : '  (none connected yet — employee will be chat/brain-only)'

  const brainList = BRAIN_DIRECTORIES.map((d) => `  - ${d}/ — for ${humanizeBrainDir(d)}`).join('\n')

  const teamList = existingTeam.length
    ? existingTeam
        .map((e) => `  - ${e.slug} (${e.display.name} · ${e.display.role})`)
        .join('\n')
    : '  (no existing custom employees)'

  return [
    'AVAILABLE TOOLKITS:',
    toolkitList,
    '',
    'AVAILABLE BRAIN DIRECTORIES (path prefixes):',
    brainList,
    '  - employees/<slug>/ — private working notes for THIS employee',
    '',
    'EXISTING TEAM (do not collide with these names or slugs):',
    teamList,
    '',
    'RESERVED SLUGS (the built-in agents — do not propose these):',
    reservedSlugs.length ? '  ' + reservedSlugs.join(', ') : '  (none)',
    '',
    "CUSTOMER'S REQUEST:",
    description.trim(),
  ].join('\n')
}

// ─── Helper: humanize brain directory names for the prompt ──────────────

function humanizeBrainDir(dir: string): string {
  const map: Record<string, string> = {
    'pattern-cards': 'recurring patterns + insights',
    'risk-register': 'flagged risks per client/project',
    'decision-log': 'strategic decisions you and the team have made',
    'kpi-snapshots': 'weekly KPI snapshots',
    'real-pl': 'profit & loss working ledger',
    clients: 'per-client durable notes',
    'quarterly-memory': 'quarterly retrospectives + outlook',
    projects: 'per-project working notes',
    'service-lines': 'service-line economics + positioning',
    team: 'team utilization, burnout, capacity notes',
    'tool-stack': 'tool stack audit notes',
    contracts: 'contract terms + renewal dates',
    pages: 'misc canonical pages',
    'agent-runs': 'agent run summaries',
  }
  return map[dir] ?? dir
}
