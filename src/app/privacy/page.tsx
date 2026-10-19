import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '<npm>/lib/constants'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How information is handled when you visit the OpsRadar website.',
}

const sectionClass = 'text-body leading-[1.6]'
const headingClass =
  'text-h2 font-serif tracking-[-0.02em] text-[var(--color-fg)] mb-4'

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
            <p className="mt-4 text-body text-[var(--color-fg-muted)]">
              Last updated: October 19, 2026
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <div className="prose-readable space-y-8 text-[var(--color-fg-muted)]">
            <section>
              <h2 className={headingClass}>What this policy covers</h2>
              <p className={sectionClass}>
                OpsRadar currently provides this public website only. Account
                registration, a product dashboard, connected integrations,
                subscriptions, and product data processing are not available
                through this site.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Information handled by the website</h2>
              <p className={sectionClass}>
                The site has no account, contact, or signup forms and does not
                use a database or analytics service. Vercel hosts the static
                website and may process technical request information, such as
                an IP address, requested page, timestamp, and browser details,
                to deliver and protect the service. See{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  className="text-[var(--color-primary)] underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Vercel&apos;s privacy policy
                </a>{' '}
                for its handling of that information.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>External links</h2>
              <p className={sectionClass}>
                This website may link to third-party services, including
                Calendly and email. If you choose to follow one of those links
                or contact us, that provider handles information you submit
                under its own privacy policy. OpsRadar does not receive that
                information through this website.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Cookies and local storage</h2>
              <p className={sectionClass}>
                The website does not set advertising or analytics cookies. Your
                browser may retain ordinary technical data needed to load the
                site. You can manage or clear locally stored data using your
                browser settings.
              </p>
            </section>

            <section>
              <h2 className={headingClass}>Questions</h2>
              <p className={sectionClass}>
                For privacy questions, contact{' '}
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
