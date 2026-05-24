// src/app/dashboard/automations/[id]/page.tsx
//
// CP-20 Phase 5b — single automation detail view.
//
// Server component. Loads the automation via inspectAutomation, then queries
// automation_runs directly for the recent run history. Interactive controls
// (pause/resume/autonomy/delete) are delegated to the DetailActions client
// component. Spec edits are explicitly NOT supported here — those go through
// the COO chat ("Edit in chat" button → /dashboard/coo?automation_id=…).

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Clock,
  ChevronLeft,
  MessageSquareText,
  ArrowRight,
  Workflow,
} from 'lucide-react';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { inspectAutomation } from '<npm>/lib/automations/registry';
import type {
  AutomationAutonomy,
  AutomationStatus,
  AutomationStep,
  CustomerAutomation,
} from '<npm>/lib/automations/types';
import { DetailActions } from './_components/detail-actions';

export const dynamic = 'force-dynamic';

type AutomationRunRow = {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  steps: unknown;
  queued_action_ids: string[] | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso).getTime();
  const diffMs = Date.now() - d;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  return `${days}d ago`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: AutomationStatus }) {
  const cls: Record<AutomationStatus, string> = {
    active:   'bg-emerald-500/15 text-emerald-300',
    paused:   'bg-amber-500/15 text-amber-300',
    archived: 'bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold capitalize ${cls[status]}`}>
      {status}
    </span>
  );
}

