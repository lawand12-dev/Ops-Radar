// /dashboard/employees (CP-34c — sub-task 1).
//
// The team roster page. Customer sees TWO sections:
//
//   1. PRE-HIRED TEAM   — the 28 built-in named specialists shipped with the
//                         tier (Riley/Cole/Scott/etc.).
//   2. YOUR HIRES       — custom employees the customer created via COO chat.
//
// Each card opens a per-employee 5-tab detail page (built next sub-task).
//
// The "+ Hire AI Employee" CTA links into the COO chat with a pre-filled
// prompt — so hiring is always a chat conversation, never a form.
//
// Research basis: docs/dev/specs/2026-05-25-ai-employees-master-plan.md §4 CP-34c.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { loadFullWorkforce } from '<npm>/lib/employees/registry'
import type { Employee } from '<npm>/lib/employees/types'

export const dynamic = 'force-dynamic'

const HIRE_PROMPT = 'I want to hire a new AI employee'

export default async function EmployeesPage() {
  const userId = await getCurrentUserId()
  if (!userId) redirect('/login')

  const team = await loadFullWorkforce(userId)
  const preHired = team.filter((e) => e.origin === 'built_in')
  const customHires = team.filter((e) => e.origin === 'custom')

  return (
    <div className="flex flex-col gap-6">
      <EmployeesHero />

      <Section
        tag="PRE-HIRED TEAM"
        subtitle={`${preHired.length} specialists included with your plan`}
        employees={preHired}
      />

      <Section
        tag="YOUR HIRES"
        subtitle={
          customHires.length === 0
            ? 'Custom teammates you build by talking to your COO'
            : `${customHires.length} custom ${customHires.length === 1 ? 'hire' : 'hires'}`
        }
        employees={customHires}
        emptyState={
          <Link
            href="/dashboard/coo"
            className="block rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center transition-colors hover:border-[var(--color-primary)]"
          >
            <div className="text-body text-[var(--color-fg-muted)]">
              No custom hires yet.{' '}
              <span className="font-medium text-[var(--color-primary)]">
                Ask your COO to hire one →
              </span>
            </div>
          </Link>
        }
      />
    </div>
  )
}

function EmployeesHero() {
  const hireHref = `/dashboard/coo?prompt=${encodeURIComponent(HIRE_PROMPT)}`
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Your AI workforce
          </h1>
          <p className="mt-1.5 max-w-[64ch] text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
            Pre-hired specialists + custom teammates you&apos;ve hired. Talk to any
            of them directly.
          </p>
        </div>

        <Link
          href={hireHref}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3.5 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <span aria-hidden className="text-[15px] leading-none">
            +
          </span>
          Hire AI Employee
        </Link>
      </div>
    </section>
  )
}

function Section({
  tag,
  subtitle,
  employees,
  emptyState,
}: {
  tag: string
  subtitle: string
  employees: Employee[]
  emptyState?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
          {tag}
        </div>
        <div className="text-caption text-[var(--color-fg-faint)]">{subtitle}</div>
      </div>

      {employees.length === 0 ? (
        emptyState ?? null
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {employees.map((e) => (
            <EmployeeCard key={`${e.origin}:${e.slug}`} employee={e} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmployeeCard({ employee }: { employee: Employee }) {
  const statusActive = employee.status === 'active'
  return (
    <Link
      href={`/dashboard/employees/${employee.slug}`}
      className="group flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[20px] leading-none"
          aria-hidden
        >
          {employee.display.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-body font-semibold text-[var(--color-fg)]">
              {employee.display.name}
            </span>
            <span className="text-body-sm text-[var(--color-fg-subtle)]">·</span>
            <span className="truncate text-body-sm text-[var(--color-fg-muted)]">
              {employee.display.role}
            </span>
          </div>
        </div>
        <StatusDot active={statusActive} />
      </div>

      {employee.display.bio && (
        <p className="line-clamp-2 text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          {employee.display.bio}
        </p>
      )}
    </Link>
  )
}

function StatusDot({ active }: { active: boolean }) {
  const bg = active ? 'var(--color-success)' : 'var(--color-fg-faint)'
  const label = active ? 'Active' : 'Paused'
  return (
    <span
      aria-label={label}
      title={label}
      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: bg }}
    />
  )
}
