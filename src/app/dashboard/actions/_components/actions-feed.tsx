'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionCard } from './action-card';
import type { AgentAction } from '<npm>/lib/actions/types';

type Tab = 'pending' | 'history';

export function ActionsFeed() {
  const [tab, setTab] = useState<Tab>('pending');
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab === 'pending' ? '?status=pending&limit=50' : '?limit=50';
      const res = await fetch(`/api/dashboard/actions${params}`);
      const data = await res.json() as { actions?: AgentAction[]; pending_count?: number };
      setActions(data.actions ?? []);
      if (data.pending_count != null) setPendingCount(data.pending_count);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
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
