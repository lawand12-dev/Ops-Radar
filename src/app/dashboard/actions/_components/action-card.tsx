'use client';

import { useState } from 'react';
import type {
  AgentAction,
  ActionPayload,
  InvoiceReminderPayload,
  MarginAlertPayload,
  HoursBudgetPayload,
  WorkflowFailurePayload,
  HubSpotHarvestPayload,
} from '<npm>/lib/actions/types';
import { ACTION_LABELS } from '<npm>/lib/actions/types';

type Props = {
  action: AgentAction;
  onUpdate: () => void;
};

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function Summary({ action }: { action: AgentAction }) {
  const p = action.payload as Record<string, unknown>;
  switch (action.action_type) {
    case 'invoice_reminder': {
      const pp = p as InvoiceReminderPayload;
      return <span>{pp.client_name} — {fmtMoney(pp.amount_due)} overdue {pp.days_overdue}d</span>;
    }
    case 'margin_alert': {
      const pp = p as MarginAlertPayload;
      return <span>{pp.client_name} — margin {pp.margin_pct.toFixed(0)}% this month</span>;
    }
    case 'hours_budget_exceeded': {
      const pp = p as HoursBudgetPayload;
      return <span>{pp.client_name} — {pp.project_name}: {pp.hours_logged}h / {pp.budget_hours}h ({pp.overage_pct}% over)</span>;
    }
    case 'workflow_failure': {
      const pp = p as WorkflowFailurePayload;
      return <span>&ldquo;{pp.workflow_name}&rdquo; failed {pp.failure_count}× in 24h</span>;
    }
    case 'hubspot_harvest_sync': {
      const pp = p as HubSpotHarvestPayload;
      return <span>{pp.hubspot_company_name} → Harvest</span>;
    }
    default:
      return null;
  }
}

function DraftEmail({ payload }: { payload: ActionPayload }) {
  const p = payload as Record<string, unknown>;
  const subject = p.draft_subject as string | undefined;
  const body = p.draft_body as string | undefined;
  if (!subject && !body) return null;

  return (
    <div className="mt-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3">
      {subject && (
        <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-fg-muted)]">
          Subject: {subject}
        </div>
      )}
      {body && (
        <div className="whitespace-pre-wrap text-[12px] leading-[1.5] text-[var(--color-fg-subtle)]">
          {body}
        </div>
      )}
    </div>
  );
}

export function ActionCard({ action, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasDraft = 'draft_subject' in (action.payload as Record<string, unknown>) ||
    'draft_body' in (action.payload as Record<string, unknown>);

  const canUndo =
    action.status === 'executed' &&
    action.undo_deadline !== null &&
    new Date(action.undo_deadline) > new Date();

  async function patch(op: 'approve' | 'dismiss' | 'undo') {
    setLoading(true);
    try {
      await fetch('/api/dashboard/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: op, id: action.id }),
      });
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  const statusBadge: Record<string, string> = {
    pending:   'bg-amber-500/10 text-amber-400',
    executed:  'bg-emerald-500/10 text-emerald-400',
    dismissed: 'bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]',
    undone:    'bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]',
    failed:    'bg-red-500/10 text-red-400',
  };

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[action.status] ?? ''}`}>
              {action.status}
            </span>
            <span className="text-[12px] font-semibold text-[var(--color-fg)]">
              {ACTION_LABELS[action.action_type]}
            </span>
          </div>
          <div className="text-[12px] text-[var(--color-fg-muted)]">
            <Summary action={action} />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-fg-faint)]">
            {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {action.status === 'pending' && (
            <>
              <button
                onClick={() => void patch('approve')}
                disabled={loading}
                className="rounded-[6px] bg-[var(--color-primary)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => void patch('dismiss')}
                disabled={loading}
                className="rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
              >
                Dismiss
              </button>
            </>
          )}
          {canUndo && (
            <button
              onClick={() => void patch('undo')}
              disabled={loading}
              className="rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
            >
              Undo
            </button>
          )}
          {hasDraft && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-[6px] border border-[var(--color-border)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              {expanded ? 'Hide' : 'Draft'}
            </button>
          )}
        </div>
      </div>

      {expanded && hasDraft && <DraftEmail payload={action.payload} />}
    </div>
  );
}
