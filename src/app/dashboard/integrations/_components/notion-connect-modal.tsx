'use client';

/**
 * Pre-flight instructions modal for the Notion connect flow (CP-24).
 *
 * When a customer clicks "Connect" on the Notion integration card, we DON'T
 * send them straight to Notion's OAuth screen — they'd be confused about
 * which pages to select. Instead we show this modal first with three
 * concrete steps:
 *
 *   1. Open Notion in a new tab
 *   2. Create a new empty top-level page called "OpsRadar Brain"
 *   3. Come back and click Continue → on Notion's screen, select ONLY that page
 *
 * The "Connect now anyway" escape hatch lets users who know what they're
 * doing (or who already have the page) skip the explanation.
 */

import { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export function NotionConnectModal({ open, onClose, onContinue }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset the checkbox each time we open the modal.
  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[560px] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[20px] font-normal leading-tight tracking-[-0.02em] text-[var(--color-fg)]">
            Before you connect Notion
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] px-2 py-1 text-body-xs text-[var(--color-fg-muted)] hover:bg-[var(--color-border)]"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <p className="mb-5 text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          We&apos;ll create your <strong className="text-[var(--color-fg)]">Company Brain</strong> — 20 databases + a daily-updated summary page — inside your Notion workspace. For security and a clean setup, please do this first:
        </p>

        <ol className="mb-5 space-y-3 text-body-sm text-[var(--color-fg)]">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-body-xs font-semibold text-[var(--color-bg)]">1</span>
            <span>
              Open <a href="https://www.notion.so/" target="_blank" rel="noopener noreferrer" className="underline">Notion</a> in a new tab.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-body-xs font-semibold text-[var(--color-bg)]">2</span>
            <span>
              Create a new empty page at the top level. Name it{' '}
              <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-[12px]">OpsRadar Brain</code>{' '}
              (or anything you like).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-body-xs font-semibold text-[var(--color-bg)]">3</span>
            <span>
              Come back here and click <strong>Continue</strong>. On Notion&apos;s permission screen, select <strong>only that new page</strong> — not your whole workspace.
            </span>
          </li>
        </ol>

        <div className="mb-5 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] p-3 text-body-xs leading-[1.5] text-[var(--color-fg-muted)]">
          <strong className="text-[var(--color-fg)]">Privacy:</strong> we&apos;ll only access the page you grant. Your other Notion pages stay private — we can&apos;t see them.
        </div>

        <label className="mb-5 flex cursor-pointer items-start gap-2 text-body-xs text-[var(--color-fg-muted)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 accent-[var(--color-accent)]"
          />
          <span>I created the page in Notion and I&apos;m ready to grant access.</span>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-3.5 py-2 text-body-sm text-[var(--color-fg)] hover:bg-[var(--color-border)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!acknowledged}
            className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-body-sm font-medium text-[var(--color-bg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to Notion
          </button>
        </div>
      </div>
    </div>
  );
}
