/**
 * Compilation prompt for the COO's propose_automation flow.
 *
 * Builds a system+user prompt for `generateObject` whose typed output is an
 * AutomationDraft. The prompt enumerates the trigger + action catalogs so the
 * model can ONLY emit slugs that exist (Lindy 2.0 "agent on rails" principle).
 *
 * Duplicate detection: existing automations are included so the model can fill
 * `duplicates_of` with the slugs of any overlapping automations the customer
 * already has — the COO surface uses that to ask "update existing or add new?"
 * before showing the install card.
 *
 * Unsupported requests: if the request can't be expressed in v1's primitives
 * (e.g. it requires `wait`, `loop`, or a slug not in the catalog), the model
 * is instructed to return a draft with `name: 'unsupported'` and `spec.steps: []`
 * so the calling tool can render a graceful "not yet supported" message.
 */

export type CompileInput = {
  userRequest: string
  availableTriggers: Array<{ toolkit: string; slug: string; description: string }>
  availableActions: Array<{ toolkit: string; action_slug: string; description: string }>
  existingAutomations: Array<{ slug: string; description: string }>
}

export function buildCompilationPrompt(input: CompileInput): string {
  const { userRequest, availableTriggers, availableActions, existingAutomations } = input

  const triggerList = availableTriggers
    .map((t) => `  - ${t.toolkit}/${t.slug} — ${t.description}`)
    .join('\n')
  const actionList = availableActions
    .map((a) => `  - ${a.toolkit}/${a.action_slug} — ${a.description}`)
    .join('\n')
  const existingList = existingAutomations.length
    ? existingAutomations.map((a) => `  - ${a.slug}: ${a.description}`).join('\n')
    : '  (none)'

  return [
    'You are compiling an OpsRadar customer automation from a natural-language request into a typed AutomationDraft.',
    '',
    'HARD RULES:',
    '1. You may ONLY use trigger slugs from the AVAILABLE TRIGGERS list below. Do not invent slugs.',
    '2. You may ONLY use action slugs from the AVAILABLE ACTIONS list below. Do not invent slugs.',
    '3. The synchronous executor only supports these step kinds: composio_action, notion_write, condition, set, queue_action. Do NOT emit wait, loop, or agent_step — those require the durable runtime which is not yet shipped.',
    '4. If the request requires a slug, step kind, or capability not listed below, output a draft with `name: "unsupported"`, `description` explaining what is missing, and `spec.steps: []`. The caller surfaces this to the customer.',
    '5. Set `duplicates_of` to the slugs of EXISTING AUTOMATIONS that overlap with what the user just asked for. Empty array if none overlap.',
    '6. `slug` must be kebab-case and descriptive (e.g. `notify-pm-on-closed-won`).',
    '7. Default `autonomy` to "ask" unless the user explicitly asks for auto-run.',
    '8. For composio_event triggers, set `trigger.toolkit` to the toolkit prefix and `trigger.slug` to the full Composio slug from the catalog.',
    '9. For schedule triggers, set `trigger.kind: "schedule"`, `trigger.toolkit: null`, `trigger.slug: null`, and provide `trigger.schedule_cron` (5-field cron).',
    '',
    'AVAILABLE TRIGGERS:',
    triggerList || '  (none)',
    '',
    'AVAILABLE ACTIONS:',
    actionList || '  (none)',
    '',
    "CUSTOMER'S EXISTING AUTOMATIONS:",
    existingList,
    '',
    "CUSTOMER'S REQUEST:",
    userRequest.trim(),
  ].join('\n')
}
