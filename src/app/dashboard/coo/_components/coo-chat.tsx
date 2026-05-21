'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

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
  const [streaming, setStreaming] = useState<AssistantMessage | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: UserMessage = { role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    const draft: AssistantMessage = { role: 'assistant', content: '', toolSteps: [], actionCard: null };
    setStreaming(draft);

    try {
      const res = await fetch('/api/dashboard/coo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
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
          const event = JSON.parse(line.slice(6)) as AgentEvent;

          if (event.type === 'tool_call') {
            setStreaming((prev) => {
              if (!prev) return prev;
              return { ...prev, toolSteps: [...prev.toolSteps, { name: event.name, label: event.label, done: false }] };
            });
          }

          if (event.type === 'tool_done') {
            setStreaming((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                toolSteps: prev.toolSteps.map((s) => s.name === event.name ? { ...s, done: true } : s),
              };
            });
          }

          if (event.type === 'text_delta') {
            setStreaming((prev) => {
              if (!prev) return prev;
              return { ...prev, content: prev.content + event.delta };
            });
          }

          if (event.type === 'action_proposed') {
            setStreaming((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                actionCard: {
                  action_id: event.action_id,
                  action_type: event.action_type,
                  label: event.label,
                  status: 'pending',
                },
              };
            });
          }

          if (event.type === 'done' || event.type === 'error') {
            setStreaming((prev) => {
              if (!prev) return prev;
              const finalContent = event.type === 'error' ? event.message : prev.content;
              const finalMsg: AssistantMessage = { ...prev, content: finalContent };
              setMessages((m) => [...m, finalMsg]);
              return null;
            });
          }
        }
      }
    } catch {
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
    return (
      <div key={index} className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          {m.toolSteps.map((step, si) => (
            <div
              key={si}
              className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] text-[var(--color-primary)]"
            >
              {step.done
                ? <CheckCircle size={12} className="shrink-0 text-emerald-400" />
                : <Loader2 size={12} className="shrink-0 animate-spin" />
              }
              {step.label}
            </div>
          ))}

          {m.content && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px] leading-[1.6] text-[var(--color-fg)]">
              {m.content}
            </div>
          )}

          {m.actionCard && (
            <div className="rounded-[var(--radius)] border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
              <p className="mb-2 text-[12px] text-emerald-300">{m.actionCard.label}</p>
              {m.actionCard.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void confirmAction(m.actionCard!.action_id, index)}
                    className="rounded-[var(--radius)] bg-emerald-600 px-3 py-1 text-[12px] font-medium text-white hover:bg-emerald-500"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => void dismissAction(m.actionCard!.action_id, index)}
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
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
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
              <div key={index} className="flex justify-end">
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
  );
}
