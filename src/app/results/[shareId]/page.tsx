import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { ShareCopyButton } from './_components/share-copy-button';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.co';

// ─── Minimal types (only fields we render) ───────────────────────────────────

type Opportunity = {
  rank?: number;
  title: string;
  hours_saved_weekly?: number;
  monthly_savings?: number;
  difficulty?: 'easy' | 'medium' | 'complex';
  quick_win?: boolean;
};

type AuditResult = {
  automation_readiness_score?: number;
  estimated_annual_waste?: number | null;
  executive_summary?: string;
  labor_arbitrage_breakdown?: { annual_labor_waste?: number };
  summary?: { automation_readiness_score?: number; total_annual_cost_savings?: number };
  opportunities?: Opportunity[];
};

type AuditAnswers = {
  teamSize?: string;
  agencyType?: string;
};

type BenchmarkPoint = { label: string; stat: string; context: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function getAnnualWaste(r: AuditResult): number | null {
  const v = r.labor_arbitrage_breakdown?.annual_labor_waste ?? r.estimated_annual_waste ?? r.summary?.total_annual_cost_savings ?? null;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function getScore(r: AuditResult): number | null {
  const v = r.automation_readiness_score ?? r.summary?.automation_readiness_score ?? null;
  return typeof v === 'number' ? v : null;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getQuickWins(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities]
    .sort((a, b) => {
      if (a.quick_win && !b.quick_win) return -1;
      if (!a.quick_win && b.quick_win) return 1;
      const da = a.difficulty === 'easy' ? 0 : a.difficulty === 'medium' ? 1 : 2;
      const db = b.difficulty === 'easy' ? 0 : b.difficulty === 'medium' ? 1 : 2;
      if (da !== db) return da - db;
      return (a.rank ?? 99) - (b.rank ?? 99);
    })
    .slice(0, 3);
}

function getBenchmarks(teamSize: string): BenchmarkPoint[] {
  if (['16-30', '31-50', '51-100', '100+'].includes(teamSize)) {
    return [
      { label: 'Manual ops cost', stat: '25–30%', context: 'of revenue at your scale — industry average' },
      { label: 'Automated workflows', stat: '8+', context: 'workflows run by top agencies your size' },
      { label: 'Annual ROI potential', stat: '$120K–$300K', context: 'typical automation return at your scale' },
    ];
  }
  if (teamSize === '6-15') {
    return [
      { label: 'Time on manual ops', stat: '22%', context: 'of team capacity — average agency your size' },
      { label: 'Automation coverage', stat: '60%+', context: 'reporting & invoicing for top performers' },
      { label: 'Annual ROI potential', stat: '$45K–$90K', context: 'typical automation return at your scale' },
    ];
  }
  if (teamSize === '2-5') {
    return [
      { label: 'Hours on admin/week', stat: '18h', context: 'average for 2–5 person teams — automation cuts this to 6h' },
      { label: 'Automation coverage', stat: '40%', context: 'of repetitive work automated by top-quartile agencies' },
      { label: 'Annual ROI potential', stat: '$28K–$55K', context: 'typical automation return at your scale' },
    ];
  }
  return [
    { label: 'Admin time/week', stat: '10–14h', context: 'average for solo agencies — automation saves 6–8h' },
    { label: 'First automation', stat: '3–5 days', context: 'average time to build and deploy your first workflow' },
    { label: 'Annual ROI potential', stat: '$12K–$30K', context: 'typical first-year return on automation investment' },
  ];
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ shareId: string }> },
): Promise<Metadata> {
  const { shareId } = await params;
  const supabase = getServerSupabaseClient();

  const { data } = await supabase
    .from('audits')
    .select('company, result')
    .eq('share_token', shareId)
    .gt('share_expires_at', new Date().toISOString())
    .single();

  if (!data) return { title: 'Automation Audit — OpsRadar' };

  const result = data.result as AuditResult;
  const score = getScore(result);
  const waste = getAnnualWaste(result);

  const title = `${data.company} Automation Audit${score != null ? ` — Score: ${score}/100` : ''}`;
  const description = waste
    ? `${data.company} could save ${fmtMoney(waste)}/year by automating their operations. Get your own free audit at opsradar.co`
    : `${data.company}'s personalized automation roadmap. Get your own free audit at opsradar.co`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SharedReportPage(
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const supabase = getServerSupabaseClient();

  const { data } = await supabase
    .from('audits')
    .select('company, result, answers')
    .eq('share_token', shareId)
    .gt('share_expires_at', new Date().toISOString())
    .single();

  if (!data) notFound();

  const result  = data.result  as AuditResult;
  const answers = data.answers as AuditAnswers | null;

  const score      = getScore(result);
  const waste      = getAnnualWaste(result);
  const quickWins  = getQuickWins(result.opportunities ?? []);
  const benchmarks = getBenchmarks(answers?.teamSize ?? '');
  const shareUrl   = `${BASE_URL}/results/${shareId}`;
  const scoreHex   = score != null ? scoreColor(score) : '#3b82f6';

  return (
    <div
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-[#060c1e] text-[#eef2ff]"
    >
      {/* OpsRadar nav badge */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image src="/logo.png" alt="OpsRadar" width={20} height={20} className="rounded-[4px]" />
          <span className="text-[13px] font-semibold text-white/50">OpsRadar</span>
        </Link>
        <Link
          href="/audit"
          className="rounded-full bg-[#3b82f6] px-3.5 py-1.5 text-[12px] font-semibold text-white no-underline hover:opacity-90"
        >
          Get my free audit →
        </Link>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12">

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
            Automation Audit Report
          </div>
          <h1 className="mb-4 text-[32px] font-bold leading-[1.15] text-white">
            {data.company}
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            {score != null && (
              <div
                className="flex items-center gap-2 rounded-[10px] border px-4 py-3"
                style={{ borderColor: `${scoreHex}33`, background: `${scoreHex}0d` }}
              >
                <span className="text-[36px] font-extrabold leading-none" style={{ color: scoreHex }}>
                  {score}
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30">Score</div>
                  <div className="text-[11px] text-white/50">out of 100</div>
                </div>
              </div>
            )}
            {waste != null && (
              <div className="flex items-center gap-2 rounded-[10px] border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
                <span className="text-[36px] font-extrabold leading-none text-amber-400">
                  {fmtMoney(waste)}
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30">Annual</div>
                  <div className="text-[11px] text-white/50">in manual work</div>
                </div>
              </div>
            )}
          </div>
          {result.executive_summary && (
            <p className="mt-5 text-[15px] leading-[1.65] text-white/60">
              {result.executive_summary}
            </p>
          )}
        </div>

        {/* Top 3 Quick Wins */}
        {quickWins.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
              Top 3 Automation Quick Wins
            </h2>
            <div className="flex flex-col gap-3">
              {quickWins.map((opp, idx) => {
                const monthlySavings = opp.monthly_savings ?? (opp.hours_saved_weekly ? Math.round(opp.hours_saved_weekly * 85 * 4.33) : null);
                return (
                  <div
                    key={idx}
                    className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="text-[14px] font-semibold text-white">{opp.title}</span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: opp.difficulty === 'easy' ? 'rgba(16,185,129,0.1)' : opp.difficulty === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: opp.difficulty === 'easy' ? '#10b981' : opp.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {opp.difficulty === 'easy' ? 'Easy' : opp.difficulty === 'medium' ? 'Medium' : 'Complex'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[12px] text-white/40">
                      {opp.hours_saved_weekly != null && opp.hours_saved_weekly > 0 && (
                        <span>~{opp.hours_saved_weekly}h saved/week</span>
                      )}
                      {monthlySavings != null && monthlySavings > 0 && (
                        <span className="text-white/60">{fmtMoney(monthlySavings)}/month</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* How You Compare */}
        <section className="mb-10">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
            How You Compare
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {benchmarks.map((b) => (
              <div
                key={b.label}
                className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30">
                  {b.label}
                </div>
                <div className="mb-1 text-[24px] font-extrabold text-[#3b82f6]">{b.stat}</div>
                <div className="text-[11px] leading-snug text-white/40">{b.context}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-[14px] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] p-6 text-center">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[2px] text-[#3b82f6]/70">
            Powered by OpsRadar
          </div>
          <h3 className="mb-2 text-[20px] font-bold text-white">
            Find out where your agency is leaking time and money
          </h3>
          <p className="mb-5 text-[14px] text-white/50">
            Takes 5 minutes. Free. No credit card.
          </p>
          <Link
            href="/audit"
            className="inline-block rounded-full bg-[#3b82f6] px-6 py-3 text-[14px] font-bold text-white no-underline shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:opacity-90"
          >
            Get my free audit →
          </Link>
        </section>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 text-center">
          <p className="text-[12px] text-white/25">
            This report was generated with{' '}
            <Link href="/" className="text-white/40 hover:text-white/60">OpsRadar</Link>
            {' '}· Share this link with your team
          </p>
          <ShareCopyButton url={shareUrl} />
        </div>

      </div>
    </div>
  );
}
