'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Plus, Trash2 } from 'lucide-react';
import { FO_SUPPORTED_TOOLS } from '<npm>/lib/fo';

type Integration = { id: string; tool: string; status: string; connected_at: string };

export default function FoClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/fo/clients/${id}/integrations`);
      const d = (await r.json()) as { integrations?: Integration[] };
      setIntegrations(d.integrations ?? []);
    } catch {
      // best-effort; UI shows empty list
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const connectedTools = new Set(integrations.map((i) => i.tool));

  async function handleAdd(tool: string) {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/fo/clients/${id}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, api_key: apiKey.trim() }),
      });
    } finally {
      setSaving(false);
      setAdding(null);
      setApiKey('');
      await load();
    }
  }

  async function handleRemove(tool: string) {
    await fetch(`/api/fo/clients/${id}/integrations?tool=${encodeURIComponent(tool)}`, {
      method: 'DELETE',
    });
    await load();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        <Link href="/dashboard/fo" className="hover:text-[var(--color-fg)]">My Agencies</Link>
        {' / '}
        <span className="font-semibold text-[var(--color-fg)]">Integrations</span>
      </div>

      <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
        Agency Integrations
      </h1>
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        Add this agency&apos;s API keys so OpsRadar can pull their live data.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {FO_SUPPORTED_TOOLS.map((tool) => {
            const connected = connectedTools.has(tool);
            const isAdding = adding === tool;
            return (
              <div
                key={tool}
                className="flex items-center gap-3 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    connected
                      ? 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)]'
                      : 'bg-[var(--color-surface-sunken)]'
                  }`}
                >
                  {connected && <Check className="h-3 w-3 text-[var(--color-success)]" />}
                </span>
                <span className="flex-1 font-medium capitalize text-[var(--color-fg)]">{tool}</span>
                {connected ? (
                  <button
                    onClick={() => handleRemove(tool)}
                    aria-label={`Remove ${tool}`}
                    className="text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : isAdding ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="password"
                      placeholder="API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-7 w-48 rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-label text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <button
                      onClick={() => handleAdd(tool)}
                      disabled={saving || !apiKey.trim()}
                      className="h-7 rounded bg-[var(--color-primary)] px-2 text-label font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setAdding(null); setApiKey(''); }}
                      className="text-label text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(tool)}
                    className="flex items-center gap-1 text-label text-[var(--color-fg-subtle)] hover:text-[var(--color-primary)]"
                  >
                    <Plus className="h-3 w-3" />
                    Add key
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
