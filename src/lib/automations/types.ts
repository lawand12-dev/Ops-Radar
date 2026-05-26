/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * Lindy-style automations were trigger-coupled and will be rebuilt
 * on Nango per CP-45. Types preserved as loose aliases so consumers compile.
 */

export type AutomationStatus = 'active' | 'paused' | 'archived'
export type AutomationAutonomy = 'ask' | 'auto' | 'off'

export type AutomationStep = {
  kind: string
  [key: string]: unknown
}

export type AutomationSpec = {
  steps: AutomationStep[]
  trigger?: {
    kind?: string
    [key: string]: unknown
  }
}

export type CustomerAutomation = {
  id: string
  user_id: string
  slug: string
  display_name: string
  description: string
  status: AutomationStatus
  autonomy: AutomationAutonomy
  spec: AutomationSpec
  created_at: string
  updated_at: string
}
