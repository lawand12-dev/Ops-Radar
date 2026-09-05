// /dashboard/employees/[slug] (CP-34c — sub-task 2).
//
// Per-employee detail page. Notion 3.3 / Lindy pattern, extended to 5 tabs:
//   Chat · Activity · Memory · Skills · Settings
//
// Tabs are search-param based (?tab=chat) so the URL is shareable and the
// page is a server component end-to-end (only the tabs themselves are
// client when they need to be).
//
// Built-in employees: settings tab is read-only (we hard-code their config).
// Custom employees: settings is editable; archive is exposed.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { resolveEmployee } from '<npm>/lib/employees/registry'
import type { Employee } from '<npm>/lib/employees/types'
import { ChatTab } from './_components/chat-tab'
import { ActivityTab } from './_components/activity-tab'
import { MemoryTab } from './_components/memory-tab'
import { SkillsTab } from './_components/skills-tab'
import { SettingsTab } from './_components/settings-tab'

export const dynamic = 'force-dynamic'

const TABS = ['chat', 'activity', 'memory', 'skills', 'settings'] as const
type TabKey = (typeof TABS)[number]

const TAB_LABELS: Record<TabKey, string> = {
  chat: 'Chat',
  activity: 'Activity',
  memory: 'Memory',
  skills: 'Skills',
  settings: 'Settings',
}

function isTabKey(value: string | undefined): value is TabKey {
  return !!value && (TABS as readonly string[]).includes(value)
}

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams

  const userId = await getCurrentUserId()
  if (!userId) redirect('/login')

  const employee = await resolveEmployee(userId, slug)
  if (!employee) return <NotFound slug={slug} />

  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : 'chat'

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <EmployeeHeader employee={employee} />
      <TabBar slug={employee.slug} active={activeTab} />
      <TabBody employee={employee} active={activeTab} />
    </div>
  )
}

function BackLink() {
  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-caption text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
      >
        <ArrowLeft size={12} />
        Back to team
      </Link>
    </div>
  )
}

function EmployeeHeader({ employee }: { employee: Employee }) {
  const originLabel =
    employee.origin === 'built_in' ? 'Pre-hired' : 'Your hire'
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[26px] leading-none"
          aria-hidden
        >
          {employee.display.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
              {employee.display.name}
            </h1>
            <span className="text-body-sm text-[var(--color-fg-subtle)]">·</span>
            <span className="text-body-sm text-[var(--color-fg-muted)]">
              {employee.display.role}
            </span>
            <StatusPill status={employee.status} />
            <OriginPill label={originLabel} />
          </div>
          {employee.display.bio && (
            <p className="mt-2 max-w-[72ch] text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
              {employee.display.bio}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function StatusPill({ status }: { status: Employee['status'] }) {
  const palette: Record<
    Employee['status'],
    { bg: string; border: string; fg: string }
  > = {
    active: {
      bg: 'rgba(16,185,129,0.10)',
      border: 'rgba(16,185,129,0.35)',
      fg: 'rgb(110,231,183)',
    },
    paused: {
      bg: 'rgba(234,179,8,0.10)',
      border: 'rgba(234,179,8,0.35)',
      fg: 'rgb(250,204,21)',
    },
    archived: {
      bg: 'var(--color-surface-sunken)',
      border: 'var(--color-border)',
      fg: 'var(--color-fg-subtle)',
    },
  }
  const c = palette[status]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider"
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.fg }}
    >
      {status}
    </span>
  )
}

function OriginPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
      Origin: {label}
    </span>
  )
}

function TabBar({ slug, active }: { slug: string; active: TabKey }) {
  return (
    <nav
      role="tablist"
      aria-label="Employee sections"
      className="flex gap-1 border-b border-[var(--color-border)]"
    >
      {TABS.map((t) => {
        const isActive = t === active
        return (
          <Link
            key={t}
            role="tab"
            aria-selected={isActive}
            href={`/dashboard/employees/${slug}?tab=${t}`}
            className={`relative px-3.5 py-2 text-body-sm transition-colors ${
              isActive
                ? 'text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            }`}
          >
            {TAB_LABELS[t]}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function TabBody({
  employee,
  active,
}: {
  employee: Employee
  active: TabKey
}) {
  switch (active) {
    case 'chat':
      return <ChatTab employee={employee} />
    case 'activity':
      return <ActivityTab slug={employee.slug} />
    case 'memory':
      return <MemoryTab slug={employee.slug} origin={employee.origin} />
    case 'skills':
      return <SkillsTab employee={employee} />
    case 'settings':
      return <SettingsTab employee={employee} />
    default:
      return null
  }
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h1 className="font-serif text-[20px] font-normal text-[var(--color-fg)]">
          Employee not found
        </h1>
        <p className="mt-2 text-body-sm text-[var(--color-fg-muted)]">
          No employee with slug{' '}
          <code className="rounded bg-[var(--color-surface-sunken)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--color-fg)]">
            {slug}
          </code>{' '}
          is on your team.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </section>
    </div>
  )
}
