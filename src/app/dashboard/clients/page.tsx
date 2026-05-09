import { Plus, Search, Mail, Phone, MoreHorizontal } from 'lucide-react';
import { C } from '../_lib/theme';
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
  { name: 'Acme Corp',     industry: 'SaaS',          contact: 'Sarah Chen',    email: 'sarah@acme.io',     projects: 4, revenue: '$48,200', tier: 'Enterprise', initials: 'AC', color: 'linear-gradient(135deg, #3B82F6, #6366F1)' },
  { name: 'BrightLab',     industry: 'Marketing',     contact: 'Marcus Webb',   email: 'marcus@brightlab.com', projects: 2, revenue: '$22,800', tier: 'Growth',     initials: 'BL', color: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
  { name: 'Northwind',     industry: 'E-commerce',    contact: 'Priya Patel',   email: 'priya@northwind.co',   projects: 3, revenue: '$31,500', tier: 'Growth',     initials: 'NW', color: 'linear-gradient(135deg, #22C55E, #14B8A6)' },
  { name: 'Crest Finance', industry: 'Fintech',       contact: 'David Liu',     email: 'd.liu@crest.fi',       projects: 2, revenue: '$62,800', tier: 'Enterprise', initials: 'CF', color: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
  { name: 'GreenPlex',     industry: 'Sustainability', contact: 'Elena Rossi',  email: 'elena@greenplex.co',   projects: 1, revenue: '$14,200', tier: 'Starter',    initials: 'GP', color: 'linear-gradient(135deg, #10B981, #06B6D4)' },
  { name: 'Pulse Media',   industry: 'Media',         contact: 'Tom Hayes',     email: 'tom@pulsemedia.tv',    projects: 2, revenue: '$18,600', tier: 'Growth',     initials: 'PM', color: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
  { name: 'ScaleUp',       industry: 'B2B',           contact: 'Anika Mehta',   email: 'anika@scaleup.app',    projects: 1, revenue: '$9,200',  tier: 'Starter',    initials: 'SU', color: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
  { name: 'Nova Tech',     industry: 'Hardware',      contact: 'Ryan Park',     email: 'ryan@novatech.io',     projects: 3, revenue: '$28,400', tier: 'Growth',     initials: 'NT', color: 'linear-gradient(135deg, #06B6D4, #3B82F6)' },
];

const tierColors: Record<string, { color: string; bg: string }> = {
  Enterprise: { color: '#FCD34D', bg: 'rgba(245,158,11,0.12)'  },
  Growth:     { color: '#60A5FA', bg: 'rgba(59,130,246,0.12)'  },
  Starter:    { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Your full client roster and relationship health."
        actions={
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '6px 12px',
                minWidth: 240,
              }}
            >
              <Search size={13} color={C.muted} />
              <input
                placeholder="Search clients…"
                style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 13, width: '100%' }}
              />
            </div>
            <PrimaryButton>
              <Plus size={14} />
              New Client
            </PrimaryButton>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {clients.map((c) => {
          const tc = tierColors[c.tier];
          return (
            <Card key={c.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  {c.initials}
                </div>
                <MoreHorizontal size={16} color={C.muted} style={{ cursor: 'pointer' }} />
              </div>

              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{c.name}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14 }}>{c.industry}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <Mail size={11} color={C.muted} />
                <span style={{ fontSize: 11.5, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.email}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Phone size={11} color={C.muted} />
                <span style={{ fontSize: 11.5, color: C.sub }}>{c.contact}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 2 }}>Projects</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.projects}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 2 }}>Revenue</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.revenue}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: tc.color, background: tc.bg, padding: '3px 8px', borderRadius: 20 }}>
                  {c.tier}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
