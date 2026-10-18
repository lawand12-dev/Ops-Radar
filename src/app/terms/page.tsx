import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTACT_EMAIL } from '<npm>/lib/constants'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Rules of using OpsRadar. Written plainly.',
  openGraph: {
    title: 'Terms of Service — OpsRadar',
    description: 'Rules of using OpsRadar. Written plainly.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Terms of Service — OpsRadar' }],
  },
  twitter: {
    title: 'Terms of Service — OpsRadar',
    description: 'Rules of using OpsRadar. Written plainly.',
    images: ['/og-image.png'],
  },
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/terms" />

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <RevealOnScroll delay={0} offset={32}>
          <div className="mb-16">
            <p className="text-label text-[var(--color-fg-subtle)]">Legal</p>
            <h1 className="mt-5 font-serif text-h1 leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
              Terms of Service
            </h1>
            <p className="mt-4 text-body text-[var(--color-fg-muted)]">Last updated: May 2026</p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
        <div className="prose-readable space-y-8 text-[var(--color-fg-muted)]">
          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">The deal</h2>
            <p className="text-body leading-[1.6]">
              OpsRadar is operated by the OpsRadar team (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
              By creating an account or using this website, you agree to these
              terms. If you don&apos;t agree, don&apos;t use the service.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">What we provide</h2>
            <p className="text-body leading-[1.6]">
              OpsRadar is a subscription SaaS product. Depending on your plan,
              you get access to: a free AI-powered operations audit, a live
              dashboard that reads from your connected tools, an AI COO chat
              assistant, automated weekly briefings, threshold alerts, and
              agentic workflow capabilities. The specific features available to
              you are listed on the{' '}
              <Link href="/pricing" className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 underline">
                pricing page
              </Link>
              {' '}for your plan.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Subscription plans and billing</h2>
            <p className="text-body leading-[1.6] mb-3">
              We offer four plans billed per agency:
            </p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6] mb-3">
              <li><strong className="text-[var(--color-fg)]">Starter</strong> — $750/month</li>
              <li><strong className="text-[var(--color-fg)]">Growth</strong> — $1,500/month</li>
              <li><strong className="text-[var(--color-fg)]">Pro</strong> — $3,000/month</li>
              <li><strong className="text-[var(--color-fg)]">Fractional Operator</strong> — $1,200/month base + $300/month per client agency (for partners managing multiple agencies)</li>
            </ul>
            <p className="text-body leading-[1.6] mb-3">
              All plans are billed monthly by default. Annual prepay is
              available at a 17% discount (two months free). Prices are in USD.
            </p>
            <p className="text-body leading-[1.6]">
              Your subscription renews automatically at the start of each
              billing cycle. You will receive an email receipt for each charge.
              If a payment fails, we will notify you and give you a grace period
              to update your payment method before access is suspended.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Cancellation</h2>
            <p className="text-body leading-[1.6]">
              You can cancel your subscription at any time from your account
              settings. Cancellation takes effect at the end of the current
              billing cycle — you keep access until then. We do not charge
              cancellation fees. Annual prepay subscriptions are not refunded
              pro-rata on cancellation, except during the money-back window
              described below.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Money-back guarantee</h2>
            <p className="text-body leading-[1.6] mb-3">
              If OpsRadar isn&apos;t working for you, tell us and we&apos;ll refund you:
            </p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6] mb-3">
              <li><strong className="text-[var(--color-fg)]">Starter and Growth</strong> — 30-day money-back, no questions asked</li>
              <li><strong className="text-[var(--color-fg)]">Pro</strong> — 60-day money-back, no questions asked</li>
            </ul>
            <p className="text-body leading-[1.6]">
              To claim a refund, email us within the window from your first
              charge date. We will process the refund within 5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Connected tools and your data</h2>
            <p className="text-body leading-[1.6] mb-3">
              OpsRadar connects to third-party tools — HubSpot, Pipedrive,
              ClickUp, Asana, Monday, Harvest, Toggl, Calendly, Apollo,
              and others — through OAuth or API keys you provide. By connecting
              a tool, you confirm you have the right to grant OpsRadar read
              access to that tool on behalf of your agency.
            </p>
            <p className="text-body leading-[1.6]">
              We read your data live to power features. We do not write to your
              connected tools except where an agentic action explicitly requires
              it — and those actions require your confirmation before executing.
              Your client business data is never stored in OpsRadar&apos;s database.
              See our{' '}
              <Link href="/privacy" className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 underline">
                Privacy Policy
              </Link>
              {' '}for the full detail.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Agentic actions</h2>
            <p className="text-body leading-[1.6]">
              Higher plans include agentic capabilities — for example, the AI
              COO can draft and queue invoices on your behalf. Agentic actions
              that create, send, or modify records in third-party tools require
              your explicit approval before they execute. You can undo
              most agentic actions within 30 minutes of triggering them. We are
              not liable for outcomes resulting from agentic actions you have
              approved.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">The audit is informational, not advice</h2>
            <p className="text-body leading-[1.6]">
              The free audit gives estimated numbers based on your inputs and
              industry benchmarks. It is a useful starting point, not a
              guarantee of savings. It is not a substitute for professional
              financial, legal, or consulting advice.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Acceptable use</h2>
            <p className="text-body leading-[1.6] mb-3">Don&apos;t use OpsRadar to:</p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6]">
              <li>Attempt to scrape, overload, or reverse-engineer the service</li>
              <li>Submit false or misleading information intentionally</li>
              <li>Connect tools you do not have authorisation to access</li>
              <li>Resell, sublicense, or white-label OpsRadar without a written partner agreement</li>
              <li>Use the service in ways that violate applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">No warranty</h2>
            <p className="text-body leading-[1.6]">
              The service is provided &ldquo;as is.&rdquo; We try to keep everything
              working and accurate, but we cannot guarantee the service is
              always available or that AI-generated analysis is always correct.
              Use your own judgment before acting on any output.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Limitation of liability</h2>
            <p className="text-body leading-[1.6]">
              To the maximum extent permitted by law, we are not liable for
              indirect, incidental, or consequential damages arising from your
              use of the service, including losses from reliance on AI-generated
              analysis or from agentic actions you approved. Our total liability
              for any direct claim is capped at the fees you paid in the 3
              months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Intellectual property</h2>
            <p className="text-body leading-[1.6]">
              The OpsRadar name, logo, and platform are ours. The audit report
              and dashboard outputs we generate for you are yours — share them,
              print them, use them freely. The underlying system, prompts, and
              research library stay ours.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Governing law</h2>
            <p className="text-body leading-[1.6]">
              These terms are governed by the laws of the Kurdistan Region of
              Iraq. Any disputes will be resolved in good faith through direct
              communication before any formal proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Changes to these terms</h2>
            <p className="text-body leading-[1.6]">
              If we update these terms, we will change the date at the top and
              notify active subscribers by email at least 14 days before
              material changes take effect. Continued use of the service after
              that date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Contact</h2>
            <p className="text-body leading-[1.6] mb-3">
              Questions about these terms:{' '}
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
