'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Message = { role: 'user' | 'assistant'; content: string; timestamp: string }
type Conversation = {
  id: string
  created_at: string
  updated_at: string | null
  messages: Message[]
  visitor_email: string | null
}

export default function ChatHistoryPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ total: 0, messages: 0, firstChat: '', lastChat: '' })
  const unsubRef = useRef<(() => void) | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('opsradar_visitor_email')
    if (saved) {
      setEmail(saved)
      setSubmitted(true)
      loadConversations(saved)
    }
  }, [])

  // Auto-refresh when component mounts
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  async function loadConversations(emailAddr: string) {
    if (!emailAddr.trim()) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddr,
          action: 'get-conversations',
        }),
      })

      if (!res.ok) throw new Error('Failed to load')
      const { conversations } = await res.json()

      if (!conversations || conversations.length === 0) {
        setError('No conversations found. Start a chat to create one.')
        setConvs([])
        setStats({ total: 0, messages: 0, firstChat: '', lastChat: '' })
        return
      }

      setConvs(conversations)
      localStorage.setItem('opsradar_visitor_email', emailAddr)

      // Calculate statistics
      const totalMsgs = conversations.reduce((sum: number, c: any) => sum + c.messages.length, 0)
      const dates = conversations.map(c => new Date(c.created_at))
      const firstChat = dates.length > 0 ? formatDate(new Date(Math.min(...dates.getTime()))) : ''
      const lastChat = dates.length > 0 ? formatDate(new Date(Math.max(...dates.getTime()))) : ''

      setStats({
        total: conversations.length,
        messages: totalMsgs,
        firstChat,
        lastChat,
      })
    } catch (err) {
      console.error(err)
      setError('Failed to load conversations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(iso: string | Date): string {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 7) return `${diffDay}d ago`
    if (diffDay < 365) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const filteredConvs = convs.filter(conv => {
    const text = conv.messages.map(m => m.content).join(' ').toLowerCase()
    return text.includes(searchTerm.toLowerCase())
  })

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    try {
      const res = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          convId: id,
          action: 'delete-conversation',
        }),
      })

      if (!res.ok) throw new Error('Failed to delete')
      setConvs(convs.filter(c => c.id !== id))
      setSelectedConv(null)
    } catch (err) {
      alert('Failed to delete conversation')
    }
  }

  function exportAsJSON() {
    if (!selectedConv) return
    const data = JSON.stringify(selectedConv, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${selectedConv.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const messageCount = selectedConv?.messages.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">💬 Chat Archive</h1>
              <p className="text-sm text-slate-600 mt-1">Secure access to all your OpsRadar conversations</p>
            </div>
            <Link href="/" className="text-primary hover:underline text-sm font-medium px-3 py-1.5 hover:bg-primary/5 rounded transition">
              ← Back
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Email Input */}
        {!submitted || convs.length === 0 ? (
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                📧 Enter your email to access your history
              </label>
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadConversations(email)}
                  placeholder="you@example.com"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={() => {
                    setSubmitted(true)
                    loadConversations(email)
                  }}
                  disabled={loading}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {loading ? 'Loading…' : 'Access'}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
              <p className="text-xs text-slate-500 mt-4">Your email is only used to retrieve your conversations securely.</p>
            </div>
          </div>
        ) : null}

        {/* Main Content */}
        {submitted && convs.length > 0 && (
          <>
            {/* Stats */}
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
              {/* Conv List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search messages…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-slate-600 mt-2">
                      {filteredConvs.length} of {convs.length}
                    </p>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                    {filteredConvs.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50/80 transition text-sm ${
                          selectedConv?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-slate-900 line-clamp-2 text-xs">
                          {conv.messages.find(m => m.role === 'user')?.content || 'New conversation'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                          <span>{formatDate(conv.updated_at ?? conv.created_at)}</span>
                          <span className="text-slate-400">•</span>
                          <span>{conv.messages.length} msgs</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setEmail('')
                    setConvs([])
                    setSelectedConv(null)
                    setSearchTerm('')
                  }}
                  className="w-full mt-3 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
                >
                  Switch email
                </button>
              </div>

              {/* Conv Details */}
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
                          onClick={e => deleteConversation(selectedConv.id, e)}
                          className="text-sm text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-100 rounded transition"
                          title="Delete conversation"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/30">
                      {selectedConv.messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-slate-200 text-slate-900 rounded-bl-none'
                            }`}
                          >
                            {msg.content}
                            <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-600'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
