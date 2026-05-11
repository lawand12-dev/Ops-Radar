import { Badge } from "<npm>/components/ui/badge";
import { Metric } from "<npm>/components/ui/metric";

/**
 * The Mercury-style "live dashboard glance" card.
 *
 * Renders in DARK surface regardless of parent theme by setting
 * data-theme="dark" on its root — this lets us embed a dark-surface
 * preview inside a light marketing surface for the cross-surface moment.
 *
 * Pure presentation: numbers and rows are static design fixtures
 * (not live data) — meant to convey what the real /dashboard surface
 * will look like in Phase 2.
 */
export function DashboardPreview() {
  return (
    <div
      data-theme="dark"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-[var(--color-success)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
          </span>
          <p className="text-label text-[var(--color-fg-subtle)]">Live workflows</p>
        </div>
        <p className="text-caption font-mono text-[var(--color-fg-subtle)]">
          12 running · 1 degraded
        </p>
      </div>

      <ul className="divide-y divide-[var(--color-border)]">
        {ROWS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr] items-center gap-4 px-5 py-3.5"
          >
            <div>
              <p className="text-body-sm font-medium text-[var(--color-fg)]">{r.name}</p>
              <p className="text-caption text-[var(--color-fg-subtle)]">{r.desc}</p>
            </div>
            <p className="text-body-sm font-mono text-[var(--color-fg-muted)] tabular-nums">{r.runs}</p>
            <Badge variant={r.status === "Running" ? "success" : r.status === "Degraded" ? "warn" : "secondary"} dot>
              {r.status}
            </Badge>
            <p className="text-caption font-mono text-[var(--color-fg-subtle)]">{r.last}</p>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-3 gap-px bg-[var(--color-border)] border-t border-[var(--color-border)]">
        <div className="bg-[var(--color-surface)] px-5 py-4">
          <Metric
            label="Hours reclaimed / mo"
            value="2,431"
            delta={{ value: "+18%", trend: "up" }}
          />
        </div>
        <div className="bg-[var(--color-surface)] px-5 py-4">
          <Metric
            label="Workflows running"
            value="87"
            delta={{ value: "+6", trend: "up" }}
          />
        </div>
        <div className="bg-[var(--color-surface)] px-5 py-4">
          <Metric label="ROI to date" value="$184,200" />
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  {
    name: "invoice-reminders",
    desc: "Sends overdue invoice reminders via Gmail",
    runs: "412",
    status: "Running",
    last: "2 min ago",
  },
  {
    name: "lead-router-v2",
    desc: "Routes new inbound leads to AE round-robin",
    runs: "87",
    status: "Running",
    last: "14 min ago",
  },
  {
    name: "slack-recap-daily",
    desc: "Posts daily client-status summary to #ops",
    runs: "3",
    status: "Degraded",
    last: "1 hr ago",
  },
  {
    name: "onboarding-emails",
    desc: "Welcome series for new client signups",
    runs: "54",
    status: "Running",
    last: "4 min ago",
  },
] as const;
