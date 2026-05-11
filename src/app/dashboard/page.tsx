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
} from 'lucide-react';
import { C, CHART_COLORS } from './_lib/theme';
import { PageHeader } from './_components/page-header';
import { StatCard } from './_components/stat-card';
import { Card } from './_components/card';
import { PrimaryButton, SecondaryButton } from './_components/buttons';
import { SalesCard } from '<npm>/components/dashboard/sales-card';
import { HeroRoiBlock } from '<npm>/components/dashboard/hero-roi-block';
import { WorkflowHealthStrip } from '<npm>/components/dashboard/workflow-health-strip';
import { MarketingCard } from '<npm>/components/dashboard/marketing-card';
import { FinancialsCard } from '<npm>/components/dashboard/financials-card';
import { DeliveryCard } from '<npm>/components/dashboard/delivery-card';

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
  { label: 'Active Projects', value: '24',        delta: '4'     },
  { label: 'Hours Tracked',   value: '347h',      delta: '12.4%' },
  { label: 'Invoiced',        value: '$96,430',   delta: '9.2%'  },
];

const revenueLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const revenueData   = [35000, 55000, 72000, 88000, 95000, 105000, 128540];

const taskData = [
  { label: 'Completed',   count: 182, color: CHART_COLORS.primary },          // indigo
  { label: 'In Progress', count: 48,  color: CHART_COLORS.success },          // success-green
  { label: 'To Do',       count: 22,  color: CHART_COLORS.trackOnSurface },   // muted track
];

const projects = [
  { name: 'Website Redesign',  client: 'Acme Corp',  progress: 80, hours: 68,  revenue: '$18,250' },
  { name: 'SEO Campaign',      client: 'BrightLab',  progress: 65, hours: 42,  revenue: '$9,800'  },
  { name: 'Brand Identity',    client: 'Northwind',  progress: 90, hours: 55,  revenue: '$14,300' },
  { name: 'PPC Management',    client: 'ScaleUp',    progress: 75, hours: 38,  revenue: '$7,650'  },
  { name: 'Social Media Mgmt', client: 'GreenPlex',  progress: 60, hours: 32,  revenue: '$6,400'  },
];

const activityItems = [
  {
    color: CHART_COLORS.success, bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle,
    titleColor: CHART_COLORS.success, title: 'Task completed',
    sub: 'Homepage design approved',
    project: 'Website Redesign', time: '2h ago',
  },
  {
    color: CHART_COLORS.primary, bg: 'rgba(129,140,248,0.12)', icon: Clock,
    titleColor: CHART_COLORS.primary, title: 'Time logged',
    sub: '3h 20m logged on SEO Audit',
    project: 'SEO Campaign', time: '4h ago',
  },
  {
    color: CHART_COLORS.primary, bg: 'rgba(129,140,248,0.18)', icon: FileText,
    titleColor: CHART_COLORS.primary, title: 'Invoice sent',
    sub: 'Invoice #INV-0321 sent to Acme Corp',
    project: 'Website Redesign', time: '6h ago',
  },
  {
    color: CHART_COLORS.warn, bg: 'rgba(251,191,36,0.12)', icon: FolderOpen,
    titleColor: CHART_COLORS.warn, title: 'Project created',
    sub: 'New project "Brand Strategy" created',
    project: 'Brand Strategy', time: '1d ago',
  },
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
    <Card title="Revenue Overview" style={{ flex: '0 0 59%' }}>
      <div style={{ height: 220 }}>
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
    <Card title="Tasks Overview" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
          <canvas ref={canvasRef} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>72%</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Completed</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {taskData.map(({ label, count, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.sub }}>{label}</span>
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{count}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, color: C.sub }}>Total Tasks</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProjectsTable() {
  return (
    <Card
      title="Top Projects"
      action={<span style={{ fontSize: 12.5, color: C.accent, cursor: 'pointer', fontWeight: 500 }}>View all</span>}
      style={{ flex: '0 0 57%' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Project', 'Client', 'Progress', 'Hours', 'Revenue'].map((h) => (
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
          {projects.map(({ name, client, progress, hours, revenue }, i) => {
            const isLast = i === projects.length - 1;
            const border = isLast ? 'none' : `1px solid ${C.border}`;
            return (
              <tr key={name}>
                <td style={{ padding: '11px 0', borderBottom: border }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{name}</span>
                </td>
                <td style={{ padding: '11px 0', borderBottom: border }}>
                  <span style={{ fontSize: 12.5, color: C.sub }}>{client}</span>
                </td>
                <td style={{ padding: '11px 16px 11px 0', borderBottom: border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: 'rgba(129,140,248,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, var(--color-accent-500), var(--color-primary))',
                          borderRadius: 99,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11.5, color: C.sub, minWidth: 30 }}>{progress}%</span>
                  </div>
                </td>
                <td style={{ padding: '11px 0', borderBottom: border }}>
                  <span style={{ fontSize: 12.5, color: C.sub }}>{hours}h</span>
                </td>
                <td style={{ padding: '11px 0', borderBottom: border }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{revenue}</span>
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
      title="Recent Activity"
      action={<span style={{ fontSize: 12.5, color: C.accent, cursor: 'pointer', fontWeight: 500 }}>View all</span>}
      style={{ flex: 1 }}
    >
      <div>
        {activityItems.map(({ color, bg, icon: Icon, title, titleColor, sub, project, time }, i) => {
          const isLast = i === activityItems.length - 1;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={color} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: titleColor }}>{title}</div>
                <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11.5, color: C.sub }}>{project}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{time}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {displayMetrics.map((m) => <StatCard key={m.label} {...m} />)}
      </div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
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
        title={<>Welcome back! 👋</>}
        subtitle="Here's what's happening with your agency today."
        actions={
          <>
            <SecondaryButton>
              <Calendar size={13} />
              Jul 1 – Jul 31, 2024
              <ChevronDown size={13} />
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New Project
            </PrimaryButton>
          </>
        }
      />

      <HeroRoiBlock />
      <WorkflowHealthStrip />

      <MarketingCard />

      <MetricStatCards />

      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        <SalesCard />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        <FinancialsCard />
        <DeliveryCard />
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <ProjectsTable />
        <ActivityFeed />
      </div>
    </>
  );
}
