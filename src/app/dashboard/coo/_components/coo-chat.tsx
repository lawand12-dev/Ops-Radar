'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

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
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/coo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { message?: string; error?: string };
      setMessages([...next, {
        role: 'assistant',
        content: data.message ?? 'Something went wrong. Please try again.',
      }]);
    } catch {
      setMessages([...next, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
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

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 text-[13px] leading-[1.6] ${
                m.role === 'user'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <Loader2 size={14} className="animate-spin text-[var(--color-fg-subtle)]" />
              <span className="text-[12.5px] text-[var(--color-fg-subtle)]">Thinking…</span>
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
            placeholder="Ask your COO anything…"
            rows={1}
            className="flex-1 resize-none rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-fg-subtle)]"
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
