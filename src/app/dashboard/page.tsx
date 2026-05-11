'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  DoughnutController,
  ArcElement,
} from 'chart.js';
import {
  Plus,
  Calendar,
  ChevronDown,
  CheckCircle,
  FileText,
  FolderOpen,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { CHART_COLORS } from './_lib/theme';
import { PageHeader } from './_components/page-header';
import { StatCard } from './_components/stat-card';
import { Card } from './_components/card';
import { PrimaryButton, SecondaryButton } from './_components/buttons';
import { BrainAskBox } from './_components/brain-ask-box';
import { PillarTag } from './_components/pillar-tag';
import { GuardIncidentFeed } from './_components/guard-incident-feed';
import { SalesCard } from '<npm>/components/dashboard/sales-card';
import { HeroRoiBlock } from '<npm>/components/dashboard/hero-roi-block';
import { WorkflowHealthStrip } from '<npm>/components/dashboard/workflow-health-strip';
import { MarketingCard } from '<npm>/components/dashboard/marketing-card';
import { FinancialsCard } from '<npm>/components/dashboard/financials-card';
import { DeliveryCard } from '<npm>/components/dashboard/delivery-card';
import { cn } from '<npm>/lib/utils';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  DoughnutController,
  ArcElement
);

type LiveMetrics = {
  revenue: { total: number; weekly: number[] };
  invoiced: { total: number; paid: number; overdue: number };
  hours_tracked: { total: number; weekly: number[] };
  active_projects: { count: number };
  tasks: { completed: number; in_progress: number; todo: number };
  profit_margin_pct: number | null;
  period_label: string;
  sources_connected: string[];
  backfill_pending: boolean;
};

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const FALLBACK_METRICS = [
  { label: 'Revenue',         value: '$128,540', delta: '18.6%' },
  { label: 'Profit Margin',   value: '32.4%',    delta: '6.3%'  },
  { label: 'Active Projects', value: '24',       delta: '4'     },
  { label: 'Hours Tracked',   value: '347h',     delta: '12.4%' },
  { label: 'Invoiced',        value: '$96,430',  delta: '9.2%'  },
];

const revenueLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const revenueData   = [35000, 55000, 72000, 88000, 95000, 105000, 128540];

const taskData = [
  { label: 'Completed',   count: 182, color: CHART_COLORS.primary },
  { label: 'In Progress', count: 48,  color: CHART_COLORS.success },
  { label: 'To Do',       count: 22,  color: CHART_COLORS.trackOnSurface },
];

const projects = [
  { name: 'Website Redesign',  client: 'Acme Corp',  progress: 80, hours: 68,  revenue: '$18,250' },
  { name: 'SEO Campaign',      client: 'BrightLab',  progress: 65, hours: 42,  revenue: '$9,800'  },
  { name: 'Brand Identity',    client: 'Northwind',  progress: 90, hours: 55,  revenue: '$14,300' },
  { name: 'PPC Management',    client: 'ScaleUp',    progress: 75, hours: 38,  revenue: '$7,650'  },
  { name: 'Social Media Mgmt', client: 'GreenPlex',  progress: 60, hours: 32,  revenue: '$6,400'  },
];

type ActivityItem = {
  icon: LucideIcon;
  iconTint: 'success' | 'primary' | 'warn';
  title: string;
  sub: string;
  project: string;
  time: string;
};

const ICON_TINT: Record<ActivityItem['iconTint'], { wrap: string; icon: string; title: string }> = {
  success: {
    wrap:  'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]',
    icon:  'text-[var(--color-success)]',
    title: 'text-[var(--color-success)]',
  },
  primary: {
    wrap:  'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]',
    icon:  'text-[var(--color-primary)]',
    title: 'text-[var(--color-primary)]',
  },
  warn: {
    wrap:  'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)]',
    icon:  'text-[var(--color-warn)]',
    title: 'text-[var(--color-warn)]',
  },
};

