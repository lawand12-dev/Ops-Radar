'use client';

import { useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { PillarTag } from './pillar-tag';

const SUGGESTIONS = [
  'How are we pacing this month?',
  'Which workflow saved the most hours?',
  "Which client's margin dropped this week?",
  "What's overdue right now?",
];

/**
 * The BRAIN surface — the AI that lives inside the dashboard and answers
 * questions about the business. Placeholder UI; not yet wired to an LLM.
 *
 * Marketing positioning: "An AI that lives in your dashboard. Ask anything
 * in plain English. It knows your data, history, patterns."
 */
export function BrainAskBox() {
  const [value, setValue] = useState('');
  const enabled = value.trim().length > 0;

  return (
    <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 pt-3.5 pb-3">
      <PillarTag name="BRAIN" subtitle="Ask anything about your agency" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: wire to LLM endpoint. Phase 2.5.
        }}
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] pl-3 pr-1 py-1"
      >
        <Sparkles size={14} className="shrink-0 text-[var(--color-primary)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Which client lost the most margin this month?"
          className="flex-1 border-none bg-transparent px-1 py-2 text-body text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] outline-none"
        />
        <button
          type="submit"
          aria-label="Ask BRAIN"
          disabled={!enabled}
          className={cn(
            'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius)]',
            'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            enabled
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] cursor-pointer'
              : 'border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-fg-faint)] cursor-not-allowed',
          )}
        >
          <ArrowUp size={14} strokeWidth={2.4} />
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            className="rounded-full border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-[11.5px] text-[var(--color-fg-muted)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
