/**
 * Employee hierarchy resolution (CP-37).
 *
 * Built on `parent_employee_id` (already in the CP-34a `custom_employees` table).
 * In v1, only CUSTOM employees can be parents or reports — the 28 built-ins
 * exist for every customer and aren't editable from the customer side, so
 * letting them be parents would be a confusing footgun (and a built-in can't
 * delegate to a custom employee anyway because the cron path doesn't run
 * Trigger.dev tasks for them).
 *
 * Functions:
 *   - loadEmployeeWithReports → fetch one employee + their direct reports
 *   - setEmployeeManager      → write parent_employee_id with cycle rejection
 *   - flattenOrgChart         → tree-flattened workforce for UI rendering
 *
 * See: docs/dev/specs/2026-05-25-ai-employees-master-plan.md §CP-37
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  customRowToEmployee,
  type CustomEmployeeRow,
  type Employee,
} from './types'
import {
  BUILT_IN_BY_SLUG,
  BUILT_IN_EMPLOYEES,
  loadCustomEmployees,
  resolveEmployee,
} from './registry'

export type EmployeeWithReports = {
  employee: Employee | null
  reports: Employee[]
}

/**
 * Resolve an employee by slug and load its direct reports.
 *
 * - Built-in employees never have reports in v1 (they're not editable + don't
 *   live in the custom_employees table). So we short-circuit with reports=[].
 * - For custom employees, we look up child rows by parent_employee_id matching
 *   the custom_employees row id.
 */
export async function loadEmployeeWithReports(
  userId: string,
  slug: string,
): Promise<EmployeeWithReports> {
  const employee = await resolveEmployee(userId, slug)
  if (!employee) return { employee: null, reports: [] }
  if (employee.origin !== 'custom' || !employee.customEmployeeId) {
    return { employee, reports: [] }
  }

  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .eq('parent_employee_id', employee.customEmployeeId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })

  if (error) {
    console.warn(
      '[employees/hierarchy] loadEmployeeWithReports failed:',
      error.message,
    )
    return { employee, reports: [] }
  }
  const reports = (data as CustomEmployeeRow[]).map(customRowToEmployee)
  return { employee, reports }
}

export type SetManagerResult =
  | { success: true; employeeSlug: string; managerSlug: string | null }
  | { success: false; error: string; code: SetManagerErrorCode }

export type SetManagerErrorCode =
  | 'employee_not_found'
  | 'manager_not_found'
  | 'employee_not_custom'
  | 'manager_not_custom'
  | 'self_reference'
  | 'cycle'
  | 'write_failed'

/**
 * Set or clear an employee's manager.
 *
 * Rules:
 *   - Both employee and manager must be CUSTOM employees (built-ins rejected).
 *   - manager_slug=null clears the manager (employee becomes top-level).
 *   - Cycle detection: walk UP the manager's parent chain — if `employee.id`
 *     ever appears, reject.
 *   - Self-reference (manager === employee) is rejected explicitly.
 */
