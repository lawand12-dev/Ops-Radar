'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

type Persona = 'ceo' | 'coo' | 'both';
type Section = 'hero' | 'automations' | 'business';

export type NarrativeCardProps = {
  /** Which slice of the narrative response to render. */
  section: Section;
  /** Persona prompt sent to the narrative API. */
  persona?: Persona;
  /** Card title shown above the prose. */
  title: string;
  className?: string;
};

type NarrativeResponse = {
  status: 'ok' | 'unavailable';
  hero?: string;
  sections?: { automations: string; business: string };
  generated_at?: string;
  message?: string;
};

/**
 * AI-generated English briefing. Spec §6.2 — non-optional primitive.
 *
 * Calls /api/dashboard/narrative once (cached server-side 1h per
 * user+persona). Renders fallback copy on any failure — never blocks
 * the rest of the page.
 */
export function NarrativeCard({ section, persona = 'both', title, className = '' }: NarrativeCardProps) {
  const [data, setData] = useState<NarrativeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/narrative?persona=${persona}`)
      .then((r) => r.json())
      .then((json: NarrativeResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ status: 'unavailable' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [persona]);

  const body = pickBody(data, section);

  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
          {title}
        </h3>
        <span className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
          <Sparkles size={9} strokeWidth={2} />
          AI · hourly
        </span>
      </div>
      {loading ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Generating briefing…</p>
      ) : body ? (
        <p className="whitespace-pre-line text-[13.5px] leading-[1.55] text-[var(--color-fg-muted)]">
          {body}
        </p>
      ) : (
        <p className="text-body-sm italic text-[var(--color-fg-subtle)]">
          Briefing temporarily unavailable.
        </p>
      )}
    </div>
  );
}

function pickBody(data: NarrativeResponse | null, section: Section): string | null {
  if (!data || data.status !== 'ok') return null;
  if (section === 'hero') return data.hero ?? null;
  return data.sections?.[section] ?? null;
}
