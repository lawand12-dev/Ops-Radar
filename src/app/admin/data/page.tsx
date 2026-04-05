'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { Button } from '<npm>/components/ui/button'
import { Input } from '<npm>/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '<npm>/components/ui/dialog'

const LOCAL_STORAGE_KEY = 'opsradar_admin_auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type TableName = 'audits' | 'chat_conversations' | 'build_requests'

type TableMeta = {
  name: TableName
  label: string
  color: string
  previewFields: string[]
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
    const { count } = await onRun()
    setLoading(false)
    setConfirm(false)
    setResult(`Deleted ${count} row${count !== 1 ? 's' : ''}`)
    setTimeout(() => setResult(null), 4000)
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
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { error, count } = await supabase
      .from('audits')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    setLoading(false)
    setConfirm(false)
    if (!error) {
      setResult(`Deleted ${count ?? 0} row${(count ?? 0) !== 1 ? 's' : ''}`)
      setTimeout(() => setResult(null), 4000)
      onRefresh()
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
  const [password, setPassword]           = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Table data
  const [audits, setAudits]               = useState<Record<string, unknown>[]>([])
  const [chats,  setChats]                = useState<Record<string, unknown>[]>([])
  const [builds, setBuilds]               = useState<Record<string, unknown>[]>([])
  const [counts, setCounts]               = useState({ audits: 0, chat_conversations: 0, build_requests: 0 })
  const [loading, setLoading]             = useState(true)

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem(LOCAL_STORAGE_KEY) === 'true') setIsAuthenticated(true)
  }, [])

  async function handleLogin() {
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setIsAuthenticated(true)
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
    } else {
      alert('Incorrect password')
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)

    const [auditRes, chatRes, buildRes] = await Promise.all([
      supabase.from('audits').select('*').order('created_at', { ascending: false }),
      supabase.from('chat_conversations').select('*').order('created_at', { ascending: false }),
      supabase.from('build_requests').select('*').order('created_at', { ascending: false }),
    ])

    const a = (auditRes.data ?? []) as Record<string, unknown>[]
    const c = (chatRes.data  ?? []) as Record<string, unknown>[]
    const b = (buildRes.data ?? []) as Record<string, unknown>[]

    setAudits(a)
    setChats(c)
    setBuilds(b)
    setCounts({ audits: a.length, chat_conversations: c.length, build_requests: b.length })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadAll()
  }, [isAuthenticated, loadAll])

  // ── Delete helpers ────────────────────────────────────────────────────────
  async function deleteRow(table: TableName, id: string) {
    await supabase.from(table).delete().eq('id', id)
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
        <div className="bg-surface-container-low p-8 rounded-[14px] shadow-lg w-full max-w-sm border border-outline-variant/10">
          <h1 className="font-headline font-bold text-[22px] tracking-[-0.02em] text-on-surface mb-6 text-center">Admin Login</h1>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="px-4 py-2.5 h-auto rounded-[10px] text-[14px] bg-surface-container border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40"
          />
          <Button
            onClick={handleLogin}
            className="mt-4 w-full h-auto bg-primary/8 border border-primary/20 text-primary hover:bg-primary/15 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold"
          >
            Login
          </Button>
        </div>
      </div>
    )
  }

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

        {/* ── 2. Test Data Cleanup ──────────────────────────────────────────── */}
        <section>
          <SectionLabel text="Test Data Cleanup" />
          <div className="grid sm:grid-cols-2 gap-3">

            <CleanupCard
              label='Delete all test audits'
              description='Removes audits where email or company_name contains "test".'
              color="#ef4444"
              onRun={async () => {
                const { count: c1 } = await supabase
                  .from('audits').delete({ count: 'exact' })
                  .ilike('email', '%test%')
                const { count: c2 } = await supabase
                  .from('audits').delete({ count: 'exact' })
                  .ilike('company', '%test%')
                await loadAll()
                return { count: (c1 ?? 0) + (c2 ?? 0) }
              }}
            />

            <CleanupCard
              label="Delete empty chat conversations"
              description="Removes conversations with fewer than 2 messages."
              color="#f59e0b"
              onRun={async () => {
                const empties = chats.filter(c => msgCount(c) < 2)
                let deleted = 0
                for (const c of empties) {
                  const { error } = await supabase.from('chat_conversations').delete().eq('id', c.id as string)
                  if (!error) deleted++
                }
                await loadAll()
                return { count: deleted }
              }}
            />

            <div className="sm:col-span-2">
              <OldAuditsCard onRefresh={loadAll} />
            </div>
          </div>
        </section>

        {/* ── 3. Individual Row Management ──────────────────────────────────── */}
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

        {/* ── 4. Export ─────────────────────────────────────────────────────── */}
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
