import { Plug } from 'lucide-react';

export type EmptyStateConnectProps = {
  tool: string;                 // e.g. "Stripe", "HubSpot"
  toolSlug?: string;            // legacy deep-link param — unused while no integrations layer is wired
  description?: string;         // override default copy
  className?: string;
};

/**
 * The single source of truth for "not connected" widget state.
 * Spec §12 — three-state pattern. State 3: not connected.
 *
 * Dim card with the tool name + a single sentence. No connect action is
 * shown while no integrations layer is wired — restore the deep-link to
 * the integrations surface when one returns.
 */
export function EmptyStateConnect({
  tool,
  description,
  className = '',
}: EmptyStateConnectProps) {
  const copy = description ?? `${tool} is not connected yet.`;
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 p-5 ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--color-fg-muted)]">
        <Plug size={14} strokeWidth={1.6} />
        <span className="text-label text-[var(--color-fg-muted)]">
          Not connected
        </span>
      </div>
      <p className="text-body-sm text-[var(--color-fg-muted)]">{copy}</p>
    </div>
  );
}
