/**
 * Display metadata for built-in AI employees.
 *
 * The shipping catalog grows one entry at a time as new Nango toolkits
 * land + are verified end-to-end. Today: Gmail Specialist only. Every
 * future toolkit adds ONE flagship pre-built employee here.
 *
 * Customers who need something outside the catalog use /dashboard/hire
 * to describe a custom employee — same engine, same approval gate,
 * same brain, just compiled from chat instead of code.
 */

export type EmployeeMetadata = {
  name: string
  role: string
  emoji: string
  avatarUrl?: string
  bio: string
  pronoun?: string
}

export const BUILT_IN_EMPLOYEE_METADATA: Record<string, EmployeeMetadata> = {
  'tool-gmail': {
    name: 'Gmail Specialist',
    role: 'Gmail Specialist',
    emoji: '✉️',
    bio: 'Watches client inboxes, drafts replies, and flags urgent threads.',
  },
}

/**
 * Returns display metadata for a given slug, falling back to a generic
 * placeholder so the sidebar + employee page always render *something*
 * even if a spec is registered without metadata yet.
 */
export function getEmployeeMetadata(slug: string): EmployeeMetadata {
  const meta = BUILT_IN_EMPLOYEE_METADATA[slug]
  if (meta) return meta
  return {
    name: slug,
    role: 'AI employee',
    emoji: '🤖',
    bio: 'Built-in employee.',
  }
}
