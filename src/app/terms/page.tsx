import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '<npm>/lib/constants'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'

export const metadata: Metadata = {
  title: 'Terms of Service — OpsRadar',
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
        <div className="mb-16">
          <p className="text-label text-[var(--color-fg-subtle)]">Legal</p>
          <h1 className="mt-5 font-serif text-h1 leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
            Terms of Service
          </h1>
          <p className="mt-4 text-body text-[var(--color-fg-muted)]">Last updated: April 2026</p>
        </div>

        <div className="prose-readable space-y-8 text-[var(--color-fg-muted)]">
          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">The deal</h2>
            <p className="text-body leading-[1.6]">
              OpsRadar is operated by the OpsRadar team (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using this
              website, you agree to these terms. If you don&apos;t agree, don&apos;t
              use the site.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">What we provide</h2>
            <p className="text-body leading-[1.6]">
              This site offers a free AI-powered audit of agency operations,
              educational content about automation, and access to book a
              paid consultation or workflow build. The audit is automated
              software. The paid services are custom engagements we agree on
              in writing before work begins.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">The audit is informational, not advice</h2>
            <p className="text-body leading-[1.6]">
              The audit report gives estimated numbers based on your inputs
              and industry benchmarks. It&apos;s a decent starting point for
              thinking about your operations. It&apos;s not a guarantee that you&apos;ll
              save that exact amount. It&apos;s not a substitute for professional
              consulting, legal advice, or financial planning.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Acceptable use</h2>
            <p className="text-body leading-[1.6] mb-3">Don&apos;t use OpsRadar to:</p>
            <ul className="space-y-2 list-disc pl-6 text-body leading-[1.6]">
              <li>Attempt to overload, scrape, or reverse-engineer the service</li>
              <li>Submit false or misleading information intentionally</li>
              <li>Use the audit output to harm other people or businesses</li>
              <li>Resell the audit reports as your own product</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Paid services</h2>
            <p className="text-body leading-[1.6]">
              If you book a paid build or strategy call, we&apos;ll agree on scope,
              price, and timeline in writing before any work begins. Paid
              services are governed by that specific engagement agreement,
              not these general terms.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">No warranty</h2>
            <p className="text-body leading-[1.6]">
              The site and audit are provided &ldquo;as is.&rdquo; We try to keep everything
              working, but we can&apos;t guarantee the site is always available,
              the audit is always accurate, or the output fits your exact
              situation. Use it at your own judgment.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Limitation of liability</h2>
            <p className="text-body leading-[1.6]">
              To the maximum extent permitted by law, we are not liable for any
              indirect, incidental, or consequential damages arising from your
              use of the free audit or this website. If you think we directly
              caused you harm through a paid engagement, that&apos;s governed by
              the specific engagement agreement we signed.
            </p>
          </section>

          <section>
            <h2 className="text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4">Intellectual property</h2>
            <p className="text-body leading-[1.6]">
              The OpsRadar name, logo, and website content are ours. The audit
              report we generate for you is yours — you can share it, print it,
              quote from it freely. The underlying system and research library
              that produced it stays ours.
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
              If we update these terms, we&apos;ll change the date at the top.
              Material changes will be announced on the homepage.
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
      </main>

      <SiteFooter />
    </div>
  )
}
