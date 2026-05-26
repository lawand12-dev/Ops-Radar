// src/app/dashboard/settings/usage/page.tsx
//
// CP-23 — customer-facing view of their external API usage this month
// across OpenAI, Nango, Tavily, and Anthropic. Renders client-side
// from the GET /api/dashboard/usage endpoint so we can refresh + show
// a live progress bar per provider.

import { UsageDashboard } from './_components/usage-dashboard';

export const dynamic = 'force-dynamic';

export default function UsagePage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Usage this month
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Your AI compute, integration calls, and web research consumption for the current calendar month. Caps reset on the 1st. Approaching a cap? Talk to us about upgrading or raising your limit.
        </p>
      </div>
      <UsageDashboard />
    </>
  );
}
