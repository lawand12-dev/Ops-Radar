import { Plus, Filter, MoreHorizontal } from 'lucide-react';
import { C } from '../_lib/theme';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Total Tasks',  value: '252', delta: '24',    trend: 'up' as const },
  { label: 'Completed',    value: '182', delta: '12.4%', trend: 'up' as const },
  { label: 'In Progress',  value: '48',  delta: '8',     trend: 'up' as const },
  { label: 'Overdue',      value: '7',   delta: '2',     trend: 'down' as const },
];

type Task = {
  title: string;
  project: string;
  assignee: string;
  due: string;
  priority: 'High' | 'Medium' | 'Low';
};

const columns: { name: string; color: string; tasks: Task[] }[] = [
  {
    name: 'To Do',
    color: '#94A3B8',
    tasks: [
      { title: 'Define Q3 content calendar',     project: 'Acme Corp',     assignee: 'JK', due: 'Aug 12', priority: 'Medium' },
      { title: 'Audit competitor landing pages', project: 'BrightLab',     assignee: 'MR', due: 'Aug 14', priority: 'Low'    },
      { title: 'Draft new pricing page copy',    project: 'Pulse Media',   assignee: 'AK', due: 'Aug 18', priority: 'Medium' },
    ],
  },
  {
    name: 'In Progress',
    color: '#3B82F6',
    tasks: [
      { title: 'Wireframes v3 for homepage',     project: 'Acme Corp',     assignee: 'JK', due: 'Aug 09', priority: 'High'   },
      { title: 'Set up GA4 conversion events',   project: 'Crest Finance', assignee: 'MR', due: 'Aug 10', priority: 'High'   },
      { title: 'Prepare brand guidelines deck',  project: 'Northwind',     assignee: 'AK', due: 'Aug 11', priority: 'Medium' },
      { title: 'Run keyword gap analysis',       project: 'BrightLab',     assignee: 'JK', due: 'Aug 13', priority: 'Medium' },
    ],
  },
  {
    name: 'Review',
    color: '#F59E0B',
    tasks: [
      { title: 'Logo concepts review',           project: 'Northwind',     assignee: 'AK', due: 'Aug 08', priority: 'High'   },
      { title: 'August invoice batch',           project: 'Internal',      assignee: 'AK', due: 'Aug 07', priority: 'Medium' },
    ],
  },
  {
    name: 'Done',
    color: '#22C55E',
    tasks: [
      { title: 'Homepage design approved',       project: 'Acme Corp',     assignee: 'JK', due: 'Aug 05', priority: 'High'   },
      { title: 'SEO audit deck delivered',       project: 'BrightLab',     assignee: 'MR', due: 'Aug 04', priority: 'Medium' },
      { title: 'Q2 retainer renewal signed',     project: 'GreenPlex',     assignee: 'AK', due: 'Aug 02', priority: 'High'   },
    ],
  },
];

const priorityColors: Record<string, string> = {
  High:   '#EF4444',
  Medium: '#F59E0B',
  Low:    '#94A3B8',
};

function TaskCard({ task }: { task: Task }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: priorityColors[task.priority],
            background: 'rgba(255,255,255,0.04)',
            padding: '2px 7px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: priorityColors[task.priority] }} />
          {task.priority}
        </span>
        <MoreHorizontal size={14} color={C.muted} style={{ cursor: 'pointer' }} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>
        {task.title}
      </div>

      <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10 }}>{task.project}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {task.assignee}
        </div>
        <span style={{ fontSize: 11, color: C.muted }}>Due {task.due}</span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Plan, assign, and ship work across your team."
        actions={
          <>
            <SecondaryButton>
              <Filter size={13} />
              Filter
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New Task
            </PrimaryButton>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {columns.map((col) => (
          <div
            key={col.name}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '14px 14px 8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{col.name}</span>
                <span style={{ fontSize: 11, color: C.muted, background: 'rgba(255,255,255,0.04)', padding: '1px 7px', borderRadius: 20 }}>
                  {col.tasks.length}
                </span>
              </div>
              <Plus size={14} color={C.muted} style={{ cursor: 'pointer' }} />
            </div>

            <div>
              {col.tasks.map((t, i) => <TaskCard key={i} task={t} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
