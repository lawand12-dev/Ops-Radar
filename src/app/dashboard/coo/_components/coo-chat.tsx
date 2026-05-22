'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle, Plus } from 'lucide-react';
import { MarkdownContent } from '<npm>/components/dashboard/markdown-content';

const STORAGE_KEY = 'opsradar:coo-chat:v1';
// Cap how many messages we persist — avoids unbounded localStorage growth
// over months of chat history. Keeps the last 50 messages (~25 turns).
const PERSIST_LIMIT = 50;

type ToolStep = { name: string; label: string; done: boolean };

type ActionCard = {
  action_id: string;
  action_type: string;
  label: string;
  status: 'pending' | 'confirmed' | 'cancelled';
};

type UserMessage = { role: 'user'; content: string };
type AssistantMessage = {
  role: 'assistant';
  content: string;
  toolSteps: ToolStep[];
  actionCard: ActionCard | null;
};
type Message = UserMessage | AssistantMessage;

type AgentEvent =
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'action_proposed'; action_id: string; action_type: string; label: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

const SUGGESTED: string[] = [
  'How did we do this month?',
  'Which clients should I worry about?',
  'Will I make payroll next month?',
  'Which clients should I reprice?',
  'How close are we to capacity?',
  'What should I do today?',
];

export function CooChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [streaming, setStreaming] = useState<AssistantMessage | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate from localStorage on mount — keeps the conversation
  // alive across navigation away from /dashboard/coo and back.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // Corrupt JSON — ignore and start fresh
    }
    setHydrated(true);
  }, []);

  // Persist on every change (but only after hydration so we don't blow
  // away saved history on first render before useEffect above has run).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const toPersist = messages.slice(-PERSIST_LIMIT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch {
      // localStorage full / disabled / private browsing — silently drop
    }
  }, [messages, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming, loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(null);
    setInput('');
    setLoading(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const userMsg: UserMessage = { role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    const draft: AssistantMessage = { role: 'assistant', content: '', toolSteps: [], actionCard: null };
    setStreaming(draft);
    let current: AssistantMessage = draft;

    try {
      const res = await fetch('/api/dashboard/coo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setStreaming(null);
        setMessages([...history, { role: 'assistant', content: data.error ?? 'Something went wrong.', toolSteps: [], actionCard: null }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: AgentEvent;
          try { event = JSON.parse(line.slice(6)) as AgentEvent; } catch { continue; }

          if (event.type === 'tool_call') {
            current = { ...current, toolSteps: [...current.toolSteps, { name: event.name, label: event.label, done: false }] };
            setStreaming(current);
          }

          if (event.type === 'tool_done') {
            current = {
              ...current,
              toolSteps: current.toolSteps.map((s) => s.name === event.name ? { ...s, done: true } : s),
            };
            setStreaming(current);
          }

          if (event.type === 'text_delta') {
            current = { ...current, content: current.content + event.delta };
            setStreaming(current);
          }

          if (event.type === 'action_proposed') {
            current = {
              ...current,
              actionCard: {
                action_id: event.action_id,
                action_type: event.action_type,
                label: event.label,
                status: 'pending',
              },
            };
            setStreaming(current);
          }

          if (event.type === 'done' || event.type === 'error') {
            const finalContent = event.type === 'error' ? event.message : current.content;
            const finalMsg: AssistantMessage = { ...current, content: finalContent };
            setMessages((m) => [...m, finalMsg]);
            setStreaming(null);
          }
        }
      }
    } catch {
      if (ac.signal.aborted) return;
      setStreaming(null);
      setMessages([...history, { role: 'assistant', content: 'Connection error. Please try again.', toolSteps: [], actionCard: null }]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(actionId: string, msgIndex: number) {
    await fetch('/api/dashboard/actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: actionId }),
    });
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || m.role !== 'assistant' || !m.actionCard) return m;
        return { ...m, actionCard: { ...m.actionCard, status: 'confirmed' } };
      })
    );
  }

  async function dismissAction(actionId: string, msgIndex: number) {
    await fetch('/api/dashboard/actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', id: actionId }),
    });
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || m.role !== 'assistant' || !m.actionCard) return m;
        return { ...m, actionCard: { ...m.actionCard, status: 'cancelled' } };
      })
    );
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  function renderAssistant(m: AssistantMessage, index: number) {
    // The streaming message is the last one when `streaming` is set.
    // We use this to know when to show the cursor / thinking dots.
    const isStreaming = streaming !== null && index === messages.length;
    const isThinking = isStreaming && m.toolSteps.length === 0 && m.content.length === 0 && !m.actionCard;

    return (
      <div key={index} className="flex justify-start coo-msg-enter">
        <div className="max-w-[85%] space-y-2">
          {isThinking && (
            <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-fg-muted)]">
              <span className="coo-thinking-dots" aria-hidden>
                <span className="coo-dot" />
                <span className="coo-dot" />
                <span className="coo-dot" />
              </span>
              <span>Thinking…</span>
            </div>
          )}

          {m.toolSteps.map((step, si) => (
            <div
              key={si}
              className="coo-step-enter flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] text-[var(--color-primary)]"
            >
              {step.done
                ? <CheckCircle size={12} className="shrink-0 text-emerald-400" />
                : <Loader2 size={12} className="shrink-0 animate-spin" />
              }
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

          {m.actionCard && (
            <div className="rounded-[var(--radius)] border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
              <p className="mb-2 text-[12px] text-emerald-300">{m.actionCard.label}</p>
              {m.actionCard.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void confirmAction(m.actionCard!.action_id, index)}
                    aria-label="Confirm action"
                    className="rounded-[var(--radius)] bg-emerald-600 px-3 py-1 text-[12px] font-medium text-white hover:bg-emerald-500"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => void dismissAction(m.actionCard!.action_id, index)}
                    aria-label="Cancel action"
                    className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1 text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {m.actionCard.status === 'confirmed' && (
                <p className="flex items-center gap-1.5 text-[12px] text-emerald-400">
                  <CheckCircle size={12} /> Action confirmed
                </p>
              )}
              {m.actionCard.status === 'cancelled' && (
                <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-fg-subtle)]">
                  <XCircle size={12} /> Cancelled
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const allMessages: Array<{ msg: Message; index: number }> = [
    ...messages.map((msg, index) => ({ msg, index })),
    ...(streaming ? [{ msg: streaming as Message, index: messages.length }] : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4" role="log" aria-live="polite" aria-busy={loading}>
        {messages.length === 0 && !streaming && (
          <div className="pt-2">
            <p className="mb-4 text-[13px] text-[var(--color-fg-muted)]">
              Ask me anything about your agency — I have access to your live data.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SUGGESTED.map((q) => (
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
        )}

        {allMessages.map(({ msg, index }) => {
          if (msg.role === 'user') {
            return (
              <div key={index} className="flex justify-end coo-msg-enter">
                <div className="max-w-[80%] rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-4 py-3 text-[13px] leading-[1.6] text-white">
                  {msg.content}
                </div>
              </div>
            );
          }
          return renderAssistant(msg as AssistantMessage, index);
        })}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your COO anything…"
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
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--color-fg-subtle)]">
            Enter to send · Shift+Enter for new line
          </p>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={newChat}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)] disabled:opacity-40"
              aria-label="Start a new chat"
            >
              <Plus size={11} /> New chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
