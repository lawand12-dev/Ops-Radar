/**
 * Unified employee registry (CP-34).
 *
 * Returns the full workforce for a customer — both pre-hired built-in
 * employees (28 from src/lib/agents/registry.ts) and any custom employees
 * they've created via COO chat.
 *
 * Consumers should treat the result as a flat list. The `origin` field on
 * each Employee tells them whether the spec is editable (custom) or
 * read-only (built_in).
 */

import { AGENTS, AGENT_SLUGS } from '<npm>/lib/agents/registry'
import { BUILT_IN_EMPLOYEE_METADATA } from '<npm>/lib/agents/employee-metadata'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  builtInToEmployee,
  customRowToEmployee,
  type Employee,
  type CustomEmployeeRow,
} from './types'

/**
 * All built-in employees (same for every customer). Computed once at import.
 */
export const BUILT_IN_EMPLOYEES: Employee[] = AGENT_SLUGS.map((slug) => {
  const spec = AGENTS[slug]
  const display = BUILT_IN_EMPLOYEE_METADATA[slug]
  if (!display) {
    throw new Error(`Missing employee-metadata entry for agent slug: ${slug}`)
  }
  return builtInToEmployee(spec, display)
})

/**
 * Map of built-in employees keyed by slug for O(1) lookup.
 */
export const BUILT_IN_BY_SLUG: Record<string, Employee> = Object.fromEntries(
  BUILT_IN_EMPLOYEES.map((e) => [e.slug, e]),
)

/**
 * Load all custom employees for a user (active + paused, not archived).
 */
export async function loadCustomEmployees(userId: string): Promise<Employee[]> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[employees/registry] loadCustomEmployees failed:', error.message)
    return []
  }
  return (data as CustomEmployeeRow[]).map(customRowToEmployee)
}

/**
 * Load a single custom employee by slug for a user.
 */
export async function loadCustomEmployeeBySlug(
  userId: string,
  slug: string,
): Promise<Employee | null> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return customRowToEmployee(data as CustomEmployeeRow)
}

/**
 * Resolve an employee by slug for a user — built-in first, then custom.
 * Built-in slugs take precedence (since they're reserved system slugs).
 */
export async function resolveEmployee(
  userId: string,
  slug: string,
): Promise<Employee | null> {
  const builtIn = BUILT_IN_BY_SLUG[slug]
  if (builtIn) return builtIn
  return loadCustomEmployeeBySlug(userId, slug)
}

/**
 * Load the full workforce for a user (built-in + custom).
 * Used by the sidebar "YOUR TEAM" section and the dashboard team widget.
 */
export async function loadFullWorkforce(userId: string): Promise<Employee[]> {
  const custom = await loadCustomEmployees(userId)
  // Built-in first (they're the value anchor); custom hires after.
  return [...BUILT_IN_EMPLOYEES, ...custom]
}

/**
 * Just the schedulable employees for the dispatcher.
 * Filters: status = 'active', cronSchedule != null.
 *
 * The built-in dispatcher (src/app/api/cron/agents/[agent]/route.ts) already
 * handles built-in agents. This function exists so the new custom-employees
 * cron route can find what to run.
 */
export async function loadSchedulableCustomEmployees(
  userId: string,
): Promise<Employee[]> {
  const custom = await loadCustomEmployees(userId)
  return custom.filter((e) => e.status === 'active' && e.runtime.cronSchedule)
}

/**
 * Reject these slugs at custom-employee creation time (they shadow built-ins).
 */
export function isReservedSlug(slug: string): boolean {
  return slug in BUILT_IN_BY_SLUG
}
