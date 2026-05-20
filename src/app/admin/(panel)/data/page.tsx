'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '<npm>/components/ui/button'
import { Input } from '<npm>/components/ui/input'
import { Badge } from '<npm>/components/ui/badge'
import {
  Table,
  THead,
  TR,
  TH,
  TD,
} from '<npm>/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '<npm>/components/ui/dialog'
import { fetchAdminApi } from '<npm>/lib/admin-api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

type TableName = 'audits' | 'build_requests'

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
  builds: Record<string, unknown>[]
  auditSessions: AuditSessionRow[]
  auditEvents: AuditEventRow[]
}

const TABLES: TableMeta[] = [
  {
    name: 'audits',
    label: 'Audits',
    color: '#818CF8',
    previewFields: ['name', 'email', 'company', 'created_at'],
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
      <DialogContent className="max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-fg)] rounded-[var(--radius-xl)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-h4 font-medium text-[var(--color-fg)]">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-body-sm text-[var(--color-fg-muted)] leading-relaxed mt-1">{description}</p>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-fg)] rounded-[var(--radius-xl)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-h4 font-medium text-[var(--color-fg)]">Row details</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-2 mt-2">
            {Object.entries(row).map(([key, val]) => (
              <div key={key} className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)] p-3">
                <p className="text-label text-[var(--color-fg-subtle)] mb-1">{key}</p>
                <pre className="text-body-sm text-[var(--color-fg-muted)] whitespace-pre-wrap break-all leading-relaxed font-mono">
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

// ─── Stat card ─────────────────────────────────────────────────────────────

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
      className="rounded-[var(--radius-lg)] p-5 border"
      style={{ background: `${color}08`, borderColor: `${color}22` }}
    >
      <p className="text-label mb-2" style={{ color }}>{label}</p>
      <p className="font-serif text-[2rem] font-medium leading-none tabular-nums text-[var(--color-fg)]">{value}</p>
      <p className="text-caption text-[var(--color-fg-subtle)] mt-2 leading-relaxed">{detail}</p>
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
  const [query, setQuery]             = useState('')
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

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
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}60` }}
          />
          <h3 className="font-serif text-h4 font-medium text-[var(--color-fg)]">{meta.label}</h3>
          <Badge
            variant="secondary"
            className="tabular-nums"
            style={{ background: `${meta.color}14`, color: meta.color, borderColor: `${meta.color}28` }}
          >
            {count} rows
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-[var(--color-border)]">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${meta.label.toLowerCase()}…`}
          className="h-8 text-body-sm"
        />
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--color-border)] max-h-[400px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center py-8 text-body-sm text-[var(--color-fg-faint)]">No rows found</p>
        )}
        {filtered.map(row => {
          const id = row.id as string
          const preview = rowPreview(row, meta.previewFields)
          return (
            <div
              key={id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-sunken)]/50 transition-colors group"
            >
              <button
                onClick={() => setSelectedRow(row)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-body-sm text-[var(--color-fg)] truncate">{preview}</p>
                <p className="text-caption text-[var(--color-fg-faint)] font-mono truncate mt-0.5">{id}</p>
              </button>
              <Button
                variant="destructive"
                size="xs"
                onClick={() => setConfirmId(id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </Button>
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
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<string | null>(null)

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
      className="rounded-[var(--radius-lg)] p-4 border"
      style={{ background: `${color}06`, borderColor: `${color}22` }}
    >
      <p className="text-body-sm font-medium text-[var(--color-fg)] mb-1">{label}</p>
      <p className="text-caption text-[var(--color-fg-subtle)] mb-3 leading-relaxed">{description}</p>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => setConfirm(true)}
          className="text-body-sm"
          style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}
        >
          Run cleanup
        </Button>
        {result && (
          <Badge variant="success">{result}</Badge>
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
    <div className="rounded-[var(--radius-lg)] p-4 border border-[var(--color-border)] bg-[var(--color-surface)]">
      <p className="text-body-sm font-medium text-[var(--color-fg)] mb-1">Delete audits older than X days</p>
      <p className="text-caption text-[var(--color-fg-subtle)] mb-3 leading-relaxed">Removes audits created before the cutoff.</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="w-20 h-8 text-body-sm tabular-nums"
        />
        <span className="text-caption text-[var(--color-fg-subtle)]">days</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirm(true)}
        >
          Run cleanup
        </Button>
        {result && <Badge variant="success">{result}</Badge>}
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

// ─── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-label text-[var(--color-fg-subtle)] shrink-0">{text}</p>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDataPage() {
  const [audits, setAudits]               = useState<Record<string, unknown>[]>([])
  const [builds, setBuilds]               = useState<Record<string, unknown>[]>([])
  const [auditSessions, setAuditSessions] = useState<AuditSessionRow[]>([])
  const [auditEvents, setAuditEvents]     = useState<AuditEventRow[]>([])
  const [counts, setCounts]               = useState({ audits: 0, build_requests: 0 })
  const [loading, setLoading]             = useState(true)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminApi<AdminDataResponse>('/api/admin/data')
      const a = data.audits ?? []
      const b = data.builds ?? []
      const s = data.auditSessions ?? []
      const e = data.auditEvents ?? []

      setAudits(a)
      setBuilds(b)
      setAuditSessions(s)
      setAuditEvents(e)
      setCounts({ audits: a.length, build_requests: b.length })
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

  const funnel = useMemo(() => {
    const started = uniqueCount(auditSessions.map(sessionKey))
    const reachedStack = countSessionsAtOrAbove(auditSessions, 4)
    const reachedAutomation = countSessionsAtOrAbove(auditSessions, 10)
    const leadModalOpened = countUniqueEvents(auditEvents, 'lead_modal_opened')
    const auditSubmitted = Math.max(countUniqueEvents(auditEvents, 'audit_submitted'), counts.audits)
    const resultsViewed = countUniqueEvents(auditEvents, 'results_viewed')
    const strategyCalls = countUniqueEvents(auditEvents, 'strategy_call_clicked')
    const buildRequestSuccess = Math.max(countUniqueEvents(auditEvents, 'build_request_success'), counts.build_requests)

    const stageRows = [
      { label: 'Started Audit', count: started, color: '#818CF8' },
      { label: 'Reached Stack Questions', count: reachedStack, color: '#38bdf8' },
      { label: 'Reached Core Pain Step', count: reachedAutomation, color: '#22c55e' },
      { label: 'Opened Lead Modal', count: leadModalOpened, color: '#a78bfa' },
      { label: 'Submitted Audit', count: auditSubmitted, color: '#f59e0b' },
      { label: 'Viewed Results', count: resultsViewed, color: '#fb7185' },
      { label: 'Strategy Call Clicked', count: strategyCalls, color: '#c084fc' },
      { label: 'Build Request Sent', count: buildRequestSuccess, color: '#f97316' },
    ]

    const topSections = summarizeBy(
      auditEvents.filter((event) => event.event_name === 'report_section_viewed'),
      (event) => event.section_id,
    ).slice(0, 8)

    return {
      started,
      auditSubmitted,
      resultsViewed,
      strategyCalls,
      buildRequestSuccess,
      stageRows,
      topSections,
    }
  }, [auditEvents, auditSessions, counts.audits, counts.build_requests])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-accent-400)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Admin /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Data</span>
        </div>
        <div className="text-right">
          <p className="text-label text-[var(--color-fg-subtle)]">Total rows</p>
          <p className="font-mono text-h4 font-bold leading-tight tabular-nums text-[var(--color-primary)]">
            {audits.length + builds.length}
          </p>
        </div>
      </div>

      <div className="space-y-10">

        {/* ── 1. Table Overview ─────────────────────────────────────────────── */}
        <section>
          <SectionLabel text="Table Overview" />

          {/* Count cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {TABLES.map(t => (
              <div
                key={t.name}
                className="rounded-[var(--radius-lg)] p-5 border"
                style={{ background: `${t.color}06`, borderColor: `${t.color}22` }}
              >
                <p className="text-label mb-2" style={{ color: t.color }}>{t.label}</p>
                <p className="font-serif text-[2.25rem] font-medium leading-none tabular-nums" style={{ color: t.color }}>
                  {counts[t.name as keyof typeof counts]}
                </p>
                <p className="text-caption text-[var(--color-fg-subtle)] mt-1">total rows</p>
              </div>
            ))}
          </div>

          {/* Recent 5 per table */}
          <div className="grid gap-4">
            {TABLES.map(t => {
              const rows = t.name === 'audits' ? audits : builds
              const recent = rows.slice(0, 5)
              return (
                <div key={t.name} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                  <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} />
                    <p className="text-body-sm font-medium text-[var(--color-fg-muted)]">{t.label} — most recent 5</p>
                  </div>
                  <Table density="medium">
                    <THead>
                      <TR>
                        <TH density="medium">Preview</TH>
                        <TH density="medium" className="hidden sm:table-cell">ID</TH>
                      </TR>
                    </THead>
                    <tbody>
                      {recent.length === 0 && (
                        <TR>
                          <TD density="medium" colSpan={2} className="text-center text-[var(--color-fg-faint)]">No data yet</TD>
                        </TR>
                      )}
                      {recent.map(row => (
                        <TR key={row.id as string}>
                          <TD density="medium" className="truncate max-w-[280px]">
                            {rowPreview(row, t.previewFields)}
                          </TD>
                          <TD density="medium" className="font-mono text-caption text-[var(--color-fg-faint)] hidden sm:table-cell">
                            {(row.id as string).slice(0, 8)}…
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
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
              color="#818CF8"
            />
            <FunnelStatCard
              label="Results Views"
              value={funnel.resultsViewed}
              detail={`${percentage(funnel.resultsViewed, Math.max(funnel.auditSubmitted, 1))} of submitted audits reached the report`}
              color="#38bdf8"
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

          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 mb-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-body-sm font-medium text-[var(--color-fg)]">Conversion Ladder</p>
                <p className="text-caption text-[var(--color-fg-subtle)] mt-1">Shows where people stall from intake to commercial intent.</p>
              </div>
              <p className="text-caption text-[var(--color-fg-faint)] hidden sm:block">
                Based on audit_sessions, audit_events, and submitted records
              </p>
            </div>

            <div className="space-y-3">
              {funnel.stageRows.map((row, index) => {
                const previous = index === 0 ? row.count : funnel.stageRows[index - 1]?.count ?? row.count
                const width = funnel.stageRows[0]?.count ? Math.max((row.count / Math.max(funnel.stageRows[0].count, 1)) * 100, row.count > 0 ? 6 : 0) : 0

                return (
                  <div key={row.label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-body-sm font-medium text-[var(--color-fg)]">{row.label}</p>
                      <div className="text-right shrink-0">
                        <p className="text-body font-medium tabular-nums text-[var(--color-fg)]">{row.count}</p>
                        <p className="text-caption text-[var(--color-fg-subtle)]">
                          {percentage(row.count, Math.max(previous, 1))} of previous
                        </p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
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

          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
            <p className="text-body-sm font-medium text-[var(--color-fg)]">Top Report Sections</p>
            <p className="text-caption text-[var(--color-fg-subtle)] mt-1 mb-4">Which blocks people actually reach on the results page</p>
            {funnel.topSections.length === 0 ? (
              <p className="text-caption text-[var(--color-fg-faint)]">No tracked events yet.</p>
            ) : (
              <Table density="medium">
                <THead>
                  <TR>
                    <TH density="medium">Source</TH>
                    <TH density="medium" className="text-right">Count</TH>
                  </TR>
                </THead>
                <tbody>
                  {funnel.topSections.map((row) => (
                    <TR key={row.key}>
                      <TD density="medium">{formatLabel(row.key)}</TD>
                      <TD density="medium" className="text-right font-mono tabular-nums text-[var(--color-primary)]">{row.count}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
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
              variant="outline"
              onClick={() => downloadJSON(audits, `audits-${Date.now()}.json`)}
              disabled={audits.length === 0}
            >
              Export audits as JSON
              <Badge variant="secondary" className="ml-1 tabular-nums">{audits.length}</Badge>
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadJSON(builds, `build-requests-${Date.now()}.json`)}
              disabled={builds.length === 0}
            >
              Export build requests as JSON
              <Badge variant="secondary" className="ml-1 tabular-nums">{builds.length}</Badge>
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadJSON(auditSessions, `audit-sessions-${Date.now()}.json`)}
              disabled={auditSessions.length === 0}
            >
              Export audit sessions as JSON
              <Badge variant="secondary" className="ml-1 tabular-nums">{auditSessions.length}</Badge>
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadJSON(auditEvents, `audit-events-${Date.now()}.json`)}
              disabled={auditEvents.length === 0}
            >
              Export audit events as JSON
              <Badge variant="secondary" className="ml-1 tabular-nums">{auditEvents.length}</Badge>
            </Button>
          </div>
        </section>

      </div>
    </div>
  )
}
