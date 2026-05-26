// src/app/dashboard/settings/automation/page.tsx
//
// CP-14 Day 4b — per-tool autonomy settings.
//
// For each connected toolkit, the customer can flip:
//   Ask every time — write actions queue for approval (default)
//   Auto-approve   — write actions fire immediately (still audited)
//   Disabled       — write actions return an error to the model

import { AutomationSettings } from './_components/automation-settings';

export const dynamic = 'force-dynamic';

export default function AutomationSettingsPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Tool Autonomy
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Control how much freedom your AI Ops Team has when writing to each connected tool. Reads are always free — these settings only affect write actions (sending email, charging cards, updating records).
        </p>
      </div>
      <AutomationSettings />
    </>
  );
}
