import { Plus, Search, Filter } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Active',        value: '24',    delta: '4',     trend: 'up'   as const },
  { label: 'Completed',     value: '142',   delta: '18',    trend: 'up'   as const },
  { label: 'On Hold',       value: '3',     delta: '1',     trend: 'down' as const },
  { label: 'Total Revenue', value: '$284K', delta: '14.2%', trend: 'up'   as const },
];

const projects = [
  { name: 'Website Redesign',  client: 'Acme Corp',     status: 'In Progress', priority: 'High',   progress: 80, deadline: 'Aug 15',  revenue: '$18,250' },
  { name: 'SEO Campaign',      client: 'BrightLab',     status: 'In Progress', priority: 'Medium', progress: 65, deadline: 'Sep 02',  revenue: '$9,800'  },
  { name: 'Brand Identity',    client: 'Northwind',     status: 'Review',      priority: 'High',   progress: 90, deadline: 'Aug 08',  revenue: '$14,300' },
  { name: 'PPC Management',    client: 'ScaleUp',       status: 'In Progress', priority: 'Low',    progress: 75, deadline: 'Ongoing', revenue: '$7,650'  },
  { name: 'Social Media Mgmt', client: 'GreenPlex',     status: 'In Progress', priority: 'Medium', progress: 60, deadline: 'Ongoing', revenue: '$6,400'  },
  { name: 'Email Automation',  client: 'Pulse Media',   status: 'Planning',    priority: 'Medium', progress: 15, deadline: 'Sep 22',  revenue: '$11,200' },
  { name: 'Content Strategy',  client: 'Acme Corp',     status: 'In Progress', priority: 'High',   progress: 45, deadline: 'Aug 28',  revenue: '$8,900'  },
  { name: 'Mobile App Launch', client: 'Crest Finance', status: 'In Progress', priority: 'High',   progress: 92, deadline: 'Aug 12',  revenue: '$38,000' },
];

const STATUS_BADGE: Record<string, string> = {
  'In Progress': 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]',
  'Review':      'bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] text-[var(--color-warn)]',
  'Planning':    'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]',
  'Completed':   'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]',
};

const PRIORITY_DOT: Record<string, string> = {
  High:   'bg-[var(--color-danger)]',
  Medium: 'bg-[var(--color-warn)]',
  Low:    'bg-[var(--color-fg-subtle)]',
};

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Active client work across your agency."
        actions={
          <>
            <SecondaryButton>
              <Filter size={13} />
              Filter
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New project
            </PrimaryButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <Card
        title="All projects"
        action={
          <div className="flex min-w-[220px] items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5">
            <Search size={13} className="text-[var(--color-fg-subtle)]" />
            <input
              placeholder="Search projects…"
              className="w-full border-none bg-transparent text-[12.5px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-faint)]"
            />
          </div>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Project', 'Client', 'Status', 'Priority', 'Progress', 'Deadline', 'Revenue'].map((h) => (
                <th
                  key={h}
                  className="border-b border-[var(--color-border)] pb-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const isLast = i === projects.length - 1;
              const cellBorder = !isLast && 'border-b border-[var(--color-border)]';
              return (
                <tr key={p.name}>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-body-sm font-medium text-[var(--color-fg)]">{p.name}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{p.client}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className={cn('inline-flex rounded-full px-2 py-[3px] text-[11px] font-semibold', STATUS_BADGE[p.status] ?? STATUS_BADGE['In Progress'])}>
                      {p.status}
                    </span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-muted)]">
                      <span className={cn('size-1.5 rounded-full', PRIORITY_DOT[p.priority])} />
                      {p.priority}
                    </span>
                  </td>
                  <td className={cn('min-w-[140px] py-2.5 pr-4', cellBorder)}>
                    <div className="flex items-center gap-2">
                      <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-500)] to-[var(--color-primary)]"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="min-w-[30px] text-[11.5px] text-[var(--color-fg-muted)]">{p.progress}%</span>
                    </div>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{p.deadline}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] font-semibold text-[var(--color-fg)]">{p.revenue}</span>
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
