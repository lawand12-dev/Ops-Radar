'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

type FinanceData = {
  invoiced: number;
  paid: number;
  overdue: number;
  sparkline: Array<{ date: string; amount: number }>;
  currency: 'USD';
};

type ApiResponse =
  | { status: 'ok'; data: FinanceData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtRelative = (iso: string) => {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.round(diffMin / 60)}h ago`;
};

export function FinanceCard() {
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard/finance', { cache: 'no-store' });
      setResp((await r.json()) as ApiResponse);
    } catch (e) {
      setResp({ status: 'unavailable', message: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-serif text-[16.5px] font-normal text-[var(--color-fg)]">Finance (live)</div>
          <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
            From Stripe · {resp?.status === 'ok' ? `synced ${fmtRelative(resp.last_synced_at)}` : 'live'}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-[var(--radius)] p-1.5 text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)] disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !resp && <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>}

      {resp?.status === 'not_connected' && (
        <div className="flex flex-col items-start gap-2 py-2">
          <div className="text-body-sm text-[var(--color-fg-muted)]">
            Connect Stripe to see invoiced, paid, and overdue.
          </div>
          <Link
            href="/dashboard/integrations"
            className="text-[12.5px] font-medium text-[var(--color-primary)] no-underline hover:underline"
          >
            Go to integrations →
          </Link>
        </div>
      )}

      {resp?.status === 'requires_reconnect' && (
        <div className="flex flex-col items-start gap-2 py-2">
          <div className="text-body-sm text-[var(--color-warn)]">
            Stripe rejected the key — reconnect required.
          </div>
          <Link
            href="/dashboard/integrations"
            className="text-[12.5px] font-medium text-[var(--color-warn)] no-underline hover:underline"
          >
            Reconnect Stripe →
          </Link>
        </div>
      )}

      {resp?.status === 'unavailable' && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
          Stripe is unreachable right now. Try refreshing in a minute.
        </div>
      )}

      {resp?.status === 'ok' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Invoiced</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-fg)]">{fmtCurrency(resp.data.invoiced)}</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Paid</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-success)]">{fmtCurrency(resp.data.paid)}</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Overdue</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-warn)]">{fmtCurrency(resp.data.overdue)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
