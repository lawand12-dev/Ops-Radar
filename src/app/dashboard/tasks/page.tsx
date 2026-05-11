import { Plus, Filter, MoreHorizontal } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Total Tasks', value: '252', delta: '24',    trend: 'up'   as const },
  { label: 'Completed',   value: '182', delta: '12.4%', trend: 'up'   as const },
  { label: 'In Progress', value: '48',  delta: '8',     trend: 'up'   as const },
  { label: 'Overdue',     value: '7',   delta: '2',     trend: 'down' as const },
];

type Task = {
  title: string;
  project: string;
  assignee: string;
  due: string;
  priority: 'High' | 'Medium' | 'Low';
};

type ColumnTone = 'subtle' | 'primary' | 'warn' | 'success';
type Column = { name: string; tone: ColumnTone; tasks: Task[] };

const columns: Column[] = [
  {
    name: 'To Do',
    tone: 'subtle',
    tasks: [
      { title: 'Define Q3 content calendar',     project: 'Acme Corp',     assignee: 'JK', due: 'Aug 12', priority: 'Medium' },
      { title: 'Audit competitor landing pages', project: 'BrightLab',     assignee: 'MR', due: 'Aug 14', priority: 'Low'    },
      { title: 'Draft new pricing page copy',    project: 'Pulse Media',   assignee: 'AK', due: 'Aug 18', priority: 'Medium' },
    ],
  },
  {
    name: 'In Progress',
    tone: 'primary',
    tasks: [
      { title: 'Wireframes v3 for homepage',    project: 'Acme Corp',     assignee: 'JK', due: 'Aug 09', priority: 'High'   },
      { title: 'Set up GA4 conversion events',  project: 'Crest Finance', assignee: 'MR', due: 'Aug 10', priority: 'High'   },
      { title: 'Prepare brand guidelines deck', project: 'Northwind',     assignee: 'AK', due: 'Aug 11', priority: 'Medium' },
      { title: 'Run keyword gap analysis',      project: 'BrightLab',     assignee: 'JK', due: 'Aug 13', priority: 'Medium' },
    ],
  },
  {
    name: 'Review',
    tone: 'warn',
    tasks: [
      { title: 'Logo concepts review', project: 'Northwind', assignee: 'AK', due: 'Aug 08', priority: 'High'   },
      { title: 'August invoice batch', project: 'Internal',  assignee: 'AK', due: 'Aug 07', priority: 'Medium' },
    ],
  },
  {
    name: 'Done',
    tone: 'success',
    tasks: [
      { title: 'Homepage design approved',   project: 'Acme Corp', assignee: 'JK', due: 'Aug 05', priority: 'High'   },
      { title: 'SEO audit deck delivered',   project: 'BrightLab', assignee: 'MR', due: 'Aug 04', priority: 'Medium' },
      { title: 'Q2 retainer renewal signed', project: 'GreenPlex', assignee: 'AK', due: 'Aug 02', priority: 'High'   },
    ],
  },
];

const COL_DOT: Record<ColumnTone, string> = {
  subtle:  'bg-[var(--color-fg-subtle)]',
  primary: 'bg-[var(--color-primary)]',
  warn:    'bg-[var(--color-warn)]',
  success: 'bg-[var(--color-success)]',
};

const PRIORITY: Record<Task['priority'], { dot: string; text: string }> = {
  High:   { dot: 'bg-[var(--color-danger)]',      text: 'text-[var(--color-danger)]'      },
  Medium: { dot: 'bg-[var(--color-warn)]',        text: 'text-[var(--color-warn)]'        },
  Low:    { dot: 'bg-[var(--color-fg-subtle)]',   text: 'text-[var(--color-fg-subtle)]'   },
};

function TaskCard({ task }: { task: Task }) {
  const p = PRIORITY[task.priority];
  return (
    <div className="mb-2.5 cursor-pointer rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 transition-colors hover:border-[var(--color-border-strong)]">
      <div className="mb-2 flex items-start justify-between">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-sunken)] px-2 py-[2px] text-[10.5px] font-semibold', p.text)}>
          <span className={cn('size-[5px] rounded-full', p.dot)} />
          {task.priority}
        </span>
        <MoreHorizontal size={14} className="cursor-pointer text-[var(--color-fg-subtle)]" />
      </div>

      <div className="mb-2 text-body-sm font-medium leading-[1.4] text-[var(--color-fg)]">
        {task.title}
      </div>

      <div className="mb-2.5 text-[11.5px] text-[var(--color-fg-muted)]">{task.project}</div>

      <div className="flex items-center justify-between">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-[10px] font-bold text-white">
          {task.assignee}
        </div>
        <span className="text-[11px] text-[var(--color-fg-subtle)]">Due {task.due}</span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Active work, by project, status, and owner."
        actions={
          <>
            <SecondaryButton>
              <Filter size={13} />
              Filter
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New task
            </PrimaryButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {columns.map((col) => (
          <div
            key={col.name}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 pt-3.5 pb-2"
          >
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', COL_DOT[col.tone])} />
                <span className="text-body-sm font-semibold text-[var(--color-fg)]">{col.name}</span>
                <span className="rounded-full bg-[var(--color-surface-sunken)] px-2 py-px text-[11px] text-[var(--color-fg-subtle)]">
                  {col.tasks.length}
                </span>
              </div>
              <Plus size={14} className="cursor-pointer text-[var(--color-fg-subtle)]" />
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
