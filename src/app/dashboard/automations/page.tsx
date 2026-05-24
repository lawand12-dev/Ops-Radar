// src/app/dashboard/automations/page.tsx
//
// CP-20 Phase 5a — registry view: every customer-built automation in one place.
// Server component, mirrors /dashboard/runs framing and the cockpit's table density.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Workflow, MessageSquareText, Play, Pause, Archive, ChevronRight } from 'lucide-react';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { listAutomations } from '<npm>/lib/automations/registry';
import type {
  AutomationAutonomy,
  AutomationStatus,
  CustomerAutomation,
} from '<npm>/lib/automations/types';
import { HowItWorks } from './_components/how-it-works';

export const dynamic = 'force-dynamic';

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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function StatusBadge({ status }: { status: AutomationStatus }) {
  const styles: Record<AutomationStatus, { cls: string; Icon: typeof Play; label: string }> = {
    active:   { cls: 'bg-emerald-500/15 text-emerald-300',                                    Icon: Play,    label: 'Active'   },
    paused:   { cls: 'bg-amber-500/15 text-amber-300',                                        Icon: Pause,   label: 'Paused'   },
    archived: { cls: 'bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]',             Icon: Archive, label: 'Archived' },
  };
  const { cls, Icon, label } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[10.5px] font-medium ${cls}`}>
      <Icon size={10} strokeWidth={2.2} /> {label}
    </span>
  );
}

function AutonomyBadge({ autonomy }: { autonomy: AutomationAutonomy }) {
  const styles: Record<AutomationAutonomy, string> = {
    ask:  'border-[var(--color-border)] text-[var(--color-fg-muted)]',
    auto: 'border-[var(--color-primary)]/40 text-[var(--color-primary)] bg-[var(--color-primary)]/10',
    off:  'border-[var(--color-border)] text-[var(--color-fg-subtle)] line-through',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-[1px] text-[10.5px] font-medium uppercase tracking-wide ${styles[autonomy]}`}>
      {autonomy}
    </span>
  );
}

function TriggerCell({ a }: { a: CustomerAutomation }) {
  if (a.trigger_kind === 'composio_event' && a.trigger_toolkit && a.trigger_slug) {
    return (
      <span className="font-mono text-[11.5px] text-[var(--color-fg-muted)]">
        {a.trigger_toolkit}/<span className="text-[var(--color-fg)]">{a.trigger_slug}</span>
      </span>
    );
  }
  return (
    <span className="text-[11.5px] capitalize text-[var(--color-fg-muted)]">
      {a.trigger_kind.replace('_', ' ')}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Workflow size={20} />
      </div>
      <h2 className="mb-1.5 font-serif text-[16px] text-[var(--color-fg)]">No automations yet</h2>
      <p className="mx-auto mb-5 max-w-[420px] text-[12.5px] leading-[1.55] text-[var(--color-fg-muted)]">
        Talk to Ask COO and describe what you want to happen automatically — for example,
        &ldquo;when a HubSpot deal closes won, DM the PM and create a kick-off page in Notion&rdquo;.
        Ask COO will draft the automation and show it to you for approval before installing.
      </p>
      <Link
        href="/dashboard/coo"
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:opacity-90"
      >
        <MessageSquareText size={13} />
        Talk to Ask COO
      </Link>
    </div>
  );
}

export default async function AutomationsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const automations = await listAutomations(userId);

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Automations
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Reflex pass — your customer-built automations that fire on inbound events. Cron agents handle synthesis; these handle reflexes.
        </p>
      </div>

      <HowItWorks />

      {automations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-[12.5px]">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 text-left">
              <tr className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Trigger</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Autonomy</th>
                <th className="px-4 py-2.5 font-medium">Last run</th>
                <th className="px-4 py-2.5 font-medium">Runs</th>
                <th className="w-8 px-4 py-2.5" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr
                  key={a.id}
                  className="group border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-2)]/40"
                >
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/automations/${a.id}`} className="block no-underline">
                      <div className="mb-0.5 font-medium text-[var(--color-fg)] group-hover:text-[var(--color-primary)]">
                        {a.name}
                      </div>
                      <div className="text-[11.5px] leading-[1.45] text-[var(--color-fg-muted)]">
                        {truncate(a.description, 110)}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/dashboard/automations/${a.id}`} className="no-underline">
                      <TriggerCell a={a} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/dashboard/automations/${a.id}`} className="no-underline">
                      <StatusBadge status={a.status} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/dashboard/automations/${a.id}`} className="no-underline">
                      <AutonomyBadge autonomy={a.autonomy} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--color-fg-muted)]">
                    <Link href={`/dashboard/automations/${a.id}`} className="no-underline text-inherit">
                      {relativeTime(a.last_run_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--color-fg-muted)]">
                    <Link href={`/dashboard/automations/${a.id}`} className="no-underline text-inherit">
                      {a.run_count}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/dashboard/automations/${a.id}`}
                      aria-label={`Open ${a.name}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-fg-faint)] transition-colors group-hover:text-[var(--color-fg)]"
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
