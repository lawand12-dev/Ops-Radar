'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import type { StoredBriefing, AttentionItem } from '<npm>/lib/briefing-types';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ok'; briefings: StoredBriefing[]; unreadIds: string[] }
  | { kind: 'error' };

export function BriefingInbox() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const markedRead = useRef(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    markedRead.current = false;
    fetch('/api/dashboard/briefing?limit=4')
      .then((r) => r.json())
      .then((data: { briefings?: StoredBriefing[] }) => {
        const briefings = data.briefings ?? [];
        if (briefings.length === 0) {
          setState({ kind: 'empty' });
        } else {
          const unreadIds = briefings.filter((b) => !b.read_at).map((b) => b.id);
          setState({ kind: 'ok', briefings, unreadIds });
          setExpandedIds(new Set([briefings[0].id]));
        }
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mark visible briefings as read after 2 seconds
  useEffect(() => {
    if (state.kind !== 'ok' || state.unreadIds.length === 0 || markedRead.current) return;
    const timer = setTimeout(() => {
      markedRead.current = true;
      fetch('/api/dashboard/briefing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: state.unreadIds }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [state]);

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    setGenerating(true);
    try {
      const r = await fetch('/api/dashboard/briefing', { method: 'POST' });
      // 429 = already generated recently — reload to show the latest
      if (r.ok || r.status === 429) load();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-label text-[var(--color-fg-muted)]">COO Briefings</h3>
          {state.kind === 'ok' && state.unreadIds.length > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-1.5 py-0.5 text-label text-[var(--color-primary)]">
            <Sparkles size={9} strokeWidth={2} />
            AI · weekly
          </span>
          <button
            onClick={generate}
            disabled={generating}
            aria-label="Generate briefing"
            className="rounded-[var(--radius)] p-1 text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)] disabled:opacity-40"
          >
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm italic text-[var(--color-fg-subtle)]">
          Briefings temporarily unavailable.
        </p>
      )}

      {state.kind === 'empty' && (
        <div className="py-4 text-center">
          <p className="text-body-sm text-[var(--color-fg-subtle)]">
            No briefings yet. Connect Stripe or Harvest and click refresh to generate your first.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="mt-3 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate Briefing'}
          </button>
        </div>
      )}

      {state.kind === 'ok' && (
        <div className="flex flex-col gap-2">
          {state.briefings.map((b, idx) => (
            <BriefingRow
              key={b.id}
              briefing={b}
              expanded={expandedIds.has(b.id)}
              isLatest={idx === 0}
              onToggle={() => toggle(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingRow({
  briefing: b,
  expanded,
  isLatest,
  onToggle,
}: {
  briefing: StoredBriefing;
  expanded: boolean;
  isLatest: boolean;
  onToggle: () => void;
}) {
  const score = b.health_score ?? 0;
  const scoreColor =
    score >= 70
      ? 'text-[var(--color-success)]'
      : score >= 40
      ? 'text-[var(--color-warn)]'
      : 'text-[var(--color-error)]';
  const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isUnread = !b.read_at;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] border',
        isLatest
          ? 'border-[var(--color-border)] bg-[var(--color-surface-sunken)]'
          : 'border-[var(--color-border-subtle)] bg-transparent',
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        {isUnread && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
        )}
        <span className={cn('text-[13px] font-semibold tabular-nums', scoreColor)}>
          {score}
        </span>
        <span className="flex-1 truncate text-body-sm text-[var(--color-fg-muted)]">
          {b.win ?? 'Weekly briefing'}
        </span>
        <span className="shrink-0 text-label text-[var(--color-fg-faint)]">{date}</span>
        {expanded
          ? <ChevronUp size={13} className="shrink-0 text-[var(--color-fg-subtle)]" />
          : <ChevronDown size={13} className="shrink-0 text-[var(--color-fg-subtle)]" />}
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border-subtle)] px-3.5 pb-3.5 pt-3">
          {(b.attention ?? []).length > 0 && (
            <div className="mb-3 space-y-2">
              {(b.attention as AttentionItem[]).map((item, i) => (
                <AttentionRow key={i} item={item} />
              ))}
            </div>
          )}

          {b.recommendation && (
            <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)] px-3 py-2.5">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                Do This
              </p>
              <p className="text-body-sm text-[var(--color-fg)]">{b.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const dotColor =
    item.kind === 'alert'
      ? 'bg-[var(--color-error)]'
      : item.kind === 'warning'
      ? 'bg-[var(--color-warn)]'
      : 'bg-[var(--color-fg-subtle)]';

  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} />
      <p className="text-body-sm leading-snug text-[var(--color-fg-muted)]">{item.text}</p>
    </div>
  );
}
