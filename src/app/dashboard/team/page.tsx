import { Plus, Mail, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton } from '../_components/buttons';

const stats = [
  { label: 'Team Members', value: '12',  delta: '2',    trend: 'up'      as const },
  { label: 'Online Now',   value: '8',   delta: '67%',  trend: 'neutral' as const },
  { label: 'Avg Hours',    value: '36h', delta: '4.2%', trend: 'up'      as const },
  { label: 'Open Roles',   value: '3',   delta: '1',    trend: 'up'      as const },
];

const team = [
  { name: 'Alex Kim',    role: 'Agency owner',     email: 'alex@opsradar.io',   status: 'online',  hours: 38, projects: 24, initials: 'AK', color: 'linear-gradient(135deg, #818CF8, #6366F1)' },
  { name: 'Jordan Park', role: 'Design lead',      email: 'jordan@opsradar.io', status: 'online',  hours: 42, projects: 11, initials: 'JP', color: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
  { name: 'Maya Rivera', role: 'SEO strategist',   email: 'maya@opsradar.io',   status: 'online',  hours: 36, projects: 8,  initials: 'MR', color: 'linear-gradient(135deg, #22C55E, #14B8A6)' },
  { name: 'Tom Hayes',   role: 'Senior developer', email: 'tom@opsradar.io',    status: 'away',    hours: 40, projects: 6,  initials: 'TH', color: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
  { name: 'Priya Patel', role: 'Content manager',  email: 'priya@opsradar.io',  status: 'online',  hours: 32, projects: 9,  initials: 'PP', color: 'linear-gradient(135deg, #06B6D4, #818CF8)' },
  { name: 'Marcus Webb', role: 'PPC specialist',   email: 'marcus@opsradar.io', status: 'online',  hours: 38, projects: 7,  initials: 'MW', color: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
  { name: 'Elena Rossi', role: 'Account manager',  email: 'elena@opsradar.io',  status: 'offline', hours: 35, projects: 12, initials: 'ER', color: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
  { name: 'Ryan Chen',   role: 'Junior designer',  email: 'ryan@opsradar.io',   status: 'online',  hours: 30, projects: 4,  initials: 'RC', color: 'linear-gradient(135deg, #10B981, #06B6D4)' },
];

const STATUS_DOT: Record<string, string> = {
  online:  'bg-[var(--color-success)]',
  away:    'bg-[var(--color-warn)]',
  offline: 'bg-[var(--color-fg-faint)]',
};

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Who's on what, and how loaded they are."
        actions={
          <PrimaryButton>
            <Plus size={14} />
            Invite member
          </PrimaryButton>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {team.map((m) => (
          <Card key={m.email}>
            <div className="mb-3.5 flex items-start justify-between">
              <div className="relative">
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-[15px] font-bold tracking-[0.5px] text-white"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </div>
                <span
                  className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-[var(--color-surface)] ${STATUS_DOT[m.status]}`}
                />
              </div>
              <MoreHorizontal size={16} className="cursor-pointer text-[var(--color-fg-subtle)]" />
            </div>

            <div className="mb-1">
              <span className="text-[14.5px] font-semibold text-[var(--color-fg)]">{m.name}</span>
            </div>
            <div className="mb-3 text-[11.5px] text-[var(--color-fg-subtle)]">{m.role}</div>

            <div className="mb-3.5 flex items-center gap-1.5">
              <Mail size={11} className="text-[var(--color-fg-subtle)]" />
              <span className="truncate text-[11.5px] text-[var(--color-fg-muted)]">{m.email}</span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <div>
                <div className="mb-0.5 text-[10.5px] text-[var(--color-fg-subtle)]">This week</div>
                <div className="text-body-sm font-semibold text-[var(--color-fg)]">{m.hours}h</div>
              </div>
              <div className="text-right">
                <div className="mb-0.5 text-[10.5px] text-[var(--color-fg-subtle)]">Projects</div>
                <div className="text-body-sm font-semibold text-[var(--color-fg)]">{m.projects}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