function AutonomyBadge({ autonomy }: { autonomy: AutomationAutonomy }) {
  const cls: Record<AutomationAutonomy, string> = {
    ask:  'border-[var(--color-border)] text-[var(--color-fg-muted)]',
    auto: 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    off:  'border-[var(--color-border)] text-[var(--color-fg-subtle)]',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide ${cls[autonomy]}`}>
      Autonomy: {autonomy}
    </span>
  );
}

function runStatusIcon(status: string) {
  if (status === 'succeeded') return <CheckCircle2 size={13} className="text-emerald-400" />;
  if (status === 'failed') return <XCircle size={13} className="text-red-400" />;
  if (status === 'awaiting_approval') return <Clock size={13} className="text-amber-400" />;
  if (status === 'skipped') return <MinusCircle size={13} className="text-[var(--color-fg-subtle)]" />;
  return <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" />;
}

function describeTrigger(a: CustomerAutomation): { headline: string; detail: string | null } {
  switch (a.trigger_kind) {
    case 'composio_event': {
      const tk = a.trigger_toolkit ?? 'unknown';
      const slug = a.trigger_slug ?? '—';
      const filters = Object.keys(a.trigger_filter ?? {});
      const detail = filters.length === 0
        ? null
        : `Filter: ${filters.map((k) => `${k} = ${JSON.stringify(a.trigger_filter[k])}`).join(', ')}`;
      return { headline: `${tk} event: ${slug}`, detail };
    }
    case 'schedule':
      return { headline: 'On a schedule', detail: a.trigger_slug ?? null };
    case 'webhook':
      return { headline: 'Inbound webhook', detail: a.trigger_slug ?? null };
    case 'manual':
      return { headline: 'Manual — runs only when explicitly invoked', detail: null };
    case 'chat':
      return { headline: 'Triggered from chat (Ask COO)', detail: null };
    default:
      return { headline: a.trigger_kind, detail: null };
  }
}

function describeStep(step: AutomationStep): { kind: string; summary: string } {
  switch (step.kind) {
    case 'composio_action':
      return { kind: 'composio_action', summary: `${step.toolkit}.${step.action_slug}` };
    case 'notion_write':
      return { kind: 'notion_write', summary: `Notion → ${step.database_slug}` };
    case 'agent_step':
      return { kind: 'agent_step', summary: step.exit_when || 'AI agent step' };
    case 'condition':
      return { kind: 'condition', summary: `${step.branches.length} branch${step.branches.length === 1 ? '' : 'es'}` };
    case 'loop':
      return { kind: 'loop', summary: `Loop over ${step.over}` };
    case 'wait':
      return { kind: 'wait', summary: `Wait for ${step.for}: ${step.value}` };
    case 'set':
      return { kind: 'set', summary: `${step.key} = ${step.value}` };
    case 'queue_action':
      return { kind: 'queue_action', summary: step.action_type };
  }
}

function StepRow({ step, index }: { step: AutomationStep; index: number }) {
  const { kind, summary } = describeStep(step);
  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[10.5px] font-semibold text-[var(--color-fg-muted)]">
        {index + 1}
      </span>
      <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2 py-[1px] font-mono text-[10.5px] text-[var(--color-fg-muted)]">
            {kind}
          </span>
        </div>
        <div className="text-[12.5px] text-[var(--color-fg)]">{summary}</div>
        {step.kind === 'condition' && (
          <ul className="mt-2 space-y-1.5 border-l border-[var(--color-border)] pl-3">
            {step.branches.map((b, i) => (
              <li key={i} className="text-[11.5px] text-[var(--color-fg-muted)]">
                <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)]">when</span> {b.when}
                {' '}
                <span className="text-[var(--color-fg-subtle)]">→ {b.steps.length} step{b.steps.length === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

async function loadRecentRuns(userId: string, automationId: string): Promise<AutomationRunRow[]> {
  const supabase = await getSessionSupabaseClient();
  const { data, error } = await supabase
    .from('automation_runs')
    .select('id, status, started_at, finished_at, error, steps, queued_action_ids')
    .eq('user_id', userId)
    .eq('automation_id', automationId)
    .order('started_at', { ascending: false })
    .limit(10);
  if (error) {
    console.warn('[automations/detail] runs query failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as AutomationRunRow[];
}

export default async function AutomationDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const { id } = await params;
  const automation = await inspectAutomation(userId, id);
  if (!automation) notFound();

  const runs = await loadRecentRuns(userId, id);
  const trigger = describeTrigger(automation);
  const stepsCount = automation.spec.steps?.length ?? 0;

  return (
    <>
      {/* Back nav */}
      <Link
        href="/dashboard/automations"
        className="mb-4 inline-flex items-center gap-1 text-[12px] text-[var(--color-fg-muted)] no-underline transition-colors hover:text-[var(--color-fg)]"
      >
        <ChevronLeft size={13} /> All automations
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Workflow size={16} className="text-[var(--color-primary)]" />
            <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
              {automation.name}
            </h1>
          </div>
          <p className="mb-3 max-w-[680px] text-body-sm leading-[1.55] text-[var(--color-fg-muted)]">
            {automation.description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={automation.status} />
            <AutonomyBadge autonomy={automation.autonomy} />
            <span className="text-[11px] text-[var(--color-fg-subtle)]">
              Created {formatDateTime(automation.created_at)}
            </span>
            <span className="text-[11px] text-[var(--color-fg-subtle)]">
              · {automation.run_count} run{automation.run_count === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <DetailActions
          automationId={automation.id}
          status={automation.status}
          autonomy={automation.autonomy}
          name={automation.name}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column: trigger + steps */}
        <div className="space-y-6">
          {/* Trigger */}
          <section>
            <h2 className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
              When
            </h2>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
              <div className="mb-0.5 text-[12.5px] font-medium text-[var(--color-fg)]">
                {trigger.headline}
              </div>
              {trigger.detail && (
                <div className="text-[11.5px] font-mono text-[var(--color-fg-muted)]">
                  {trigger.detail}
                </div>
              )}
            </div>
          </section>

          {/* Steps */}
          <section>
            <h2 className="mb-2.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
              <span>Then</span>
              <span className="font-normal lowercase text-[var(--color-fg-subtle)]">
                {stepsCount} step{stepsCount === 1 ? '' : 's'}
              </span>
            </h2>
            {stepsCount === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-[12px] text-[var(--color-fg-muted)]">
                This automation has no steps yet.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {automation.spec.steps.map((step, i) => (
                  <StepRow key={i} step={step} index={i} />
                ))}
              </ol>
            )}
            <p className="mt-3 text-[11px] text-[var(--color-fg-subtle)]">
              Read-only here. To change the plan, open this automation in Ask COO.
            </p>
          </section>
        </div>

        {/* Right column: recent runs */}
        <aside className="space-y-3">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
            Recent runs
          </h2>
          {runs.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-[12px] text-[var(--color-fg-muted)]">
              No runs yet. This automation will execute the next time its trigger fires.
            </p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => {
                const stepsArr = Array.isArray(run.steps) ? run.steps : [];
                const queuedCount = (run.queued_action_ids ?? []).length;
                return (
                  <li
                    key={run.id}
                    className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12px] capitalize text-[var(--color-fg)]">
                        {runStatusIcon(run.status)} {run.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10.5px] text-[var(--color-fg-subtle)]">
                        {relativeTime(run.started_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--color-fg-muted)]">
                      <span>{stepsArr.length} step{stepsArr.length === 1 ? '' : 's'}</span>
                      {queuedCount > 0 && (
                        <Link
                          href="/dashboard/actions"
                          className="inline-flex items-center gap-1 text-[var(--color-primary)] no-underline hover:underline"
                        >
                          {queuedCount} action{queuedCount === 1 ? '' : 's'} queued <ArrowRight size={10} />
                        </Link>
                      )}
                    </div>
                    {run.error && (
                      <div className="mt-1.5 truncate text-[10.5px] text-red-400" title={run.error}>
                        {run.error}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href={`/dashboard/coo?automation_id=${automation.id}`}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-transparent px-4 py-2 text-[12px] font-medium text-[var(--color-fg)] no-underline transition-colors hover:bg-[var(--color-surface-sunken)]"
          >
            <MessageSquareText size={12} />
            Edit in chat
          </Link>
        </aside>
      </div>
    </>
  );
}
