'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Plus, ScrollText } from 'lucide-react';
import { FoClientCard } from './_components/fo-client-card';
import { PlanGate } from '../_components/plan-gate';
import type { FoClientHealth, FoDashboardResponse } from '<npm>/lib/fo';

type FoAlert = {
  id: string;
  fo_client_id: string;
  agency_name: string;
  kind: string;
  severity: 'critical' | 'warning' | 'info';
  entity_name: string;
  detail: string;
};

type FoAlertsResp = {
  alerts?: FoAlert[];
  counts?: { critical: number; warning: number; info: number };
};

type ApiResp =
  | FoDashboardResponse
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { error: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'upgrade_required' }
  | { kind: 'ok'; clients: FoClientHealth[]; totalRevenue: number; totalAtRisk: number }
  | { kind: 'error' };

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function FoDashboardPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTeamSize, setNewTeamSize] = useState('');
  const [alerts, setAlerts] = useState<FoAlert[]>([]);
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0 });

  async function load() {
    setState({ kind: 'loading' });
    try {
      const r = await fetch('/api/fo/dashboard');
      const resp = (await r.json()) as ApiResp;
      if ('clients' in resp) {
        setState({
          kind: 'ok',
          clients: resp.clients,
          totalRevenue: resp.total_revenue_mtd,
          totalAtRisk: resp.total_at_risk,
        });
      } else if ('status' in resp && resp.status === 'upgrade_required') {
        setState({ kind: 'upgrade_required' });
      } else {
        setState({ kind: 'error' });
      }
    } catch {
      setState({ kind: 'error' });
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    // Load the unified alerts feed in parallel with the dashboard.
    void (async () => {
      try {
        const r = await fetch('/api/fo/alerts');
        if (!r.ok) return;
        const data = (await r.json()) as FoAlertsResp;
        if (data.alerts) setAlerts(data.alerts);
        if (data.counts) setAlertCounts(data.counts);
      } catch {
        // best-effort; missing alerts shouldn't break the dashboard
      }
    })();
  }, []);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const r = await fetch('/api/fo/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency_name: newName.trim(), team_size: newTeamSize.trim() || undefined }),
    });
    if (r.ok) {
      setNewName('');
      setNewTeamSize('');
      setAdding(false);
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        Dashboard / <span className="font-semibold text-[var(--color-fg)]">My Agencies</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            My Agencies
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            All agencies you manage — margin, scope risk, and integration health at a glance.
          </p>
        </div>
        {state.kind === 'ok' && (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/fo/audit"
              className="flex items-center gap-1.5 rounded-[var(--radius,6px)] border border-[var(--color-border)] px-3 py-2 text-body-sm text-[var(--color-fg-muted)] no-underline hover:text-[var(--color-fg)]"
            >
              <ScrollText className="h-4 w-4" />
              Audit log
            </Link>
            <button
              onClick={() => setAdding((v) => !v)}
              className="flex items-center gap-1.5 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-3 py-2 text-body-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add agency
            </button>
          </div>
        )}
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="Fractional Operator multi-client dashboard" requiredPlan="fo" />
      )}

      {state.kind === 'loading' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg,8px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load agency dashboard.</p>
      )}

      {state.kind === 'ok' && (
        <>
          {state.clients.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Agencies', value: String(state.clients.length) },
                { label: 'Total revenue MTD', value: fmtMoney(state.totalRevenue) },
                { label: 'Projects at risk', value: String(state.totalAtRisk) },
                { label: 'Alerts (critical)', value: String(alertCounts.critical) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <p className="text-label text-[var(--color-fg-muted)]">{stat.label}</p>
                  <p className="mt-0.5 text-[22px] font-semibold tabular-nums text-[var(--color-fg)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {alerts.length > 0 && (
            <div className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="mb-3 flex items-center gap-2 text-body-sm font-semibold text-[var(--color-fg)]">
                <AlertCircle className="h-4 w-4 text-[var(--color-warn)]" />
                Across your book ({alerts.length})
              </p>
              <div className="flex flex-col gap-1">
                {alerts.slice(0, 12).map((a) => {
                  const sevColor =
                    a.severity === 'critical' ? 'var(--color-danger)' :
                    a.severity === 'warning' ? 'var(--color-warn)' :
                    'var(--color-fg-subtle)';
                  return (
                    <Link
                      key={a.id}
                      href={`/dashboard/fo/clients/${a.fo_client_id}`}
                      className="group flex items-center gap-3 rounded-[var(--radius,6px)] px-2 py-2 no-underline hover:bg-[var(--color-surface-sunken)]"
                    >
                      <span
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: sevColor }}
                      />
                      <span className="text-body-sm font-medium text-[var(--color-fg)]">{a.agency_name}</span>
                      <span className="text-body-sm text-[var(--color-fg-muted)]">·</span>
                      <span className="text-body-sm text-[var(--color-fg-muted)]">{a.entity_name}</span>
                      <span className="ml-auto text-label text-[var(--color-fg-subtle)]">{a.detail}</span>
                    </Link>
                  );
                })}
              </div>
              {alerts.length > 12 && (
                <p className="mt-2 text-label text-[var(--color-fg-subtle)]">+{alerts.length - 12} more</p>
              )}
            </div>
          )}

          {adding && (
            <form
              onSubmit={handleAddClient}
              className="flex flex-wrap gap-2 rounded-[var(--radius,6px)] border border-dashed border-[var(--color-border)] p-3"
            >
              <input
                className="h-8 min-w-[180px] flex-1 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                placeholder="Agency name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
              />
              <input
                className="h-8 w-32 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                placeholder="Team size (opt)"
                value={newTeamSize}
                onChange={(e) => setNewTeamSize(e.target.value)}
              />
              <button
                type="submit"
                className="h-8 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-3 text-body-sm font-medium text-white hover:opacity-90"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setNewName(''); setNewTeamSize(''); }}
                className="h-8 rounded-[var(--radius,6px)] border border-[var(--color-border)] px-3 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                Cancel
              </button>
            </form>
          )}

          {state.clients.length === 0 ? (
            <div className="rounded-[var(--radius-lg,8px)] border border-dashed border-[var(--color-border)] p-8 text-center">
              <p className="font-medium text-[var(--color-fg)]">No agencies yet</p>
              <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
                Add your first managed agency and connect their integrations.
              </p>
              <button
                onClick={() => setAdding(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add agency
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.clients.map((h) => (
                <FoClientCard key={h.client.id} health={h} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
