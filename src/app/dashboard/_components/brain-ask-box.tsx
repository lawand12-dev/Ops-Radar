'use client';

import { useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { C } from '<npm>/app/dashboard/_lib/theme';
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

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '16px 18px 14px',
        marginBottom: 18,
      }}
    >
      <PillarTag
        name="BRAIN"
        subtitle="Ask anything about your agency"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: wire to LLM endpoint. Phase 2.5.
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: C.cardHover,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '4px 6px 4px 12px',
        }}
      >
        <Sparkles size={14} color={C.accent} style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Which client lost the most margin this month?"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontSize: 14,
            padding: '8px 4px',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          aria-label="Ask BRAIN"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            background: value.trim() ? C.accent : C.cardHover,
            border: value.trim() ? 'none' : `1px solid ${C.border}`,
            borderRadius: 8,
            color: value.trim() ? '#1E1B4B' : C.muted,
            cursor: value.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          disabled={!value.trim()}
        >
          <ArrowUp size={14} strokeWidth={2.4} />
        </button>
      </form>

      <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              color: C.sub,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = C.sub;
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
