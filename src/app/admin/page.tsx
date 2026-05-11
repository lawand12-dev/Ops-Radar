'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { fetchAdminApi } from '../../lib/admin-api-client'

export const dynamic = 'force-dynamic'

// Types
type Answers = {
  agencyType?: string;
  teamSize?: string;
  tools?: string;
  services?: string;
  timeWasters?: string;
  manualProcesses?: string;
  revenue?: string;
  fallThrough?: string;
}

type AuditResult = {
  executive_summary?: string;
  automation_readiness_score?: number;
  estimated_annual_waste?: number;
  estimated_monthly_waste?: number;
  summary?: {
    automation_readiness_score?: number;
    total_annual_cost_savings?: number;
    total_hours_saved_weekly?: number;
    headline?: string;
  };
  opportunities?: Array<{
    rank: number;
    title: string;
    hard_truth?: string;
    problem?: string;
    solution: string;
    monthly_savings?: number;
    annual_savings?: number;
    hours_saved_weekly: number;
    difficulty: string;
    tools_involved?: string[];
  }>;
  tools_analysis?: {
    current_stack_rating?: number;
    biggest_friction_point?: string;
    recommended_additions?: string[];
    missing_integrations?: string[];
  };
}

type AuditRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string;
  answers: Answers;
  result: AuditResult;
  access_token?: string | null;
}

type FunnelData = {
  funnel: Array<{ step: number; label: string; reached: number; percent: number }>
  totalSessions: number
  biggestDropStep: number
  biggestDropPct: number
  completionRate: number
}

// Helpers
function readinessScore(r: AuditResult): number {
  return r.automation_readiness_score ?? r.summary?.automation_readiness_score ?? 0
}

function annualWaste(r: AuditResult): number {
  return r.estimated_annual_waste ?? r.summary?.total_annual_cost_savings ?? 0
}

