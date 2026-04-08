'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import SiteHeader from '<npm>/components/ui/site-header'

type Message = { role: 'user' | 'assistant'; content: string; timestamp: string }
type Conversation = {
  id: string
  created_at: string
  updated_at: string | null
  messages: Message[]
  visitor_email: string | null
}

type AccessStep = 'request' | 'verify' | 'ready'

const EMAIL_KEY = 'opsradar_visitor_email'

export default function ChatHistoryPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<AccessStep>('request')
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ total: 0, messages: 0, firstChat: '', lastChat: '' })

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-conversations',
        }),
      })

      const data = await res.json()

      if (res.status === 401) {
        setStep('request')
        setConvs([])
        setSelectedConv(null)
        setError('Verify your email again to open your chat history.')
        return
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to load conversations.')
      }

      const conversations = (data.conversations ?? []) as Conversation[]

      if (conversations.length === 0) {
        setConvs([])
        setSelectedConv(null)
        setStats({ total: 0, messages: 0, firstChat: '', lastChat: '' })
        setError('No conversations found for this email yet.')
        return
      }

      setConvs(conversations)
      setSelectedConv((current) => current && conversations.some((conv) => conv.id === current.id)
        ? conversations.find((conv) => conv.id === current.id) ?? conversations[0]
        : conversations[0])

      const totalMessages = conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0)
      const timestamps = conversations.map((conversation) => new Date(conversation.created_at).getTime())
      const firstChat = timestamps.length > 0 ? formatDate(new Date(Math.min(...timestamps))) : ''
      const lastChat = timestamps.length > 0 ? formatDate(new Date(Math.max(...timestamps))) : ''

      setStats({
        total: conversations.length,
        messages: totalMessages,
        firstChat,
        lastChat,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations.')
    } finally {
      setLoading(false)
    }
  }, [])

  const restoreSession = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session-status' }),
      })

      if (!res.ok) {
        return
      }

      const data = await res.json()
      if (data.authenticated) {
        if (data.email) {
          setEmail(data.email)
          localStorage.setItem(EMAIL_KEY, data.email)
        }
        setStep('ready')
        await loadConversations()
      }
    } catch {
      // Ignore restore failures and fall back to manual verification
    }
  }, [loadConversations])

  useEffect(() => {
    const savedEmail = localStorage.getItem(EMAIL_KEY)
    if (savedEmail) {
      setEmail(savedEmail)
    }

    restoreSession()
  }, [restoreSession])

  async function requestAccessCode() {
    if (!email.trim()) {
      setError('Please enter a valid email.')
      return
    }

    setLoading(true)
    setError('')
    setInfo('')

    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-access-code',
          email,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to send code.')
      }

      localStorage.setItem(EMAIL_KEY, email)
      setStep('verify')
      setInfo(data.message ?? 'Check your inbox for a verification code.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send code.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (!code.trim()) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setVerifying(true)
    setError('')
    setInfo('')

    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-access-code',
          email,
          code,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Verification failed.')
      }

      localStorage.setItem(EMAIL_KEY, email)
      setStep('ready')
      setCode('')
      await loadConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setVerifying(false)
    }
  }

  async function signOut() {
    setLoading(true)

    try {
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign-out' }),
      })
    } catch {
      // Best effort only
    } finally {
      setStep('request')
      setCode('')
      setConvs([])
      setSelectedConv(null)
      setSearchTerm('')
      setStats({ total: 0, messages: 0, firstChat: '', lastChat: '' })
      setInfo('')
      setError('')
      setLoading(false)
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return

    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-conversation',
          convId: id,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      const nextConversations = convs.filter((conversation) => conversation.id !== id)
      setConvs(nextConversations)
      setSelectedConv((current) => (current?.id === id ? nextConversations[0] ?? null : current))
      setStats((current) => ({
        ...current,
        total: nextConversations.length,
        messages: nextConversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
      }))
    } catch {
      alert('Failed to delete conversation')
    }
  }

  function exportAsJSON() {
    if (!selectedConv) return

    const data = JSON.stringify(selectedConv, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chat-${selectedConv.id.slice(0, 8)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function formatDate(iso: string | Date): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const filteredConversations = useMemo(() => convs.filter((conversation) => {
    const text = conversation.messages.map((message) => message.content).join(' ').toLowerCase()
    return text.includes(searchTerm.toLowerCase())
  }), [convs, searchTerm])

  const messageCount = selectedConv?.messages.length || 0
  const showHistory = step === 'ready' && convs.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <SiteHeader
        sticky
        navLinks={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'About', href: '/about' },
          { label: 'Blog', href: '/blog' },
        ]}
        ctaLabel="Start Free Audit"
        ctaHref="/audit"
      />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[28px] border border-white/10 bg-slate-950/80 px-6 py-7 text-white shadow-[0_30px_90px_rgba(2,6,23,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
            Chat Archive
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Secure access to your saved conversations
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            Verify your email with a one-time code to reopen previous chats, export transcripts,
            or delete old threads.
          </p>
        </div>

        {!showHistory && (
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                📧 Email verification for your chat history
              </label>

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && step === 'request') {
                      requestAccessCode()
                    }
                  }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />

                {step === 'verify' && (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        verifyCode()
                      }
                    }}
                    placeholder="6-digit code"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                )}

                <div className="flex gap-2">
                  {step === 'request' ? (
                    <button
                      onClick={requestAccessCode}
                      disabled={loading}
                      className="flex-1 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
                    >
                      {loading ? 'Sending…' : 'Send code'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={verifyCode}
                        disabled={verifying}
                        className="flex-1 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
                      >
                        {verifying ? 'Verifying…' : 'Verify'}
                      </button>
                      <button
                        onClick={requestAccessCode}
                        disabled={loading}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                      >
                        Resend
                      </button>
                    </>
                  )}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded mt-4">{error}</p>}
              {info && <p className="text-emerald-700 text-sm bg-emerald-50 p-2 rounded mt-4">{info}</p>}

              <p className="text-xs text-slate-500 mt-4">
                We’ll email a one-time code before showing any saved conversations.
              </p>
            </div>
          </div>
        )}

        {showHistory && (
          <>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-slate-600">Verified as <span className="font-semibold text-slate-900">{email}</span></p>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
              >
                Sign out
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Total Chats</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Messages</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.messages}</p>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">First Chat</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{stats.firstChat || '—'}</p>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Last Chat</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{stats.lastChat || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search messages…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-slate-600 mt-2">
                      {filteredConversations.length} of {convs.length}
                    </p>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConv(conversation)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50/80 transition text-sm ${
                          selectedConv?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-slate-900 line-clamp-2 text-xs">
                          {conversation.messages.find((message) => message.role === 'user')?.content || 'New conversation'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                          <span>{formatDate(conversation.updated_at ?? conversation.created_at)}</span>
                          <span className="text-slate-400">•</span>
                          <span>{conversation.messages.length} msgs</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedConv ? (
                  <div className="bg-white rounded-xl shadow-md border border-slate-200 h-full flex flex-col overflow-hidden">
                    <div className="px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">Conversation</h3>
                        <p className="text-xs text-slate-600 mt-0.5">{formatDate(selectedConv.updated_at ?? selectedConv.created_at)} • {messageCount} messages</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={exportAsJSON}
                          className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1 hover:bg-slate-200 rounded transition"
                          title="Export as JSON"
                        >
                          📥
                        </button>
                        <button
                          onClick={(event) => deleteConversation(selectedConv.id, event)}
                          className="text-sm text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-100 rounded transition"
                          title="Delete conversation"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/30">
                      {selectedConv.messages.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                              message.role === 'user'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-slate-200 text-slate-900 rounded-bl-none'
                            }`}
                          >
                            {message.content}
                            <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-slate-600'}`}>
                              {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-md border border-slate-200 h-full flex flex-col items-center justify-center min-h-96">
                    <p className="text-4xl mb-3">👈</p>
                    <p className="text-slate-500 text-sm font-medium">Select a conversation to view</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
