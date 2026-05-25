// /dashboard/integrations/setup — the post-Notion-OAuth progress page (CP-24).
//
// When the customer completes the Notion OAuth flow, Composio redirects them
// back to /dashboard/integrations?connected=notion. From there a "View setup
// progress" link brings them here, where we poll /api/dashboard/brain-status
// every 3 seconds and render a 4-checkpoint progress display.
//
// When the Brain is ready (all 20 DBs + Brain Home exist), we surface a CTA
// to either open the Brain in Notion or land on /dashboard/brain.

import { BrainSetupProgress } from './_components/brain-setup-progress';

export const dynamic = 'force-dynamic';

export default function BrainSetupPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Setting up your Company Brain
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          We&apos;re creating 20 databases in your Notion and pulling 12 months of data from your connected tools. This usually takes 3–5 minutes — you can leave this page and come back.
        </p>
      </div>
      <BrainSetupProgress />
    </>
  );
}
