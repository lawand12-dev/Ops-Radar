'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mic, Send, X, Sparkles } from 'lucide-react'
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
    content: "We don't build for agencies we don't understand. Ask me what AIOS does, how the audit works, or what it costs — and I'll give you a straight answer.",
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
  { label: 'What does AIOS do?', message: 'What does AIOS do?' },
  { label: 'How much does it cost?', message: 'How much does it cost?' },
  { label: 'How does the free audit work?', message: 'How does the free audit work?' },
  { label: 'Is my agency a fit?', message: 'How does the free audit work?' },
]

// ── Extend Window for SpeechRecognition ───────────────────────────────────────

type SpeechRecognitionResult = { 0: { transcript: string } }
type SpeechRecognitionEvent = { results: ArrayLike<SpeechRecognitionResult> }
type SpeechRecognitionErrorEvent = { error: string }
interface SpeechRecognitionInstance {
  start: () => void
  stop: () => void
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
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
          content: "The AI couldn't connect right now. You can email our team directly or start the free audit to get in touch.",
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')

      devLog('Transcript:', transcript)
      setMessage(prev => {
        return prev + ' ' + transcript
      })
      setCharCount((prev) => prev + transcript.length)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
    <div className="fixed bottom-6 right-6 z-[60]">
      {/* FAB — closed state */}
      <button
        className="floating-ai-button relative flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] border border-[var(--color-accent-700)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-accent-700)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent-500)] focus-visible:outline-offset-2"
        onClick={() => setIsChatOpen(!isChatOpen)}
        aria-label={isChatOpen ? 'Close AIOS assistant' : 'Ask AIOS anything'}
      >
        {isChatOpen
          ? <X className="w-5 h-5 text-white" />
          : <Sparkles className="w-5 h-5 text-white" />
        }
        {/* Quiet "live" indicator — single animation allowed per Phase 0 */}
        {!isChatOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-bg)]" />
        )}
      </button>

      {/* Chat Panel — open state */}
      {isChatOpen && (
        <div
          ref={chatRef}
          className="absolute bottom-16 right-0 w-[400px] max-w-[calc(100vw-32px)]"
          style={{ animation: 'chat-panel-in var(--duration-slow) var(--ease-out) forwards' }}
        >
          <div
            className="relative flex flex-col rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden"
            style={{ maxHeight: 'min(600px, calc(100vh - 110px))' }}
          >

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-[var(--color-border)] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Image src="/logo.png" alt="OpsRadar" width={24} height={24} className="rounded shrink-0" />
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-[var(--color-fg)]">Ask AIOS anything</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                    <span className="text-caption text-[var(--color-fg-subtle)]">OpsRadar AI</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0 ml-2">
                {/* New conversation */}
                <button
                  onClick={startNewConversation}
                  title="New conversation"
                  className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)] transition-colors duration-[var(--duration-fast)]"
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
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors duration-[var(--duration-fast)] ${
                      showHistory
                        ? 'text-[var(--color-primary)] bg-[var(--color-accent-50)]'
                        : 'text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]'
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
                  className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)] transition-colors duration-[var(--duration-fast)]"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── History panel overlay ───────────────────────────────────── */}
            {showHistory && (
              <div className="absolute inset-x-0 top-[57px] bottom-0 z-10 flex flex-col bg-[var(--color-surface)] rounded-b-lg border-t border-[var(--color-border)]">
                <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
                  <p className="text-label text-[var(--color-fg-subtle)]">Previous conversations</p>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-caption text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)]"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {convList.length === 0 ? (
                    <p className="text-body-sm text-[var(--color-fg-subtle)] text-center mt-8 px-4">No previous conversations yet.</p>
                  ) : (
                    convList.map((conv, i) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-[var(--color-surface-sunken)] transition-colors duration-[var(--duration-fast)] ${
                          i < convList.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                        } ${conv.id === convId ? 'bg-[var(--color-accent-50)]' : ''}`}
                      >
                        <p className="text-label text-[var(--color-fg-subtle)] mb-1">
                          {fmtDate(conv.updated_at ?? conv.created_at)}
                          {conv.id === convId && <span className="ml-2 text-[var(--color-primary)] opacity-60">· current</span>}
                        </p>
                        <p className="text-body-sm text-[var(--color-fg-muted)] leading-snug">{conv.preview}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Messages ────────────────────────────────────────────────── */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
              style={{ maxHeight: '380px', overscrollBehavior: 'contain' }}
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
                      className={`max-w-[82%] px-3.5 py-2.5 text-body-sm leading-[1.6] rounded-md ${
                        msg.role === 'user'
                          ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                          : 'bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-fg)] rounded-bl-sm'
                      }`}
                      style={{
                        whiteSpace: msg.role === 'assistant' ? 'pre-wrap' : undefined,
                        wordBreak: msg.role === 'assistant' ? 'break-word' : undefined,
                      }}
                    >
                      {isTyping ? (
                        <span className="flex gap-1 items-center py-0.5">
                          {[0, 1, 2].map(d => (
                            <span
                              key={d}
                              className="w-1.5 h-1.5 rounded-full bg-[var(--color-fg-faint)]"
                              style={{
                                animation: `typing-dot 900ms ease-in-out ${d * 160}ms infinite`,
                              }}
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
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_ACTIONS.map(({ label, message: msg }) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(msg)}
                      disabled={loading}
                      className="px-2.5 py-1.5 rounded text-caption border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)] transition-colors duration-[var(--duration-fast)] disabled:opacity-40"
                    >
                      {label}
                    </button>
                  ))}
                  <Link
                    href="/audit"
                    className="px-2.5 py-1.5 rounded text-caption border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-accent-50)] transition-colors duration-[var(--duration-fast)]"
                  >
                    Start free audit &rarr;
                  </Link>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input row ───────────────────────────────────────────────── */}
            <div className="border-t border-[var(--color-border)]">
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={loading}
                className="w-full px-4 py-3 bg-transparent border-none outline-none resize-none text-body-sm leading-relaxed min-h-[72px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] disabled:opacity-50"
                placeholder="Ask anything about agency operations..."
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
              {isListening && (
                <div className="px-4 pb-2 text-caption text-[var(--color-danger)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" style={{ animation: 'typing-dot 1200ms ease-in-out infinite' }} />
                  Listening — speak now
                </div>
              )}
              {voiceError && (
                <div className="px-4 pb-2 text-caption text-[var(--color-warn)]">
                  {voiceError}
                </div>
              )}
            </div>

            {/* ── Controls row ─────────────────────────────────────────────── */}
            <div className="px-4 pb-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* Voice button */}
                  <button
                    onClick={handleVoiceInput}
                    className={`p-2 rounded border transition-colors duration-[var(--duration-fast)] ${
                      isListening
                        ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]'
                        : 'bg-transparent border-[var(--color-border)] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-sunken)]'
                    }`}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Character counter */}
                  <span className="text-caption font-mono text-[var(--color-fg-faint)]">
                    {charCount}/{maxChars}
                  </span>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || loading}
                    className="p-2.5 rounded bg-[var(--color-primary)] text-white transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-accent-700)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status footer */}
              <div className="flex items-center justify-end mt-2.5 pt-2.5 border-t border-[var(--color-border)] text-caption text-[var(--color-fg-subtle)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[var(--color-success)] rounded-full" />
                  <span>OpsRadar AI · always on</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes — functional animations only, no ambient loops */}
      <style jsx>{`
        @keyframes chat-panel-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes typing-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export { FloatingAiAssistant }
