'use client';

import { useEffect, useState } from 'react';
import type { AgencyScore, Grade } from '<npm>/lib/agency-score';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; score: AgencyScore }
  | { kind: 'err' };

type ShareState = 'idle' | 'generating' | { token: string };

function gradeColor(g: Grade): string {
  if (g === 'A') return 'text-emerald-400';
  if (g === 'B') return 'text-emerald-300';
  if (g === 'C') return 'text-amber-400';
  if (g === 'D') return 'text-orange-400';
  return 'text-[var(--color-error)]';
}

function gradeLabel(g: Grade): string {
  if (g === 'A') return 'Excellent';
  if (g === 'B') return 'Good';
  if (g === 'C') return 'Fair';
  if (g === 'D') return 'Needs work';
  return 'Critical';
}

function DimensionCard({ title, dimension }: { title: string; dimension: AgencyScore['dimensions'][keyof AgencyScore['dimensions']] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-xs)]">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
        {title}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-[28px] font-bold ${gradeColor(dimension.grade)}`}>
          {dimension.grade}
        </span>
        <span className="text-[12.5px] text-[var(--color-fg-muted)]">{gradeLabel(dimension.grade)}</span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">{dimension.detail}</p>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${dimension.score}%` }}
        />
      </div>
    </div>
  );
}

export default function ScorePage() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [shareState, setShareState] = useState<ShareState>('idle');

  useEffect(() => {
    fetch('/api/dashboard/score')
      .then((r) => r.json())
      .then((j: { score?: AgencyScore; error?: string }) => {
        if (j.score) setState({ kind: 'ok', score: j.score });
        else setState({ kind: 'err' });
      })
      .catch(() => setState({ kind: 'err' }));
  }, []);

  async function generateShareLink() {
    setShareState('generating');
    try {
      const res = await fetch('/api/dashboard/score', { method: 'POST' });
      const data = await res.json() as { share_token?: string };
      if (data.share_token) {
        setShareState({ token: data.share_token });
      } else {
        setShareState('idle');
      }
    } catch {
      setShareState('idle');
    }
  }

  const shareUrl = typeof shareState === 'object'
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/score/${shareState.token}`
    : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Score</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Agency Score
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            Your agency rated across 5 dimensions — compared to industry.
          </p>
        </div>
        {state.kind === 'ok' && (
          <button
            onClick={() => void generateShareLink()}
            disabled={shareState === 'generating'}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] disabled:opacity-50"
          >
            {shareState === 'generating' ? 'Generating…' : 'Share scorecard'}
          </button>
        )}
      </div>

      {shareUrl && (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <p className="mb-1 text-[11.5px] font-medium text-[var(--color-fg)]">Public share link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-[var(--color-surface-sunken)] px-2 py-1 text-[11.5px] text-[var(--color-fg-muted)]">
              {shareUrl}
            </code>
            <button
              onClick={() => void navigator.clipboard.writeText(shareUrl)}
              className="shrink-0 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface)]" />
          ))}
        </div>
      )}

      {state.kind === 'err' && (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          Couldn&apos;t load score. Connect Stripe and Harvest for a full picture.
        </p>
      )}

      {state.kind === 'ok' && (
        <>
          <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[var(--shadow-xs)]">
            <span className={`text-[56px] font-bold leading-none ${gradeColor(state.score.overall_grade)}`}>
              {state.score.overall_grade}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-fg)]">
                {gradeLabel(state.score.overall_grade)} · {state.score.overall_score}/100
              </p>
              <p className="text-body-sm text-[var(--color-fg-muted)]">
                {state.score.company_name || 'Your agency'} · Computed just now
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DimensionCard title="Margins" dimension={state.score.dimensions.margins} />
            <DimensionCard title="Collections" dimension={state.score.dimensions.collection_speed} />
            <DimensionCard title="Client Mix" dimension={state.score.dimensions.client_concentration} />
            <DimensionCard title="Utilization" dimension={state.score.dimensions.utilization} />
            <DimensionCard title="Industry Rank" dimension={state.score.dimensions.benchmark_position} />
          </div>
        </>
      )}
    </div>
  );
}
