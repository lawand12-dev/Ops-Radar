'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from '../_components/narrative-card';
import { EmptyStateConnect } from '../_components/empty-state-connect';

// Real shape from /api/dashboard/automation-roi
type AutomationRoiWidget = {
  dollars_saved: number;
  hours_saved: number;
  actions_automated: number;
  success_rate_pct: number;
  total_workflows: number;
  open_alerts: number;
  healthy_count: number;
  failing_count: number;
  monitor_url: string;
};

type RoiResp =
  | { status: 'ok'; data: AutomationRoiWidget; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget };

// Real shape from /api/dashboard/workflow-health
type WorkflowExecution = {
  execution_id: string;
  status: 'success' | 'failure' | 'running' | 'canceled';
  started_at: string | null;
  duration_ms: number | null;
  error_summary: string | null;
};

type WorkflowHealthEntry = {
  workflow_id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: WorkflowExecution[];
};

type WorkflowHealthResp =
  | { status: 'not_enrolled' }
  | { status: 'ok'; workflows: WorkflowHealthEntry[] }
  | { status: 'unavailable'; message: string };

type WorkflowRow = {
  name: string;
  runs_7d: number;
  success_count: number;
  success_pct: number;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
};

type Incident = { when: string; message: string; recovered: boolean };

export default function AutomationsPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <Topbar />
      <Kpis />
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <NarrativeCard section="automations" persona="coo" title="This week, at a glance" />
        <IncidentsPanel />
      </div>
      <Leaderboard />
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div className="text-[12.5px] text-[var(--color-fg-muted)]">
        Dashboard /{' '}
        <span className="font-semibold text-[var(--color-fg)]">Automations</span>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-fg-subtle)]">
        <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
        Live
      </span>
    </div>
  );
}

function Kpis() {
  const [roi, setRoi] = useState<RoiResp | null>(null);
  const [health, setHealth] = useState<WorkflowHealthResp | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/automation-roi')
      .then((r) => r.json())
      .then(setRoi)
      .catch(() => setRoi({ status: 'error', message: 'fetch failed' }));
    fetch('/api/dashboard/workflow-health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'unavailable', message: 'fetch failed' }));
  }, []);

  // Time saved: from roi.data.hours_saved (flat, no overview wrapper)
  const roiData = roi?.status === 'ok' ? roi.data : roi?.status === 'error' && roi.staleData ? roi.staleData : null;
  const timeSaved = roiData?.hours_saved != null ? `${Math.round(roiData.hours_saved)}h` : '—';

  // Executions + success rate: derived from all recent_executions across workflows
  let totalExecs = 0;
  let successExecs = 0;
  if (health && 'workflows' in health && health.workflows) {
    for (const w of health.workflows) {
      for (const ex of w.recent_executions) {
        totalExecs++;
        if (ex.status === 'success') successExecs++;
      }
    }
  }
  const execsVal = health === null ? '—' : totalExecs > 0 ? totalExecs.toLocaleString() : '—';
  const successVal =
    health === null
      ? '—'
      : totalExecs > 0
      ? `${((successExecs / totalExecs) * 100).toFixed(1)}%`
      : '—';

  // Caught (incidents caught): use open_alerts from roi if available, else 0
  const caughtVal = roiData?.open_alerts != null ? String(roiData.open_alerts) : '—';

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <Kpi label="Time saved · 7d" value={timeSaved} />
      <Kpi label="Executions · 7d" value={execsVal} />
      <Kpi label="Success rate · 7d" value={successVal} />
      <Kpi label="Caught · 7d" value={caughtVal} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div className="text-[20px] font-bold leading-none tracking-[-0.02em] text-[var(--color-fg)]">
        {value}
      </div>
    </div>
  );
}

