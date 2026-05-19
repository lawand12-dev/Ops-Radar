'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlanGate } from '../../_components/plan-gate';

type Entry = {
  id: string;
  fo_client_id: string | null;
  action_kind: string;
  details: Record<string, unknown>;
  created_at: string;
  agency_name: string | null;
};

const KIND_LABELS: Record<string, string> = {
  agency_added: 'Added agency',
  agency_removed: 'Removed agency',
  agency_viewed: 'Viewed agency',
  integration_added: 'Connected integration',
  integration_removed: 'Disconnected integration',
  dashboard_viewed: 'Viewed dashboard',
};

type ApiResp =
  | { entries: Entry[] }
  | { status: 'upgrade_required'; required_plan: string }
  | { error: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'upgrade_required' }
  | { kind: 'ok'; entries: Entry[] }
  | { kind: 'error' };

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDetails(kind: string, details: Record<string, unknown>): string {
  if (kind === 'integration_added' || kind === 'integration_removed') {
    return typeof details.tool === 'string' ? details.tool : '';
  }
  if (kind === 'agency_added') {
    return typeof details.agency_name === 'string' ? details.agency_name : '';
  }
  return '';
}

export default function FoAuditLogPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/fo/audit-log');
        const resp = (await r.json()) as ApiResp;
        if ('entries' in resp) {
          setState({ kind: 'ok', entries: resp.entries });
        } else if ('status' in resp && resp.status === 'upgrade_required') {
          setState({ kind: 'upgrade_required' });
        } else {
          setState({ kind: 'error' });
        }
      } catch {
        setState({ kind: 'error' });
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        <Link href="/dashboard/fo" className="hover:text-[var(--color-fg)]">My Agencies</Link>
        {' / '}
        <span className="font-semibold text-[var(--color-fg)]">Audit Log</span>
      </div>

      <div>
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Partner Audit Log
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Every action across your book of agencies — append-only. Useful for client trust and engagement disputes.
        </p>
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="FO partner audit log" requiredPlan="fo" />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load audit log.</p>
      )}

      {state.kind === 'ok' && (
        state.entries.length === 0 ? (
          <div className="rounded-[var(--radius-lg,8px)] border border-dashed border-[var(--color-border)] p-8 text-center">
            <p className="font-medium text-[var(--color-fg)]">No activity yet</p>
            <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
              Add an agency or connect an integration to see entries here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">When</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">Action</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">Agency</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">Detail</th>
                </tr>
              </thead>
              <tbody>
                {state.entries.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-2 text-label tabular-nums text-[var(--color-fg-subtle)]">
                      {fmtTime(e.created_at)}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-fg)]">
                      {KIND_LABELS[e.action_kind] ?? e.action_kind}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-fg-muted)]">{e.agency_name ?? '—'}</td>
                    <td className="px-4 py-2 text-[var(--color-fg-muted)]">{fmtDetails(e.action_kind, e.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
