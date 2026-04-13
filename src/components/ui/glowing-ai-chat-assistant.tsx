'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mic, Send, Bot, X } from 'lucide-react'
import { getAbuseProtectionPayload } from '../../lib/abuse-protection'
import { devLog, devError } from '<npm>/lib/dev-log'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string; timestamp: string }
type ConvSummary = { id: string; created_at: string; updated_at: string | null; preview: string }
type ConversationRecord = {
  id: string
  created_at: string
  updated_at: string | null
  messages: Message[]
  visitor_email?: string | null
}
type ConversationBootstrapResponse = {
  visitorId?: string
  latestConversation?: ConversationRecord | null
  conversations?: ConvSummary[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWelcome(): Message {
  return {
    role: 'assistant',
    content: "Hi! I'm the OpsRadar assistant. I can answer questions about what we build, how much it costs, and how our done-for-you automation service works.\n\nOr just ask me anything about agency automation.",
    timestamp: new Date().toISOString(),
  }
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return m ? m[0] : null
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDay = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDay === 0) return 'Today'
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildPreview(messages: Message[]): string {
  const firstUser = messages.find((message) => message.role === 'user')
  if (!firstUser) return ''
  return firstUser.content.length > 52
    ? `${firstUser.content.slice(0, 52)}...`
    : firstUser.content
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VISITOR_KEY = 'opsradar_visitor_id'
const EMAIL_KEY = 'opsradar_visitor_email'

const QUICK_ACTIONS = [
  { label: 'What does OpsRadar do?', message: 'What does OpsRadar do?' },
  { label: 'How much does it cost?', message: 'How much does it cost?' },
  { label: 'How does the free audit work?', message: 'How does the free audit work?' },
  { label: 'Book a call with Lawand', message: 'How do I book a call with Lawand?' },
]

// ── Extend Window for SpeechRecognition ───────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

// ── FloatingAiAssistant ───────────────────────────────────────────────────────

const FloatingAiAssistant = () => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const maxChars = 2000

  // Backend state (ported from ChatWidget)
  const [msgs, setMsgs] = useState<Message[]>(() => [makeWelcome()])
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [visitorEmail, setVisitorEmail] = useState<string | null>(null)
  const [convList, setConvList] = useState<ConvSummary[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [hasAskedContact, setHasAskedContact] = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<any>(null)
  const leadStartedAtRef = useRef(Date.now())
  const convIdRef = useRef<string | null>(null)
  const visitorIdRef = useRef<string | null>(null)
  const visitorEmailRef = useRef<string | null>(null)

  useEffect(() => { convIdRef.current = convId }, [convId])
  useEffect(() => { visitorIdRef.current = visitorId }, [visitorId])
  useEffect(() => { visitorEmailRef.current = visitorEmail }, [visitorEmail])

  // ── Init: restore local email ──────────────────────────────────────────────
  useEffect(() => {
    const storedEmail = localStorage.getItem(EMAIL_KEY)
    if (storedEmail) {
      setVisitorEmail(storedEmail)
      visitorEmailRef.current = storedEmail
    }
  }, [])

  // ── On first open: load last conversation + history list ───────────────────
  useEffect(() => {
    if (!isChatOpen || historyLoaded) return
    setHistoryLoaded(true)

    const loadInitialState = async () => {
      try {
        const res = await fetch('/api/chat-conversations?view=initial', { cache: 'no-store' })
        if (!res.ok) return

        const data = await res.json() as ConversationBootstrapResponse
        if (typeof data.visitorId === 'string' && data.visitorId) {
          setVisitorId(data.visitorId)
          visitorIdRef.current = data.visitorId
          localStorage.setItem(VISITOR_KEY, data.visitorId)
        }

        const summaries = Array.isArray(data.conversations) ? data.conversations : []
        setConvList(summaries)

        const latestConversation = data.latestConversation
        if (!latestConversation || !Array.isArray(latestConversation.messages)) return

        const stored = latestConversation.messages
        if (stored.some((m) => m.role === 'user')) {
          setMsgs(stored)
          setConvId(latestConversation.id)
          convIdRef.current = latestConversation.id
        }

        if (latestConversation.visitor_email) {
          setVisitorEmail(latestConversation.visitor_email)
          visitorEmailRef.current = latestConversation.visitor_email
          localStorage.setItem(EMAIL_KEY, latestConversation.visitor_email)
        }
      } catch {
        // Keep chat usable even if history storage is unavailable.
      }
    }

    loadInitialState()
  }, [isChatOpen, historyLoaded])

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // ── Focus input when panel opens ───────────────────────────────────────────
  useEffect(() => {
    if (isChatOpen) setTimeout(() => inputRef.current?.focus(), 180)
  }, [isChatOpen])

  // ── Close chat when clicking outside ───────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatRef.current &&
        !chatRef.current.contains(event.target as Node) &&
        !(event.target as Element)?.closest('.floating-ai-button')
      ) {
        setIsChatOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Fetch conversation list ────────────────────────────────────────────────
  async function fetchConvList() {
    try {
      const res = await fetch('/api/chat-conversations?view=list', { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json() as ConversationBootstrapResponse
      if (typeof data.visitorId === 'string' && data.visitorId) {
        setVisitorId(data.visitorId)
        visitorIdRef.current = data.visitorId
        localStorage.setItem(VISITOR_KEY, data.visitorId)
      }

      if (Array.isArray(data.conversations)) {
        setConvList(data.conversations)
      }
    } catch {
      // Keep the widget interactive if persistence is unavailable.
    }
  }

  function syncConversationSummary(
    conversationId: string,
    messages: Message[],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  ) {
    const preview = buildPreview(messages)
    if (!preview) return

    setConvList((previous) => {
      const existing = previous.find((entry) => entry.id === conversationId)
      return [
        {
          id: conversationId,
          created_at: existing?.created_at ?? createdAt,
          updated_at: updatedAt,
          preview,
        },
        ...previous.filter((entry) => entry.id !== conversationId),
      ].slice(0, 10)
    })
  }

  // ── Persist conversation ───────────────────────────────────────────────────
  const saveConversation = useCallback(async (finalMsgs: Message[], email: string | null) => {
    if (email) localStorage.setItem(EMAIL_KEY, email)

    try {
      const startedAsNewConversation = !convIdRef.current
      const res = await fetch('/api/chat-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convIdRef.current,
          messages: finalMsgs,
          visitorEmail: email,
        }),
      })
      if (!res.ok) {
        devError('[chat] conversation persistence failed:', res.status, await res.text().catch(() => ''))
        return null
      }

      const data = await res.json() as { visitorId?: string; conversationId?: string | null }

      if (typeof data.visitorId === 'string' && data.visitorId) {
        setVisitorId(data.visitorId)
        visitorIdRef.current = data.visitorId
        localStorage.setItem(VISITOR_KEY, data.visitorId)
      }

      if (typeof data.conversationId === 'string' && data.conversationId) {
        setConvId(data.conversationId)
        convIdRef.current = data.conversationId
        syncConversationSummary(data.conversationId, finalMsgs)

        if (startedAsNewConversation) await fetchConvList()
        return data.conversationId
      }
    } catch {
      return null
    }

    return null
  }, [])

  // ── Start a fresh conversation ─────────────────────────────────────────────
  function startNewConversation() {
    setMsgs([makeWelcome()])
    setConvId(null)
    convIdRef.current = null
    leadStartedAtRef.current = Date.now()
    setHasAskedContact(false)
    setShowHistory(false)
    setTimeout(() => inputRef.current?.focus(), 100)
    fetchConvList().catch(() => {})
  }

  // ── Load a conversation from history ───────────────────────────────────────
  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/chat-conversations?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json() as { visitorId?: string; conversation?: ConversationRecord | null }
      if (typeof data.visitorId === 'string' && data.visitorId) {
        setVisitorId(data.visitorId)
        visitorIdRef.current = data.visitorId
        localStorage.setItem(VISITOR_KEY, data.visitorId)
      }

      if (!data.conversation) return

      const stored = Array.isArray(data.conversation.messages) ? data.conversation.messages : []
      setMsgs(stored)
      setConvId(data.conversation.id)
      convIdRef.current = data.conversation.id
      if (data.conversation.visitor_email) {
        setVisitorEmail(data.conversation.visitor_email)
        visitorEmailRef.current = data.conversation.visitor_email
        localStorage.setItem(EMAIL_KEY, data.conversation.visitor_email)
      }
      setShowHistory(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 50)
    } catch {
      // Ignore storage errors and keep the current conversation in place.
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const detectedEmail = extractEmail(trimmed)
    const activeEmail = detectedEmail ?? visitorEmailRef.current

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
    const history = [...msgs, userMsg]

    setMsgs([...history, { role: 'assistant', content: '', timestamp: '' }])
    setMessage('')
    setCharCount(0)
    setLoading(true)

    const userCount = history.filter(m => m.role === 'user').length
    const shouldAskContact = userCount >= 3 && !hasAskedContact && !activeEmail
    if (shouldAskContact) setHasAskedContact(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          shouldAskContact,
          visitorEmail: activeEmail,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream unavailable')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
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
      }

      const savedConversationId = await saveConversation(finalMsgs, activeEmail)

      if (detectedEmail) {
        const userMsgs = finalMsgs.filter(m => m.role === 'user')
        fetch('/api/notify-chat-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorEmail: detectedEmail,
            messageCount: userMsgs.length,
            lastMessage: trimmed,
            conversationId: savedConversationId ?? convIdRef.current,
            ...getAbuseProtectionPayload(leadStartedAtRef.current),
          }),
        }).catch(() => { /* non-critical */ })
      }
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

  // ── Input handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxChars) {
      setMessage(value)
      setCharCount(value.length)
    }
  }

  const handleSend = () => {
    if (message.trim()) sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Voice input (Web Speech API) ───────────────────────────────────────────

  const handleVoiceInput = async () => {
    setVoiceError(null)

    // Check browser support
    const SpeechRecognition =
      (typeof window !== 'undefined' &&
       (window.SpeechRecognition || window.webkitSpeechRecognition))

    if (!SpeechRecognition) {
      setVoiceError("Voice input works best in Chrome, Edge, or Safari")
      setTimeout(() => setVoiceError(null), 4000)
      return
    }

    // If already listening, stop it
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setVoiceError("Microphone access denied. Please allow microphone in browser settings.")
      setTimeout(() => setVoiceError(null), 5000)
      return
    }

    // Initialize recognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      devLog('Voice recognition started')
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      devLog('Transcript:', transcript)
      setMessage(prev => {
        return prev + ' ' + transcript
      })
      setCharCount((prev) => prev + transcript.length)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setVoiceError("Microphone permission denied")
      } else if (event.error === 'no-speech') {
        setVoiceError("No speech detected. Try again.")
      } else {
        setVoiceError(`Voice error: ${event.error}`)
      }
      setTimeout(() => setVoiceError(null), 4000)
    }

    recognition.onend = () => {
      devLog('Voice recognition ended')
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      console.error('Failed to start recognition:', err)
      setIsListening(false)
      setVoiceError("Couldn't start voice input. Try again.")
      setTimeout(() => setVoiceError(null), 4000)
    }
  }

  const showQuickActions = msgs.length === 1 && msgs[0].role === 'assistant'
  const hasHistory = convList.length > 0

  return (
    <div className="fixed bottom-20 right-4 z-[60] md:bottom-6 md:right-6">
      {/* Floating 3D Glowing AI Logo */}
      <button
        className={`floating-ai-button relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 transform ${
          isChatOpen ? 'rotate-90' : 'rotate-0'
        }`}
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.8) 0%, rgba(99,102,241,0.8) 100%)',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.7), 0 0 40px rgba(79, 70, 229, 0.5), 0 0 60px rgba(67, 56, 202, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-30" />
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="relative z-10">
          {isChatOpen ? <X className="w-7 h-7 text-white" /> : <Bot className="w-8 h-8 text-white" />}
        </div>
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-blue-500" />
      </button>

      {/* Chat Interface */}
      {isChatOpen && (
        <div
          ref={chatRef}
          className="absolute bottom-20 right-0 w-[420px] max-w-[calc(100vw-40px)] transition-all duration-300 origin-bottom-right"
          style={{
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}
        >
          <div className="relative flex flex-col rounded-3xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 border border-zinc-500/50 shadow-2xl backdrop-blur-3xl overflow-hidden" style={{ maxHeight: 'min(640px, calc(100vh - 120px))' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-700/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Image src="/logo.png" alt="OpsRadar" width={28} height={28} className="rounded-[7px] shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-zinc-100">OpsRadar Assistant</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-400">Online</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0 ml-2">
                {/* New conversation */}
                <button
                  onClick={startNewConversation}
                  title="New conversation"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors duration-150"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.5 1L12 3.5l-5 5H4.5V6l5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* History */}
                {hasHistory && (
                  <button
                    onClick={() => setShowHistory(h => !h)}
                    title="Previous conversations"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                      showHistory ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50'
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M6.5 3.5V6.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors duration-150"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── History panel overlay ──────────────────────────────────────── */}
            {showHistory && (
              <div className="absolute inset-x-0 top-[65px] bottom-0 z-10 flex flex-col bg-zinc-900/95 rounded-b-3xl backdrop-blur-xl">
                <div className="px-5 py-3 border-b border-zinc-700/40 flex items-center justify-between shrink-0">
                  <p className="text-xs font-semibold text-zinc-200">Previous Conversations</p>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {convList.length === 0 ? (
                    <p className="text-[13px] text-zinc-500 text-center mt-8 px-4">No previous conversations yet.</p>
                  ) : (
                    convList.map((conv, i) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`w-full text-left px-5 py-3.5 hover:bg-zinc-800/60 transition-colors duration-150 ${
                          i < convList.length - 1 ? 'border-b border-zinc-800/50' : ''
                        } ${conv.id === convId ? 'bg-blue-500/5' : ''}`}
                      >
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          {fmtDate(conv.updated_at ?? conv.created_at)}
                          {conv.id === convId && <span className="ml-2 text-blue-400/60">· current</span>}
                        </p>
                        <p className="text-[13px] text-zinc-400 leading-snug">{conv.preview}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Messages ──────────────────────────────────────────────────── */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
              style={{ maxHeight: '400px', overscrollBehavior: 'contain' }}
            >
              {msgs.map((msg, i) => {
                const isLast = i === msgs.length - 1
                const isTyping = msg.role === 'assistant' && msg.content === '' && loading && isLast

                return (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-[1.65] ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                          : 'bg-zinc-800 border border-zinc-700/50 text-zinc-200'
                      }`}
                      style={{
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        whiteSpace: msg.role === 'assistant' ? 'pre-wrap' : undefined,
                        wordBreak: msg.role === 'assistant' ? 'break-word' : undefined,
                      }}
                    >
                      {isTyping ? (
                        <span className="flex gap-1 items-center py-0.5">
                          {[0, 1, 2].map(d => (
                            <span
                              key={d}
                              className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
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
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_ACTIONS.map(({ label, message: msg }) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(msg)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-zinc-600/30 text-zinc-400 hover:border-zinc-500/50 hover:text-zinc-200 transition-all duration-150 disabled:opacity-40"
                    >
                      {label}
                    </button>
                  ))}
                  <Link
                    href="/audit"
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-150"
                  >
                    Start free audit &rarr;
                  </Link>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input Section */}
            <div className="relative overflow-hidden border-t border-zinc-700/40">
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={loading}
                className="w-full px-5 py-3 bg-transparent border-none outline-none resize-none text-sm font-normal leading-relaxed min-h-[80px] text-zinc-100 placeholder-zinc-500 scrollbar-none disabled:opacity-50"
                placeholder="Ask anything..."
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
              {isListening && (
                <div className="px-6 py-2 text-xs text-red-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Listening... speak now
                </div>
              )}
              {voiceError && (
                <div className="px-6 py-2 text-xs text-amber-400">
                  {voiceError}
                </div>
              )}
            </div>

            {/* Controls Section */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Voice Button */}
                  <button
                    onClick={handleVoiceInput}
                    className={`group relative p-2.5 border rounded-lg cursor-pointer transition-all duration-300 transform ${
                      isListening
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse scale-110'
                        : 'bg-transparent border-zinc-700/30 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800/80 hover:scale-110 hover:border-blue-500/30'
                    }`}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Character Counter */}
                  <div className="text-xs font-medium text-zinc-500">
                    <span>{charCount}</span>/<span className="text-zinc-400">{maxChars}</span>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || loading}
                    className="group relative p-3 bg-gradient-to-r from-blue-600 to-indigo-600 border-none rounded-xl cursor-pointer transition-all duration-300 text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 hover:scale-110 hover:shadow-blue-500/30 hover:shadow-xl active:scale-95 transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 0 rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    <Send className="w-5 h-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-12 group-hover:scale-110" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-lg transform scale-110" />
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 transform scale-0 group-active:scale-100 transition-transform duration-200 rounded-xl" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer — status only */}
              <div className="flex items-center justify-end mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>All systems operational</span>
                </div>
              </div>
            </div>

            {/* Floating Overlay */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent, rgba(99, 102, 241, 0.05))',
              }}
            />
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .floating-ai-button:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.9), 0 0 50px rgba(79, 70, 229, 0.7), 0 0 70px rgba(67, 56, 202, 0.5);
        }
      `}</style>
    </div>
  )
}

export { FloatingAiAssistant }
