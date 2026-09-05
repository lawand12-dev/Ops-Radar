'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionCard } from './action-card';
import { PlanGate } from '../../_components/plan-gate';
import type { AgentAction } from '<npm>/lib/actions/types';

type Tab = 'pending' | 'history';

type Usage = {
  plan: string;
  used: number;
  quota: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
  over_quota: boolean;
};

export function ActionsFeed() {
  const [tab, setTab] = useState<Tab>('pending');
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab === 'pending' ? '?status=pending&limit=50' : '?limit=50';
      const res = await fetch(`/api/dashboard/actions${params}`);
      if (res.status === 402) {
        setUpgradeRequired(true);
        return;
      }
      const data = await res.json() as { actions?: AgentAction[]; pending_count?: number };
      setUpgradeRequired(false);
      setActions(data.actions ?? []);
      if (data.pending_count != null) setPendingCount(data.pending_count);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/actions/usage');
      if (!res.ok) return;
      const data = (await res.json()) as Usage;
      setUsage(data);
    } catch {
      // best-effort; usage badge is optional
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadUsage(); }, [loadUsage]);

  if (upgradeRequired) {
    return <PlanGate feature="Agentic Actions" requiredPlan="pro" />;
  }

  return (
    <div>
      {usage && (
        <UsageBadge usage={usage} />
      )}

      <div className="mb-5 flex gap-1 border-b border-[var(--color-border)]">
        {(['pending', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 pb-2.5 text-[13px] font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            }`}
          >
            {t === 'pending' ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'History'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      ) : actions.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
          <div className="mb-1 text-[14px] font-semibold text-[var(--color-fg)]">
            {tab === 'pending' ? 'No actions pending' : 'No actions yet'}
          </div>
          <p className="text-[12.5px] text-[var(--color-fg-subtle)]">
            {tab === 'pending'
              ? 'OpsRadar will surface actions here when it detects something that needs attention.'
              : 'Completed and dismissed actions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actions.map((a) => (
            <ActionCard key={a.id} action={a} onUpdate={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}

function UsageBadge({ usage }: { usage: Usage }) {
  const unlimited = usage.quota < 0;
  const pct = unlimited || usage.quota === 0 ? 0 : Math.min(100, (usage.used / usage.quota) * 100);
  const barColor =
    usage.over_quota ? 'var(--color-danger)' :
    pct >= 80 ? 'var(--color-warn)' :
    'var(--color-primary)';

  return (
    <div className="mb-4 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-[var(--color-fg-muted)]">This month</p>
        <p className="text-body-sm tabular-nums text-[var(--color-fg)]">
          {unlimited ? (
            <>
              <span className="font-semibold">{usage.used}</span>
              <span className="text-[var(--color-fg-subtle)]"> actions · unlimited</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{usage.used}</span>
              <span className="text-[var(--color-fg-subtle)]"> of {usage.quota} actions used</span>
              {usage.over_quota && <span className="ml-2 text-[var(--color-danger)]">· quota reached</span>}
            </>
          )}
        </p>
      </div>
      {!unlimited && usage.quota > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}
