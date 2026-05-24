'use client';

// CP-20 Phase 5c — interactive controls for the automation detail page.
//
// Owns the pause/resume + autonomy + delete fetches. Each mutation hits the
// API, then router.refresh() so the server-rendered detail page picks up
// the new state (no client-side state mirror — single source of truth lives
// in the database). Delete navigates back to the list.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pause, Play, Trash2 } from 'lucide-react';
import type { AutomationAutonomy, AutomationStatus } from '<npm>/lib/automations/types';

type Props = {
  automationId: string;
  status: AutomationStatus;
  autonomy: AutomationAutonomy;
  name: string;
};

const AUTONOMY_OPTIONS: AutomationAutonomy[] = ['ask', 'auto', 'off'];

export function DetailActions({ automationId, status, autonomy, name }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | 'status' | 'autonomy' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function patch(body: Record<string, unknown>, label: 'status' | 'autonomy') {
    setError(null);
    setBusy(label);
    try {
      const res = await fetch(`/api/dashboard/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request_failed');
    } finally {
      setBusy(null);
    }
  }

  async function onTogglePause() {
    const nextStatus: AutomationStatus = status === 'active' ? 'paused' : 'active';
    await patch({ status: nextStatus }, 'status');
  }

  async function onAutonomyChange(next: AutomationAutonomy) {
    if (next === autonomy) return;
    await patch({ autonomy: next }, 'autonomy');
  }

  async function onDelete() {
    setError(null);
    setBusy('delete');
    try {
      const res = await fetch(`/api/dashboard/automations/${automationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      router.push('/dashboard/automations');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete_failed');
      setBusy(null);
    }
  }

  const isArchived = status === 'archived';
  const togglingDisabled = isArchived || busy === 'status' || pending;
  const pauseLabel = status === 'active' ? 'Pause' : 'Resume';
  const PauseIcon = status === 'active' ? Pause : Play;

  return (
    <div className="flex flex-col items-end gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Autonomy selector */}
        <div className="flex items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
          {AUTONOMY_OPTIONS.map((opt) => {
            const active = autonomy === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => void onAutonomyChange(opt)}
                disabled={busy === 'autonomy' || pending}
                className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
                }`}
                aria-pressed={active}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Pause / Resume */}
        <button
          type="button"
          onClick={() => void onTogglePause()}
          disabled={togglingDisabled}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-sunken)] disabled:opacity-50"
        >
          {busy === 'status' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <PauseIcon size={12} />
          )}
          {pauseLabel}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={busy === 'delete' || pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-danger)_30%,var(--color-border))] bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-[var(--color-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] disabled:opacity-50"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={() => !busy && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1.5 font-serif text-[16px] text-[var(--color-fg)]">Delete this automation?</h3>
            <p className="mb-4 text-[12.5px] leading-[1.55] text-[var(--color-fg-muted)]">
              <span className="font-medium text-[var(--color-fg)]">{name}</span> will stop firing
              immediately and its history will be removed. This can&rsquo;t be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy === 'delete'}
                className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={busy === 'delete'}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-danger)] px-4 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
