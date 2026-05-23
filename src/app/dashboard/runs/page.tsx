// src/app/dashboard/runs/page.tsx
//
// CP-14 Day 4a — the runs history surface.
//
// Lists every cron agent execution with status / agent / duration / actions
// queued. Click a row → drawer slides in with the full summary, token cost,
// and the actions queued during the run. Mirrors the Lindy "Task view" and
// Zapier "Zap History" patterns from the v1 control-surface research.

import { RunsTable } from './_components/runs-table';

export const dynamic = 'force-dynamic';

export default function RunsPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Runs
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Every cron agent execution — what they did, what they queued for your approval, what failed. Click a row for the full breakdown.
        </p>
      </div>
      <RunsTable />
    </>
  );
}
