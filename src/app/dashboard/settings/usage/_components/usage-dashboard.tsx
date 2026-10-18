'use client';

import { useEffect, useState } from 'react';

type Quota = {
  provider: 'openai' | 'tavily' | 'anthropic';
  used: number;
  cap: number;
  remaining: number;
  resets_at: string;
  pct_used: number;
};

type UsageResponse = {
  tier: string;
  tier_caps: Record<string, number>;
  quotas: Quota[];
};

const PROVIDER_LABELS: Record<Quota['provider'], { name: string; unit: string; description: string }> = {
  openai: {
    name: 'AI compute (OpenAI)',
    unit: 'tokens',
    description: 'Used by every AI employee chat, the daily briefing, every cron agent run, and the document / research tools.',
  },
  tavily: {
    name: 'Web research (Tavily)',
    unit: 'credits',
    description: 'The COO\'s web_search, competitor research, and document analysis use credits. Basic search = 1 credit, advanced = 2.',
  },
  anthropic: {
    name: 'AI compute (Anthropic)',
    unit: 'tokens',
    description: 'Used for select agents that run on Claude models.',
  },
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatResetDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function UsageDashboard() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/usage');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const payload = (await res.json()) as UsageResponse;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-body-sm text-[var(--color-fg-muted)]">Loading usage…</div>;
  }
  if (error || !data) {
    return (
      <div className="text-body-sm text-[var(--color-fg-muted)]">
        Could not load usage right now. {error ? `(${error})` : ''}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-body-sm text-[var(--color-fg-muted)]">
        Current plan: <span className="font-medium text-[var(--color-fg)]">{data.tier.toUpperCase()}</span>
      </div>

      <div className="space-y-3">
        {data.quotas.map((q) => {
          const meta = PROVIDER_LABELS[q.provider];
          const pct = Math.min(100, q.pct_used);
          const tone =
            pct >= 90
              ? 'bg-red-500'
              : pct >= 70
                ? 'bg-amber-500'
                : 'bg-[var(--color-accent)]';

          return (
            <div
              key={q.provider}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--color-fg)]">{meta.name}</div>
                  <div className="mt-0.5 text-body-xs text-[var(--color-fg-muted)]">{meta.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-body-sm font-medium text-[var(--color-fg)]">
                    {formatNumber(q.used)} / {formatNumber(q.cap)}
                  </div>
                  <div className="text-body-xs text-[var(--color-fg-muted)]">{meta.unit}</div>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-body-xs text-[var(--color-fg-muted)]">
                <span>{pct}% used</span>
                <span>Resets {formatResetDate(q.resets_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-body-xs text-[var(--color-fg-muted)]">
        Caps are deliberately generous — they exist to catch abuse, not gate normal use. If you&apos;re consistently approaching one, let us know and we&apos;ll raise it or move you to a plan that fits.
      </p>
    </div>
  );
}
