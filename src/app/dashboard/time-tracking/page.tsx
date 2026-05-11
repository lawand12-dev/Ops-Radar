import { Play, Plus, Calendar, ChevronDown, Pause } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Today',          value: '6h 24m',  delta: '12.4%', trend: 'up' as const },
  { label: 'This Week',      value: '32h 10m', delta: '8.2%',  trend: 'up' as const },
  { label: 'This Month',     value: '347h',    delta: '14.6%', trend: 'up' as const },
  { label: 'Billable Ratio', value: '86%',     delta: '3.1%',  trend: 'up' as const },
];

const entries = [
  { task: 'Wireframes v3 for homepage',     project: 'Acme Corp',     assignee: 'Jordan Kim', duration: '2h 15m', billable: true,  start: '09:12 AM', date: 'Today' },
  { task: 'Set up GA4 conversion events',   project: 'Crest Finance', assignee: 'Maya R.',    duration: '1h 30m', billable: true,  start: '11:42 AM', date: 'Today' },
  { task: 'Internal: weekly planning',      project: 'Internal',      assignee: 'Alex Kim',   duration: '0h 45m', billable: false, start: '01:30 PM', date: 'Today' },
  { task: 'Run keyword gap analysis',       project: 'BrightLab',     assignee: 'Jordan Kim', duration: '1h 54m', billable: true,  start: '02:18 PM', date: 'Today' },
  { task: 'Logo concepts review',           project: 'Northwind',     assignee: 'Alex Kim',   duration: '3h 10m', billable: true,  start: '10:00 AM', date: 'Yesterday' },
  { task: 'Prepare brand guidelines deck',  project: 'Northwind',     assignee: 'Alex Kim',   duration: '2h 22m', billable: true,  start: '01:30 PM', date: 'Yesterday' },
  { task: 'Audit competitor landing pages', project: 'BrightLab',     assignee: 'Maya R.',    duration: '1h 48m', billable: true,  start: '04:00 PM', date: 'Yesterday' },
];

export default function TimeTrackingPage() {
  return (
    <>
      <PageHeader
        title="Time tracking"
        subtitle="Hours logged and utilization, across your team."
        actions={
          <>
            <SecondaryButton>
              <Calendar size={13} />
              This week
              <ChevronDown size={13} />
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New entry
            </PrimaryButton>
          </>
        }
      />

      {/* Active timer */}
      <div className="mb-5 flex items-center justify-between rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-6 py-5">
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Pause timer"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_15%,transparent)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Pause size={16} fill="currentColor" />
          </button>
          <div>
            <div className="mb-1 text-caption font-medium text-[var(--color-fg-muted)]">
              Currently tracking · <span className="text-[var(--color-primary)]">Acme Corp</span>
            </div>
            <div className="text-body font-semibold text-[var(--color-fg)]">Wireframes v3 for homepage</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[28px] font-bold leading-none tabular-nums text-[var(--color-fg)]">
            01:24:38
          </div>
          <div className="mt-1 text-[11.5px] text-[var(--color-fg-muted)]">Started 09:12 AM</div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <Card
        title="Recent entries"
        action={
          <button
            type="button"
            className="cursor-pointer text-[12.5px] font-medium text-[var(--color-primary)] hover:underline"
          >
            Export CSV
          </button>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Task', 'Project', 'Member', 'Start', 'Duration', 'Billable', 'Date', ''].map((h, idx) => (
                <th
                  key={`${h}-${idx}`}
                  className="border-b border-[var(--color-border)] pb-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const isLast = i === entries.length - 1;
              const cellBorder = !isLast && 'border-b border-[var(--color-border)]';
              return (
                <tr key={i}>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-body-sm font-medium text-[var(--color-fg)]">{e.task}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{e.project}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{e.assignee}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="font-mono text-[12.5px] tabular-nums text-[var(--color-fg-subtle)]">{e.start}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums text-[var(--color-fg)]">{e.duration}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    {e.billable ? (
                      <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] px-2 py-[2px] text-[11px] font-semibold text-[var(--color-success)]">
                        Billable
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[var(--color-surface-sunken)] px-2 py-[2px] text-[11px] font-semibold text-[var(--color-fg-subtle)]">
                        Internal
                      </span>
                    )}
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-subtle)]">{e.date}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-2 py-1 text-[11px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                    >
                      <Play size={10} fill="currentColor" /> Resume
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
