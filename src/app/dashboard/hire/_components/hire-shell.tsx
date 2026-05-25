'use client'

import { useCallback, useEffect, useState } from 'react'
import { HireChat } from './hire-chat'
import { SessionsSidebar, type ChatSession } from './sessions-sidebar'

const ACTIVE_SESSION_KEY = 'opsradar:hire-chat:active-session'

export function HireShell() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  // On mount: load sessions, then restore last-active id from localStorage
  // if it still exists, otherwise activate the most recent.
  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/hire/sessions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load_failed'))))
      .then((data: { sessions: ChatSession[] }) => {
        if (cancelled) return
        const list = data.sessions ?? []
        setSessions(list)

        let restoreId: string | null = null
        try {
          restoreId = localStorage.getItem(ACTIVE_SESSION_KEY)
        } catch { /* noop */ }

        const exists = restoreId && list.some((s) => s.id === restoreId)
        if (exists) {
          setActiveId(restoreId)
        } else if (list.length > 0) {
          setActiveId(list[0].id)
        } else {
          setActiveId(null)
        }
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setHydrated(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (activeId) localStorage.setItem(ACTIVE_SESSION_KEY, activeId)
      else localStorage.removeItem(ACTIVE_SESSION_KEY)
    } catch { /* noop */ }
  }, [activeId, hydrated])

  const refreshSessions = useCallback(async (): Promise<ChatSession[]> => {
    try {
      const res = await fetch('/api/dashboard/hire/sessions')
      if (!res.ok) return []
      const data = (await res.json()) as { sessions: ChatSession[] }
      const list = data.sessions ?? []
      setSessions(list)
      return list
    } catch {
      return []
    }
  }, [])

  const handleNewChat = useCallback(() => {
    setActiveId(null)
  }, [])

  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      setActiveId(remaining[0]?.id ?? null)
    }
    try {
      await fetch(`/api/dashboard/hire/sessions/${id}`, { method: 'DELETE' })
    } catch { /* noop */ }
  }, [activeId, sessions])

  const handleSessionResolved = useCallback((sessionId: string, title: string) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === sessionId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], title }
        return next
      }
      return [
        {
          id: sessionId,
          title,
          message_count: 0,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]
    })
    if (activeId !== sessionId) setActiveId(sessionId)
  }, [activeId])

  const handleMessagePersisted = useCallback(() => {
    void refreshSessions()
  }, [refreshSessions])

  return (
    <div className="flex h-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]">
      <SessionsSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNewChat}
        onDelete={handleDelete}
        loading={loading}
      />
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <HireChat
          sessionId={activeId}
          onSessionResolved={handleSessionResolved}
          onMessagePersisted={handleMessagePersisted}
        />
      </div>
    </div>
  )
}
