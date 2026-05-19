# Client Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully-static client dashboard at `src/app/dashboard/page.tsx` with sidebar, metric cards, Chart.js charts, a projects table, and an activity feed — all hardcoded sample data.

**Architecture:** Single `'use client'` page component at `src/app/dashboard/page.tsx`. Charts rendered via Chart.js (npm package) in `useEffect` hooks using canvas refs. Styling via Tailwind + inline style for the custom dark palette (#080C14 background). No external data fetching.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, chart.js (npm), lucide-react (icons already installed).

> **Note on Chart.js delivery:** The spec says "from cdnjs" but the npm package ships its own TypeScript types and integrates cleanly with Next.js SSR. We use the npm package to satisfy the zero-TypeScript-errors requirement. The runtime bundle is identical.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/app/dashboard/page.tsx` | Full dashboard page — layout, sidebar, topbar, metrics, charts, table, activity |
| Modify | `package.json` (via npm install) | Add `chart.js` dependency |

---

### Task 1: Install chart.js

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install chart.js**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm install chart.js
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && node -e "require('chart.js')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add package.json package-lock.json
git commit -m "chore: add chart.js for dashboard charts"
```

---

### Task 2: Create the dashboard page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/page.tsx` with the full implementation**

Create the file with this exact content:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  DoughnutController,
  ArcElement,
} from 'chart.js';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  UsersRound,
  Settings,
  Bell,
  TrendingUp,
  Plus,
  MessageSquare,
  FileText,
  UserPlus,
  AlertCircle,
} from 'lucide-react';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  DoughnutController,
  ArcElement
);

// ─── palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#080C14',
  sidebar: '#0D1117',
  card: '#0F1923',
  accent: '#00C2FF',
  border: 'rgba(0,194,255,0.1)',
  text: '#E0F0FF',
  muted: '#4A6280',
  green: '#00E676',
};

// ─── sample data ─────────────────────────────────────────────────────────────
const metrics = [
  { label: 'Revenue', value: '$128,540', delta: '+18.6%', icon: DollarSign },
  { label: 'Profit Margin', value: '32.4%', delta: '+6.3%', icon: TrendingUp },
  { label: 'Active Projects', value: '24', delta: '+4', icon: FolderKanban },
  { label: 'Hours Tracked', value: '347h', delta: '+12.4%', icon: Clock },
  { label: 'Invoiced', value: '$96,430', delta: '+9.2%', icon: FileText },
];

const revenueLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const revenueData = [62000, 74000, 68000, 89000, 95000, 112000, 128540];

const projects = [
  { name: 'Brand Redesign', client: 'Acme Corp', progress: 87, hours: 142, revenue: '$24,800' },
  { name: 'SEO Campaign', client: 'Bright Labs', progress: 61, hours: 78, revenue: '$12,500' },
  { name: 'Social Media', client: 'Nova Tech', progress: 45, hours: 53, revenue: '$8,200' },
  { name: 'Web Development', client: 'Crest Finance', progress: 92, hours: 210, revenue: '$38,000' },
  { name: 'Email Automation', client: 'Pulse Media', progress: 33, hours: 29, revenue: '$6,100' },
];

const activity = [
  { icon: MessageSquare, text: 'New message from Acme Corp', time: '2 min ago' },
  { icon: CheckSquare, text: 'Task "Wireframes v3" marked complete', time: '18 min ago' },
  { icon: UserPlus, text: 'Jordan Kim joined the workspace', time: '1h ago' },
  { icon: AlertCircle, text: 'Invoice #1042 is overdue by 3 days', time: '3h ago' },
  { icon: Plus, text: 'New project "Email Automation" created', time: '5h ago' },
];

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Projects', icon: FolderKanban, active: false },
  { label: 'Tasks', icon: CheckSquare, active: false },
  { label: 'Time Tracking', icon: Clock, active: false },
  { label: 'Financials', icon: DollarSign, active: false },
  { label: 'Clients', icon: Users, active: false },
  { label: 'Reports', icon: BarChart3, active: false },
  { label: 'Team', icon: UsersRound, active: false },
  { label: 'Settings', icon: Settings, active: false },
];

// ─── sub-components ───────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '28px 20px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: C.text,
            letterSpacing: '-0.3px',
          }}
        >
          Ops<span style={{ color: C.accent }}>Radar</span>
        </span>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: C.accent,
            boxShadow: `0 0 8px ${C.accent}`,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navItems.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              marginBottom: 2,
              cursor: 'pointer',
              background: active ? `rgba(0,194,255,0.12)` : 'transparent',
              color: active ? C.accent : C.muted,
              transition: 'background 0.15s',
            }}
          >
            <Icon size={16} strokeWidth={1.8} />
            <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400 }}>{label}</span>
          </div>
        ))}
      </nav>

      <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.accent}, #0066FF)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>Agency Owner</div>
            <div style={{ fontSize: 11, color: C.muted }}>Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          Welcome back! 👋
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted }}>
          Here's what's happening with your agency today.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 4 }}>
        <span style={{ fontSize: 12.5, color: C.muted }}>{today}</span>
        <button
          style={{
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '6px 8px',
            cursor: 'pointer',
            color: C.muted,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Bell size={16} />
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.accent}, #0066FF)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          A
        </div>
      </div>
    </div>
  );
}

