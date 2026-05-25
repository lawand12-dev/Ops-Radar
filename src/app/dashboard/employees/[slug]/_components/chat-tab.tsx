'use client'

// Chat tab — per-employee chat client.
//
// Mirrors /dashboard/coo/_components/coo-chat.tsx structurally but talks to
// /api/dashboard/employees/[slug]/chat. The backend SSE event shape is:
//   { type: 'thread', thread_id, title }
//   { type: 'tool_call', name, label }
//   { type: 'tool_done', name }
//   { type: 'text_delta', delta }
//   { type: 'done' }
//   { type: 'error', message }
//
// Suggested prompts are derived from the employee's personaSummary / bio /
// role — so each employee's empty state feels like THEM, not the generic COO.

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import { MarkdownContent } from '<npm>/components/dashboard/markdown-content'
import type { Employee } from '<npm>/lib/employees/types'

type ToolStep = { name: string; label: string; done: boolean }

type UserMessage = { role: 'user'; content: string }
type AssistantMessage = {
  role: 'assistant'
  content: string
  toolSteps: ToolStep[]
}
type Message = UserMessage | AssistantMessage

type EmployeeChatEvent =
  | { type: 'thread'; thread_id: string; title: string }
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

function suggestedPrompts(employee: Employee): string[] {
  const name = employee.display.name
  const role = employee.display.role.toLowerCase()
  return [
    `What should ${name} work on first?`,
    `Show me what you know about my ${role} situation.`,
    `What's the most important thing I should know right now?`,
    `Pick one thing to focus on this week.`,
  ]
}

export function ChatTab({ employee }: { employee: Employee }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState<AssistantMessage | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

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
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const draft: AssistantMessage = {
      role: 'assistant',
      content: '',
      toolSteps: [],
    }
    setStreaming(draft)
    let current: AssistantMessage = draft

    try {
      const res = await fetch(
        `/api/dashboard/employees/${employee.slug}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: threadId,
            message: trimmed,
          }),
          signal: ac.signal,
        },
      )

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        setStreaming(null)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message ?? data.error ?? 'Something went wrong.',
            toolSteps: [],
          },
        ])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: EmployeeChatEvent
          try {
            event = JSON.parse(line.slice(6)) as EmployeeChatEvent
          } catch {
            continue
          }

          if (event.type === 'thread') {
            setThreadId(event.thread_id)
          }

          if (event.type === 'tool_call') {
            current = {
              ...current,
              toolSteps: [
                ...current.toolSteps,
                { name: event.name, label: event.label, done: false },
              ],
            }
            setStreaming(current)
          }

          if (event.type === 'tool_done') {
            current = {
              ...current,
              toolSteps: current.toolSteps.map((s) =>
                s.name === event.name ? { ...s, done: true } : s,
              ),
            }
            setStreaming(current)
          }

          if (event.type === 'text_delta') {
            current = { ...current, content: current.content + event.delta }
            setStreaming(current)
          }

          if (event.type === 'done' || event.type === 'error') {
            const finalContent =
              event.type === 'error' ? event.message : current.content
            const finalMsg: AssistantMessage = {
              ...current,
              content: finalContent,
            }
            setMessages((prev) => [...prev, finalMsg])
            setStreaming(null)
          }
        }
      }
    } catch {
      if (ac.signal.aborted) return
      setStreaming(null)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection error. Please try again.',
          toolSteps: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  function renderAssistant(m: AssistantMessage, index: number, isLive: boolean) {
    const isThinking =
      isLive && m.toolSteps.length === 0 && m.content.length === 0
    return (
      <div key={index} className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          {isThinking && (
            <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-fg-muted)]">
              <Loader2 size={12} className="animate-spin" />
              <span>Thinking…</span>
            </div>
          )}

          {m.toolSteps.map((step, si) => (
            <div
              key={si}
              className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] text-[var(--color-primary)]"
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
            </div>
          )}
        </div>
      </div>
    )
  }

  const liveMessages: Array<{ msg: Message; index: number; isLive: boolean }> = [
    ...messages.map((msg, index) => ({ msg, index, isLive: false })),
    ...(streaming
      ? [
          {
            msg: streaming as Message,
            index: messages.length,
            isLive: true,
          },
        ]
      : []),
  ]

  const prompts = suggestedPrompts(employee)

  return (
    <div className="flex h-[640px] flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div
        className="flex-1 space-y-4 overflow-y-auto pb-4 px-1"
        role="log"
        aria-live="polite"
        aria-busy={loading}
      >
        {messages.length === 0 && !streaming && (
          <div className="pt-2">
            <p className="mb-4 text-[13px] text-[var(--color-fg-muted)]">
              {employee.display.personaSummary ??
                `Talk to ${employee.display.name}. ${employee.display.bio}`}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {prompts.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-left text-[12.5px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {liveMessages.map(({ msg, index, isLive }) => {
          if (msg.role === 'user') {
            return (
              <div key={index} className="flex justify-end">
                <div className="max-w-[80%] rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-4 py-3 text-[13px] leading-[1.6] text-white">
                  {msg.content}
                </div>
              </div>
            )
          }
          return renderAssistant(msg as AssistantMessage, index, isLive)
        })}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask ${employee.display.name} anything…`}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-[13px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-subtle)] focus:border-[var(--color-primary)] disabled:opacity-50"
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
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
