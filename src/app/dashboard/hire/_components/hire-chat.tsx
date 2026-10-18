'use client'

/**
 * HireChat — the dedicated hiring chat UI (CP-38, redesigned).
 *
 * Centered, ChatGPT-style hiring surface. The presentation is a focused
 * single column (max-w-3xl) with a glowing empty-state hero, staggered
 * suggestion chips, streaming presence, inline draft + hired cards, and a
 * docked composer with a soft scroll-fade.
 *
 * The logic is unchanged from the original: SSE parsing, session load,
 * draft_proposed / employee_hired handling, error + retry, abort safety.
 *
 * Public contract with the server (matches /api/dashboard/hire SSE shape):
 *   session, tool_call, tool_done, text_delta, draft_proposed,
 *   employee_hired, done, error.
 */

import { useState, useRef, useEffect } from 'react'
import {
  ArrowUp,
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  UserPlus,
  ExternalLink,
  Mail,
  Calculator,
  Send as SendIcon,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { MarkdownContent } from '<npm>/components/dashboard/markdown-content'
import {
  EmployeeDraftCard,
  type EmployeeDraftLike,
} from '<npm>/components/dashboard/employee-draft-card'

type ToolStep = { name: string; label: string; done: boolean }
type HiredInfo = { slug: string; url: string }

type UserMessage = { role: 'user'; content: string }
type AssistantMessage = {
  role: 'assistant'
  content: string
  toolSteps: ToolStep[]
  draftCard: EmployeeDraftLike | null
  hired: HiredInfo | null
}
type Message = UserMessage | AssistantMessage

type ServerMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tool_steps: ToolStep[] | null
  draft_card: EmployeeDraftLike | null
  created_at: string
}

