import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '<npm>/lib/constants'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — OpsRadar',
  description: 'How OpsRadar handles your data. Written plainly by the OpsRadar team.',
  openGraph: {
    title: 'Privacy Policy — OpsRadar',
    description: 'How OpsRadar handles your data. Written plainly by the OpsRadar team.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Privacy Policy — OpsRadar' }],
  },
  twitter: {
    title: 'Privacy Policy — OpsRadar',
    description: 'How OpsRadar handles your data. Written plainly by the OpsRadar team.',
    images: ['/og-image.png'],
  },
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/privacy" />

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-16">
          <p className="text-label text-[var(--color-fg-subtle)]">Legal</p>
          <h1 className="mt-5 font-serif text-h1 leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
            Privacy Policy
          </h1>
          <p className="mt-4 text-body text-[var(--color-fg-muted)]">Last updated: April 2026</p>
        </div>

        <div className="prose-readable space-y-8 text-[var(--color-fg-muted)]">
          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">The short version</h2>
            <p className="text-body leading-[1.6]">
              When you use this site, we collect the minimum data needed to give
              you useful output. We don&apos;t sell your data. We don&apos;t share it with
              advertisers. If you want us to delete everything we have on you,
              email us and we&apos;ll do it.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">What we collect</h2>
            <p className="text-body leading-[1.6] mb-3">When you complete an audit, we collect:</p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6]">
              <li>Your name, work email, and company name (you type these in Step 1)</li>
              <li>Your answers to the audit questions</li>
              <li>Your website URL if you provide one</li>
              <li>Your IP address (standard web server logs, for rate limiting)</li>
              <li>Page views via Vercel Analytics (no cookies, no personal profile)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Why we collect it</h2>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6]">
              <li>Your name/email/company: to send you the audit report and follow up about it</li>
              <li>Your audit answers: to generate your personalized report</li>
              <li>Your website URL: to make the audit more specific to your actual stack</li>
              <li>Your IP: to prevent abuse and rate-limit the AI endpoint</li>
              <li>Analytics: to know which pages prospects find useful</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Where your data lives</h2>
            <p className="text-body leading-[1.6]">
              Your audit data is stored in Supabase (US-based PostgreSQL database).
              Emails are sent through Resend. Rate limiting uses Upstash Redis.
              The site is hosted on Vercel. Analytics is Vercel Analytics &mdash;
              cookieless and privacy-friendly. We do not use Google Analytics,
              Facebook Pixel, or any other tracking.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Who we share it with</h2>
            <p className="text-body leading-[1.6] mb-3">
              Nobody, except the subprocessors listed above (Supabase, Resend,
              Vercel, Upstash) who help us run the service. We don&apos;t sell your
              data. We don&apos;t share it with advertisers.
            </p>
            <p className="text-body leading-[1.6]">
              Your audit inputs ARE sent to OpenAI&apos;s API to generate the report
              itself. OpenAI processes the text and returns the audit. They
              have their own privacy policy which you can read at openai.com/privacy.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">How long we keep it</h2>
            <p className="text-body leading-[1.6]">
              Audit records are retained indefinitely so you can return to your
              results URL. If you want your data deleted, email us and we&apos;ll
              remove it within 7 days.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Your rights</h2>
            <p className="text-body leading-[1.6] mb-3">
              If you&apos;re in the EU (GDPR) or California (CCPA), you have the
              right to:
            </p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6] mb-3">
              <li>Know what data we have about you</li>
              <li>Correct it if it&apos;s wrong</li>
              <li>Delete it entirely</li>
              <li>Export it in a readable format</li>
              <li>Opt out of follow-up emails (every email has an unsubscribe link)</li>
            </ul>
            <p className="text-body leading-[1.6]">
              To exercise any of these rights, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 underline">
                {CONTACT_EMAIL}
              </a>
              . No form to fill out. We&apos;ll reply within 3 business days.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Cookies</h2>
            <p className="text-body leading-[1.6]">
              OpsRadar uses no tracking cookies. There&apos;s a small localStorage
              entry for your theme preference (light/dark mode) &mdash; that&apos;s it.
              No advertising pixels, no third-party trackers, no fingerprinting.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Changes to this policy</h2>
            <p className="text-body leading-[1.6]">
              If we change anything material, we&apos;ll update the &ldquo;Last updated&rdquo;
              date at the top and note what changed. We won&apos;t silently expand
              what we collect.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Contact</h2>
            <p className="text-body leading-[1.6] mb-3">
              Questions, concerns, or data requests:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-body leading-[1.6]">
              — The OpsRadar Team
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
