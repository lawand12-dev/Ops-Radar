import Link from 'next/link';
import { Plug } from 'lucide-react';

export type EmptyStateConnectProps = {
  tool: string;                 // e.g. "Stripe", "HubSpot"
  toolSlug: string;             // url-safe slug for ?tool=… param
  description?: string;         // override default copy
  className?: string;
};

/**
 * The single source of truth for "not connected" widget state.
 * Spec §12 — three-state pattern. State 3: not connected.
 *
 * Dim card with the tool name, a single sentence, and a primary
 * button deep-linking to /dashboard/integrations?tool=<slug>.
 *
 * Use this for the entire widget body when an integration is not
 * connected. Do NOT compose multiple of these in one widget.
 */
export function EmptyStateConnect({
  tool,
  toolSlug,
  description,
  className = '',
}: EmptyStateConnectProps) {
  const copy = description ?? `Connect ${tool} to see your data here.`;
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
      <Link
        href={`/dashboard/integrations?tool=${toolSlug}`}
        className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-body-sm font-semibold text-white no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_85%,black)]"
      >
        Connect {tool}
      </Link>
    </div>
  );
}
