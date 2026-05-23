// src/app/audit/page.tsx
//
// CP-16: the prospect-facing audit funnel was retired with the n8n / chatv2
// sever. The page now reserves the URL with a "demo coming soon" placeholder.
// Marketing pages across the site still link to /audit; keeping the route
// alive avoids 404s while we build the interactive product demo.

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo — OpsRadar',
  description:
    'A live, narrated demo of the AI Chief of Staff for marketing agencies is coming soon. Leave your email and we will send you the first run.',
};

export const dynamic = 'force-static';

export default function AuditPlaceholderPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--color-primary)]">
        Coming soon
      </div>

      <h1 className="mb-3 font-serif text-[40px] font-normal leading-[1.1] tracking-[-0.02em] text-[var(--color-fg)] sm:text-[48px]">
        The live demo is being built.
      </h1>

      <p className="mb-8 max-w-[480px] text-[15px] leading-[1.55] text-[var(--color-fg-muted)]">
        A guided, narrated walkthrough of the AI Chief of Staff — your cron agents
        working through real agency data, your Notion brain populating, your
        approval queue catching the risky writes. We will publish the first run
        in the coming weeks.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-90"
        >
          See pricing
        </Link>
        <Link
          href="/product"
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 py-2.5 text-[13px] font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)]"
        >
          How it works
        </Link>
      </div>

      <p className="mt-8 text-[12px] text-[var(--color-fg-subtle)]">
        Want early access? Email{' '}
        <a href="mailto:hello@opsradar.app" className="text-[var(--color-primary)] hover:underline">
          hello@opsradar.app
        </a>
        .
      </p>
    </main>
  );
}
