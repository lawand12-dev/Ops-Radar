/**
 * /dashboard — the Overview (CP-33, extended in CP-36).
 *
 * Research-backed 4-block control-panel layout — BOND Presidential Brief +
 * BOND Live Dashboard + Lindy Tasks summary, sized to fit one screen.
 *
 *   1. Today's Briefing card     ← what moved, who's blocked, top priority
 *   2. Pending actions banner    ← "N actions waiting on you → /actions"
 *   3. KPI strip (≤4 numbers)    ← MRR, pipeline, prospects, calls
 *   4. Agent activity summary    ← "N runs today · F failed → /runs"
 *
 * The full agent log + full briefing archive live in their own surfaces
 * (/dashboard/runs and /dashboard/brain) because 28-agent log volume would
 * drown a single-page overview.
 *
 * This is a Server Component so all data fetching stays server-side. All
 * children are client components.
 */

import { CockpitKpiStrip } from './_components/cockpit-kpi-strip';
import { OnboardingChecklist } from './_components/onboarding-checklist';
import { OverviewBriefingCard } from './_components/overview-briefing-card';
import { OverviewPendingActions } from './_components/overview-pending-actions';
import { OverviewAgentActivity } from './_components/overview-agent-activity';

// Dynamic rendering keeps any future server-side reads session-scoped.
// Without this, Next.js 16 fails the static page collection step with
// "Dynamic server usage" and the route falls back to a generic error in prod.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <OnboardingChecklist />
      <Topbar />

      {/* 1. Today's briefing */}
      <OverviewBriefingCard />

      {/* 2. Pending actions */}
      <OverviewPendingActions />

      {/* 3. KPI strip */}
      <CockpitKpiStrip />

      {/* 4. Agent activity summary */}
      <OverviewAgentActivity />
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <h1 className="text-body font-medium text-[var(--color-fg)]">Overview</h1>
      <span className="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-subtle)]">
        <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
        Live
      </span>
    </div>
  );
}
