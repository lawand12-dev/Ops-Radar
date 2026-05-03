'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

type Session = {
  id: string
  agency_name: string
  status: string
  created_at: string
  pdf_url: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft_layer1:    { label: 'Draft',            color: 'bg-gray-700 text-gray-300' },
  client_prefill:  { label: 'Client Submitted',  color: 'bg-blue-900/60 text-blue-300 border border-blue-700/50' },
  blueprint_ready: { label: 'Blueprint Ready',   color: 'bg-green-900/60 text-green-300 border border-green-700/50' },
}

export default function VipSessionsPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newAgencyName, setNewAgencyName] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newLink, setNewLink] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin-auth')
      .then((r) => r.json())
      .then((d: { authenticated: boolean }) => {
        if (!d.authenticated) {
          router.replace('/admin/login?redirectTo=/admin/vip-sessions')
        } else {
          setAuthed(true)
        }
      })
      .catch(() => router.replace('/admin/login'))
  }, [router])

  useEffect(() => {
    if (!authed) return
    fetch('/api/vip-sessions')
      .then((r) => r.json())
      .then((d: { sessions: Session[] }) => setSessions(d.sessions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [authed])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newAgencyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/vip-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agency_name: newAgencyName.trim() }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (res.ok && data.id) {
        const link = `${window.location.origin}/vip/${data.id}`
        setNewLink(link)
        setSessions((prev) => [
          {
            id: data.id!,
            agency_name: newAgencyName.trim(),
            status: 'draft_layer1',
            created_at: new Date().toISOString(),
            pdf_url: null,
          },
          ...prev,
        ])
        setNewAgencyName('')
        setShowModal(false)
      }
    } finally {
      setCreating(false)
    }
  }

  async function copyLink(id: string) {
    const link = `${window.location.origin}/vip/${id}`
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!authed || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="OpsRadar" width={36} height={36} className="rounded-xl" />
            <div>
              <h1 className="text-xl font-bold text-white">VIP Sessions</h1>
              <p className="text-xs text-gray-500">Manage pre-call blueprints</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300">← Admin</Link>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              + New Session
            </button>
          </div>
        </div>

        {/* New session link banner */}
        {newLink && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-700/50 bg-blue-950/30 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-white">Session created!</p>
              <p className="mt-0.5 break-all text-xs text-blue-300">{newLink}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(newLink)}
              className="ml-4 flex-shrink-0 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-900/40"
            >
              Copy Link
            </button>
          </div>
        )}

        {/* Sessions table */}
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/30">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Agency</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Created</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">
                    No sessions yet. Create one to get started.
                  </td>
                </tr>
              )}
              {sessions.map((s) => {
                const badge = STATUS_LABELS[s.status] ?? { label: s.status, color: 'bg-gray-700 text-gray-300' }
                return (
                  <tr key={s.id} className="hover:bg-gray-800/30">
                    <td className="px-5 py-4">
                      <Link href={`/admin/vip-sessions/${s.id}`} className="font-semibold text-white hover:text-blue-300">
                        {s.agency_name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyLink(s.id)}
                          className="rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:border-gray-500"
                        >
                          {copiedId === s.id ? 'Copied!' : 'Copy Link'}
                        </button>
                        <Link
                          href={`/admin/vip-sessions/${s.id}`}
                          className="rounded-md bg-blue-600/20 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600/40"
                        >
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">New VIP Session</h2>
            <form onSubmit={handleCreate}>
              <label className="mb-1.5 block text-sm text-gray-300">Agency Name</label>
              <input
                autoFocus
                type="text"
                value={newAgencyName}
                onChange={(e) => setNewAgencyName(e.target.value)}
                placeholder="Acme Marketing Agency"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newAgencyName.trim()}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
