'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

export function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-2)]/40"
      >
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--color-fg)]">
          <Info size={14} className="text-[var(--color-primary)]" />
          How automations work
        </span>
        <ChevronDown
          size={14}
          className={`text-[var(--color-fg-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] px-4 py-3.5 text-[12.5px] leading-[1.6] text-[var(--color-fg-muted)]">
          <p className="mb-2">
            An automation is a customer-built reflex. When a specific event happens in a connected tool — a HubSpot deal closes, a Stripe invoice goes overdue, a Slack message lands — the automation runs the plan you described to Ask COO.
          </p>
          <ul className="ml-5 list-disc space-y-1 text-[12px]">
            <li>
              <span className="text-[var(--color-fg)]">Built in chat.</span> Describe what you want in plain English to Ask COO. It compiles a draft, you confirm, it installs.
            </li>
            <li>
              <span className="text-[var(--color-fg)]">Approval-gated.</span> Set autonomy to <span className="font-mono text-[11.5px]">ask</span> to review each step before it runs, <span className="font-mono text-[11.5px]">auto</span> to let it fly, <span className="font-mono text-[11.5px]">off</span> to disable execution.
            </li>
            <li>
              <span className="text-[var(--color-fg)]">Visible to every agent.</span> The COO and cron agents both know what&rsquo;s running here so they don&rsquo;t duplicate work.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
