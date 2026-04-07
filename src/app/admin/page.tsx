'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'  
import { Button } from '../../components/ui/button'  

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
}

// Rest of your login component logic continues here...
  opportunities?: Array<{
    rank: number
    title: string
    hard_truth?: string
    problem?: string
    solution: string
    monthly_savings?: number
    annual_savings?: number
    hours_saved_weekly: number
    difficulty: string
    tools_involved?: string[]
  }>
  tools_analysis?: {
    current_stack_rating?: number
    biggest_friction_point?: string
    recommended_additions?: string[]
    missing_integrations?: string[]
  }
}
export const dynamic = 'force-dynamic'
type AuditRow = {
  id: string
  created_at: string
  name: string
  email: string
  company: string
  answers: Answers
  result: AuditResult
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readinessScore(r: AuditResult): number {
  return r.automation_readiness_score ?? r.summary?.automation_readiness_score ?? 0
}

function annualWaste(r: AuditResult): number {
  return r.estimated_annual_waste ?? r.summary?.total_annual_cost_savings ?? 0
}

function scoreColor(score: number): string {
  if (score >= 60) return '#10b981'
  if (score >= 30) return '#f59e0b'
  return '#ef4444'
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)      return `$${(n / 1000).toFixed(0)}K`
  return n > 0 ? `$${n.toLocaleString()}` : '—'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function diffBadge(d: string) {
  const map: Record<string, { text: string; color: string }> = {
    easy:    { text: 'Easy',    color: '#10b981' },
    medium:  { text: 'Medium',  color: '#f59e0b' },
    complex: { text: 'Complex', color: '#ef4444' },
  }
  return map[d] ?? { text: d, color: '#6b7280' }
}

// ─── Expanded row detail ──────────────────────────────────────────────────────

function AuditDetail({ audit }: { audit: AuditRow }) {
  const { answers, result, id } = audit
  const opps   = result.opportunities ?? []
  const tools  = result.tools_analysis

  return (
    <div className="mt-4 space-y-5 text-[13px]">

      {/* Executive summary */}
      {result.executive_summary && (
        <div
          className="p-4 rounded-[12px] bg-primary/5 border border-primary/15"
        >
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary mb-2">Executive Summary</p>
          <p className="text-on-surface-variant leading-[1.7]">{result.executive_summary}</p>
        </div>
      )}

      {/* Answers submitted */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-3">Form Answers</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            ['Industry',        answers.agencyType],
            ['Team Size',       answers.teamSize],
            ['Revenue',         answers.revenue],
            ['Tools Used',      answers.tools],
            ['Services',        answers.services],
            ['Time Wasters',    answers.timeWasters],
            ['Manual Processes',answers.manualProcesses],
            ['Falls Through',   answers.fallThrough],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div
              key={label as string}
              className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant/10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant/50 mb-1">{label}</p>
              <p className="text-on-surface-variant leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      {opps.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-3">
            Opportunities ({opps.length})
          </p>
          <div className="space-y-2">
            {opps.map((opp) => {
              const diff  = diffBadge(opp.difficulty)
              const money = opp.monthly_savings ?? (opp.annual_savings ? Math.round(opp.annual_savings / 12) : 0)
              return (
                <div
                  key={opp.rank}
                  className="flex items-start gap-3 p-3 rounded-[10px] bg-surface-container-low border border-outline-variant/10"
                >
                  <span
                    className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: 'rgba(173,198,255,0.1)', border: '1px solid rgba(173,198,255,0.25)', color: '#adc6ff' }}
                  >
                    {opp.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface leading-snug">{opp.title}</p>
                    {(opp.hard_truth ?? opp.problem) && (
                      <p className="text-on-surface-variant mt-0.5 leading-relaxed line-clamp-2">
                        {opp.hard_truth ?? opp.problem}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
                      style={{ background: `${diff.color}15`, border: `1px solid ${diff.color}35`, color: diff.color }}
                    >
                      {diff.text}
                    </span>
                    <span className="text-[11px] font-bold text-on-surface-variant tabular-nums">
                      {opp.hours_saved_weekly}h/wk
                    </span>
                    {money > 0 && (
                      <span className="text-[11px] font-bold text-[#10b981] tabular-nums">
                        {fmtMoney(money)}/mo
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stack friction point */}
      {tools?.biggest_friction_point && (
        <div
          className="p-4 rounded-[12px]"
          style={{ background: 'rgba(255,183,134,0.04)', border: '1px solid rgba(255,183,134,0.15)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-tertiary mb-1.5">Biggest Friction Point</p>
          <p className="text-on-surface-variant leading-relaxed">{tools.biggest_friction_point}</p>
        </div>
      )}

      {/* View full report link */}
      <div className="flex items-center justify-end pt-2">
        <Link
          href={`/results?id=${id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-primary/8 border border-primary/20 text-primary hover:bg-primary/15 transition-colors"
        >
          View Full Report
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M6.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [audits,    setAudits]    = useState<AuditRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [query,     setQuery]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('audits')
      .select('id, created_at, name, email, company, answers, result')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setAudits((data ?? []) as AuditRow[])
        setLoading(false)
      })
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

  // ── Loading / error ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#adc6ff', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center text-error text-[14px]">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="border-b border-outline-variant/10 px-6 py-5">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/" className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                <Image src="/logo.png" alt="OpsRadar" width={18} height={18} className="h-[18px] w-auto rounded-[4px]" />
                OpsRadar
              </Link>
              <span className="text-on-surface-variant/20">/</span>
              <span className="text-[11px] text-on-surface-variant">Admin</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Link
                href="/admin/data"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[7px] text-[11px] font-semibold text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high border border-transparent hover:border-outline-variant/15 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="1" y="5.5" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="1" y="10" width="10" height="1" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Data Management
              </Link>
            </div>
            <h1 className="font-headline font-bold text-[22px] tracking-[-0.02em]">Audit Dashboard</h1>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5">
            <Button
              onClick={handleSignOut}
              className="h-auto px-3 py-2 rounded-[8px] text-[12px] font-semibold bg-surface-container border border-outline-variant/15 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            >
              Sign out
            </Button>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant/50">Total Audits</p>
              <p className="font-headline text-[28px] font-extrabold leading-none text-primary tabular-nums">
                {audits.length}
              </p>
            </div>
            {audits.length > 0 && (
              <>
                <div className="w-px h-10 bg-outline-variant/20" />
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant/50">Avg Readiness</p>
                  <p className="font-headline text-[28px] font-extrabold leading-none tabular-nums"
                    style={{ color: scoreColor(Math.round(audits.reduce((s, a) => s + readinessScore(a.result), 0) / audits.length)) }}>
                    {Math.round(audits.reduce((s, a) => s + readinessScore(a.result), 0) / audits.length)}
                    <span className="text-[14px] font-normal text-on-surface-variant/40">/100</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="max-w-[1100px] mx-auto px-6 py-8">

        {/* Search bar */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="15" height="15" viewBox="0 0 16 16" fill="none"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by company, email, or contact name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-[10px] text-[14px] text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all duration-200 bg-surface-container border border-outline-variant/15"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(173,198,255,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(66,71,84,0.15)')}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Results count when searching */}
        {query && (
          <p className="text-[12px] text-on-surface-variant mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-on-surface-variant/40">
            <p className="text-[15px]">{query ? 'No audits match your search.' : 'No audits yet.'}</p>
          </div>
        )}

        {/* Column headers */}
        {filtered.length > 0 && (
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_90px_90px_60px_60px] gap-4 px-4 mb-2">
            {['Date', 'Company', 'Contact', 'Industry', 'Team', 'Score', 'Waste'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-[1.8px] text-on-surface-variant/50">{h}</p>
            ))}
          </div>
        )}

        {/* Audit rows */}
        <div className="space-y-2">
          {filtered.map((audit) => {
            const score   = readinessScore(audit.result)
            const waste   = annualWaste(audit.result)
            const isOpen  = expandedId === audit.id
            const color   = scoreColor(score)

            return (
              <div
                key={audit.id}
                className={`rounded-[14px] overflow-hidden transition-all duration-200 ${isOpen
                  ? 'bg-surface-container-high border border-primary/20'
                  : 'bg-surface-container border border-outline-variant/10 hover:border-outline-variant/20'
                }`}
              >
                {/* Row */}
                <button
                  onClick={() => toggleRow(audit.id)}
                  className="w-full text-left px-4 py-4"
                >
                  {/* Desktop grid */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_90px_90px_60px_60px] gap-4 items-center">
                    <p className="text-[12px] text-on-surface-variant tabular-nums">{fmtDate(audit.created_at)}</p>
                    <p className="text-[13px] font-semibold text-on-surface truncate">{audit.company}</p>
                    <div className="min-w-0">
                      <p className="text-[13px] text-on-surface truncate">{audit.name}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{audit.email}</p>
                    </div>
                    <p className="text-[12px] text-on-surface-variant truncate">{audit.answers?.agencyType ?? '—'}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">{audit.answers?.teamSize ?? '—'}</p>
                    <p className="font-headline text-[15px] font-bold tabular-nums" style={{ color }}>{score}</p>
                    <p className="text-[12px] font-semibold text-tertiary tabular-nums">{fmtMoney(waste)}</p>
                  </div>

                  {/* Mobile layout */}
                  <div className="sm:hidden flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-on-surface truncate">{audit.company}</p>
                      <p className="text-[12px] text-on-surface-variant mt-0.5">{audit.name} · {audit.email}</p>
                      <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{fmtDate(audit.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-headline text-[18px] font-bold tabular-nums" style={{ color }}>{score}</p>
                      <p className="text-[11px] text-tertiary font-semibold tabular-nums mt-0.5">{fmtMoney(waste)}</p>
                    </div>
                  </div>

                  {/* Expand chevron */}
                  <div className="flex justify-end mt-1 sm:mt-0">
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className="transition-transform duration-200 text-on-surface-variant/30"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path d="m2 5 5 5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-5 border-t border-outline-variant/10">
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
