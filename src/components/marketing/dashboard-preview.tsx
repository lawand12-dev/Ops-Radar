import { Badge } from "<npm>/components/ui/badge";
import { Sparkles } from "lucide-react";

/**
 * The OBSERVE + BRAIN preview card on the landing hero.
 *
 * Renders in DARK surface regardless of parent theme by setting
 * data-theme="dark" on its root — embeds a dark-surface dashboard
 * preview inside the light marketing surface.
 *
 * Structure (top → bottom):
 *   1. Header with sync status
 *   2. BUSINESS KPIs (revenue, ad spend, leads, hours reclaimed) — the
 *      "every tool, one screen" promise made visible
 *   3. BRAIN — AI input box with a sample answer (the "AI in the corner")
 *   4. Workflows table — secondary, smaller, scrollable
 *
 * Static design fixtures — not live data. Conveys what /dashboard will
 * look like in Phase 2.
 */
export function DashboardPreview() {
  return (
    <div
      data-theme="dark"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-md)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-[var(--color-success)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
          </span>
          <p className="text-label text-[var(--color-fg-subtle)]">opsradar.co · dashboard</p>
        </div>
        <p className="text-caption font-mono text-[var(--color-fg-subtle)]">
          live · synced 14s ago
        </p>
      </div>

      {/* Business KPIs — every tool, one screen */}
      <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-[var(--color-surface)] px-5 py-3.5">
            <div className="flex items-center justify-between">
              <p className="text-label text-[var(--color-fg-subtle)]">{k.label}</p>
              <span className="text-caption font-mono text-[var(--color-fg-faint)]">{k.source}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className="font-mono text-h3 font-medium tabular-nums text-[var(--color-fg)]">{k.value}</p>
              <p className={`text-caption ${TREND_COLOR[k.trendKind]}`}>
                {k.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* BRAIN — AI ask box with sample answer */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-[var(--color-primary)]" />
          <p className="text-label text-[var(--color-fg-subtle)]">BRAIN · ask anything</p>
        </div>
        <p className="mt-2 font-mono text-body-sm text-[var(--color-fg-muted)]">
          ↳ Which client lost the most margin this month?
        </p>
        <p className="mt-1.5 text-body-sm text-[var(--color-fg)] leading-[1.55]">
          <span className="text-[var(--color-primary)]">Aurora Beauty</span> — MER
          dropped from 5.2 to 3.4 after the Meta budget bump on the 14th. Their
          retainer margin landed at <span className="font-mono">38%</span>, down
          from 51% last month.
        </p>
      </div>

      {/* Workflows — secondary, compact */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
        <p className="text-label text-[var(--color-fg-subtle)]">OPERATE · workflows</p>
        <p className="text-caption font-mono text-[var(--color-fg-subtle)]">12 running · 1 degraded</p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {ROWS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[1.4fr_0.55fr_0.85fr_0.7fr] items-center gap-3 px-5 py-2.5"
          >
            <p className="text-body-sm font-medium text-[var(--color-fg)] truncate">{r.name}</p>
            <p className="text-caption font-mono text-[var(--color-fg-muted)] tabular-nums">{r.runs}</p>
            <Badge variant={r.status === "Running" ? "success" : "warn"} dot>
              {r.status}
            </Badge>
            <p className="text-caption font-mono text-[var(--color-fg-subtle)] text-right">{r.last}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TREND_COLOR = {
  up: "text-[var(--color-success)]",
  down: "text-[var(--color-danger)]",
  flat: "text-[var(--color-fg-subtle)]",
} as const;

const KPIS: Array<{
  label: string;
  source: string;
  value: string;
  trend: string;
  trendKind: keyof typeof TREND_COLOR;
}> = [
  {
    label: "Revenue · 30d",
    source: "Stripe",
    value: "$240k",
    trend: "+12% MoM",
    trendKind: "up" as const,
  },
  {
    label: "Ad spend · 30d",
    source: "Meta + Google",
    value: "$48k",
    trend: "MER 5.0",
    trendKind: "flat" as const,
  },
  {
    label: "Leads · 7d",
    source: "HubSpot",
    value: "162",
    trend: "+24",
    trendKind: "up" as const,
  },
  {
    label: "Hours reclaimed",
    source: "OPERATE",
    value: "2,431",
    trend: "+18%",
    trendKind: "up" as const,
  },
];

const ROWS = [
  { name: "invoice-reminders", runs: "412", status: "Running", last: "2 min ago" },
  { name: "lead-router-v2", runs: "87", status: "Running", last: "14 min ago" },
  { name: "slack-recap-daily", runs: "3", status: "Degraded", last: "1 hr ago" },
] as const;
