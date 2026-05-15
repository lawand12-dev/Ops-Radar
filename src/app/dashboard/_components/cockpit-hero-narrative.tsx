'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from './narrative-card';
import { OPERATOR_RATE_USD_PER_HOUR } from '<npm>/lib/dashboard-alert-rules';

type RoiResp = {
  status: 'ok' | 'error' | string;
  data?: {
    hours_saved?: number;
    dollars_saved?: number;
  };
};

export function CockpitHeroNarrative() {
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-3">
      <HeroCard />
      <NarrativeCard section="hero" title="This week's briefing" />
    </div>
  );
}

function HeroCard() {
  const [data, setData] = useState<RoiResp | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/automation-roi')
      .then((r) => r.json())
      .then((r: RoiResp) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setData({ status: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  // automation-roi returns flat data.hours_saved — no overview wrapper
  const hours = data?.data?.hours_saved;
  const usd = typeof hours === 'number' ? hours * OPERATOR_RATE_USD_PER_HOUR : null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-sunken)] p-5">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
        Estimated savings · cumulative
      </div>
      {data === null ? (
        <div className="mt-2 h-12 w-48 animate-pulse rounded bg-[var(--color-surface-sunken)]" aria-hidden />
      ) : usd === null ? (
        <div className="mt-2 text-[13px] text-[var(--color-fg-subtle)]">
          No automation data yet — connect n8n via your account manager.
        </div>
      ) : (
        <>
          <div className="mt-2 text-[48px] font-bold leading-none tracking-[-0.03em] text-[var(--color-fg)]">
            ${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 text-[12.5px] text-[var(--color-success)]">
            {Math.round(hours ?? 0)} hours automated · workflows carrying their weight
          </div>
        </>
      )}
    </div>
  );
}
