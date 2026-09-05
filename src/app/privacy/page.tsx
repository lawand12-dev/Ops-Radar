import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '<npm>/lib/constants'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How OpsRadar handles your data. Written plainly.',
  openGraph: {
    title: 'Privacy Policy — OpsRadar',
    description: 'How OpsRadar handles your data. Written plainly.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Privacy Policy — OpsRadar' }],
  },
  twitter: {
    title: 'Privacy Policy — OpsRadar',
    description: 'How OpsRadar handles your data. Written plainly.',
    images: ['/og-image.png'],
  },
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/privacy" />

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <RevealOnScroll delay={0} offset={32}>
          <div className="mb-16">
            <p className="text-label text-[var(--color-fg-subtle)]">Legal</p>
            <h1 className="mt-5 font-serif text-h1 leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
              Privacy Policy
            </h1>
            <p className="mt-4 text-body text-[var(--color-fg-muted)]">Last updated: May 2026</p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
        <div className="prose-readable space-y-8 text-[var(--color-fg-muted)]">
          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">The short version</h2>
            <p className="text-body leading-[1.6]">
              We collect the minimum data needed to run the service. Your client
              business data — everything read from HubSpot, ClickUp, Harvest,
              Stripe, and every other tool you connect — is never stored in
              OpsRadar&apos;s database. It is read live, used to answer your
              question or generate your briefing, and discarded. We do not sell
              your data. We do not share it with advertisers. Email us to delete
              your account and we&apos;ll do it within 7 days.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">What we collect about you</h2>
            <p className="text-body leading-[1.6] mb-3">
              When you create an account or complete the audit form:
            </p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6]">
              <li>Name, work email, and company name</li>
              <li>Password (hashed — we never see the plaintext)</li>
              <li>Subscription plan and billing status (not payment card details — those stay with Stripe)</li>
              <li>Audit answers and your generated audit report</li>
              <li>Your website URL if you provide one</li>
              <li>IP address (standard logs, used for rate limiting and abuse prevention)</li>
              <li>Page views via Vercel Analytics (cookieless, no personal profile built)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Your connected tools — the critical rule</h2>
            <p className="text-body leading-[1.6] mb-3">
              The AI COO connects to tools your agency already uses: HubSpot,
              Pipedrive, ClickUp, Asana, Monday, Harvest, Toggl, Stripe,
              Calendly, Apollo, and others. When you connect a tool, we store
              the OAuth token or the encrypted API key you provide. That
              credential is the only thing we persist.
            </p>
            <p className="text-body leading-[1.6] mb-3">
              <strong className="text-[var(--color-fg)]">Your client business data is never written to our database.</strong>{' '}
              When the AI COO answers a question or generates a briefing, it
              reads live from your connected tools through the stored credential,
              reasons over the result, and returns the answer. The underlying
              data — deal values, time entries, invoices, contacts — is never
              retained on our servers.
            </p>
            <p className="text-body leading-[1.6]">
              You can revoke any credential at any time from your dashboard.
              Revocation immediately removes the stored key and disables all
              reads from that tool.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Why we collect what we collect</h2>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6]">
              <li><strong className="text-[var(--color-fg)]">Account data</strong> — to authenticate you, manage your subscription, and send product and billing emails</li>
              <li><strong className="text-[var(--color-fg)]">Audit answers</strong> — to generate your personalized audit report</li>
              <li><strong className="text-[var(--color-fg)]">Tool credentials</strong> — to read live data from your connected tools on demand</li>
              <li><strong className="text-[var(--color-fg)]">IP address</strong> — to enforce rate limits and block abuse on AI endpoints</li>
              <li><strong className="text-[var(--color-fg)]">Analytics</strong> — to understand which pages and features are useful</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Where your data lives</h2>
            <p className="text-body leading-[1.6]">
              Account, subscription, and audit data is stored in Supabase
              (US-based PostgreSQL). Encrypted tool credentials are stored in
              Supabase using column-level encryption. Transactional emails
              (welcome, billing, briefings) are sent via Resend. Rate limiting
              and session caching use Upstash Redis. The application is hosted
              on Vercel. Analytics is Vercel Analytics &mdash; cookieless and
              GDPR-friendly. We do not use Google Analytics, Facebook Pixel, or
              any advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Subprocessors and AI</h2>
            <p className="text-body leading-[1.6] mb-3">
              The AI COO uses Claude (Anthropic) to reason over your live data
              and answer questions. When you ask a question or request a
              briefing, the relevant data read from your tools is passed to
              Anthropic&apos;s API to generate the response. Anthropic does not
              use your business data to train its models. Their privacy policy
              is at anthropic.com/privacy.
            </p>
            <p className="text-body leading-[1.6]">
              Our full subprocessor list: Supabase, Vercel, Resend, Upstash,
              Anthropic, Stripe (payment processing). We do not sell your data
              to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Cookies and local storage</h2>
            <p className="text-body leading-[1.6]">
              OpsRadar uses no tracking cookies. Authentication uses a secure
              HTTP-only session cookie set by Supabase. There is a small
              localStorage entry for your theme preference. No advertising
              pixels, no third-party trackers, no fingerprinting.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">How long we keep your data</h2>
            <p className="text-body leading-[1.6]">
              Account and audit data is retained for the duration of your
              subscription plus 90 days after cancellation. After 90 days,
              your account and all associated data is permanently deleted. Tool
              credentials are deleted immediately when you revoke them or
              cancel your subscription. If you want everything deleted sooner,
              email us.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Your rights</h2>
            <p className="text-body leading-[1.6] mb-3">
              Regardless of where you are, you can:
            </p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6] mb-3">
              <li>Request a copy of all data we hold about you</li>
              <li>Correct anything that is wrong</li>
              <li>Delete your account and all data</li>
              <li>Revoke any tool integration at any time from your dashboard</li>
              <li>Unsubscribe from marketing emails (every email has an unsubscribe link)</li>
            </ul>
            <p className="text-body leading-[1.6]">
              To exercise any of these rights, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 underline">
                {CONTACT_EMAIL}
              </a>
              . We&apos;ll reply within 3 business days.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Changes to this policy</h2>
            <p className="text-body leading-[1.6]">
              If we change anything material, we&apos;ll update the date at the top
              and notify active subscribers by email before the change takes
              effect. We will not silently expand what we collect or share.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Contact</h2>
            <p className="text-body leading-[1.6] mb-3">
              Questions, data requests, or concerns:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-body leading-[1.6]">
              — The OpsRadar Team
            </p>
          </section>
        </div>
        </RevealOnScroll>
      </main>

      <SiteFooter />
    </div>
  )
}
