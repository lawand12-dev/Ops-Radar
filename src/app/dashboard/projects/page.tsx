import { Plus, Search, Filter } from 'lucide-react';
import { C } from '../_lib/theme';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Active',     value: '24',        delta: '4',     trend: 'up'      as const },
  { label: 'Completed',  value: '142',       delta: '18',    trend: 'up'      as const },
  { label: 'On Hold',    value: '3',         delta: '1',     trend: 'down'    as const },
  { label: 'Total Revenue', value: '$284K', delta: '14.2%', trend: 'up'      as const },
];

const projects = [
  { name: 'Website Redesign',    client: 'Acme Corp',    status: 'In Progress', priority: 'High',   progress: 80, deadline: 'Aug 15', revenue: '$18,250' },
  { name: 'SEO Campaign',        client: 'BrightLab',    status: 'In Progress', priority: 'Medium', progress: 65, deadline: 'Sep 02', revenue: '$9,800'  },
  { name: 'Brand Identity',      client: 'Northwind',    status: 'Review',      priority: 'High',   progress: 90, deadline: 'Aug 08', revenue: '$14,300' },
  { name: 'PPC Management',      client: 'ScaleUp',      status: 'In Progress', priority: 'Low',    progress: 75, deadline: 'Ongoing', revenue: '$7,650'  },
  { name: 'Social Media Mgmt',   client: 'GreenPlex',    status: 'In Progress', priority: 'Medium', progress: 60, deadline: 'Ongoing', revenue: '$6,400'  },
  { name: 'Email Automation',    client: 'Pulse Media',  status: 'Planning',    priority: 'Medium', progress: 15, deadline: 'Sep 22', revenue: '$11,200' },
  { name: 'Content Strategy',    client: 'Acme Corp',    status: 'In Progress', priority: 'High',   progress: 45, deadline: 'Aug 28', revenue: '$8,900'  },
  { name: 'Mobile App Launch',   client: 'Crest Finance',status: 'In Progress', priority: 'High',   progress: 92, deadline: 'Aug 12', revenue: '$38,000' },
];

const statusColors: Record<string, { color: string; bg: string }> = {
  'In Progress': { color: '#60A5FA', bg: 'rgba(129,140,248,0.12)' },
  'Review':      { color: '#FCD34D', bg: 'rgba(245,158,11,0.12)' },
  'Planning':    { color: '#A78BFA', bg: 'rgba(139,92,246,0.12)' },
  'Completed':   { color: '#4ADE80', bg: 'rgba(34,197,94,0.12)'  },
};

const priorityColors: Record<string, string> = {
  High:   '#EF4444',
  Medium: '#F59E0B',
  Low:    '#94A3B8',
};

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Manage and track all your client projects in one place."
        actions={
          <>
            <SecondaryButton>
              <Filter size={13} />
              Filter
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New Project
            </PrimaryButton>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <Card
        title="All Projects"
        action={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '6px 10px',
              minWidth: 220,
            }}
          >
            <Search size={13} color={C.muted} />
            <input
              placeholder="Search projects…"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 12.5,
                width: '100%',
              }}
            />
          </div>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Project', 'Client', 'Status', 'Priority', 'Progress', 'Deadline', 'Revenue'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    fontSize: 11,
                    color: C.muted,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    paddingBottom: 10,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const isLast = i === projects.length - 1;
              const border = isLast ? 'none' : `1px solid ${C.border}`;
              const sc = statusColors[p.status] ?? statusColors['In Progress'];
              return (
                <tr key={p.name}>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{p.name}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>{p.client}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: sc.color,
                        background: sc.bg,
                        padding: '3px 8px',
                        borderRadius: 20,
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.sub }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColors[p.priority] }} />
                      {p.priority}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px 11px 0', borderBottom: border, minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'rgba(129,140,248,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${p.progress}%`,
                            background: 'linear-gradient(90deg, #6366F1, #818CF8)',
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11.5, color: C.sub, minWidth: 30 }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>{p.deadline}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{p.revenue}</span>
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
