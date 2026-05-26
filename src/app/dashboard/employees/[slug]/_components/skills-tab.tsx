// Skills tab — read-only display of an employee's runtime surface.
//
// Server component. Shows:
//   - Scoped toolkits (pill list with check icons)
//   - Scoped brain prefixes (path-styled chips)
//   - Model + Max steps + Schedule
//
// Built-ins have an empty scopedBrainPrefixes array (full brain access);
// we surface that explicitly so the customer understands the difference.

import { Check, FolderTree, Cpu, Workflow, Clock } from 'lucide-react'
import type { Employee } from '<npm>/lib/employees/types'

export function SkillsTab({ employee }: { employee: Employee }) {
  const toolkits = employee.runtime.nangoApps ?? []
  const prefixes = employee.runtime.scopedBrainPrefixes ?? []
  const isBuiltIn = employee.origin === 'built_in'

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Scoped toolkits" icon={Workflow}>
        {toolkits.length === 0 ? (
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            No external toolkits — chat &amp; brain only.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {toolkits.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-caption text-[var(--color-fg)]"
              >
                <Check size={11} className="text-emerald-400" />
                <span className="font-mono">{t}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Scoped brain prefixes" icon={FolderTree}>
        {prefixes.length === 0 ? (
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            {isBuiltIn
              ? 'Pre-hired employees have full brain access.'
              : 'No brain prefixes scoped — full brain access.'}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {prefixes.map((p) => (
              <li
                key={p}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-1 font-mono text-[12px] text-[var(--color-fg-muted)]"
              >
                {p}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Model" icon={Cpu}>
        <p className="font-mono text-body text-[var(--color-fg)]">
          {employee.runtime.model}
        </p>
        <p className="mt-1 text-caption text-[var(--color-fg-muted)]">
          Max steps per run:{' '}
          <span className="font-mono text-[var(--color-fg)]">
            {employee.runtime.maxSteps}
          </span>
        </p>
      </Card>

      <Card title="Schedule" icon={Clock}>
        {employee.runtime.cronSchedule ? (
          <p className="font-mono text-body text-[var(--color-fg)]">
            {employee.runtime.cronSchedule}
          </p>
        ) : (
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            Chat-only — runs only when you message this employee.
          </p>
        )}
      </Card>
    </div>
  )
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Cpu
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center gap-2 text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
        <Icon size={12} />
        {title}
      </div>
      {children}
    </section>
  )
}
