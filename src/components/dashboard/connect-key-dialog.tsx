'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

export type ConnectKeyDialogProps = {
  open: boolean;
  tool: string;
  displayName: string;
  instructions: string;
  createKeyDocsUrl: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ConnectKeyDialog(props: ConnectKeyDialogProps) {
  const { open, tool, displayName, instructions, createKeyDocsUrl, onClose, onSuccess } = props;
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiKey('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${tool}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? body.error ?? `Connection failed (${res.status}).`);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-serif text-[18px] text-[var(--color-fg)]">Connect {displayName}</h2>
            <p className="mt-1 text-[12.5px] text-[var(--color-fg-muted)]">
              Paste a read-only API key. We encrypt it; the data stays in {displayName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius)] p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3 text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">
          <div className="mb-1.5 font-medium text-[var(--color-fg)]">How to create the key</div>
          <p>{instructions}</p>
          <a
            href={createKeyDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[var(--color-primary)] no-underline hover:underline"
          >
            Open {displayName} <ExternalLink size={11} />
          </a>
        </div>

        <form onSubmit={submit}>
          <label className="block text-[11.5px] font-medium text-[var(--color-fg)]">API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={tool === 'stripe' ? 'rk_live_… or sk_live_…' : 'pat-…'}
            autoComplete="off"
            spellCheck={false}
            required
            className="mt-1 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
          />

          {error && (
            <div className="mt-3 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius)] px-3 py-1.5 text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || apiKey.length < 8}
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