const activityItems: ActivityItem[] = [
  { icon: CheckCircle, iconTint: 'success', title: 'Task completed',    sub: 'Homepage design approved',       project: 'Website Redesign', time: '2h ago' },
  { icon: Clock,       iconTint: 'primary', title: 'Time logged',       sub: '3h 20m logged on SEO Audit',     project: 'SEO Campaign',     time: '4h ago' },
  { icon: FileText,    iconTint: 'primary', title: 'Invoice sent',      sub: 'Invoice #INV-0321 sent to Acme', project: 'Website Redesign', time: '6h ago' },
  { icon: FolderOpen,  iconTint: 'warn',    title: 'Project created',   sub: 'New project "Brand Strategy" created', project: 'Brand Strategy', time: '1d ago' },
];

function RevenueChart({ labels = revenueLabels, data = revenueData }: { labels?: string[]; data?: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, CHART_COLORS.primaryAlpha35);
    gradient.addColorStop(1, 'rgba(129,140,248,0)');

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data,
          borderColor: CHART_COLORS.primary,
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.45,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: CHART_COLORS.primary,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_COLORS.surfaceSunken,
            borderColor: 'rgba(129,140,248,0.4)',
            borderWidth: 1,
            titleColor: CHART_COLORS.fgMuted,
            bodyColor: CHART_COLORS.fg,
            padding: 10,
            callbacks: {
              title: (items) => items[0].label + ' 2024',
              label: (item) => `$${(item.parsed.y ?? 0).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: CHART_COLORS.fgSubtle, font: { size: 11 } } },
          y: {
            grid: { color: CHART_COLORS.primaryAlpha04 },
            border: { display: false },
            ticks: { color: CHART_COLORS.fgSubtle, font: { size: 11 }, callback: (v) => `${Number(v) / 1000}K` },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [labels, data]);

  return (
    <Card title="Revenue overview" style={{ flex: '0 0 59%' }}>
      <div className="h-[220px]">
        <canvas ref={canvasRef} />
      </div>
    </Card>
  );
}

function TasksChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: taskData.map((t) => t.label),
        datasets: [{
          data: taskData.map((t) => t.count),
          backgroundColor: taskData.map((t) => t.color),
          borderColor: CHART_COLORS.surface,
          borderWidth: 3,
          hoverOffset: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_COLORS.surfaceSunken,
            borderColor: 'rgba(129,140,248,0.4)',
            borderWidth: 1,
            titleColor: CHART_COLORS.fgMuted,
            bodyColor: CHART_COLORS.fg,
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, []);

  const total = taskData.reduce((s, t) => s + t.count, 0);

  return (
    <Card title="Tasks overview" className="flex-1">
      <div className="flex items-center gap-5">
        <div className="relative h-[150px] w-[150px] shrink-0">
          <canvas ref={canvasRef} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[26px] font-bold leading-none text-[var(--color-fg)]">72%</div>
            <div className="mt-0.5 text-caption text-[var(--color-fg-muted)]">Completed</div>
          </div>
        </div>

        <div className="flex-1">
          {taskData.map(({ label, count, color }) => (
            <div key={label} className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="block size-[9px] shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-body-sm text-[var(--color-fg-muted)]">{label}</span>
              </div>
              <span className="text-[13.5px] font-semibold text-[var(--color-fg)]">{count}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <span className="text-body-sm text-[var(--color-fg-muted)]">Total tasks</span>
            <span className="text-[13.5px] font-bold text-[var(--color-fg)]">{total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProjectsTable() {
  return (
    <Card
      title="Top projects"
      action={
        <button
          type="button"
          className="cursor-pointer text-[12.5px] font-medium text-[var(--color-primary)] hover:underline"
        >
          View all
        </button>
      }
      style={{ flex: '0 0 57%' }}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['Project', 'Client', 'Progress', 'Hours', 'Revenue'].map((h) => (
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
          {projects.map(({ name, client, progress, hours, revenue }, i) => {
            const isLast = i === projects.length - 1;
            return (
              <tr key={name}>
                <td className={cn('py-2.5', !isLast && 'border-b border-[var(--color-border)]')}>
                  <span className="text-body-sm font-medium text-[var(--color-fg)]">{name}</span>
                </td>
                <td className={cn('py-2.5', !isLast && 'border-b border-[var(--color-border)]')}>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">{client}</span>
                </td>
                <td className={cn('py-2.5 pr-4', !isLast && 'border-b border-[var(--color-border)]')}>
                  <div className="flex items-center gap-2">
                    <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-500)] to-[var(--color-primary)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="min-w-[30px] text-[11.5px] text-[var(--color-fg-muted)]">{progress}%</span>
                  </div>
                </td>
                <td className={cn('py-2.5', !isLast && 'border-b border-[var(--color-border)]')}>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">{hours}h</span>
                </td>
                <td className={cn('py-2.5', !isLast && 'border-b border-[var(--color-border)]')}>
                  <span className="text-[12.5px] font-semibold text-[var(--color-fg)]">{revenue}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function ActivityFeed() {
  return (
    <Card
      title="Recent activity & alerts"
      action={
        <button
          type="button"
          className="cursor-pointer text-[12.5px] font-medium text-[var(--color-primary)] hover:underline"
        >
          View all
        </button>
      }
      className="flex-1"
    >
      <div>
        {activityItems.map((item, i) => {
          const isLast = i === activityItems.length - 1;
          const tint = ICON_TINT[item.iconTint];
          const Icon = item.icon;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 py-2.5',
                !isLast && 'border-b border-[var(--color-border)]',
              )}
            >
              <div className={cn('flex size-[34px] shrink-0 items-center justify-center rounded-full', tint.wrap)}>
                <Icon size={15} strokeWidth={1.8} className={tint.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('text-[12.5px] font-semibold', tint.title)}>{item.title}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-[var(--color-fg-muted)]">{item.sub}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11.5px] text-[var(--color-fg-muted)]">{item.project}</div>
                <div className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">{item.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MetricStatCards() {
  const [liveData, setLiveData] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/metrics')
      .then((r) => r.json())
      .then((json) => {
        if (json.status === 'ok') setLiveData(json.data as LiveMetrics);
      })
      .catch(() => {});
  }, []);

  const displayMetrics = liveData
    ? [
        { label: 'Revenue',         value: fmtCurrency(liveData.revenue.total),                                              delta: '—' },
        { label: 'Profit Margin',   value: liveData.profit_margin_pct != null ? `${liveData.profit_margin_pct.toFixed(1)}%` : '—', delta: '—' },
        { label: 'Active Projects', value: String(liveData.active_projects.count),                                            delta: '—' },
        { label: 'Hours Tracked',   value: `${Math.round(liveData.hours_tracked.total)}h`,                                    delta: '—' },
        { label: 'Invoiced',        value: fmtCurrency(liveData.invoiced.total),                                              delta: '—' },
      ]
    : FALLBACK_METRICS;

  const chartLabels = liveData
    ? liveData.revenue.weekly.map((_, i) => `W${i + 1}`)
    : revenueLabels;
  const chartData = liveData?.revenue.weekly ?? revenueData;

  return (
    <>
      <div className="mb-5 grid grid-cols-5 gap-3">
        {displayMetrics.map((m) => <StatCard key={m.label} {...m} />)}
      </div>
      <div className="mb-4 flex gap-3.5">
        <RevenueChart labels={chartLabels} data={chartData} />
        <TasksChart />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Your agency, this morning."
        subtitle="Connected continuously from your stack. Updated 14s ago."
        actions={
          <>
            <SecondaryButton>
              <Calendar size={13} />
              Jul 1 – Jul 31, 2024
              <ChevronDown size={13} />
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New project
            </PrimaryButton>
          </>
        }
      />

      <BrainAskBox />

      <HeroRoiBlock />

      <PillarTag name="OPERATE" subtitle="Workflows running across your stack" />
      <WorkflowHealthStrip />

      <MarketingCard />

      <PillarTag name="OBSERVE" subtitle="Every tool, surfaced in one screen" className="mt-5" />
      <MetricStatCards />

      <div className="mb-4 flex gap-3.5">
        <SalesCard />
      </div>

      <div className="mb-4 flex gap-3.5">
        <FinancialsCard />
        <DeliveryCard />
      </div>

      <PillarTag name="OPERATE" subtitle="Active project work" className="mt-5" />
      <div className="mb-4 flex gap-3.5">
        <ProjectsTable />
      </div>

      <PillarTag name="GUARD" subtitle="What broke, what self-healed, what needs you" />
      <div className="mb-4 flex gap-3.5">
        <GuardIncidentFeed />
      </div>

      <PillarTag name="OBSERVE" subtitle="Recent activity across your stack" />
      <div className="flex gap-3.5">
        <ActivityFeed />
      </div>
    </>
  );
}
