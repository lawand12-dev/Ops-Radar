'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { PlanGate } from '../_components/plan-gate';

type Webhook = {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
};

type ListResp = {
  webhooks?: Webhook[];
  available_events?: string[];
  status?: 'upgrade_required';
  required_plan?: string;
};

type PageState =
  | { kind: 'loading' }
  | { kind: 'upgrade_required' }
  | { kind: 'ok'; webhooks: Webhook[]; availableEvents: string[] }
  | { kind: 'error' };

export default function WebhooksPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [justCreated, setJustCreated] = useState<{ id: string; signing_secret: string } | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const r = await fetch('/api/dashboard/webhooks');
      const resp = (await r.json()) as ListResp;
      if (resp.status === 'upgrade_required') {
        setState({ kind: 'upgrade_required' });
      } else if (Array.isArray(resp.webhooks) && Array.isArray(resp.available_events)) {
        setState({ kind: 'ok', webhooks: resp.webhooks, availableEvents: resp.available_events });
      } else {
        setState({ kind: 'error' });
      }
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleEvent(event: string) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const r = await fetch('/api/dashboard/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
    });
    const body = (await r.json()) as { ok?: boolean; webhook?: Webhook; signing_secret?: string; error?: string };
    if (r.ok && body.webhook && body.signing_secret) {
      setJustCreated({ id: body.webhook.id, signing_secret: body.signing_secret });
      setNewUrl('');
      setNewEvents([]);
      setAdding(false);
      await load();
    } else {
      alert(body.error ?? 'Failed to create webhook');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook? Future events will not be delivered.')) return;
    await fetch(`/api/dashboard/webhooks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await load();
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch('/api/dashboard/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    await load();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        Dashboard / <span className="font-semibold text-[var(--color-fg)]">Webhooks</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Outgoing Webhooks
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            Get notified at any URL when OpsRadar fires an event. Each delivery is signed with HMAC-SHA256.
          </p>
        </div>
        {state.kind === 'ok' && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1.5 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-3 py-2 text-body-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add webhook
          </button>
        )}
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="Custom webhooks" requiredPlan="pro" />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load webhooks.</p>
      )}

      {justCreated && (
        <div className="rounded-[var(--radius-lg,8px)] border border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] p-4">
          <p className="font-medium text-[var(--color-fg)]">Webhook created — save your signing secret</p>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            Verify every request by computing HMAC-SHA256 of the raw body with this secret and comparing to the <code>X-OpsRadar-Signature</code> header. We only show it once.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-1 font-mono text-body-sm text-[var(--color-fg)]">
              {justCreated.signing_secret}
            </code>
            <button
              onClick={() => navigator.clipboard?.writeText(justCreated.signing_secret)}
              aria-label="Copy signing secret"
              className="rounded border border-[var(--color-border)] p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setJustCreated(null)}
              className="text-label text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {state.kind === 'ok' && adding && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-[var(--radius-lg,8px)] border border-dashed border-[var(--color-border)] p-4"
        >
          <div>
            <label className="block text-label text-[var(--color-fg-muted)]">Delivery URL (https only)</label>
            <input
              type="url"
              required
              autoFocus
              placeholder="https://example.com/opsradar-events"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="mt-1 h-9 w-full rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-label text-[var(--color-fg-muted)]">
              Events (leave empty for all)
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {state.availableEvents.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-1 text-label text-[var(--color-fg-muted)]"
                >
                  <input
                    type="checkbox"
                    checked={newEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  <code className="text-[11px]">{event}</code>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-3 py-1.5 text-body-sm font-medium text-white hover:opacity-90"
            >
              Create webhook
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewUrl(''); setNewEvents([]); }}
              className="rounded-[var(--radius,6px)] border border-[var(--color-border)] px-3 py-1.5 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {state.kind === 'ok' && (
        state.webhooks.length === 0 ? (
          <div className="rounded-[var(--radius-lg,8px)] border border-dashed border-[var(--color-border)] p-8 text-center">
            <p className="font-medium text-[var(--color-fg)]">No webhooks yet</p>
            <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
              Register a URL and we&apos;ll POST a signed payload whenever OpsRadar fires an event.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add webhook
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {state.webhooks.map((wh) => (
              <div
                key={wh.id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <code className="flex-1 truncate text-body-sm text-[var(--color-fg)]">{wh.url}</code>
                <span className="text-label text-[var(--color-fg-subtle)]">
                  {wh.events.length === 0 ? 'all events' : `${wh.events.length} event${wh.events.length === 1 ? '' : 's'}`}
                </span>
                <label className="flex cursor-pointer items-center gap-1 text-label text-[var(--color-fg-muted)]">
                  <input
                    type="checkbox"
                    checked={wh.is_active}
                    onChange={() => handleToggle(wh.id, wh.is_active)}
                  />
                  Active
                </label>
                <button
                  onClick={() => handleDelete(wh.id)}
                  aria-label="Delete webhook"
                  className="rounded p-1 text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
