/**
 * Customer-built automations (CP-20).
 *
 * The customer talks to the AI COO in chat, describes an automation in plain
 * English, the COO compiles it to an AutomationSpec, customer confirms, row
 * is inserted in customer_automations. When the trigger fires (Composio
 * webhook → /api/automations/webhook/composio), the executor walks the spec
 * and queues each Composio call through the approval gate.
 *
 * See docs/specs/automations.md for the full design.
 */

import type { Json } from '<npm>/lib/database.types'
import type { ToolSlug } from '<npm>/lib/composio'

// ─── Top-level row shape ───────────────────────────────────────────────────

export type AutomationStatus = 'active' | 'paused' | 'archived'
export type AutomationAutonomy = 'ask' | 'auto' | 'off'
export type AutomationTriggerKind =
  | 'composio_event'
  | 'schedule'
  | 'manual'
  | 'webhook'
  | 'chat'
export type AutomationSource = 'coo-chat' | 'template' | 'manual'

export type CustomerAutomation = {
  id: string
  user_id: string
  slug: string
  name: string
  description: string
  status: AutomationStatus
  trigger_kind: AutomationTriggerKind
  trigger_toolkit: ToolSlug | null
  trigger_slug: string | null
  trigger_filter: Record<string, Json>
  spec: AutomationSpec
  spec_version: number
  autonomy: AutomationAutonomy
  source: AutomationSource
  source_session: string | null
  created_by: string
  last_run_at: string | null
  last_run_status: string | null
  run_count: number
  created_at: string
  updated_at: string
}

// ─── Spec IR — the executable plan ──────────────────────────────────────────

export type AutomationSpec = {
  version: 1
  steps: AutomationStep[]
}

export type AutomationStep =
  | AutomationStepComposioAction
  | AutomationStepNotionWrite
  | AutomationStepAgentStep
  | AutomationStepCondition
  | AutomationStepLoop
  | AutomationStepWait
  | AutomationStepSet
  | AutomationStepQueueAction

/** Fire a Composio action (goes through approval gate). */
export type AutomationStepComposioAction = {
  kind: 'composio_action'
  toolkit: ToolSlug
  action_slug: string
  arguments: Record<string, Json>
  ref?: string // name future steps use to reference this step's output
}

/** Write to the customer's Notion Brain (does NOT queue — Notion writes pass through). */
export type AutomationStepNotionWrite = {
  kind: 'notion_write'
  database_slug: string
  properties: Record<string, Json>
  ref?: string
}

/** Escape hatch: model picks tools dynamically. Bounded by exit_when + allowed_tools. */
export type AutomationStepAgentStep = {
  kind: 'agent_step'
  prompt: string
  allowed_tools: string[]
  exit_when: string // human-readable condition
  ref?: string
}

/** Branch — "Go down this path if…" */
export type AutomationStepCondition = {
  kind: 'condition'
  branches: Array<{
    when: string // expression evaluated against the run ledger
    steps: AutomationStep[]
  }>
}

/** Loop over a list. Each item runs in sequence (max_concurrent reserved for future durable runtime). */
export type AutomationStepLoop = {
  kind: 'loop'
  over: string // reference to a list output from a prior step
  max_concurrent?: number
  max_cycles?: number
  steps: AutomationStep[]
  output: string // name of the field aggregated from each loop body
}

/** Pause execution. Only honored by the durable runtime (Phase 7). */
export type AutomationStepWait = {
  kind: 'wait'
  for: 'duration' | 'token' | 'event'
  value: string // ISO 8601 duration, approval token name, or trigger slug
}

/** Store a value in the run ledger for later steps to reference. */
export type AutomationStepSet = {
  kind: 'set'
  key: string
  value: string // jsonata-style reference like "$steps.0.result.deal_id"
}

/** Explicitly queue an action row in agent_actions (rare — most actions queue via composio_action). */
export type AutomationStepQueueAction = {
  kind: 'queue_action'
  action_type: string
  payload_template: Record<string, Json>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function specHasWaits(spec: AutomationSpec): boolean {
  return walkSteps(spec.steps).some((s) => s.kind === 'wait')
}

export function walkSteps(steps: AutomationStep[]): AutomationStep[] {
  const out: AutomationStep[] = []
  for (const step of steps) {
    out.push(step)
    if (step.kind === 'condition') {
      for (const b of step.branches) out.push(...walkSteps(b.steps))
    } else if (step.kind === 'loop') {
      out.push(...walkSteps(step.steps))
    }
  }
  return out
}
