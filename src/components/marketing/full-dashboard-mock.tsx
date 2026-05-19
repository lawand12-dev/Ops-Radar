import { Sparkles, Search } from "lucide-react";
import { Badge } from "<npm>/components/ui/badge";

/**
 * Rich, full-bleed-ready dashboard mockup for the mid-page product reveal.
 *
 * Layout (left → right, top → bottom):
 *   - Sidebar (nav rail with pillar groups + connected sources)
 *   - Main content
 *      - Status bar (live sync + search + initials)
 *      - 6-cell KPI strip
 *      - Two-up: Revenue sparkline panel + BRAIN ask panel
 *      - Workflows table (OPERATE)
 *
 * Static fixtures. Designed to read as one cohesive product surface, not
 * a marketing collage. Always renders in dark surface — parent decides
 * whether to wrap it in a browser frame.
 */
export function FullDashboardMock() {
  return (
    <div
      data-theme="dark"
      className="grid grid-cols-[200px_1fr] bg-[var(--color-surface)] text-[var(--color-fg)]"
    >
      <Sidebar />
      <main>
        <StatusBar />
        <KpiStrip />
        <ChartAndBrain />
        <WorkflowsBlock />
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Sidebar                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function Sidebar() {
  return (
    <aside className="border-r border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-5">
      <div className="flex items-center gap-2 px-2">
        <Logomark />
        <span className="font-serif text-body-sm tracking-[-0.01em] text-[var(--color-fg)]">
          OpsRadar
        </span>
      </div>

      <p className="mt-7 px-2 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
        Pillars
      </p>
      <ul className="mt-2 space-y-0.5">
        {PILLARS.map((p) => (
          <li key={p.label}>
            <span
              className={
                "flex items-center justify-between rounded-md px-2 py-1.5 text-[12px] " +
                (p.active
                  ? "bg-[var(--color-bg)] text-[var(--color-fg)]"
                  : "text-[var(--color-fg-muted)]")
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className={
                    "size-1.5 rounded-full " +
                    (p.active
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-fg-faint)]")
                  }
                />
                {p.label}
              </span>
              {p.count ? (
                <span className="font-mono text-[10px] text-[var(--color-fg-subtle)] tabular-nums">
                  {p.count}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-7 px-2 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
        Sources
      </p>
      <ul className="mt-2 space-y-0.5">
        {SOURCES.map((s) => (
          <li
            key={s}
            className="flex items-center justify-between px-2 py-1 text-[12px] text-[var(--color-fg-muted)]"
          >
            <span>{s}</span>
            <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Logomark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M 18 148 L 92 148 L 112 52 L 132 204 L 152 124 L 172 148 L 238 148"
        stroke="#06b6d4"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Status bar                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2.5">
        <span className="relative inline-flex">
          <span className="absolute inline-flex h-2 w-2 rounded-full bg-[var(--color-success)] opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
        </span>
        <p className="text-label text-[var(--color-fg-subtle)]">
          Business overview
        </p>
        <span className="text-[var(--color-fg-faint)]">·</span>
        <p className="text-caption font-mono text-[var(--color-fg-subtle)]">
          synced 14s ago
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1">
          <Search className="size-3 text-[var(--color-fg-subtle)]" />
          <span className="text-[11px] font-mono text-[var(--color-fg-subtle)] tracking-tight">
            Search clients, workflows, accounts…
          </span>
        </div>
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--color-accent-700)] text-[10px] font-medium text-white">
          DA
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  KPI strip                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function KpiStrip() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
      {KPIS.map((k) => (
        <div key={k.label} className="bg-[var(--color-surface)] px-5 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--color-fg-faint)]">
              {k.label}
            </p>
            <span className="text-[10px] font-mono text-[var(--color-fg-faint)]">
              {k.source}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="font-mono text-h4 font-medium tabular-nums text-[var(--color-fg)]">
              {k.value}
            </p>
            <p
              className={
                k.kind === "up"
                  ? "text-[11px] text-[var(--color-success)]"
                  : k.kind === "down"
                  ? "text-[11px] text-[var(--color-danger)]"
                  : "text-[11px] text-[var(--color-fg-subtle)]"
              }
            >
              {k.trend}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Chart + BRAIN panel                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function ChartAndBrain() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
      <div className="bg-[var(--color-surface)] px-6 py-5">
        <div className="flex items-center justify-between">
          <p className="text-label text-[var(--color-fg-subtle)]">
            Revenue · 30d
          </p>
          <p className="text-caption font-mono text-[var(--color-fg-subtle)]">
            Stripe · live
          </p>
        </div>
        <div className="mt-4">
          <Sparkline />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[var(--color-fg-faint)]">
          <span>Apr 12</span>
          <span>May 12</span>
        </div>
      </div>

      <div className="bg-[var(--color-surface-sunken)] px-6 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-[var(--color-primary)]" />
          <p className="text-label text-[var(--color-fg-subtle)]">
            BRAIN · ask anything
          </p>
        </div>
        <p className="mt-3 font-mono text-[12px] text-[var(--color-fg-muted)]">
          ↳ Which client lost the most margin this month?
        </p>
        <p className="mt-2 text-body-sm text-[var(--color-fg)] leading-[1.55]">
          <span className="text-[var(--color-primary)]">Aurora Beauty</span> —
          MER dropped from{" "}
          <span className="font-mono">5.2</span> to{" "}
          <span className="font-mono">3.4</span> after the Meta budget bump on
          the 14th. Retainer margin landed at{" "}
          <span className="font-mono">38%</span>, down from{" "}
          <span className="font-mono">51%</span>.
        </p>
      </div>
    </div>
  );
}

function Sparkline() {
  // Hand-crafted point set — gently up-and-to-the-right with believable noise.
  const points = [
    [0, 38],
    [8, 36],
    [16, 32],
    [24, 34],
    [32, 28],
    [40, 30],
    [48, 24],
    [56, 26],
    [64, 20],
    [72, 22],
    [80, 16],
    [88, 14],
    [96, 18],
    [100, 12],
  ];
  const d = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
  const area = `${d} L 100 50 L 0 50 Z`;

  return (
    <svg
      viewBox="0 0 100 50"
      preserveAspectRatio="none"
      className="h-20 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={d}
        fill="none"
        stroke="var(--color-accent-400)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Workflows table                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function WorkflowsBlock() {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)]">
        <p className="text-label text-[var(--color-fg-subtle)]">
          OPERATE · workflows
        </p>
        <p className="text-caption font-mono text-[var(--color-fg-subtle)]">
          12 running · 1 degraded
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {ROWS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[1.4fr_0.55fr_0.85fr_0.8fr] gap-4 px-6 py-2.5 items-center"
          >
            <p className="text-body-sm font-medium text-[var(--color-fg)] truncate">
              {r.name}
            </p>
            <p className="font-mono text-caption text-[var(--color-fg-muted)] tabular-nums">
              {r.runs}
            </p>
            <Badge variant={r.flag === "warn" ? "warn" : "success"} dot>
              {r.status}
            </Badge>
            <p className="font-mono text-caption text-[var(--color-fg-subtle)] text-right">
              {r.last}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Static fixtures                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

const PILLARS: Array<{ label: string; active: boolean; count?: string }> = [
  { label: "Overview", active: true },
  { label: "OPERATE", active: false, count: "12" },
  { label: "OBSERVE", active: false },
  { label: "BRAIN", active: false },
  { label: "GUARD", active: false, count: "1" },
];

const SOURCES = ["Stripe", "HubSpot", "ClickUp", "Meta Ads", "Google Ads", "Harvest"];

const KPIS: Array<{
  label: string;
  source: string;
  value: string;
  trend: string;
  kind: "up" | "down" | "flat";
}> = [
  { label: "Revenue · 30d", source: "Stripe", value: "$240k", trend: "+12%", kind: "up" },
  { label: "Ad spend · 30d", source: "Meta+G", value: "$48k", trend: "flat", kind: "flat" },
  { label: "MER", source: "OBSERVE", value: "5.0", trend: "flat", kind: "flat" },
  { label: "Leads · 7d", source: "HubSpot", value: "162", trend: "+24", kind: "up" },
  { label: "Hours · 30d", source: "OPERATE", value: "2,431", trend: "+18%", kind: "up" },
  { label: "Workflows", source: "OPERATE", value: "87", trend: "1 d.", kind: "flat" },
];

const ROWS = [
  { name: "invoice-reminders", runs: "412", status: "Running", last: "2 min ago", flag: "success" },
  { name: "lead-router-v2", runs: "87", status: "Running", last: "14 min ago", flag: "success" },
  { name: "client-monthly-recap", runs: "12", status: "Running", last: "1 hr ago", flag: "success" },
  { name: "slack-recap-daily", runs: "3", status: "Degraded", last: "1 hr ago", flag: "warn" },
  { name: "onboarding-emails", runs: "54", status: "Running", last: "4 min ago", flag: "success" },
] as const;
