import { Play, Plus, Calendar, ChevronDown, Pause } from 'lucide-react';
import { C } from '../_lib/theme';
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
        title="Time Tracking"
        subtitle="Log billable hours and review your team's time entries."
        actions={
          <>
            <SecondaryButton>
              <Calendar size={13} />
              This week
              <ChevronDown size={13} />
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New Entry
            </PrimaryButton>
          </>
        }
      />

      {/* Active timer */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(99,102,241,0.06))',
          border: `1px solid rgba(129,140,248,0.25)`,
          borderRadius: 12,
          padding: '18px 22px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.accent,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 0 0 4px rgba(129,140,248,0.15)',
            }}
          >
            <Pause size={16} fill="#fff" />
          </button>
          <div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 4, fontWeight: 500 }}>
              Currently tracking · <span style={{ color: C.accent }}>Acme Corp</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Wireframes v3 for homepage</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            01:24:38
          </div>
          <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4 }}>Started 09:12 AM</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <Card title="Recent Entries" action={<span style={{ fontSize: 12.5, color: C.accent, cursor: 'pointer', fontWeight: 500 }}>Export CSV</span>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Task', 'Project', 'Member', 'Start', 'Duration', 'Billable', 'Date', ''].map((h) => (
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
            {entries.map((e, i) => {
              const isLast = i === entries.length - 1;
              const border = isLast ? 'none' : `1px solid ${C.border}`;
              return (
                <tr key={i}>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{e.task}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>{e.project}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>{e.assignee}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{e.start}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{e.duration}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    {e.billable ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, padding: '2px 8px', borderRadius: 20 }}>
                        Billable
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 20 }}>
                        Internal
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.muted }}>{e.date}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <button
                      style={{
                        background: 'transparent',
                        border: `1px solid ${C.border}`,
                        borderRadius: 7,
                        padding: '4px 8px',
                        color: C.sub,
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Play size={10} fill={C.sub} /> Resume
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
