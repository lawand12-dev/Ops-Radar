'use client'

/**
 * HireChat — the dedicated hiring chat UI (CP-38).
 *
 * Forked from /dashboard/coo/_components/coo-chat.tsx with two changes:
 *   1. Tool steps reflect hiring flow ("Drafting the spec…").
 *   2. Server events `draft_proposed` + `employee_hired` render the
 *      EmployeeDraftCard inline (instead of the COO's "action approval" card)
 *      and link to /dashboard/employees/<slug> on success.
 *
 * Public contract with the server (matches /api/dashboard/hire SSE shape):
 *   session, tool_call, tool_done, text_delta, draft_proposed,
 *   employee_hired, done, error.
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, CheckCircle, Sparkles, AlertCircle, UserPlus } from 'lucide-react'
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

const SUGGESTION_GROUPS: Array<{ heading: string; items: string[] }> = [
  {
    heading: 'Common first hires',
    items: [
      'I want a Bookkeeper named Sarah who pulls yesterday\'s Stripe charges every day at 8am and flags anything over $5,000.',
      'Hire an SDR named Marcus that drafts personalized outreach to new HubSpot leads every weekday morning.',
      'Build a Project Coordinator that checks ClickUp status every Monday at 9am and surfaces any overdue tasks.',
    ],
  },
  {
    heading: 'Manage your team',
    items: [
      'Who\'s on my team right now?',
      'Pause Sarah for the rest of the week.',
      'Show me Marcus\'s full spec.',
    ],
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

  async function send(text: string) {
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

  // The draft card's "Hire" button calls install_custom_employee directly
  // via the chat tool layer — i.e. we just chat the install intent back.
  // This matches CP-34c (no separate REST endpoint for install; the COO/Hire
  // chat is the only path).
  async function handleConfirmDraft(d: EmployeeDraftLike) {
    const intent = `Yes, hire ${d.name} as configured — install the draft.`
    await send(intent)
  }

  function handleEditDraft() {
    setInput(
      'Let\'s adjust the draft — ',
    )
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
      <div key={index} className="flex justify-start coo-msg-enter">
        <div className="max-w-[85%] space-y-2">
          {isThinking && (
            <div
              className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-fg-muted)]"
              role="status"
              aria-label="Hiring assistant is thinking"
            >
              <Loader2 size={12} className="shrink-0 animate-spin text-[var(--color-primary)]" />
              <span>Reading your request…</span>
            </div>
          )}

          {m.toolSteps.map((step, si) => (
            <div
              key={si}
              className="coo-step-enter flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] text-[var(--color-primary)]"
            >
              {step.done ? (
                <CheckCircle size={12} className="shrink-0 text-emerald-400" />
              ) : (
                <Loader2 size={12} className="shrink-0 animate-spin" />
              )}
              {step.label}
            </div>
          ))}

          {m.content && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <MarkdownContent>{m.content}</MarkdownContent>
              {isStreaming && (
                <span className="coo-cursor" aria-hidden>▍</span>
              )}
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
            <div className="rounded-[var(--radius-lg)] border border-emerald-500/30 bg-emerald-950/15 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-300">
                <CheckCircle size={14} /> Hired
              </p>
              <p className="text-[12.5px] text-[var(--color-fg-muted)]">
                Open <Link href={m.hired.url} className="text-[var(--color-primary)] underline-offset-2 hover:underline">{m.hired.slug}&rsquo;s page</Link> to start chatting with your new hire or trigger their first task.
              </p>
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1" role="log" aria-live="polite" aria-busy={loading}>
        {loadingSession && (
          <div className="flex items-center gap-2 pt-4 text-[12px] text-[var(--color-fg-muted)]">
            <Loader2 size={12} className="animate-spin" />
            Loading chat…
          </div>
        )}

        {!loadingSession && messages.length === 0 && !streaming && (
          <div className="pt-2">
            <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <UserPlus size={14} className="text-[var(--color-primary)]" />
                <p className="text-[13px] font-medium text-[var(--color-fg)]">
                  Hiring assistant
                </p>
              </div>
              <p className="text-[12.5px] leading-[1.55] text-[var(--color-fg-muted)]">
                I help you build your AI workforce — name, role, schedule, scoped tools, first task.
                <span className="block mt-1 text-[11.5px] text-[var(--color-fg-subtle)]">
                  Nothing locks in until you click <strong>Hire</strong> on the draft card.
                </span>
              </p>
            </div>

            {SUGGESTION_GROUPS.map((group) => (
              <div key={group.heading} className="mb-4 last:mb-0">
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  {group.heading}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {group.items.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-[12.5px] text-[var(--color-fg-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {allMessages.map(({ msg, index }) => {
          if (msg.role === 'user') {
            return (
              <div key={index} className="flex justify-end coo-msg-enter">
                <div className="max-w-[80%] rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-4 py-3 text-[13px] leading-[1.6] text-white">
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
            className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-red-500/30 bg-red-950/20 px-4 py-3"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-[12.5px] leading-[1.5] text-red-200">{chatError.message}</p>
              {lastUserText && (
                <button
                  onClick={() => {
                    const text = lastUserText
                    setChatError(null)
                    void send(text)
                  }}
                  className="mt-1.5 text-[12px] font-medium text-red-300 underline-offset-2 hover:text-red-200 hover:underline"
                >
                  Retry last message
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe who you want to hire…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-fg-subtle)] disabled:opacity-50"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--color-fg-subtle)]">
          <Sparkles size={10} className="inline align-text-bottom" /> Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