export async function setEmployeeManager(
  userId: string,
  employeeSlug: string,
  managerSlug: string | null,
): Promise<SetManagerResult> {
  const supabase = getServerSupabaseClient()

  // Reject built-in slugs immediately — they're not in custom_employees.
  if (employeeSlug in BUILT_IN_BY_SLUG) {
    return {
      success: false,
      error: 'Built-in employees cannot have a manager set in v1.',
      code: 'employee_not_custom',
    }
  }
  if (managerSlug !== null && managerSlug in BUILT_IN_BY_SLUG) {
    return {
      success: false,
      error: 'Built-in employees cannot be managers in v1.',
      code: 'manager_not_custom',
    }
  }

  // Fetch employee row.
  const { data: empRow, error: empErr } = await supabase
    .from('custom_employees')
    .select('id, user_id')
    .eq('user_id', userId)
    .eq('slug', employeeSlug)
    .maybeSingle()

  if (empErr || !empRow) {
    return {
      success: false,
      error: `No custom employee with slug "${employeeSlug}".`,
      code: 'employee_not_found',
    }
  }

  // Clearing the manager → just write null.
  if (managerSlug === null) {
    const { error: updErr } = await supabase
      .from('custom_employees')
      .update({
        parent_employee_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', empRow.id)
      .eq('user_id', userId)
    if (updErr) {
      return {
        success: false,
        error: `Update failed: ${updErr.message}`,
        code: 'write_failed',
      }
    }
    return { success: true, employeeSlug, managerSlug: null }
  }

  // Fetch manager row.
  const { data: mgrRow, error: mgrErr } = await supabase
    .from('custom_employees')
    .select('id, parent_employee_id')
    .eq('user_id', userId)
    .eq('slug', managerSlug)
    .maybeSingle()

  if (mgrErr || !mgrRow) {
    return {
      success: false,
      error: `No custom employee with slug "${managerSlug}".`,
      code: 'manager_not_found',
    }
  }

  // Self-reference guard.
  if (mgrRow.id === empRow.id) {
    return {
      success: false,
      error: 'An employee cannot be their own manager.',
      code: 'self_reference',
    }
  }

  // Cycle detection: walk up the proposed manager's chain. If we hit empRow.id
  // anywhere on the way to the root, this would create a cycle.
  const visited = new Set<string>()
  let cursor: string | null = mgrRow.parent_employee_id
  while (cursor !== null) {
    if (cursor === empRow.id) {
      return {
        success: false,
        error: 'Refusing — this would create a management cycle.',
        code: 'cycle',
      }
    }
    if (visited.has(cursor)) {
      // Pre-existing cycle in the DB — bail out so we don't loop forever.
      return {
        success: false,
        error: 'Pre-existing cycle detected in manager chain; refusing to write.',
        code: 'cycle',
      }
    }
    visited.add(cursor)
    const { data: parent }: {
      data: { parent_employee_id: string | null } | null
    } = await supabase
      .from('custom_employees')
      .select('parent_employee_id')
      .eq('id', cursor)
      .eq('user_id', userId)
      .maybeSingle()
    cursor = parent?.parent_employee_id ?? null
  }

  const { error: writeErr } = await supabase
    .from('custom_employees')
    .update({
      parent_employee_id: mgrRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', empRow.id)
    .eq('user_id', userId)

  if (writeErr) {
    return {
      success: false,
      error: `Update failed: ${writeErr.message}`,
      code: 'write_failed',
    }
  }

  return { success: true, employeeSlug, managerSlug }
}

export type OrgChartNode = {
  employee: Employee
  depth: number
  hasReports: boolean
}

/**
 * Flatten the workforce into a tree-ordered list for UI rendering.
 *
 * Layout rules:
 *   - All 28 built-in employees come first at depth=0 (they're the value
 *     anchor and have no hierarchy in v1).
 *   - Custom employees follow. Top-level customs (no manager) at depth=0,
 *     their reports indented at depth=1, sub-reports at depth=2, etc.
 *   - Within a depth, ordering matches the insertion order from
 *     loadCustomEmployees (created_at ascending).
 *
 * Implementation: we resolve parentSlug for every custom row from the raw
 * parent_employee_id → row.id map, then DFS from each top-level custom node.
 */
export async function flattenOrgChart(userId: string): Promise<OrgChartNode[]> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })

  const rows = !error && data ? (data as CustomEmployeeRow[]) : []
  const employees = rows.map(customRowToEmployee)
  // Build id → slug map so we can populate parentSlug on each Employee.
  const idToSlug = new Map<string, string>()
  for (const row of rows) idToSlug.set(row.id, row.slug)
  const slugToParent = new Map<string, string | null>()
  for (const row of rows) {
    slugToParent.set(
      row.slug,
      row.parent_employee_id ? idToSlug.get(row.parent_employee_id) ?? null : null,
    )
  }
  // Build a children map: managerSlug → reportSlugs[]
  const children = new Map<string | null, string[]>()
  for (const e of employees) {
    const parentSlug = slugToParent.get(e.slug) ?? null
    const arr = children.get(parentSlug) ?? []
    arr.push(e.slug)
    children.set(parentSlug, arr)
  }
  const empBySlug = new Map<string, Employee>()
  for (const e of employees) {
    empBySlug.set(e.slug, { ...e, parentSlug: slugToParent.get(e.slug) ?? null })
  }

  // Built-ins first.
  const out: OrgChartNode[] = BUILT_IN_EMPLOYEES.map((e) => ({
    employee: e,
    depth: 0,
    hasReports: false,
  }))

  // DFS the custom tree starting from top-level (parentSlug === null).
  const topLevel = children.get(null) ?? []
  const visit = (slug: string, depth: number) => {
    const emp = empBySlug.get(slug)
    if (!emp) return
    const kids = children.get(slug) ?? []
    out.push({ employee: emp, depth, hasReports: kids.length > 0 })
    for (const kid of kids) visit(kid, depth + 1)
  }
  for (const slug of topLevel) visit(slug, 0)

  return out
}

/**
 * Helper for the COO/agent tools: given a custom employee's slug, return the
 * union of direct-report slugs (for autocomplete + for verifying a delegate
 * call is allowed). Built-ins always return []. Errors swallowed → [].
 */
export async function listDirectReportSlugs(
  userId: string,
  managerSlug: string,
): Promise<string[]> {
  const { reports } = await loadEmployeeWithReports(userId, managerSlug)
  return reports.map((r) => r.slug)
}

/**
 * Light helper for callers (e.g. dashboard page) that need the full custom
 * employee list with parentSlug populated. Mirrors `loadCustomEmployees` but
 * fills in the parent reference (which is null in the base loader).
 */
export async function loadCustomEmployeesWithParents(
  userId: string,
): Promise<Employee[]> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })

  if (error || !data) {
    // Fall back to the basic loader (parents will be null but the page still renders).
    return loadCustomEmployees(userId)
  }

  const rows = data as CustomEmployeeRow[]
  const idToSlug = new Map<string, string>()
  for (const row of rows) idToSlug.set(row.id, row.slug)
  return rows.map((row) => {
    const emp = customRowToEmployee(row)
    return {
      ...emp,
      parentSlug: row.parent_employee_id
        ? idToSlug.get(row.parent_employee_id) ?? null
        : null,
    }
  })
}