function IncidentsPanel() {
  const [items, setItems] = useState<Incident[] | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/workflow-health')
      .then((r) => r.json())
      .then((j: WorkflowHealthResp) => {
        if (!('workflows' in j) || !j.workflows) {
          setItems([]);
          return;
        }
        const out: Incident[] = [];
        for (const w of j.workflows) {
          // Find the most recent failure. If no success comes after it, it's an active incident.
          const execs = [...w.recent_executions].sort((a, b) => {
            const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
            const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
            return tb - ta; // newest first
          });
          let latestFailureIdx = -1;
          let successAfterFailure = false;
          for (let i = 0; i < execs.length; i++) {
            if (execs[i].status === 'failure') {
              latestFailureIdx = i;
              break;
            }
          }
          if (latestFailureIdx > 0) {
            // There's a success before (earlier index) this failure in the sorted array
            successAfterFailure = execs.slice(0, latestFailureIdx).some((e) => e.status === 'success');
          }
          if (latestFailureIdx !== -1) {
            const failExec = execs[latestFailureIdx];
            out.push({
              when: failExec.started_at ?? new Date().toISOString(),
              message: failExec.error_summary
                ? `${w.name} · ${failExec.error_summary}`
                : `${w.name} · execution failed`,
              recovered: successAfterFailure,
            });
          }
        }
        setItems(out.slice(0, 5));
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
        Recent incidents
      </h3>
      {items === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">No incidents in the last 24 hours.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((incident, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 border-b border-[var(--color-border)] py-1.5 last:border-b-0"
            >
              <span className="flex-1 text-[12.5px] text-[var(--color-fg-muted)]">
                {incident.message}
              </span>
              <span
                className={`rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                  incident.recovered
                    ? 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]'
                    : 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]'
                }`}
              >
                {incident.recovered ? 'recovered' : 'needs you'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState<WorkflowRow[] | null>(null);
  const [notEnrolled, setNotEnrolled] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/workflow-health')
      .then((r) => r.json())
      .then((j: WorkflowHealthResp) => {
        if (j.status === 'not_enrolled') {
          setNotEnrolled(true);
          return;
        }
        if (!('workflows' in j) || !j.workflows) {
          setRows([]);
          return;
        }
        const out: WorkflowRow[] = j.workflows.map((w) => {
          const total = w.recent_executions.length;
          const success = w.recent_executions.filter((e) => e.status === 'success').length;
          return {
            name: w.name,
            runs_7d: total,
            success_count: success,
            success_pct: total > 0 ? (success / total) * 100 : 0,
            status: w.status,
          };
        });
        // Sort descending by run count (hours_saved not available per-workflow)
        out.sort((a, b) => b.runs_7d - a.runs_7d);
        setRows(out);
      })
      .catch(() => setRows([]));
  }, []);

  if (notEnrolled) {
    return (
      <EmptyStateConnect
        tool="Automations"
        toolSlug="n8n"
        description="Your automations aren't enrolled in OpsRadar yet. Contact your account manager to get connected."
      />
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
        Workflow leaderboard · last 7d
      </h3>
      {rows === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">No workflow data yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Workflow', 'Runs', 'Success', 'Status'].map((h) => (
                <th
                  key={h}
                  className="border-b border-[var(--color-border)] pb-2 text-left text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              // $ saved: proportional to run count × rate (no per-workflow hours data available)
              const pillCls =
                r.status === 'healthy'
                  ? 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]'
                  : r.status === 'degraded'
                  ? 'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] text-[var(--color-warn)]'
                  : r.status === 'failing'
                  ? 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]'
                  : 'bg-[color-mix(in_srgb,var(--color-fg-subtle)_14%,transparent)] text-[var(--color-fg-subtle)]';
              return (
                <tr
                  key={r.name}
                  className="border-b border-[var(--color-border)] last:border-b-0"
                >
                  <td className="py-2 text-body-sm font-medium text-[var(--color-fg)]">
                    {r.name}
                  </td>
                  <td className="py-2 text-[12.5px] text-[var(--color-fg-muted)]">
                    {r.runs_7d.toLocaleString()}
                  </td>
                  <td className="py-2 text-[12.5px] text-[var(--color-fg-muted)]">
                    {r.success_pct.toFixed(1)}%
                  </td>
                  <td className="py-2">
                    <span
                      className={`rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${pillCls}`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
