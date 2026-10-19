import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '<npm>/lib/constants'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms for using the OpsRadar public website.',
}

const sectionClass = 'text-body leading-[1.6]'
const headingClass =
  'text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4'

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/terms" />

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <RevealOnScroll delay={0} offset={32}>
          <div className="mb-16">
            <p className="text-label text-[var(--color-fg-subtle)]">Legal</p>
            <h1 className="mt-5 font-serif text-h1 leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
              Terms of Use
            </h1>
            <p className="mt-4 text-body text-[var(--color-fg-muted)]">
              Last updated: October 19, 2026
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <div className="prose-readable space-y-8 text-[var(--color-fg-muted)]">
            <section>
              <h2 className={headingClass}>Website only</h2>
              <p className={sectionClass}>
                OpsRadar currently provides an informational website. It does
                not provide account access, a hosted software service,
                integrations, AI operations, subscriptions, or purchases.
                Product descriptions, feature lists, and pricing references
                elsewhere on this site may describe concepts or earlier plans;
                they are not an offer or promise that those services are
                currently available.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Use of the site</h2>
              <p className={sectionClass}>
                You may browse the website for lawful, personal or business
                informational purposes. Do not attempt to disrupt, damage, or
                gain unauthorized access to the website or its hosting
                infrastructure.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Information is not professional advice</h2>
              <p className={sectionClass}>
                Website content is provided for general information only. It is
                not financial, legal, accounting, or other professional advice,
                and should not be relied on as a substitute for advice from a
                qualified professional.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>External services</h2>
              <p className={sectionClass}>
                Links to third-party websites are provided for convenience.
                OpsRadar does not control those sites and is not responsible
                for their content, availability, or practices. Your use of
                third-party services is subject to their own terms.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Availability and liability</h2>
              <p className={sectionClass}>
                The website is provided as available, without a guarantee that
                it will always be accessible, current, or error-free. To the
                extent permitted by applicable law, OpsRadar is not liable for
                losses arising from your use of, or inability to use, this
                informational website.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Changes and contact</h2>
              <p className={sectionClass}>
                These terms may be updated by revising the date above. Questions
                can be sent to{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-[var(--color-primary)] underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </RevealOnScroll>
      </main>

      <SiteFooter />
    </div>
  )
}
