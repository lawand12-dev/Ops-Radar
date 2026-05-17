'use client';

import { useState, useEffect } from 'react';
import { CockpitKpiStrip } from './_components/cockpit-kpi-strip';
import { CockpitAlertsRibbon } from './_components/cockpit-alerts-ribbon';
import { CockpitHeroNarrative } from './_components/cockpit-hero-narrative';
import { CockpitIntegrationHealth } from './_components/cockpit-integration-health';
import { CockpitActivityFeed } from './_components/cockpit-activity-feed';
import { AutomationsCtaCard, BusinessCtaCard } from './_components/pillar-cta-card';
import { BriefingInbox } from './_components/briefing-inbox';
import { HealthReportBanner } from './_components/health-report-banner';

export default function DashboardPage() {
  const greeting = useGreeting();

  return (
    <div className="flex flex-col gap-3.5">
      <HealthReportBanner />
      <Topbar />
      <Greeting greeting={greeting} />
      <CockpitKpiStrip />
      <CockpitAlertsRibbon />
      <CockpitHeroNarrative />
      <BriefingInbox />
      <CockpitIntegrationHealth />
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <CockpitActivityFeed />
        <div className="flex flex-col gap-2.5">
          <AutomationsCtaCard />
          <BusinessCtaCard />
        </div>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <h1 className="text-body font-medium text-[var(--color-fg)]">Overview</h1>
      <LiveIndicator />
    </div>
  );
}

function LiveIndicator() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  // The actual "synced Nm ago" comes from individual widgets' last_synced_at.
  // This indicator is just the cockpit heartbeat.
  void tick;
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-subtle)]">
      <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
      Live
    </span>
  );
}

function Greeting({ greeting }: { greeting: string }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const week = isoWeek(today);
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-serif text-h2 text-[var(--color-fg)]">{greeting}</h2>
      <span className="text-body-sm text-[var(--color-fg-subtle)]">{dateStr} · Week {week}</span>
    </div>
  );
}

function computeGreeting(): string {
  const hr = new Date().getHours();
  return hr < 12 ? 'Good morning.' : hr < 18 ? 'Good afternoon.' : 'Good evening.';
}

function useGreeting(): string {
  const [g] = useState(computeGreeting);
  return g;
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
