'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message     = { role: 'user' | 'assistant'; content: string; timestamp: string }
type ConvSummary = { id: string; created_at: string; updated_at: string | null; preview: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function makeWelcome(): Message {
  return {
    role: 'assistant',
    content: "Hey! I'm the OpsRadar assistant. I can help you figure out what's worth automating in your agency, how long it takes, and what it costs. What's on your mind?",
    timestamp: new Date().toISOString(),
  }
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return m ? m[0] : null
}

function fmtDate(iso: string): string {
  const d       = new Date(iso)
  const now     = new Date()
  const diffDay = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDay === 0) return 'Today'
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7)   return `${diffDay} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VISITOR_KEY   = 'opsradar_visitor_id'
const EMAIL_KEY     = 'opsradar_visitor_email'
const MAX_HISTORY   = 10

const QUICK_ACTIONS = [
  { label: 'What do you do?',        message: 'What does OpsRadar do?' },
  { label: 'How much does it cost?', message: 'How much does it cost?' },
]

// ── ChatWidget ────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open,            setOpen]           = useState(false)
  const [msgs,            setMsgs]           = useState<Message[]>(() => [makeWelcome()])
  const [input,           setInput]          = useState('')
  const [loading,         setLoading]        = useState(false)
  const [convId,          setConvId]         = useState<string | null>(null)
  const [visitorId,       setVisitorId]      = useState<string | null>(null)
  const [visitorEmail,    setVisitorEmail]   = useState<string | null>(null)
  const [convList,        setConvList]       = useState<ConvSummary[]>([])
  const [showHistory,     setShowHistory]    = useState(false)
  const [historyLoaded,   setHistoryLoaded]  = useState(false)
  const [hasAskedContact, setHasAskedContact] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)
  // Mutable refs to avoid stale closures in async callbacks
  const convIdRef      = useRef<string | null>(null)
  const visitorIdRef   = useRef<string | null>(null)
  const visitorEmailRef = useRef<string | null>(null)

  useEffect(() => { convIdRef.current      = convId },      [convId])
  useEffect(() => { visitorIdRef.current   = visitorId },   [visitorId])
  useEffect(() => { visitorEmailRef.current = visitorEmail }, [visitorEmail])

  // ── Init: generate or retrieve visitor ID ────────────────────────────────────
  useEffect(() => {
    let vid = localStorage.getItem(VISITOR_KEY)
    if (!vid) {
      vid = genId()
      localStorage.setItem(VISITOR_KEY, vid)
    }
    setVisitorId(vid)
    visitorIdRef.current = vid
  }, [])

  // ── On first open: load last conversation + history list ──────────────────────
  useEffect(() => {
    if (!open || !visitorId || historyLoaded) return
    setHistoryLoaded(true)

    const loadInitialConv = async () => {
      // Try to load by email first (for cross-device sync)
      const savedEmail = localStorage.getItem(EMAIL_KEY)
      let query = supabase
        .from('chat_conversations')
        .select('id, messages, visitor_email')
        .order('created_at', { ascending: false })
        .limit(1)

      if (savedEmail) {
        query = query.eq('visitor_email', savedEmail)
      } else {
        query = query.eq('visitor_id', visitorId)
      }

      const { data } = await query.single()
      if (!data) return

      const stored = (data.messages ?? []) as Message[]
      // Only restore if there's a real exchange (more than the welcome message)
      if (stored.filter(m => m.role === 'user').length > 0) {
        setMsgs(stored)
        setConvId(data.id)
        convIdRef.current = data.id
        if (data.visitor_email) {
          setVisitorEmail(data.visitor_email)
          visitorEmailRef.current = data.visitor_email
          localStorage.setItem(EMAIL_KEY, data.visitor_email)
        }
      }
    }

    loadInitialConv()
    fetchConvList(visitorId)
  }, [open, visitorId, historyLoaded])

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // ── Focus input when panel opens ──────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 180)
  }, [open])

  // ── Fetch conversation list ───────────────────────────────────────────────────
  async function fetchConvList(vid: string) {
    // Prioritize email-based lookup for cross-device sync
    const savedEmail = localStorage.getItem(EMAIL_KEY)
    let query = supabase
      .from('chat_conversations')
      .select('id, created_at, updated_at, messages')
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY)

    if (savedEmail) {
      query = query.eq('visitor_email', savedEmail)
    } else {
      query = query.eq('visitor_id', vid)
    }

    const { data } = await query
    if (!data) return

    const summaries: ConvSummary[] = data
      .map(row => {
        const messages  = (row.messages ?? []) as Message[]
        const firstUser = messages.find(m => m.role === 'user')
        return {
          id:         row.id,
          created_at: row.created_at,
          updated_at: row.updated_at ?? null,
          preview:    firstUser
            ? firstUser.content.slice(0, 52) + (firstUser.content.length > 52 ? '…' : '')
            : 'New conversation',
        }
      })
      // Only show convs that have at least one user message
      .filter(s => s.preview !== 'New conversation' || s.id === convIdRef.current)

    setConvList(summaries)
  }

  // ── Persist conversation ──────────────────────────────────────────────────────
  const saveConversation = useCallback((finalMsgs: Message[], email: string | null) => {
    const vid = visitorIdRef.current
    if (!vid) return

    // Always save email to localStorage for cross-device access
    if (email) {
      localStorage.setItem(EMAIL_KEY, email)
    }

    const cid     = convIdRef.current
    const payload = {
      visitor_id: vid,
      messages:   finalMsgs,
      updated_at: new Date().toISOString(),
      ...(email ? { visitor_email: email } : {}),
    }
    if (cid) {
      supabase.from('chat_conversations').update(payload).eq('id', cid).then(() => {})
    } else {
      supabase
        .from('chat_conversations')
        .insert(payload)
        .select('id')
        .single()
        .then(({ data }) => {
          if (data?.id) {
            setConvId(data.id)
            convIdRef.current = data.id
            // Refresh the history list so it shows the new conv
            if (vid) fetchConvList(vid)
          }
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start a fresh conversation ────────────────────────────────────────────────
  function startNewConversation() {
    setMsgs([makeWelcome()])
    setConvId(null)
    convIdRef.current = null
    setHasAskedContact(false)
    setShowHistory(false)
    setTimeout(() => inputRef.current?.focus(), 100)
    const vid = visitorIdRef.current
    if (vid) fetchConvList(vid)
  }

  // ── Load a conversation from history ─────────────────────────────────────────
  async function loadConversation(id: string) {
    const { data } = await supabase
      .from('chat_conversations')
      .select('id, messages, visitor_email')
      .eq('id', id)
      .single()

    if (!data) return
    const stored = (data.messages ?? []) as Message[]
    setMsgs(stored)
    setConvId(data.id)
    convIdRef.current = data.id
    if (data.visitor_email) {
      setVisitorEmail(data.visitor_email)
      visitorEmailRef.current = data.visitor_email
    }
    setShowHistory(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 50)
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Detect email provided by user
    const detectedEmail  = extractEmail(trimmed)
    const activeEmail    = detectedEmail ?? visitorEmailRef.current

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
    const history = [...msgs, userMsg]

    setMsgs([...history, { role: 'assistant', content: '', timestamp: '' }])
    setInput('')
    setLoading(true)
    if (inputRef.current) inputRef.current.style.height = 'auto'

    // Ask for contact details after the 3rd user message, once only
    const userCount        = history.filter(m => m.role === 'user').length
    const shouldAskContact = userCount >= 3 && !hasAskedContact && !activeEmail
    if (shouldAskContact) setHasAskedContact(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages:        history,
          shouldAskContact,
          visitorEmail:    activeEmail,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream unavailable')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''
      const aiTimestamp = new Date().toISOString()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMsgs(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: fullText, timestamp: aiTimestamp },
        ])
      }

      const finalMsgs: Message[] = [
        ...history,
        { role: 'assistant', content: fullText, timestamp: aiTimestamp },
      ]

      if (detectedEmail) {
        setVisitorEmail(detectedEmail)
        visitorEmailRef.current = detectedEmail
        // Notify operator — fire-and-forget, don't block UI
        const userMsgs = finalMsgs.filter(m => m.role === 'user')
        fetch('/api/notify-chat-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorEmail: detectedEmail,
            messageCount: userMsgs.length,
            lastMessage: trimmed,
            conversationId: convIdRef.current,
          }),
        }).catch(() => { /* non-critical */ })
      }
      saveConversation(finalMsgs, activeEmail)

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMsgs(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: "Sorry, I couldn't connect right now. You can email us or start the free audit to get in touch.",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`
  }

  const showQuickActions = msgs.length === 1 && msgs[0].role === 'assistant'
  const hasHistory       = convList.length > 0

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Chat panel ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed z-[9998] flex flex-col bg-surface-container border border-outline-variant/15"
          style={{
            bottom:    '84px',
            right:     '20px',
            width:     '360px',
            maxWidth:  'calc(100vw - 40px)',
            height:    'min(540px, calc(100vh - 120px))',
            borderRadius: '18px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(173,198,255,0.06)',
          }}
        >
          {/* Top accent */}
          <div style={{ height: '2px', flexShrink: 0, borderRadius: '18px 18px 0 0', background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }} />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10" style={{ flexShrink: 0 }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Image src="/logo.png" alt="OpsRadar" width={28} height={28} className="rounded-[7px] shrink-0" />
              <div className="min-w-0">
                <p className="font-headline font-bold text-[14px] text-on-surface leading-none">OpsRadar</p>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  AI Assistant · Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 ml-2">
              {/* New conversation */}
              <button
                onClick={startNewConversation}
                title="New conversation"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.5 1L12 3.5l-5 5H4.5V6l5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* History */}
              {hasHistory && (
                <button
                  onClick={() => setShowHistory(h => !h)}
                  title="Previous conversations"
                  className={`w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors duration-150 ${
                    showHistory
                      ? 'text-primary bg-primary/10'
                      : 'text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M6.5 3.5V6.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}

              {/* View all history */}
              <Link
                href="/chat-history"
                target="_blank"
                title="View all chats by email"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 2h9v9H2V2M2 5h9M4 8h1M8 8h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface-variant transition-colors duration-150"
                aria-label="Close chat"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── History panel overlay ─────────────────────────────────────────── */}
          {showHistory && (
            <div
              className="absolute inset-x-0 top-[57px] bottom-0 z-10 flex flex-col bg-surface-container rounded-b-[18px]"
              style={{ borderTop: '1px solid rgba(173,198,255,0.06)' }}
            >
              <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
                <p className="text-[12px] font-semibold text-on-surface">Previous Conversations</p>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {convList.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant/40 text-center mt-8 px-4">No previous conversations yet.</p>
                ) : (
                  convList.map((conv, i) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-surface-container-high transition-colors duration-150 ${
                        i < convList.length - 1 ? 'border-b border-outline-variant/8' : ''
                      } ${conv.id === convId ? 'bg-primary/5' : ''}`}
                    >
                      <p className="text-[10px] font-semibold text-on-surface-variant/35 uppercase tracking-wider mb-1">
                        {fmtDate(conv.updated_at ?? conv.created_at)}
                        {conv.id === convId && <span className="ml-2 text-primary/60">· current</span>}
                      </p>
                      <p className="text-[13px] text-on-surface-variant leading-snug">{conv.preview}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Messages ─────────────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
            style={{ overscrollBehavior: 'contain' }}
          >
            {msgs.map((msg, i) => {
              const isLast   = i === msgs.length - 1
              const isTyping = msg.role === 'assistant' && msg.content === '' && loading && isLast

              return (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-primary/10 border border-primary/20">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="2.5" stroke="#adc6ff" strokeWidth="1.2" fill="rgba(173,198,255,0.25)" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 text-[13px] leading-[1.65] ${
                      msg.role === 'user'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high border border-outline-variant/10 text-on-surface-variant'
                    }`}
                    style={{
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      whiteSpace:   msg.role === 'assistant' ? 'pre-wrap' : undefined,
                      wordBreak:    msg.role === 'assistant' ? 'break-word' : undefined,
                    }}
                  >
                    {isTyping ? (
                      <span className="flex gap-1 items-center py-0.5">
                        {[0, 1, 2].map(d => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce"
                            style={{ animationDelay: `${d * 160}ms`, animationDuration: '900ms' }}
                          />
                        ))}
                      </span>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              )
            })}

            {/* Quick actions — shown only on a fresh welcome */}
            {showQuickActions && (
              <div className="flex flex-wrap gap-2 pt-1 pl-8">
                {QUICK_ACTIONS.map(({ label, message }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(message)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border border-outline-variant/20 text-on-surface-variant/50 hover:border-outline-variant/40 hover:text-on-surface-variant transition-all duration-150 disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
                <Link
                  href="/audit"
                  className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border border-primary/30 text-primary bg-primary/6 hover:bg-primary/10 transition-all duration-150"
                >
                  Start free audit →
                </Link>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ────────────────────────────────────────────────────────── */}
          <div className="px-3 pb-3 pt-2 border-t border-outline-variant/10" style={{ flexShrink: 0 }}>
            <div className="flex items-end gap-2 rounded-[12px] px-3 py-2 bg-surface-container-high border border-outline-variant/15">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent resize-none outline-none text-[13px] text-on-surface placeholder:text-on-surface-variant/30 leading-[1.55] disabled:opacity-50 overflow-y-auto"
                style={{ fontFamily: 'inherit', maxHeight: '88px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-30 mb-0.5 ${
                  input.trim() && !loading ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant/40'
                }`}
                aria-label="Send message"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 11L11 6.5L2 2v3.5l6 1-6 1V11z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant/20 text-center mt-1.5">
              Powered by OpsRadar AI
            </p>
          </div>
        </div>
      )}

      {/* ── Floating bubble ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-[9999] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #adc6ff 0%, #a78bfa 50%, #4cd7f6 100%)',
          boxShadow:  open ? '0 8px 24px rgba(173,198,255,0.3)' : '0 8px 32px rgba(173,198,255,0.4)',
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" fill="white" opacity="0.92" />
              <circle cx="8"  cy="9.5" r="1" fill="rgba(10,14,22,0.5)" />
              <circle cx="11" cy="9.5" r="1" fill="rgba(10,14,22,0.5)" />
              <circle cx="14" cy="9.5" r="1" fill="rgba(10,14,22,0.5)" />
            </svg>
            <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-surface-container-lowest" />
          </>
        )}
      </button>
    </>
  )
}