type AgentEvent =
  | { type: 'session'; session_id: string; title: string }
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'draft_proposed'; draft: EmployeeDraftLike }
  | { type: 'employee_hired'; slug: string; url: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

type ChatError = { message: string } | null

const SUGGESTIONS: Array<{ title: string; sub: string; prompt: string; icon: LucideIcon }> = [
  {
    title: 'A daily inbox watcher',
    sub: 'Flags client emails that need a reply',
    icon: Mail,
    prompt:
      'Hire a Gmail assistant named Ava who scans my inbox every morning at 8am, flags any client email that\'s gone unanswered for more than 12 hours, and drafts a reply for me to approve.',
  },
  {
    title: 'A bookkeeper',
    sub: 'Pulls payment activity and flags big charges',
    icon: Calculator,
    prompt:
      'I want a Bookkeeper named Sarah who pulls yesterday\'s payments every day at 8am and flags anything over $5,000.',
  },
  {
    title: 'An SDR',
    sub: 'Drafts outreach to new leads',
    icon: SendIcon,
    prompt:
      'Hire an SDR named Marcus that drafts personalized outreach to new HubSpot leads every weekday morning.',
  },
  {
    title: 'Show me my team',
    sub: 'See who you\'ve already hired',
    icon: Users,
    prompt: 'Who\'s on my team right now?',
  },
]

function serverToMessage(m: ServerMessage): Message {
  if (m.role === 'user') return { role: 'user', content: m.content }
  return {
    role: 'assistant',
    content: m.content,
    toolSteps: (m.tool_steps ?? []).map((s) => ({ ...s, done: true })),
    draftCard: m.draft_card,
    hired: null,
  }
}

type Props = {
  sessionId: string | null
  onSessionResolved: (sessionId: string, title: string) => void
  onMessagePersisted: () => void
}

export function HireChat({ sessionId, onSessionResolved, onMessagePersisted }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState<AssistantMessage | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [chatError, setChatError] = useState<ChatError>(null)
  const [lastUserText, setLastUserText] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const displayedSessionRef = useRef<string | null>(null)

  // Load messages whenever the active session changes
  useEffect(() => {
    abortRef.current?.abort()
    setStreaming(null)
    setLoading(false)
    setChatError(null)
    setLastUserText('')

    if (!sessionId) {
      setMessages([])
      displayedSessionRef.current = null
      return
    }

    const targetId = sessionId
    setLoadingSession(true)
    fetch(`/api/dashboard/hire/sessions/${targetId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load_failed'))))
      .then((data: { messages: ServerMessage[] }) => {
        if (displayedSessionRef.current !== targetId && sessionId !== targetId) {
          return
        }
        displayedSessionRef.current = targetId
        setMessages((data.messages ?? []).map(serverToMessage))
      })
      .catch(() => {
        if (sessionId === targetId) setMessages([])
      })
      .finally(() => setLoadingSession(false))
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, loading])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Auto-grow the composer textarea.
  function autoGrow() {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }
  useEffect(autoGrow, [input])

  async function send(text: string, installDraft?: EmployeeDraftLike) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const userMsg: UserMessage = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setLastUserText(trimmed)
    setChatError(null)
    setInput('')
    setLoading(true)

    const draft: AssistantMessage = {
      role: 'assistant',
      content: '',
      toolSteps: [],
      draftCard: null,
      hired: null,
    }
    setStreaming(draft)
    let current: AssistantMessage = draft

    try {
      const res = await fetch('/api/dashboard/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          ...(installDraft ? { install_draft: installDraft } : {}),
        }),
        signal: ac.signal,
      })

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        setStreaming(null)
        setMessages(messages)
        setChatError({
          message:
            data.message ??
            (data.error === 'quota_exceeded'
              ? "You've hit this month's AI compute cap. Resets next month."
              : data.error === 'unauthorized'
              ? 'Your session expired. Refresh the page to sign in again.'
              : 'Something went wrong on our side. Try again in a moment.'),
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let terminated = false

      streamLoop: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: AgentEvent
          try {
            event = JSON.parse(line.slice(6)) as AgentEvent
          } catch {
            continue
          }
          if (terminated) continue

          if (event.type === 'session') {
            displayedSessionRef.current = event.session_id
            onSessionResolved(event.session_id, event.title)
            continue
          }

          if (event.type === 'tool_call') {
            current = {
              ...current,
              toolSteps: [...current.toolSteps, { name: event.name, label: event.label, done: false }],
            }
            setStreaming(current)
            continue
          }

          if (event.type === 'tool_done') {
            current = {
              ...current,
              toolSteps: current.toolSteps.map((s) =>
                s.name === event.name ? { ...s, done: true } : s,
              ),
            }
            setStreaming(current)
            continue
          }

          if (event.type === 'text_delta') {
            current = { ...current, content: current.content + event.delta }
            setStreaming(current)
            continue
          }

          if (event.type === 'draft_proposed') {
            current = { ...current, draftCard: event.draft }
            setStreaming(current)
            continue
          }

          if (event.type === 'employee_hired') {
            current = { ...current, hired: { slug: event.slug, url: event.url } }
            setStreaming(current)
            continue
          }

          if (event.type === 'error') {
            setStreaming(null)
            setMessages(messages)
            setChatError({ message: event.message })
            terminated = true
            setLoading(false)
            try { abortRef.current?.abort() } catch { /* noop */ }
            onMessagePersisted()
            break streamLoop
          }

          if (event.type === 'done') {
            const hasContent =
              current.content.length > 0 ||
              current.toolSteps.length > 0 ||
              current.draftCard !== null ||
              current.hired !== null
            if (hasContent) {
              setMessages((m) => [...m, { ...current }])
            }
            setStreaming(null)
            terminated = true
            onMessagePersisted()
            break streamLoop
          }
        }
      }
    } catch {
      if (ac.signal.aborted) return
      setStreaming(null)
      setMessages(messages)
      setChatError({ message: 'Network hiccup. Check your connection and retry.' })
    } finally {
      setLoading(false)
    }
  }

  // The draft card's "Hire" button sends the EXACT draft object so the server
  // installs it deterministically — the draft lives only in UI state, so the
  // model couldn't reconstruct it from chat history. The text is just what the
  // customer "said"; the install_draft payload is what actually persists.
  async function handleConfirmDraft(d: EmployeeDraftLike) {
    await send(`Hire ${d.name} as configured.`, d)
  }

  function handleEditDraft() {
    setInput("Let's adjust the draft — ")
    taRef.current?.focus()
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  function renderAssistant(m: AssistantMessage, index: number) {
    const isStreaming = streaming !== null && index === messages.length
    const isThinking =
      isStreaming &&
      m.toolSteps.length === 0 &&
      m.content.length === 0 &&
      !m.draftCard &&
      !m.hired

    return (
      <div key={index} className="coo-msg-enter flex gap-3">
        {/* Assistant avatar mark */}
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-primary)]">
          <Sparkles size={14} />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {isThinking && (
            <div
              className="flex w-fit items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-fg-muted)]"
              role="status"
              aria-label="Hiring assistant is thinking"
            >
              <span className="coo-thinking-dots" aria-hidden>
                <span className="coo-dot" />
                <span className="coo-dot" />
                <span className="coo-dot" />
              </span>
              <span>Reading your request…</span>
            </div>
          )}

          {m.toolSteps.map((step, si) => (
            <div
              key={si}
              className="coo-step-enter flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px]"
            >
              {step.done ? (
                <CheckCircle2 size={13} className="shrink-0 text-[var(--color-success)]" />
              ) : (
                <Loader2 size={13} className="shrink-0 animate-spin text-[var(--color-primary)]" />
              )}
              <span className={step.done ? 'text-[var(--color-fg-muted)]' : 'text-[var(--color-fg)]'}>
                {step.label}
              </span>
            </div>
          ))}

          {m.content && (
            <div className="text-[14px] leading-[1.7] text-[var(--color-fg)]">
              <MarkdownContent>{m.content}</MarkdownContent>
              {isStreaming && <span className="coo-cursor" aria-hidden>▍</span>}
            </div>
          )}

          {m.draftCard && (
            <EmployeeDraftCard
              draft={m.draftCard}
              onConfirm={handleConfirmDraft}
              onEdit={handleEditDraft}
            />
          )}

          {m.hired && (
            <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-4 py-3">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
              <div className="text-[13px] leading-[1.5]">
                <p className="font-semibold text-[var(--color-fg)]">{m.hired.slug} is hired.</p>
                <Link
                  href={m.hired.url}
                  className="mt-0.5 inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                >
                  Open their page <ExternalLink size={12} />
                </Link>
                <span className="text-[var(--color-fg-muted)]"> to chat or trigger their first task.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const allMessages: Array<{ msg: Message; index: number }> = [
    ...messages.map((msg, index) => ({ msg, index })),
    ...(streaming ? [{ msg: streaming as Message, index: messages.length }] : []),
  ]

  const isEmpty = !loadingSession && messages.length === 0 && !streaming

  return (
    <div className="relative flex h-full flex-col bg-[var(--color-bg)]">
      {/* ── Chat header bar — identity + framing ────────────────────── */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-500)] to-[var(--color-accent-700)] text-white">
          <Sparkles size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-[var(--color-fg)]">Hiring assistant</p>
          <p className="text-[11px] leading-tight text-[var(--color-fg-subtle)]">Builds your AI workforce — drafts a spec, you approve</p>
        </div>
      </div>

      {/* ── Scrollable conversation ─────────────────────────────────── */}
      <div
        className="hire-scroll-fade flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-busy={loading}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4">
          {loadingSession && (
            <div className="flex items-center gap-2 pt-6 text-[12.5px] text-[var(--color-fg-muted)]">
              <Loader2 size={13} className="animate-spin" />
              Loading chat…
            </div>
          )}

          {/* Empty-state hero */}
          {isEmpty && (
            <div className="hire-hero flex flex-1 flex-col items-center justify-center py-10 text-center">
              <div className="hire-mark mb-5 flex size-14 items-center justify-center rounded-[var(--radius-xl)] text-white">
                <UserPlus size={26} />
              </div>
              <h2 className="font-serif text-[26px] font-normal leading-[1.15] tracking-[-0.02em] text-[var(--color-fg)]">
                Who do you want to hire?
              </h2>
              <p className="mt-2 max-w-md text-[13.5px] leading-[1.6] text-[var(--color-fg-muted)]">
                Describe the role in plain English — a name, a schedule, the tools they touch.
                I&rsquo;ll draft the spec. Nothing locks in until you click <strong className="font-semibold text-[var(--color-fg)]">Hire</strong>.
              </p>

              <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => void send(s.prompt)}
                    className="hire-chip group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow)]"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent-50)] text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-white">
                      <s.icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--color-fg)]">
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-[var(--color-fg-muted)]">
                        {s.sub}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          {!isEmpty && (
            <div className="space-y-6 py-6">
              {allMessages.map(({ msg, index }) => {
                if (msg.role === 'user') {
                  return (
                    <div key={index} className="coo-msg-enter flex justify-end">
                      <div className="max-w-[82%] rounded-[var(--radius-lg)] rounded-br-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2.5 text-[14px] leading-[1.6] text-white">
                        {msg.content}
                      </div>
                    </div>
                  )
                }
                return renderAssistant(msg as AssistantMessage, index)
              })}

              {chatError && (
                <div
                  role="alert"
                  className="coo-msg-enter flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-4 py-3"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
                  <div className="flex-1">
                    <p className="text-[12.5px] leading-[1.5] text-[var(--color-fg)]">{chatError.message}</p>
                    {lastUserText && (
                      <button
                        onClick={() => {
                          const text = lastUserText
                          setChatError(null)
                          void send(text)
                        }}
                        className="mt-1.5 text-[12px] font-medium text-[var(--color-danger)] underline-offset-2 hover:underline"
                      >
                        Retry last message
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Docked composer ─────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-1 pt-2">
        <div className="mx-auto w-full max-w-3xl">
          <div className="hire-composer flex items-end gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] px-3 py-2.5">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Describe who you want to hire…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent px-1.5 py-1 text-[14px] leading-[1.5] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-subtle)] disabled:opacity-50"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            />
            <button
              onClick={() => void send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-all hover:bg-[var(--color-primary-hover)] disabled:scale-95 disabled:opacity-30"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-[var(--color-fg-subtle)]">
            Enter to send · Shift+Enter for a new line · nothing runs until you approve it
          </p>
        </div>
      </div>
    </div>
  )
}
