import { notFound } from 'next/navigation';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { AgencyScore, Grade } from '<npm>/lib/agency-score';

export const dynamic = 'force-dynamic';

function gradeColor(g: Grade): string {
  if (g === 'A') return 'text-emerald-400';
  if (g === 'B') return 'text-emerald-300';
  if (g === 'C') return 'text-amber-400';
  if (g === 'D') return 'text-orange-400';
  return 'text-red-400';
}

function gradeLabel(g: Grade): string {
  if (g === 'A') return 'Excellent';
  if (g === 'B') return 'Good';
  if (g === 'C') return 'Fair';
  if (g === 'D') return 'Needs work';
  return 'Critical';
}

type Props = { params: Promise<{ token: string }> };

export default async function PublicScorePage({ params }: Props) {
  const { token } = await params;
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('score_snapshots')
    .select('scores, company_name, created_at')
    .eq('share_token', token)
    .single();

  if (error || !data) notFound();

  const score = data.scores as unknown as AgencyScore;
  const companyName = data.company_name || score.company_name || 'Agency';
  const createdAtISO = data.created_at ?? new Date().toISOString();
  const computedAt = new Date(createdAtISO).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const dimensions = [
    { key: 'margins',              label: 'Margins' },
    { key: 'collection_speed',     label: 'Collections' },
    { key: 'client_concentration', label: 'Client Mix' },
    { key: 'utilization',          label: 'Utilization' },
    { key: 'benchmark_position',   label: 'Industry Rank' },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-10">
      <div className="mx-auto max-w-[640px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            OpsRadar Agency Score
          </p>
          <h1 className="font-serif text-[28px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            {companyName}
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-subtle)]">Computed {computedAt}</p>
        </div>

        {/* Overall */}
        <div className="mb-6 flex items-center gap-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
          <span className={`text-[64px] font-bold leading-none ${gradeColor(score.overall_grade)}`}>
            {score.overall_grade}
          </span>
          <div>
            <p className="text-[16px] font-semibold text-[var(--color-fg)]">
              {gradeLabel(score.overall_grade)} · {score.overall_score}/100
            </p>
            <p className="text-body-sm text-[var(--color-fg-muted)]">Overall agency health score</p>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dimensions.map(({ key, label }) => {
            const dim = score.dimensions[key];
            return (
              <div
                key={key}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"
              >
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
                  {label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[24px] font-bold ${gradeColor(dim.grade)}`}>{dim.grade}</span>
                  <span className="text-[12px] text-[var(--color-fg-muted)]">{dim.detail}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="mb-2 text-[12.5px] text-[var(--color-fg-subtle)]">
            Want to see your own agency score?
          </p>
          <a
            href="https://opsradar.app"
            className="inline-flex items-center rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
          >
            Get your score at OpsRadar →
          </a>
        </div>
      </div>
    </div>
  );
}
