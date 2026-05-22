'use client';

import { BriefingInbox } from '../_components/briefing-inbox';

export default function BriefingsPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Briefings</span>
        </div>
      </div>

      <div>
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Briefings
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Your COO&apos;s daily readout — what changed, what needs attention, what to do today.
        </p>
      </div>

      <BriefingInbox />
    </div>
  );
}
