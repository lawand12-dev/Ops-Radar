/**
 * /dashboard/hire — the dedicated Hiring chat surface (CP-38).
 *
 * Sibling to /dashboard/coo. Where COO answers business questions, this
 * surface is purpose-built for the customer to BUILD their AI workforce —
 * matching the Notion 3.3 / Lindy 3.0 / Microsoft Copilot Studio pattern
 * where Q&A and agent-builder live on separate routes.
 */

import { HireShell } from './_components/hire-shell'

export const dynamic = 'force-dynamic'

export default function HirePage() {
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Hire</span>
        </div>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Hire an AI employee
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Describe the role in plain English — name, schedule, tools, first task. I&rsquo;ll draft the spec; you click Hire when you&rsquo;re ready.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <HireShell />
      </div>
    </div>
  )
}
