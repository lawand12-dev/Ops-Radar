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
import { C } from '../_lib/theme';
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
  { label: 'Avg Project Value', value: '$11,840', delta: '8.4%',  trend: 'up' as const   },
  { label: 'Utilization',       value: '78%',      delta: '3.2%',  trend: 'up' as const   },
  { label: 'Win Rate',          value: '62%',      delta: '4.1%',  trend: 'up' as const   },
  { label: 'Avg Project Time',  value: '24 days',  delta: '2.6%',  trend: 'down' as const },
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
            backgroundColor: '#15151A',
            borderColor: 'rgba(129,140,248,0.4)',
            borderWidth: 1,
            titleColor: '#94A3B8',
            bodyColor: '#F0F4FF',
            callbacks: { label: (i) => ` ${i.dataset.label}: $${(i.parsed.y ?? 0)}K` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#4B5F7A', font: { size: 11 } } },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { display: false },
            ticks: { color: '#4B5F7A', font: { size: 11 }, callback: (v) => `$${v}K` },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, []);

  return (
    <Card
      title="Revenue vs Expenses"
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.sub }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#818CF8' }} /> Revenue
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.sub }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#8B5CF6' }} /> Expenses
          </span>
        </div>
      }
      style={{ flex: '0 0 60%' }}
    >
      <div style={{ height: 260 }}>
        <canvas ref={ref} />
      </div>
    </Card>
  );
}

const projectMixData = [
  { label: 'Web Development', value: 38, color: '#818CF8' },
  { label: 'Branding',        value: 22, color: '#8B5CF6' },
  { label: 'SEO & Content',   value: 18, color: '#22C55E' },
  { label: 'Paid Ads',        value: 14, color: '#F59E0B' },
  { label: 'Other',           value: 8,  color: '#94A3B8' },
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
            backgroundColor: '#15151A',
            borderColor: 'rgba(129,140,248,0.4)',
            borderWidth: 1,
            titleColor: '#94A3B8',
            bodyColor: '#F0F4FF',
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
    <Card title="Project Mix" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 180, height: 180, flexShrink: 0 }}>
          <canvas ref={ref} />
        </div>
        <div style={{ flex: 1 }}>
          {projectMixData.map((d) => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: 12.5, color: C.sub }}>{d.label}</span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{d.value}%</span>
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
    <Card title="Top Clients by Revenue" style={{ flex: 1 }}>
      {top.map((c) => (
        <div key={c.name} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.text, fontWeight: 500 }}>{c.name}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
              ${c.revenue.toLocaleString()}
            </span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${c.pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #818CF8)', borderRadius: 99 }} />
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
        subtitle="Insights and analytics across your agency."
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        <RevenueByMonth />
        <ProjectMix />
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <TopClients />
      </div>
    </>
  );
}
