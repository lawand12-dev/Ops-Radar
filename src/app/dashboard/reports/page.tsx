'use client';

import { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  RadialLinearScale,
  PolarAreaController,
  ArcElement,
} from 'chart.js';
import { Calendar, ChevronDown, Download } from 'lucide-react';
import { CHART_COLORS } from '../_lib/theme';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  RadialLinearScale,
  PolarAreaController,
  ArcElement
);

const stats = [
  { label: 'Avg Project Value', value: '$11,840', delta: '8.4%', trend: 'up'   as const },
  { label: 'Utilization',       value: '78%',     delta: '3.2%', trend: 'up'   as const },
  { label: 'Win Rate',          value: '62%',     delta: '4.1%', trend: 'up'   as const },
  { label: 'Avg Project Time',  value: '24 days', delta: '2.6%', trend: 'down' as const },
];

function RevenueByMonth() {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [
          {
            label: 'Revenue',
            data: [35, 55, 72, 88, 95, 105, 128],
            backgroundColor: 'rgba(129,140,248,0.6)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Expenses',
            data: [12, 18, 22, 28, 30, 32, 36],
            backgroundColor: 'rgba(139,92,246,0.5)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
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
            callbacks: { label: (i) => ` ${i.dataset.label}: $${(i.parsed.y ?? 0)}K` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: CHART_COLORS.fgSubtle, font: { size: 11 } } },
          y: {
            grid: { color: CHART_COLORS.primaryAlpha04 },
            border: { display: false },
            ticks: { color: CHART_COLORS.fgSubtle, font: { size: 11 }, callback: (v) => `$${v}K` },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, []);

  return (
    <Card
      title="Revenue vs expenses"
      action={
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-fg-muted)]">
            <span className="size-[9px] rounded-full bg-[var(--color-primary)]" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-fg-muted)]">
            <span className="size-[9px] rounded-full bg-[#8B5CF6]" /> Expenses
          </span>
        </div>
      }
      style={{ flex: '0 0 60%' }}
    >
      <div className="h-[260px]">
        <canvas ref={ref} />
      </div>
    </Card>
  );
}

const projectMixData = [
  { label: 'Web Development', value: 38, color: '#818CF8' },
  { label: 'Branding',        value: 22, color: '#8B5CF6' },
  { label: 'SEO & Content',   value: 18, color: '#34D399' },
  { label: 'Paid Ads',        value: 14, color: '#FBBF24' },
  { label: 'Other',           value: 8,  color: '#71717A' },
];

function ProjectMix() {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: projectMixData.map((d) => d.label),
        datasets: [{
          data: projectMixData.map((d) => d.value),
          backgroundColor: projectMixData.map((d) => d.color + 'B0'),
          borderColor: projectMixData.map((d) => d.color),
          borderWidth: 1.5,
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
          },
        },
        scales: {
          r: {
            grid:   { color: 'rgba(255,255,255,0.05)' },
            angleLines: { color: 'rgba(255,255,255,0.05)' },
            ticks:  { display: false, backdropColor: 'transparent' },
            pointLabels: { display: false },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, []);

  return (
    <Card title="Project mix" className="flex-1">
      <div className="flex items-center gap-4">
        <div className="h-[180px] w-[180px] shrink-0">
          <canvas ref={ref} />
        </div>
        <div className="flex-1">
          {projectMixData.map((d) => (
            <div key={d.label} className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[12.5px] text-[var(--color-fg-muted)]">{d.label}</span>
              </div>
              <span className="text-[12.5px] font-semibold text-[var(--color-fg)]">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TopClients() {
  const top = [
    { name: 'Crest Finance', revenue: 62800, pct: 100 },
    { name: 'Acme Corp',     revenue: 48200, pct: 77  },
    { name: 'Northwind',     revenue: 31500, pct: 50  },
    { name: 'Nova Tech',     revenue: 28400, pct: 45  },
    { name: 'BrightLab',     revenue: 22800, pct: 36  },
    { name: 'Pulse Media',   revenue: 18600, pct: 29  },
  ];

  return (
    <Card title="Top clients by revenue" className="flex-1">
      {top.map((c) => (
        <div key={c.name} className="mb-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-[var(--color-fg)]">{c.name}</span>
            <span className="font-mono text-[12.5px] font-semibold tabular-nums text-[var(--color-fg)]">
              ${c.revenue.toLocaleString()}
            </span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-500)] to-[var(--color-primary)]"
              style={{ width: `${c.pct}%` }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Performance across revenue, margin, utilization, and delivery."
        actions={
          <>
            <SecondaryButton>
              <Calendar size={13} />
              Last 7 months
              <ChevronDown size={13} />
            </SecondaryButton>
            <PrimaryButton>
              <Download size={14} />
              Export PDF
            </PrimaryButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="mb-4 flex gap-3.5">
        <RevenueByMonth />
        <ProjectMix />
      </div>

      <div className="flex gap-3.5">
        <TopClients />
      </div>
    </>
  );
}