function MetricCards() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 14,
        marginBottom: 24,
      }}
    >
      {metrics.map(({ label, value, delta, icon: Icon }) => (
        <div
          key={label}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '18px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                {value}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: `rgba(0,194,255,0.1)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={16} color={C.accent} strokeWidth={1.8} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: C.green,
                background: 'rgba(0,230,118,0.1)',
                borderRadius: 20,
                padding: '2px 8px',
              }}
            >
              {delta}
            </span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>vs last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0,194,255,0.25)');
    gradient.addColorStop(1, 'rgba(0,194,255,0)');

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: revenueLabels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueData,
            borderColor: '#00C2FF',
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00C2FF',
            pointBorderColor: '#0F1923',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0D1117',
            borderColor: 'rgba(0,194,255,0.3)',
            borderWidth: 1,
            titleColor: '#E0F0FF',
            bodyColor: '#00C2FF',
            callbacks: {
              label: (ctx) => ` $${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,194,255,0.05)' },
            ticks: { color: '#4A6280', font: { size: 11 } },
          },
          y: {
            grid: { color: 'rgba(0,194,255,0.05)' },
            ticks: {
              color: '#4A6280',
              font: { size: 11 },
              callback: (v) => `$${Number(v) / 1000}k`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, []);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        flex: '0 0 60%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Revenue Overview</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Jan – Jul 2026</div>
        </div>
        <span
          style={{
            fontSize: 11.5,
            color: C.green,
            background: 'rgba(0,230,118,0.1)',
            borderRadius: 20,
            padding: '3px 10px',
            fontWeight: 600,
          }}
        >
          +18.6% MoM
        </span>
      </div>
      <div style={{ height: 220 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function TasksChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'To Do'],
        datasets: [
          {
            data: [72, 18, 10],
            backgroundColor: ['#00C2FF', '#0066FF', '#0F1923'],
            borderColor: ['#00C2FF', '#0066FF', 'rgba(0,194,255,0.2)'],
            borderWidth: 1,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#4A6280',
              font: { size: 11.5 },
              padding: 14,
              boxWidth: 10,
              boxHeight: 10,
            },
          },
          tooltip: {
            backgroundColor: '#0D1117',
            borderColor: 'rgba(0,194,255,0.3)',
            borderWidth: 1,
            titleColor: '#E0F0FF',
            bodyColor: '#E0F0FF',
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, []);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Tasks Overview</div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Current sprint</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ height: 220, width: '100%' }}>
          <canvas ref={canvasRef} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>72%</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>done</div>
        </div>
      </div>
    </div>
  );
}

function ProjectsTable() {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        flex: '0 0 60%',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        Top Projects
      </div>
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
          {projects.map(({ name, client, progress, hours, revenue }, i) => (
            <tr key={name}>
              <td style={{ paddingTop: 12, paddingBottom: i < projects.length - 1 ? 12 : 4, borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{name}</span>
              </td>
              <td style={{ borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 12.5, color: C.muted }}>{client}</span>
              </td>
              <td style={{ borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none', paddingRight: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      background: 'rgba(0,194,255,0.1)',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: progress > 80 ? C.green : C.accent,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11.5, color: C.muted, minWidth: 30 }}>{progress}%</span>
                </div>
              </td>
              <td style={{ borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 12.5, color: C.muted }}>{hours}h</span>
              </td>
              <td style={{ borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.accent }}>{revenue}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        flex: 1,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        Recent Activity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {activity.map(({ icon: Icon, text, time }, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              paddingBottom: i < activity.length - 1 ? 14 : 0,
              borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(0,194,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={14} color={C.accent} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.4 }}>{text}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', fontFamily: 'inherit' }}>
      <Sidebar />

      {/* main content offset for fixed sidebar */}
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 28px', minWidth: 0 }}>
        <TopBar />
        <MetricCards />

        {/* middle row: revenue + tasks */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          <RevenueChart />
          <TasksChart />
        </div>

        {/* bottom row: projects + activity */}
        <div style={{ display: 'flex', gap: 14 }}>
          <ProjectsTable />
          <ActivityFeed />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors. If there are errors, fix them before proceeding.

- [ ] **Step 3: Lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint 2>&1 | tail -20
```

Expected: no errors (warnings acceptable).

- [ ] **Step 4: Build check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Show the diff**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && git diff --stat && git diff
```

Show the output to the user for review before committing.

- [ ] **Step 6: Commit (only after user approves diff)**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/dashboard/page.tsx
git commit -m "feat: add client dashboard with metrics, charts, table, and activity feed"
```

---

## Self-Review Against Spec

| Spec Requirement | Covered By |
|-----------------|-----------|
| Background #080C14 | `C.bg` applied to root div |
| Sidebar #0D1117, 220px fixed | `Sidebar` component |
| OpsRadar logo + cyan dot | Logo section in `Sidebar` |
| All 9 nav items with icons | `navItems` array |
| Dashboard active with cyan | `active` flag in nav render |
| Top bar welcome + subtitle | `TopBar` component |
| Right: date + bell + avatar | `TopBar` right side |
| 5 metric cards in a row | `MetricCards` 5-column grid |
| All 5 metrics with sample data | `metrics` array |
| Green % badge on each card | badge in `MetricCards` |
| Revenue line chart Jan–Jul | `RevenueChart` + Chart.js |
| Cyan line with glow | gradient fill + accent color |
| Tasks donut 72% completed | `TasksChart` + center label |
| 3 donut labels | Chart.js legend |
| Top Projects table 5 rows | `ProjectsTable` |
| Progress bars | inline div bars in table |
| Revenue column | last column in table |
| Recent Activity 5 items | `ActivityFeed` |
| Icons + timestamps | `activity` array |
| Zero TS errors | tsc --noEmit check in Task 2 |
| Show diff before committing | Step 5 before Step 6 |

No gaps found.
