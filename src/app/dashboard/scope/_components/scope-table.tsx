// src/app/dashboard/scope/_components/scope-table.tsx
'use client';

import type { ScopeProject } from '<npm>/lib/scope-creep';
import Link from 'next/link';

const STATUS_STYLES: Record<
  ScopeProject['status'],
  { bg: string; text: string; label: string }
> = {
  on_track:    { bg: 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]', text: 'text-[var(--color-success)]',  label: 'On Track'    },
  at_risk:     { bg: 'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)]',    text: 'text-[var(--color-warn)]',     label: 'At Risk'     },
  over_budget: { bg: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',  text: 'text-[var(--color-danger)]',   label: 'Over Budget' },
};

function BurnBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warn)' : 'var(--color-success)';
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-sunken)]">
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${capped}%`, background: color }}
      />
    </div>
  );
}

export function ScopeTable({ projects }: { projects: ScopeProject[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        No projects with time budgets found in ClickUp. Add time estimates to your ClickUp tasks to track scope burn.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="py-2 pr-4 text-left font-medium text-[var(--color-fg-muted)]">Project</th>
            <th className="py-2 px-4 text-right font-medium text-[var(--color-fg-muted)]">Budget h</th>
            <th className="py-2 px-4 text-right font-medium text-[var(--color-fg-muted)]">Logged h</th>
            <th className="py-2 px-4 min-w-[140px] font-medium text-[var(--color-fg-muted)]">Burn</th>
            <th className="py-2 pl-4 text-right font-medium text-[var(--color-fg-muted)]">Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const s = STATUS_STYLES[p.status];
            return (
              <tr
                key={p.project_name}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="py-2.5 pr-4 font-medium text-[var(--color-fg)]">
                  {p.project_name}
                  {!p.matched && (
                    <span className="ml-2 text-label text-[var(--color-fg-subtle)]">(no Harvest match)</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-[var(--color-fg-muted)]">
                  {p.estimated_hours}h
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-[var(--color-fg-muted)]">
                  {p.logged_hours}h
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex flex-col gap-1">
                    <BurnBar pct={p.burn_pct} />
                    <span className="text-label tabular-nums text-[var(--color-fg-muted)]">
                      {p.burn_pct}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pl-4 text-right">
                  <span
                    className={`inline-block rounded-[3px] px-1.5 py-0.5 text-label font-medium ${s.bg} ${s.text}`}
                  >
                    {s.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ScopeNotConnected({ missing }: { missing: ('clickup' | 'harvest')[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <p className="font-medium text-[var(--color-fg)]">Connect your tools to track scope</p>
      <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
        {missing.includes('clickup') && missing.includes('harvest')
          ? 'Both ClickUp (for budgets) and Harvest (for logged hours) are required.'
          : missing.includes('clickup')
          ? 'ClickUp is required for project time budgets.'
          : 'Harvest is required for logged hours.'}
      </p>
      <Link
        href="/dashboard/integrations"
        className="mt-4 inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white no-underline hover:opacity-90"
      >
        Connect Integrations →
      </Link>
    </div>
  );
}
