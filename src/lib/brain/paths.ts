/**
 * Brain document path conventions (CP-28).
 *
 * The brain is a flat-ish set of markdown files under conventional
 * directories. Agents pick paths according to these rules — consistent
 * naming = consistent reads later.
 *
 * Conventions:
 *   pattern-cards/<kebab-slug>.md       AI-detected patterns
 *   risk-register/<kebab-slug>.md       Open risks
 *   decision-log/<YYYY-MM-DD>-<slug>.md Customer decisions
 *   kpi-snapshots/<YYYY-Www>.md         Weekly KPI snapshot
 *   real-pl/<YYYY-MM>-<client-slug>.md  Monthly per-client P&L
 *   clients/<client-slug>.md            One file per active client
 *   quarterly-memory/<YYYY-Q[1-4]>.md   Quarterly narrative pages
 *   projects/<project-slug>.md          One file per active project
 *   service-lines/<slug>.md             One file per service line
 *   team/<member-slug>.md               One file per team member
 *   tool-stack/<tool-slug>.md           One file per software subscription
 *   contracts/<client-slug>.md          One file per active contract
 *   pages/how-we-work.md                Customer-edited playbook
 *   pages/okrs.md                       Customer-edited OKRs
 *   pages/brain-home.md                 The README of the customer's brain
 *   pages/meeting-notes.md              Customer-edited notes
 *   pages/playbooks.md                  Customer-edited playbooks
 *   agent-runs/<YYYY-MM-DD>-<agent>.md  Per-day audit log of agent activity
 */

/** Kebab-case a string for safe use in paths. */
export function kebab(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** ISO date in YYYY-MM-DD. */
export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** ISO week stamp YYYY-Www. */
export function isoWeek(d: Date = new Date()): string {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((+utc - +yearStart) / 86_400_000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** YYYY-MM month stamp. */
export function isoMonth(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** YYYY-Q[1-4] quarter stamp. */
export function isoQuarter(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`
}

// ─── Convenience builders ────────────────────────────────────────────────

export const brainPath = {
  patternCard: (slug: string) => `pattern-cards/${kebab(slug)}.md`,
  riskRegister: (slug: string) => `risk-register/${kebab(slug)}.md`,
  decision: (slug: string, d: Date = new Date()) =>
    `decision-log/${isoDate(d)}-${kebab(slug)}.md`,
  kpiSnapshot: (d: Date = new Date()) => `kpi-snapshots/${isoWeek(d)}.md`,
  realPl: (clientSlug: string, d: Date = new Date()) =>
    `real-pl/${isoMonth(d)}-${kebab(clientSlug)}.md`,
  client: (slug: string) => `clients/${kebab(slug)}.md`,
  quarterlyMemory: (d: Date = new Date()) => `quarterly-memory/${isoQuarter(d)}.md`,
  project: (slug: string) => `projects/${kebab(slug)}.md`,
  serviceLine: (slug: string) => `service-lines/${kebab(slug)}.md`,
  teamMember: (slug: string) => `team/${kebab(slug)}.md`,
  toolStack: (toolSlug: string) => `tool-stack/${kebab(toolSlug)}.md`,
  contract: (clientSlug: string) => `contracts/${kebab(clientSlug)}.md`,
  agentRun: (agentSlug: string, d: Date = new Date()) =>
    `agent-runs/${isoDate(d)}-${kebab(agentSlug)}.md`,
}

/** Allowed top-level directories. Surfaced in tool description so the model
 *  knows the conventions without guessing. */
export const BRAIN_DIRECTORIES = [
  'pattern-cards',
  'risk-register',
  'decision-log',
  'kpi-snapshots',
  'real-pl',
  'clients',
  'quarterly-memory',
  'projects',
  'service-lines',
  'team',
  'tool-stack',
  'contracts',
  'pages',
  'agent-runs',
] as const

export type BrainDirectory = (typeof BRAIN_DIRECTORIES)[number]
