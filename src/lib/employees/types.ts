/**
 * Employee types — the unified mental model for CP-34+.
 *
 * An "employee" is what the customer sees:
 *   - Built-in employees: 28 pre-hired specialists shipped with OpsRadar.
 *     These wrap the existing AgentSpec from src/lib/agents/types.ts plus
 *     display metadata (name, role, emoji, bio).
 *   - Custom employees: created by the customer via COO chat (`propose_custom_employee`).
 *     Persisted in the `custom_employees` table.
 *
 * Both run on the SAME runAgent loop (src/lib/agents/loop.ts).
 * Both write to the SAME brain (src/lib/brain/store.ts) — the only difference
 * is the `author_type` value on commits: `agent:<slug>` vs `employee:<slug>`.
 */

import type { AgentSpec } from '<npm>/lib/agents/types'
import type { Database } from '<npm>/lib/database.types'

export type EmployeeOrigin = 'built_in' | 'custom'

export type EmployeeStatus = 'active' | 'paused' | 'archived'

export type EmployeeAutonomy = 'ask' | 'auto' | 'off'

/**
 * Display metadata shared by built-in + custom employees.
 * Drives the sidebar entry, employee page header, and chat avatar.
 */
export type EmployeeDisplay = {
  name: string         // 'Riley' or 'Sarah'
  role: string         // 'Revenue Analyst' or 'Bookkeeper'
  emoji: string        // single emoji avatar fallback
  avatarUrl?: string   // optional uploaded image
  bio: string          // 1-sentence "what they do"
  personaSummary?: string  // longer "who they are" — custom employees only
}

/**
 * Runtime spec — what the runAgent loop needs to execute the employee.
 * Built-in employees inherit this from their AgentSpec; custom employees
 * build it from their database row.
 */
export type EmployeeRuntime = {
  systemPrompt: string
  nangoApps: string[]          // toolkit slugs the employee can call
  model: string                   // gpt-5.4 etc.
  maxSteps: number
  cronSchedule: string | null     // null for chat-only employees
  scopedBrainPrefixes: string[]   // restricts brain reads/writes
}

/**
 * The unified Employee object.
 *
 * Consumers (sidebar, dispatcher, /dashboard/employees/[slug]) only see this shape.
 * Whether the employee came from code or DB is hidden behind `origin`.
 */
export type Employee = {
  slug: string                    // 'revenue' (built-in) or user-chosen (custom)
  origin: EmployeeOrigin
  display: EmployeeDisplay
  runtime: EmployeeRuntime
  status: EmployeeStatus
  autonomy: EmployeeAutonomy

  // Hierarchy (CP-37 — null in CP-34, filled in CP-37 when parent_id is set).
  parentSlug: string | null

  // Only set for custom employees — used for DB updates.
  customEmployeeId?: string
  userId?: string                 // only meaningful for custom employees
}

/**
 * Adapter: convert an AgentSpec + display metadata into an Employee.
 * Built-in employees do not have a userId — they exist for every customer.
 */
export function builtInToEmployee(
  spec: AgentSpec,
  display: EmployeeDisplay,
): Employee {
  return {
    slug: spec.slug,
    origin: 'built_in',
    display,
    runtime: {
      systemPrompt: spec.systemPrompt,
      nangoApps: spec.nangoApps as string[],
      model: spec.model,
      maxSteps: spec.maxSteps,
      cronSchedule: spec.cronSchedule,
      scopedBrainPrefixes: [],    // built-in employees have full brain access
    },
    status: 'active',
    autonomy: 'ask',
    parentSlug: null,
  }
}

/**
 * Adapter: convert a custom_employees row into an Employee.
 */
export type CustomEmployeeRow = Database['public']['Tables']['custom_employees']['Row']

export function customRowToEmployee(row: CustomEmployeeRow): Employee {
  return {
    slug: row.slug,
    origin: 'custom',
    display: {
      name: row.name,
      role: row.role,
      emoji: row.emoji ?? '👤',
      avatarUrl: row.avatar_url ?? undefined,
      bio: row.persona_summary?.slice(0, 80) ?? '',
      personaSummary: row.persona_summary ?? undefined,
    },
    runtime: {
      systemPrompt: row.system_prompt,
      nangoApps: row.scoped_toolkits,
      model: row.model_slug ?? 'gpt-5.4',
      maxSteps: row.max_steps ?? 10,
      cronSchedule: row.schedule_cron,
      scopedBrainPrefixes: row.scoped_brain_prefixes,
    },
    status: row.status as EmployeeStatus,
    autonomy: row.autonomy as EmployeeAutonomy,
    parentSlug: null,               // resolved in CP-37 by looking up parent_employee_id → slug
    customEmployeeId: row.id,
    userId: row.user_id,
  }
}

/**
 * The author_type written to brain_commits for a given employee.
 * Built-in employees use the legacy `agent:<slug>` prefix to preserve
 * existing brain history; custom employees use `employee:<slug>`.
 */
export function brainAuthorTypeFor(emp: Employee): string {
  return emp.origin === 'built_in' ? `agent:${emp.slug}` : `employee:${emp.slug}`
}
