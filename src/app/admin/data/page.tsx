'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '<npm>/components/ui/button'
import { Input } from '<npm>/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '<npm>/components/ui/dialog'
import { fetchAdminApi } from '../../../lib/admin-api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

type TableName = 'audits' | 'chat_conversations' | 'build_requests'

type TableMeta = {
  name: TableName
  label: string
  color: string
  previewFields: string[]
}

type AuditSessionRow = {
  id: string
  session_id?: string | null
  step_reached?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type AuditEventRow = {
  id: string
  session_id?: string | null
  audit_id?: string | null
  event_name?: string | null
  step?: number | null
  source?: string | null
  section_id?: string | null
  report_stage?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

type AdminDataResponse = {
  audits: Record<string, unknown>[]
  chats: Record<string, unknown>[]
  builds: Record<string, unknown>[]
  auditSessions: AuditSessionRow[]
  auditEvents: AuditEventRow[]
}

const TABLES: TableMeta[] = [
  {
    name: 'audits',
    label: 'Audits',
    color: '#60a5fa',
    previewFields: ['name', 'email', 'company', 'created_at'],
  },
  {
    name: 'chat_conversations',
    label: 'Chat Conversations',
    color: '#34d399',
    previewFields: ['visitor_name', 'visitor_email', 'created_at'],
  },
  {
    name: 'build_requests',
    label: 'Build Requests',
    color: '#f59e0b',
    previewFields: ['name', 'email', 'automation_title', 'created_at'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function downloadJSON(data: unknown[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function rowPreview(row: Record<string, unknown>, fields: string[]): string {
  return fields
    .map(f => {
      const v = row[f]
      if (!v) return null
      if (f === 'created_at') return fmtDate(v as string)
      return String(v)
    })
    .filter(Boolean)
    .join(' · ')
}

function msgCount(row: Record<string, unknown>): number {
  const msgs = row.messages
  if (!Array.isArray(msgs)) return 0
  return msgs.length
}

function formatLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function sessionKey(session: AuditSessionRow): string {
  return session.session_id || session.id
}

function eventKey(event: AuditEventRow): string {
  return event.audit_id || event.session_id || event.id
}

function uniqueCount(values: string[]): number {
  return new Set(values.filter(Boolean)).size
}

function countSessionsAtOrAbove(sessions: AuditSessionRow[], step: number): number {
  return uniqueCount(
    sessions
      .filter((session) => (session.step_reached ?? 0) >= step)
      .map(sessionKey),
  )
}

function countUniqueEvents(events: AuditEventRow[], eventName: string): number {
  return uniqueCount(
    events
      .filter((event) => event.event_name === eventName)
      .map(eventKey),
  )
}

function summarizeBy<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>()

  for (const item of items) {
    const key = getKey(item)?.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

function percentage(value: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// ─── Confirmation modal ────────────────────────────────────────────────────

function ConfirmModal({
  open, title, description, onConfirm, onCancel, loading,
}: {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-sm bg-surface-container border border-outline-variant/15 text-on-surface rounded-[16px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-[18px] font-bold text-on-surface">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-on-surface-variant leading-[1.6] mt-1">{description}</p>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-auto py-2.5 rounded-[10px] text-[13px] border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-auto py-2.5 rounded-[10px] text-[13px] bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Row detail modal ──────────────────────────────────────────────────────

function RowModal({
  row, onClose,
}: {
  row: Record<string, unknown> | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!row} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-surface-container border border-outline-variant/15 text-on-surface rounded-[16px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-[16px] font-bold text-on-surface">Row Details</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3 mt-2">
            {Object.entries(row).map(([key, val]) => (
              <div key={key} className="rounded-[10px] bg-surface-container-low border border-outline-variant/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-on-surface-variant/50 mb-1">{key}</p>
                <pre className="text-[12px] text-on-surface-variant whitespace-pre-wrap break-all leading-[1.6] font-mono">
                  {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '—')}
                </pre>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FunnelStatCard({
  label,
  value,
  detail,
  color,
}: {
  label: string
  value: number
  detail: string
  color: string
}) {
  return (
    <div
      className="rounded-[14px] p-5 border"
      style={{ background: `${color}08`, borderColor: `${color}20` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[1.8px] mb-2" style={{ color }}>{label}</p>
      <p className="font-headline text-[34px] font-extrabold leading-none tabular-nums text-on-surface">{value}</p>
      <p className="text-[11px] text-on-surface-variant/55 mt-2">{detail}</p>
    </div>
  )
}

// ─── Table section ─────────────────────────────────────────────────────────

function TableSection({
  meta,
  rows,
  count,
  onDelete,
  onRefresh,
}: {
  meta: TableMeta
  rows: Record<string, unknown>[]
  count: number
  onDelete: (id: string) => Promise<void>
  onRefresh: () => void
}) {
  const [query, setQuery]         = useState('')
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const filtered = query.trim()
    ? rows.filter(r =>
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase())
      )
    : rows

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    await onDelete(confirmId)
    setDeleting(false)
    setConfirmId(null)
    onRefresh()
  }

  return (
    <div className="rounded-[16px] bg-surface-container border border-outline-variant/10 overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
          />
          <h3 className="font-headline font-bold text-[15px] text-on-surface">{meta.label}</h3>
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums"
            style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
          >
            {count} rows
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-outline-variant/10">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${meta.label.toLowerCase()}…`}
          className="h-9 text-[13px] bg-surface-container-low border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 rounded-[8px]"
        />
      </div>

      {/* Rows */}
      <div className="divide-y divide-outline-variant/8 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center py-8 text-[13px] text-on-surface-variant/40">No rows found</p>
        )}
        {filtered.map(row => {
          const id = row.id as string
          const preview = rowPreview(row, meta.previewFields)
          return (
            <div
              key={id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-surface-container-high transition-colors group"
            >
              <button
                onClick={() => setSelectedRow(row)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-[13px] text-on-surface truncate">{preview}</p>
                <p className="text-[11px] text-on-surface-variant/50 font-mono truncate mt-0.5">{id}</p>
              </button>
              {meta.name === 'chat_conversations' && (
                <span className="text-[11px] text-on-surface-variant/50 shrink-0">
                  {msgCount(row)} msgs
                </span>
              )}
              <button
                onClick={() => setConfirmId(id)}
                className="shrink-0 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold text-red-400 bg-red-500/0 border border-red-500/0 hover:bg-red-500/10 hover:border-red-500/25 transition-all opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          )
        })}
      </div>

      <RowModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      <ConfirmModal
        open={!!confirmId}
        title="Delete row?"
        description="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
      />
    </div>
  )
}

// ─── Cleanup card ─────────────────────────────────────────────────────────

function CleanupCard({
  label,
  description,
  color,
  onRun,
}: {
  label: string
  description: string
  color: string
  onRun: () => Promise<{ count: number }>
}) {
  const [confirm, setConfirm]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    try {
      const { count } = await onRun()
      setConfirm(false)
      setResult(`Deleted ${count} row${count !== 1 ? 's' : ''}`)
      setTimeout(() => setResult(null), 4000)
    } catch (error) {
      console.error('[admin-data] cleanup failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-[14px] p-4 border"
      style={{ background: `${color}06`, borderColor: `${color}20` }}
    >
      <p className="text-[13px] font-semibold text-on-surface mb-1">{label}</p>
      <p className="text-[12px] text-on-surface-variant/60 mb-3 leading-relaxed">{description}</p>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setConfirm(true)}
          className="h-auto px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
          style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}
        >
          Run cleanup
        </Button>
        {result && (
          <span className="text-[12px] text-emerald-400">{result}</span>
        )}
      </div>

      <ConfirmModal
        open={confirm}
        title={label}
        description={`${description} This cannot be undone.`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(false)}
        loading={loading}
      />
    </div>
  )
}

// ─── Days input cleanup card ───────────────────────────────────────────────

function OldAuditsCard({ onRefresh }: { onRefresh: () => void }) {
  const [days, setDays]       = useState(30)
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    try {
      const data = await fetchAdminApi<{ count: number }>('/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-old-audits', days }),
      })
      setResult(`Deleted ${data.count ?? 0} row${(data.count ?? 0) !== 1 ? 's' : ''}`)
      setTimeout(() => setResult(null), 4000)
      onRefresh()
    } catch (error) {
      console.error('[admin-data] old audit cleanup failed:', error)
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  return (
    <div className="rounded-[14px] p-4 border border-outline-variant/15 bg-surface-container-low">
      <p className="text-[13px] font-semibold text-on-surface mb-1">Delete audits older than X days</p>
      <p className="text-[12px] text-on-surface-variant/60 mb-3">Removes audits created before the cutoff.</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="w-20 h-8 text-[13px] bg-surface-container border-outline-variant/15 text-on-surface rounded-[8px] tabular-nums"
        />
        <span className="text-[12px] text-on-surface-variant/60">days</span>
        <Button
          onClick={() => setConfirm(true)}
          className="h-8 px-3 rounded-[8px] text-[12px] font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
        >
          Run cleanup
        </Button>
        {result && <span className="text-[12px] text-emerald-400">{result}</span>}
      </div>

      <ConfirmModal
        open={confirm}
        title={`Delete audits older than ${days} days?`}
        description={`All audits created more than ${days} days ago will be permanently deleted.`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(false)}
        loading={loading}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDataPage() {
  const router = useRouter()

  // Table data
  const [audits, setAudits]               = useState<Record<string, unknown>[]>([])
  const [chats,  setChats]                = useState<Record<string, unknown>[]>([])
  const [builds, setBuilds]               = useState<Record<string, unknown>[]>([])
  const [auditSessions, setAuditSessions] = useState<AuditSessionRow[]>([])
  const [auditEvents, setAuditEvents]     = useState<AuditEventRow[]>([])
  const [counts, setCounts]               = useState({ audits: 0, chat_conversations: 0, build_requests: 0 })
  const [loading, setLoading]             = useState(true)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminApi<AdminDataResponse>('/api/admin/data')
      const a = data.audits ?? []
      const c = data.chats ?? []
      const b = data.builds ?? []
      const s = data.auditSessions ?? []
      const e = data.auditEvents ?? []

      setAudits(a)
      setChats(c)
      setBuilds(b)
      setAuditSessions(s)
      setAuditEvents(e)
      setCounts({ audits: a.length, chat_conversations: c.length, build_requests: b.length })
    } catch (error) {
      console.error('[admin-data] failed to load:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadAll])

  // ── Delete helpers ────────────────────────────────────────────────────────
  async function deleteRow(table: TableName, id: string) {
    await fetchAdminApi('/api/admin/data', {
      method: 'DELETE',
      body: JSON.stringify({ table, id }),
    })
  }

  async function handleSignOut() {
    await fetch('/api/admin-auth', { method: 'DELETE' })
    router.replace('/admin/login')
    router.refresh()
  }

  const funnel = useMemo(() => {
    const started = uniqueCount(auditSessions.map(sessionKey))
    const reachedStack = countSessionsAtOrAbove(auditSessions, 4)
    const reachedAutomation = countSessionsAtOrAbove(auditSessions, 10)
    const leadModalOpened = countUniqueEvents(auditEvents, 'lead_modal_opened')
    const auditSubmitted = Math.max(countUniqueEvents(auditEvents, 'audit_submitted'), counts.audits)
    const resultsViewed = countUniqueEvents(auditEvents, 'results_viewed')
    const unlockIntent = countUniqueEvents(auditEvents, 'unlock_cta_clicked')
    const unlockEmailSent = countUniqueEvents(auditEvents, 'unlock_email_sent')
    const strategyCalls = countUniqueEvents(auditEvents, 'strategy_call_clicked')
    const buildRequestSuccess = Math.max(countUniqueEvents(auditEvents, 'build_request_success'), counts.build_requests)

    const stageRows = [
      { label: 'Started Audit', count: started, color: '#60a5fa' },
      { label: 'Reached Stack Questions', count: reachedStack, color: '#38bdf8' },
      { label: 'Reached Core Pain Step', count: reachedAutomation, color: '#22c55e' },
      { label: 'Opened Lead Modal', count: leadModalOpened, color: '#a78bfa' },
      { label: 'Submitted Audit', count: auditSubmitted, color: '#f59e0b' },
      { label: 'Viewed Results', count: resultsViewed, color: '#fb7185' },
      { label: 'Unlock Email Sent', count: unlockEmailSent, color: '#34d399' },
      { label: 'Strategy Call Clicked', count: strategyCalls, color: '#c084fc' },
      { label: 'Build Request Sent', count: buildRequestSuccess, color: '#f97316' },
    ]

    const topSections = summarizeBy(
      auditEvents.filter((event) => event.event_name === 'report_section_viewed'),
      (event) => event.section_id,
    ).slice(0, 8)

    const unlockSources = summarizeBy(
      auditEvents.filter((event) => event.event_name === 'unlock_cta_clicked'),
      (event) => event.source,
    ).slice(0, 6)

    const strategySources = summarizeBy(
      auditEvents.filter((event) => event.event_name === 'strategy_call_clicked'),
      (event) => event.source,
    ).slice(0, 6)

    const buildSources = summarizeBy(
      auditEvents.filter((event) => event.event_name === 'build_request_opened'),
      (event) => event.source,
    ).slice(0, 6)

    return {
      started,
      auditSubmitted,
      resultsViewed,
      unlockIntent,
      unlockEmailSent,
      strategyCalls,
      buildRequestSuccess,
      stageRows,
      topSections,
      unlockSources,
      strategySources,
      buildSources,
    }
  }, [auditEvents, auditSessions, counts.audits, counts.build_requests])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#adc6ff', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-outline-variant/10 px-6 py-5 sticky top-0 z-10 bg-surface-container-lowest/90 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/" className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                <Image src="/logo.png" alt="OpsRadar" width={18} height={18} className="h-[18px] w-auto rounded-[4px]" />
                OpsRadar
              </Link>
              <span className="text-on-surface-variant/20">/</span>
              <Link href="/admin" className="text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Admin</Link>
              <span className="text-on-surface-variant/20">/</span>
              <span className="text-[11px] text-on-surface-variant">Data</span>
            </div>
            <h1 className="font-headline font-bold text-[22px] tracking-[-0.02em]">Data Management</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={loadAll}
              className="h-auto px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-surface-container border border-outline-variant/15 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            >
              Refresh
            </Button>
            <Button
              onClick={handleSignOut}
              className="h-auto px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-surface-container border border-outline-variant/15 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-10">

        {/* ── 1. Table Overview ─────────────────────────────────────────────── */}
        <section>
          <SectionLabel text="Table Overview" />

          {/* Count cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {TABLES.map(t => (
              <div
                key={t.name}
                className="rounded-[14px] p-5 border"
                style={{ background: `${t.color}06`, borderColor: `${t.color}20` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[1.8px] mb-2" style={{ color: t.color }}>{t.label}</p>
                <p className="font-headline text-[36px] font-extrabold leading-none tabular-nums" style={{ color: t.color }}>
                  {counts[t.name as keyof typeof counts]}
                </p>
                <p className="text-[11px] text-on-surface-variant/50 mt-1">total rows</p>
              </div>
            ))}
          </div>

          {/* Recent 5 per table */}
          <div className="grid gap-4">
            {TABLES.map(t => {
              const rows = t.name === 'audits' ? audits
                : t.name === 'chat_conversations' ? chats
                : builds
              const recent = rows.slice(0, 5)
              return (
                <div key={t.name} className="rounded-[14px] border border-outline-variant/10 overflow-hidden bg-surface-container">
                  <div className="flex items-center gap-2.5 px-5 py-3 border-b border-outline-variant/10">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                    <p className="text-[12px] font-bold text-on-surface-variant">{t.label} — most recent 5</p>
                  </div>
                  <div className="divide-y divide-outline-variant/8">
                    {recent.length === 0 && (
                      <p className="px-5 py-4 text-[12px] text-on-surface-variant/40">No data yet</p>
                    )}
                    {recent.map(row => (
                      <div key={row.id as string} className="flex items-center gap-3 px-5 py-3">
                        <p className="flex-1 text-[12px] text-on-surface truncate">
                          {rowPreview(row, t.previewFields)}
                        </p>
                        {t.name === 'chat_conversations' && (
                          <span className="text-[11px] text-on-surface-variant/40 shrink-0">{msgCount(row)} msgs</span>
                        )}
                        <p className="text-[11px] font-mono text-on-surface-variant/30 shrink-0 hidden sm:block">
                          {(row.id as string).slice(0, 8)}…
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 2. Funnel Intelligence ───────────────────────────────────────── */}
        <section>
          <SectionLabel text="Funnel Intelligence" />

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <FunnelStatCard
              label="Audit Starts"
              value={funnel.started}
              detail={`${funnel.auditSubmitted} finished the intake`}
              color="#60a5fa"
            />
            <FunnelStatCard
              label="Results Views"
              value={funnel.resultsViewed}
              detail={`${percentage(funnel.resultsViewed, Math.max(funnel.auditSubmitted, 1))} of submitted audits reached the report`}
              color="#38bdf8"
            />
            <FunnelStatCard
              label="Unlock Intent"
              value={funnel.unlockIntent}
              detail={`${funnel.unlockEmailSent} email unlocks sent`}
              color="#a78bfa"
            />
            <FunnelStatCard
              label="Strategy Calls"
              value={funnel.strategyCalls}
              detail={`${percentage(funnel.strategyCalls, Math.max(funnel.resultsViewed, 1))} of report viewers clicked a call CTA`}
              color="#c084fc"
            />
            <FunnelStatCard
              label="Build Requests"
              value={funnel.buildRequestSuccess}
              detail={`${percentage(funnel.buildRequestSuccess, Math.max(funnel.resultsViewed, 1))} of report viewers asked for a build`}
              color="#f97316"
            />
            <FunnelStatCard
              label="Lead Modal Opens"
              value={funnel.stageRows.find((row) => row.label === 'Opened Lead Modal')?.count ?? 0}
              detail="Useful for seeing whether the final capture step is convincing enough"
              color="#f59e0b"
            />
          </div>

          <div className="rounded-[16px] bg-surface-container border border-outline-variant/10 p-5 mb-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[13px] font-semibold text-on-surface">Conversion Ladder</p>
                <p className="text-[12px] text-on-surface-variant/60 mt-1">Shows where people stall from intake to commercial intent.</p>
              </div>
              <p className="text-[11px] text-on-surface-variant/40">
                Based on `audit_sessions`, `audit_events`, and submitted records
              </p>
            </div>

            <div className="space-y-3">
              {funnel.stageRows.map((row, index) => {
                const previous = index === 0 ? row.count : funnel.stageRows[index - 1]?.count ?? row.count
                const width = funnel.stageRows[0]?.count ? Math.max((row.count / Math.max(funnel.stageRows[0].count, 1)) * 100, row.count > 0 ? 6 : 0) : 0

                return (
                  <div key={row.label} className="rounded-[14px] border border-outline-variant/10 bg-surface-container-low p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[13px] font-medium text-on-surface">{row.label}</p>
                      <div className="text-right">
                        <p className="text-[14px] font-bold tabular-nums text-on-surface">{row.count}</p>
                        <p className="text-[11px] text-on-surface-variant/50">
                          {percentage(row.count, Math.max(previous, 1))} of previous
                        </p>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, background: `linear-gradient(90deg, ${row.color}, ${row.color}bb)` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Top Report Sections',
                subtitle: 'Which blocks people actually reach on the results page',
                rows: funnel.topSections,
                formatter: (key: string) => formatLabel(key),
              },
              {
                title: 'Unlock CTA Sources',
                subtitle: 'Which sections trigger unlock intent',
                rows: funnel.unlockSources,
                formatter: (key: string) => formatLabel(key),
              },
              {
                title: 'Commercial CTA Sources',
                subtitle: 'Where strategy-call and build intent comes from',
                rows: summarizeBy(
                  [
                    ...auditEvents.filter((event) => event.event_name === 'strategy_call_clicked').map((event) => ({ key: `Call · ${event.source ?? 'unknown'}` })),
                    ...auditEvents.filter((event) => event.event_name === 'build_request_opened').map((event) => ({ key: `Quote · ${event.source ?? 'unknown'}` })),
                  ],
                  (entry) => entry.key,
                ).slice(0, 6),
                formatter: (key: string) => key.replace(/\b([a-z])/g, (match) => match.toUpperCase()).replace(/[-_]/g, ' '),
              },
            ].map((card) => (
              <div key={card.title} className="rounded-[16px] bg-surface-container border border-outline-variant/10 p-5">
                <p className="text-[13px] font-semibold text-on-surface">{card.title}</p>
                <p className="text-[12px] text-on-surface-variant/60 mt-1 mb-4">{card.subtitle}</p>
                <div className="space-y-3">
                  {card.rows.length === 0 && (
                    <p className="text-[12px] text-on-surface-variant/40">No tracked events yet.</p>
                  )}
                  {card.rows.map((row) => (
                    <div key={row.key} className="rounded-[12px] bg-surface-container-low border border-outline-variant/8 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12px] text-on-surface pr-4">{card.formatter(row.key)}</p>
                        <span className="text-[12px] font-bold tabular-nums text-secondary shrink-0">{row.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Test Data Cleanup ──────────────────────────────────────────── */}
        <section>
          <SectionLabel text="Test Data Cleanup" />
          <div className="grid sm:grid-cols-2 gap-3">

            <CleanupCard
              label='Delete all test audits'
              description='Removes audits where email or company_name contains "test".'
              color="#ef4444"
              onRun={async () => {
                const result = await fetchAdminApi<{ count: number }>('/api/admin/data', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'delete-test-audits' }),
                })
                await loadAll()
                return { count: result.count ?? 0 }
              }}
            />

            <CleanupCard
              label="Delete empty chat conversations"
              description="Removes conversations with fewer than 2 messages."
              color="#f59e0b"
              onRun={async () => {
                const result = await fetchAdminApi<{ count: number }>('/api/admin/data', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'delete-empty-chat-conversations' }),
                })
                await loadAll()
                return { count: result.count ?? 0 }
              }}
            />

            <div className="sm:col-span-2">
              <OldAuditsCard onRefresh={loadAll} />
            </div>
          </div>
        </section>

        {/* ── 4. Individual Row Management ──────────────────────────────────── */}
        <section>
          <SectionLabel text="Row Management" />
          <div className="space-y-4">
            <TableSection
              meta={TABLES[0]}
              rows={audits}
              count={counts.audits}
              onDelete={id => deleteRow('audits', id)}
              onRefresh={loadAll}
            />
            <TableSection
              meta={TABLES[1]}
              rows={chats}
              count={counts.chat_conversations}
              onDelete={id => deleteRow('chat_conversations', id)}
              onRefresh={loadAll}
            />
            <TableSection
              meta={TABLES[2]}
              rows={builds}
              count={counts.build_requests}
              onDelete={id => deleteRow('build_requests', id)}
              onRefresh={loadAll}
            />
          </div>
        </section>

        {/* ── 5. Export ─────────────────────────────────────────────────────── */}
        <section>
          <SectionLabel text="Export" />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => downloadJSON(audits, `audits-${Date.now()}.json`)}
              disabled={audits.length === 0}
              className="h-auto px-5 py-2.5 rounded-[10px] text-[13px] font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 disabled:opacity-40"
            >
              Export audits as JSON
              <span className="ml-2 opacity-50">({audits.length})</span>
            </Button>
            <Button
              onClick={() => downloadJSON(builds, `build-requests-${Date.now()}.json`)}
              disabled={builds.length === 0}
              className="h-auto px-5 py-2.5 rounded-[10px] text-[13px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
            >
              Export build_requests as JSON
              <span className="ml-2 opacity-50">({builds.length})</span>
            </Button>
            <Button
              onClick={() => downloadJSON(auditSessions, `audit-sessions-${Date.now()}.json`)}
              disabled={auditSessions.length === 0}
              className="h-auto px-5 py-2.5 rounded-[10px] text-[13px] font-semibold bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40"
            >
              Export audit_sessions as JSON
              <span className="ml-2 opacity-50">({auditSessions.length})</span>
            </Button>
            <Button
              onClick={() => downloadJSON(auditEvents, `audit-events-${Date.now()}.json`)}
              disabled={auditEvents.length === 0}
              className="h-auto px-5 py-2.5 rounded-[10px] text-[13px] font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-violet-500/20 disabled:opacity-40"
            >
              Export audit_events as JSON
              <span className="ml-2 opacity-50">({auditEvents.length})</span>
            </Button>
          </div>
        </section>

      </main>
    </div>
  )
}

// ─── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50">{text}</p>
      <div className="flex-1 h-px bg-outline-variant/10" />
    </div>
  )
}
