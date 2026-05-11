import { Plus, Mail, MoreHorizontal } from 'lucide-react';
import { C } from '../_lib/theme';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton } from '../_components/buttons';

const stats = [
  { label: 'Team Members', value: '12', delta: '2',     trend: 'up'      as const },
  { label: 'Online Now',   value: '8',  delta: '67%',   trend: 'neutral' as const },
  { label: 'Avg Hours',    value: '36h', delta: '4.2%', trend: 'up'      as const },
  { label: 'Open Roles',   value: '3',   delta: '1',    trend: 'up'      as const },
];

const team = [
  { name: 'Alex Kim',      role: 'Agency Owner',     email: 'alex@opsradar.io',     status: 'online', hours: 38, projects: 24, initials: 'AK', color: 'linear-gradient(135deg, #818CF8, #6366F1)' },
  { name: 'Jordan Park',   role: 'Design Lead',      email: 'jordan@opsradar.io',   status: 'online', hours: 42, projects: 11, initials: 'JP', color: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
  { name: 'Maya Rivera',   role: 'SEO Strategist',   email: 'maya@opsradar.io',     status: 'online', hours: 36, projects: 8,  initials: 'MR', color: 'linear-gradient(135deg, #22C55E, #14B8A6)' },
  { name: 'Tom Hayes',     role: 'Senior Developer', email: 'tom@opsradar.io',      status: 'away',   hours: 40, projects: 6,  initials: 'TH', color: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
  { name: 'Priya Patel',   role: 'Content Manager',  email: 'priya@opsradar.io',    status: 'online', hours: 32, projects: 9,  initials: 'PP', color: 'linear-gradient(135deg, #06B6D4, #818CF8)' },
  { name: 'Marcus Webb',   role: 'PPC Specialist',   email: 'marcus@opsradar.io',   status: 'online', hours: 38, projects: 7,  initials: 'MW', color: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
  { name: 'Elena Rossi',   role: 'Account Manager',  email: 'elena@opsradar.io',    status: 'offline', hours: 35, projects: 12, initials: 'ER', color: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
  { name: 'Ryan Chen',     role: 'Junior Designer',  email: 'ryan@opsradar.io',     status: 'online', hours: 30, projects: 4,  initials: 'RC', color: 'linear-gradient(135deg, #10B981, #06B6D4)' },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  online:  { color: '#22C55E', label: 'Online'  },
  away:    { color: '#F59E0B', label: 'Away'    },
  offline: { color: '#94A3B8', label: 'Offline' },
};

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Your people, what they're working on, and how loaded they are."
        actions={
          <PrimaryButton>
            <Plus size={14} />
            Invite Member
          </PrimaryButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {team.map((m) => {
          const sc = statusConfig[m.status];
          return (
            <Card key={m.email}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {m.initials}
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: sc.color,
                      border: `2px solid ${C.card}`,
                    }}
                  />
                </div>
                <MoreHorizontal size={16} color={C.muted} style={{ cursor: 'pointer' }} />
              </div>

              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{m.name}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>{m.role}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Mail size={11} color={C.muted} />
                <span style={{ fontSize: 11.5, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.email}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 2 }}>This week</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.hours}h</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 2 }}>Projects</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.projects}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
