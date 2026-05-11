import { Plus, Search, Mail, Phone, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton } from '../_components/buttons';

const stats = [
  { label: 'Active Clients',    value: '38',       delta: '5',     trend: 'up' as const },
  { label: 'New This Month',    value: '7',        delta: '40%',   trend: 'up' as const },
  { label: 'Avg Revenue',       value: '$12,450',  delta: '6.2%',  trend: 'up' as const },
  { label: 'Retention Rate',    value: '94%',      delta: '1.8%',  trend: 'up' as const },
];

const clients = [
  { name: 'Acme Corp',     industry: 'SaaS',           contact: 'Sarah Chen',  email: 'sarah@acme.io',         projects: 4, revenue: '$48,200', tier: 'Enterprise', initials: 'AC', color: 'linear-gradient(135deg, #818CF8, #6366F1)' },
  { name: 'BrightLab',     industry: 'Marketing',      contact: 'Marcus Webb', email: 'marcus@brightlab.com',  projects: 2, revenue: '$22,800', tier: 'Growth',     initials: 'BL', color: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
  { name: 'Northwind',     industry: 'E-commerce',     contact: 'Priya Patel', email: 'priya@northwind.co',    projects: 3, revenue: '$31,500', tier: 'Growth',     initials: 'NW', color: 'linear-gradient(135deg, #22C55E, #14B8A6)' },
  { name: 'Crest Finance', industry: 'Fintech',        contact: 'David Liu',   email: 'd.liu@crest.fi',        projects: 2, revenue: '$62,800', tier: 'Enterprise', initials: 'CF', color: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
  { name: 'GreenPlex',     industry: 'Sustainability', contact: 'Elena Rossi', email: 'elena@greenplex.co',    projects: 1, revenue: '$14,200', tier: 'Starter',    initials: 'GP', color: 'linear-gradient(135deg, #10B981, #06B6D4)' },
  { name: 'Pulse Media',   industry: 'Media',          contact: 'Tom Hayes',   email: 'tom@pulsemedia.tv',     projects: 2, revenue: '$18,600', tier: 'Growth',     initials: 'PM', color: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
  { name: 'ScaleUp',       industry: 'B2B',            contact: 'Anika Mehta', email: 'anika@scaleup.app',     projects: 1, revenue: '$9,200',  tier: 'Starter',    initials: 'SU', color: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
  { name: 'Nova Tech',     industry: 'Hardware',       contact: 'Ryan Park',   email: 'ryan@novatech.io',      projects: 3, revenue: '$28,400', tier: 'Growth',     initials: 'NT', color: 'linear-gradient(135deg, #06B6D4, #818CF8)' },
];

const TIER_BADGE: Record<string, string> = {
  Enterprise: 'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] text-[var(--color-warn)]',
  Growth:     'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]',
  Starter:    'bg-[var(--color-surface-sunken)] text-[var(--color-fg-muted)]',
};

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Your roster — margins, MER, status, history. Surfaced live."
        actions={
          <>
            <div className="flex min-w-[240px] items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
              <Search size={13} className="text-[var(--color-fg-subtle)]" />
              <input
                placeholder="Search clients…"
                className="w-full border-none bg-transparent text-body-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-faint)]"
              />
            </div>
            <PrimaryButton>
              <Plus size={14} />
              New client
            </PrimaryButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {clients.map((c) => (
          <Card key={c.name}>
            <div className="mb-3.5 flex items-start justify-between">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[13px] font-bold tracking-[0.5px] text-white"
                style={{ background: c.color }}
              >
                {c.initials}
              </div>
              <MoreHorizontal size={16} className="cursor-pointer text-[var(--color-fg-subtle)]" />
            </div>

            <div className="mb-1">
              <span className="text-[14.5px] font-semibold text-[var(--color-fg)]">{c.name}</span>
            </div>
            <div className="mb-3.5 text-[11.5px] text-[var(--color-fg-subtle)]">{c.industry}</div>

            <div className="mb-1.5 flex items-center gap-1.5">
              <Mail size={11} className="text-[var(--color-fg-subtle)]" />
              <span className="truncate text-[11.5px] text-[var(--color-fg-muted)]">{c.email}</span>
            </div>
            <div className="mb-3.5 flex items-center gap-1.5">
              <Phone size={11} className="text-[var(--color-fg-subtle)]" />
              <span className="text-[11.5px] text-[var(--color-fg-muted)]">{c.contact}</span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <div>
                <div className="mb-0.5 text-[10.5px] text-[var(--color-fg-subtle)]">Projects</div>
                <div className="text-body-sm font-semibold text-[var(--color-fg)]">{c.projects}</div>
              </div>
              <div className="text-right">
                <div className="mb-0.5 text-[10.5px] text-[var(--color-fg-subtle)]">Revenue</div>
                <div className="text-body-sm font-semibold text-[var(--color-fg)]">{c.revenue}</div>
              </div>
            </div>

            <div className="mt-3">
              <span className={`inline-flex rounded-full px-2 py-[3px] text-[10.5px] font-semibold ${TIER_BADGE[c.tier]}`}>
                {c.tier}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