function scoreColor(score: number): string {
  if (score >= 60) return 'var(--color-success, #34D399)'
  if (score >= 30) return 'var(--color-warn, #FBBF24)'
  return 'var(--color-danger, #F87171)'
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return n > 0 ? `$${n.toLocaleString()}` : '—'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function diffBadge(d: string) {
  const map: Record<string, { text: string; colorClass: string }> = {
    easy:    { text: 'Easy',    colorClass: 'text-[var(--color-success,#34D399)] border-[color-mix(in_srgb,var(--color-success,#34D399)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-success,#34D399)_10%,transparent)]' },
    medium:  { text: 'Medium',  colorClass: 'text-[var(--color-warn,#FBBF24)] border-[color-mix(in_srgb,var(--color-warn,#FBBF24)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-warn,#FBBF24)_10%,transparent)]' },
    complex: { text: 'Complex', colorClass: 'text-[var(--color-danger,#F87171)] border-[color-mix(in_srgb,var(--color-danger,#F87171)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-danger,#F87171)_10%,transparent)]' },
  }
  return map[d] ?? { text: d, colorClass: 'text-[var(--color-fg-muted)] border-[var(--color-border)] bg-[var(--color-surface-sunken)]' }
}

// Expanded row detail
function AuditDetail({ audit }: { audit: AuditRow }) {
  const { answers, result, id, access_token } = audit
  const opps = result.opportunities ?? []
  const tools = result.tools_analysis
  const reportHref = access_token
    ? `/results?id=${encodeURIComponent(id)}&token=${encodeURIComponent(access_token)}`
    : `/results?id=${encodeURIComponent(id)}`

  return (
    <div className="mt-4 space-y-5 text-body-sm">
      {result.executive_summary && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]">
          <p className="text-label text-[var(--color-fg-subtle)] mb-2">Executive Summary</p>
          <p className="text-[var(--color-fg-muted)] leading-relaxed">{result.executive_summary}</p>
        </div>
      )}

      <div>
        <p className="text-label text-[var(--color-fg-subtle)] mb-3">Form Answers</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            ['Industry', answers.agencyType],
            ['Team Size', answers.teamSize],
            ['Revenue', answers.revenue],
            ['Tools Used', answers.tools],
            ['Services', answers.services],
            ['Time Wasters', answers.timeWasters],
            ['Manual Processes', answers.manualProcesses],
            ['Falls Through', answers.fallThrough],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string} className="p-3 rounded-[var(--radius)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
              <p className="text-label text-[var(--color-fg-subtle)] mb-1">{label}</p>
              <p className="text-[var(--color-fg-muted)] leading-relaxed">{value as string}</p>
            </div>
          ))}
        </div>
      </div>

      {opps.length > 0 && (
        <div>
          <p className="text-label text-[var(--color-fg-subtle)] mb-3">Opportunities ({opps.length})</p>
          <div className="space-y-2">
            {opps.map((opp) => {
              const diff = diffBadge(opp.difficulty)
              const money = opp.monthly_savings ?? (opp.annual_savings ? Math.round(opp.annual_savings / 12) : 0)
              return (
                <div key={opp.rank} className="flex items-start gap-3 p-3 rounded-[var(--radius)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
                  <span className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-caption font-bold shrink-0 bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] text-[var(--color-primary)]">
                    {opp.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-fg)] leading-snug">{opp.title}</p>
                    {(opp.hard_truth ?? opp.problem) && (
                      <p className="text-[var(--color-fg-muted)] mt-0.5 leading-relaxed line-clamp-2">{opp.hard_truth ?? opp.problem}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-caption font-semibold px-2 py-[2px] rounded-full border ${diff.colorClass}`}>
                      {diff.text}
                    </span>
                    <span className="text-caption font-bold text-[var(--color-fg-muted)] tabular-nums font-mono">{opp.hours_saved_weekly}h/wk</span>
                    {money > 0 && (
                      <span className="text-caption font-bold text-[var(--color-success,#34D399)] tabular-nums font-mono">{fmtMoney(money)}/mo</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tools?.biggest_friction_point && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-warn,#FBBF24)_5%,transparent)] border border-[color-mix(in_srgb,var(--color-warn,#FBBF24)_18%,transparent)]">
          <p className="text-label text-[var(--color-warn,#FBBF24)] mb-1.5">Biggest Friction Point</p>
          <p className="text-[var(--color-fg-muted)] leading-relaxed">{tools.biggest_friction_point}</p>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <Link
          href={reportHref}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius)] text-body-sm font-medium bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] transition-colors duration-[var(--duration-fast)]"
        >
          View Full Report
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M6.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}

// Main page
export default function AdminPage() {
  const router = useRouter()
  const [audits, setAudits] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)

  useEffect(() => {
    fetchAdminApi<{ audits: AuditRow[] }>('/api/admin/data?view=audits')
      .then((data) => {
        setAudits(data.audits ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load audits')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchAdminApi<FunnelData>('/api/admin/funnel')
      .then(setFunnelData)
      .catch((err) => console.warn('[admin] funnel fetch failed:', err))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return audits
    return audits.filter(a =>
      a.company.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
    )
  }, [audits, query])

  function toggleRow(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  async function handleSignOut() {
    await fetch('/api/admin-auth', { method: 'DELETE' })
    router.replace('/admin/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-body-sm text-[var(--color-danger,#F87171)]">Error: {error}</p>
      </div>
    )
  }

  const avgScore = audits.length > 0
    ? Math.round(audits.reduce((s, a) => s + readinessScore(a.result), 0) / audits.length)
    : 0

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">

      {/* ── Top nav bar ── */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 h-14 flex items-center justify-between gap-6">

          {/* Wordmark + breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-caption text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)]"
            >
              <Image src="/logo.png" alt="OpsRadar" width={16} height={16} className="h-4 w-auto rounded-[3px]" />
              OpsRadar
            </Link>
            <span className="text-[var(--color-border-strong)] text-caption">/</span>
            <span className="text-caption text-[var(--color-fg-muted)]">Admin</span>

            {/* Sub-nav */}
            <span className="text-[var(--color-border-strong)] text-caption ml-2">/</span>
            <Link
              href="/admin/data"
              className="text-caption text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)] inline-flex items-center gap-1"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="1" y="5.5" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="1" y="10" width="10" height="1" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              Data
            </Link>
          </div>

          {/* Right: KPI strip + sign out */}
          <div className="flex items-center gap-5 shrink-0">
            {/* Total audits KPI */}
            <div className="text-right hidden sm:block">
              <p className="text-label text-[var(--color-fg-subtle)]">Total Audits</p>
              <p className="font-mono text-h4 font-bold leading-tight text-[var(--color-primary)] tabular-nums">{audits.length}</p>
            </div>

            {audits.length > 0 && (
              <>
                <div className="w-px h-8 bg-[var(--color-border)] hidden sm:block" />
                {/* Avg readiness KPI */}
                <div className="text-right hidden sm:block">
                  <p className="text-label text-[var(--color-fg-subtle)]">Avg Readiness</p>
                  <p
                    className="font-mono text-h4 font-bold leading-tight tabular-nums"
                    style={{ color: scoreColor(avgScore) }}
                  >
                    {avgScore}
                    <span className="text-body-sm font-normal text-[var(--color-fg-subtle)]">/100</span>
                  </p>
                </div>
              </>
            )}

            <div className="w-px h-8 bg-[var(--color-border)]" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-serif text-h2 tracking-[-0.02em] text-[var(--color-fg)]">
            Audit Dashboard
          </h1>
          <p className="mt-1 text-body text-[var(--color-fg-muted)]">
            {audits.length > 0
              ? `${audits.length} audit${audits.length !== 1 ? 's' : ''} submitted — operator view`
              : 'No audits submitted yet.'}
          </p>
        </div>

        {/* ── Funnel section ── */}
        {funnelData && funnelData.totalSessions > 0 && (
          <section className="mb-10 p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-baseline justify-between mb-5 gap-4 flex-wrap">
              <div>
                <h2 className="text-h4 text-[var(--color-fg)]">Audit Funnel</h2>
                <p className="text-body-sm text-[var(--color-fg-subtle)] mt-0.5">
                  Last 30 days · {funnelData.totalSessions} sessions · {funnelData.completionRate}% completion rate
                </p>
              </div>
              {funnelData.biggestDropPct > 0 && (
                <div className="text-right">
                  <p className="text-label text-[var(--color-fg-subtle)]">Biggest drop</p>
                  <p className="text-body-sm font-semibold text-[var(--color-danger,#F87171)] font-mono">
                    Step {funnelData.biggestDropStep - 1} → {funnelData.biggestDropStep} ({funnelData.biggestDropPct}%)
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {funnelData.funnel.map((row) => {
                const isDrop = row.step === funnelData.biggestDropStep
                return (
                  <div key={row.step} className="flex items-center gap-3 text-body-sm">
                    <span className="w-8 text-[var(--color-fg-subtle)] font-mono text-caption shrink-0">S{row.step}</span>
                    <span className="w-32 text-[var(--color-fg-muted)] truncate shrink-0">{row.label}</span>
                    <div className="flex-1 h-5 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] overflow-hidden">
                      <div
                        className="h-full transition-[width] duration-[var(--duration-base)]"
                        style={{
                          width: `${row.percent}%`,
                          background: isDrop
                            ? 'color-mix(in srgb, var(--color-danger, #F87171) 22%, transparent)'
                            : 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
                          borderRight: isDrop
                            ? '2px solid var(--color-danger, #F87171)'
                            : '2px solid var(--color-primary)',
                        }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono text-caption tabular-nums text-[var(--color-fg-muted)] shrink-0">
                      {row.reached} ({row.percent}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Search ── */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-fg-faint)]"
            width="15" height="15" viewBox="0 0 16 16" fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by company, email, or contact name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2 h-9 rounded-[var(--radius)] text-body bg-[var(--color-surface)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)] outline-none transition-[border-color] duration-[var(--duration-fast)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-faint)] hover:text-[var(--color-fg-muted)] transition-colors duration-[var(--duration-fast)]"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {query && (
          <p className="text-body-sm text-[var(--color-fg-muted)] mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
        )}

        {/* ── Empty states ── */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-[var(--color-fg-subtle)]">
            <p className="text-body">{query ? 'No audits match your search.' : 'No audits yet.'}</p>
          </div>
        )}

        {/* ── Table header ── */}
        {filtered.length > 0 && (
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_90px_90px_60px_70px] gap-4 px-4 mb-2">
            {['Date', 'Company', 'Contact', 'Industry', 'Team', 'Score', 'Waste'].map(h => (
              <p key={h} className="text-label text-[var(--color-fg-subtle)]">{h}</p>
            ))}
          </div>
        )}

        {/* ── Audit rows ── */}
        <div className="space-y-2">
          {filtered.map((audit) => {
            const score = readinessScore(audit.result)
            const waste = annualWaste(audit.result)
            const isOpen = expandedId === audit.id
            const color = scoreColor(score)

            return (
              <div
                key={audit.id}
                className={`rounded-[var(--radius-md)] overflow-hidden transition-[border-color,background-color] duration-[var(--duration-fast)] ${
                  isOpen
                    ? 'bg-[var(--color-surface)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <button onClick={() => toggleRow(audit.id)} className="w-full text-left px-4 py-4">
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_90px_90px_60px_70px] gap-4 items-center">
                    <p className="text-body-sm text-[var(--color-fg-muted)] tabular-nums font-mono">{fmtDate(audit.created_at)}</p>
                    <p className="text-body-sm font-medium text-[var(--color-fg)] truncate">{audit.company}</p>
                    <div className="min-w-0">
                      <p className="text-body-sm text-[var(--color-fg)] truncate">{audit.name}</p>
                      <p className="text-caption text-[var(--color-fg-subtle)] truncate">{audit.email}</p>
                    </div>
                    <p className="text-body-sm text-[var(--color-fg-muted)] truncate">{audit.answers?.agencyType ?? '—'}</p>
                    <p className="text-body-sm text-[var(--color-fg-muted)] truncate">{audit.answers?.teamSize ?? '—'}</p>
                    <p className="font-mono text-body-sm font-bold tabular-nums" style={{ color }}>{score}</p>
                    <p className="font-mono text-body-sm font-semibold text-[var(--color-success,#34D399)] tabular-nums">{fmtMoney(waste)}</p>
                  </div>

                  {/* Mobile row */}
                  <div className="sm:hidden flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body font-medium text-[var(--color-fg)] truncate">{audit.company}</p>
                      <p className="text-body-sm text-[var(--color-fg-muted)] mt-0.5">{audit.name} · {audit.email}</p>
                      <p className="text-caption text-[var(--color-fg-subtle)] mt-0.5 font-mono">{fmtDate(audit.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-h4 font-bold tabular-nums" style={{ color }}>{score}</p>
                      <p className="text-caption text-[var(--color-success,#34D399)] font-semibold font-mono tabular-nums mt-0.5">{fmtMoney(waste)}</p>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="flex justify-end mt-1 sm:mt-0">
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className="text-[var(--color-fg-faint)] transition-transform duration-[var(--duration-fast)]"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      aria-hidden="true"
                    >
                      <path d="m2 5 5 5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 border-t border-[var(--color-border)]">
                    <AuditDetail audit={audit} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
