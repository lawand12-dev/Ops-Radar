import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'For Paid-Media Agencies — OpsRadar',
  description:
    "n8n automation for paid-media shops under 20 people. Meta + Google + Shopify + Klaviyo reports that build themselves. Pacing alerts tied to MER, not last-click ROAS. Onboarding that cuts BM-access-to-first-report from 3 weeks to 5 days.",
  openGraph: {
    title: 'For Paid-Media Agencies — OpsRadar',
    description:
      "n8n automation for paid-media shops under 20 people. Reports that build themselves. Pacing alerts tied to MER. Onboarding in days, not weeks.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Paid-Media Agencies' }],
  },
  twitter: {
    title: 'For Paid-Media Agencies — OpsRadar',
    description:
      "n8n automation for paid-media shops under 20 people. Reports that build themselves. Pacing alerts tied to MER. Onboarding in days, not weeks.",
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Paid-Media', href: '/for/paid-media', isActive: true },
  { label: 'SEO', href: '/for/seo' },
  { label: 'Full-Service', href: '/for/full-service' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

const WHAT_I_BUILD_FOR_PAID_MEDIA = [
  {
    title: 'Monthly client reports that build themselves.',
    desc: 'Meta + Google + Shopify + Klaviyo + Triple Whale rolled up into a branded PDF or Looker board. Delivered on the 2nd of every month. You stop Sunday report nights.',
  },
  {
    title: 'Onboarding that ships in 5 days, not 3 weeks.',
    desc: 'Business Manager access, pixel installation, GA4 configuration, Conversion API, MCC link — turned into a one-click workflow. 10\u201315 hours of senior time saved per new client.',
  },
  {
    title: 'Pacing alerts tied to MER, not last-click ROAS.',
    desc: 'Daily Slack alerts that flag when MER drops below your threshold, not when Facebook\u2019s attribution lies to you. No more Valentine\u2019s Day budget fires.',
  },
  {
    title: 'Creative performance rollups, auto-tagged.',
    desc: 'Cross-platform creative performance pulled into Motion or Notion, tagged by hook, format, and offer. See what\u2019s actually working before the account review call.',
  },
  {
    title: 'Account audit automation.',
    desc: 'Disapproved ads, low-quality-score keywords, creative fatigue flags, pixel firing failures \u2014 caught daily, surfaced in Slack, before your client notices.',
  },
  {
    title: 'Invoicing reconciliation.',
    desc: 'Flat retainer + true-up on ad spend over threshold, reconciled against platform spend automatically. No more month-end spreadsheet panic.',
  },
]

const YOUR_STACK = [
  'Meta Ads Manager',
  'Google Ads',
  'TikTok Ads',
  'GA4',
  'Triple Whale / Northbeam / Hyros',
  'Motion / Atria / Varos',
  'Supermetrics / Windsor.ai / Improvado',
  'Looker Studio / AgencyAnalytics / Whatagraph',
  'Klaviyo',
  'Shopify',
  'Slack',
  'Notion / ClickUp',
]

const FAQS = [
  {
    q: 'We already use Zapier. Why switch?',
    a: 'Zapier works at low volume. The moment your reporting workflows run hundreds of times a day \u2014 pulling Meta, Google, Shopify, Klaviyo \u2014 you hit Zapier\u2019s per-task pricing wall. Typical agency Zapier retainer: $500\u2013$2,000/month. Your own n8n account: flat $20/month, unlimited runs. I move the workflows over and rebuild them properly.',
  },
  {
    q: 'We built it in n8n ourselves and it broke. Why will this be different?',
    a: 'Because you\u2019re running a paid-media shop, not an ops shop. I\u2019ve built 30+ agency workflows and know the specific breakage points \u2014 Meta\u2019s API deprecations, Shopify rate limits, Klaviyo\u2019s list sync quirks. I build it, monitor it, and fix it when it breaks. You never touch the canvas.',
  },
  {
    q: 'How do you compete with Motion, Varos, AgencyAnalytics?',
    a: 'I don\u2019t. Those tools each solve one slice \u2014 creative analytics, benchmarks, reporting dashboards. I connect them together and plug the gaps in your workflow. Most of my paid-media clients keep their existing tools and use me to stitch them into one system.',
  },
  {
    q: 'Can you work with Advantage+ and Performance Max reporting?',
    a: 'Yes. I pull spend, conversions, ASC creative IDs, and search-term data where the API allows it \u2014 and flag the parts the black box won\u2019t show you. You get the clearest picture the platforms permit, not a pretty report that pretends PMax gave you more than it did.',
  },
]

export default function ForPaidMediaPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />
      <SegmentPageAnalytics segment="paid-media" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'n8n Automation for Paid-Media Agencies',
            provider: {
              '@type': 'Organization',
              name: 'OpsRadar',
              url: 'https://www.opsradar.co',
              founder: { '@type': 'Person', name: 'Lawand Soran' },
            },
            areaServed: ['US', 'CA', 'GB', 'AU', 'IE'],
            audience: {
              '@type': 'BusinessAudience',
              audienceType: 'Paid-Media Agencies',
              numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 20 },
            },
            description:
              'Custom n8n automations for paid-media shops under 20 people. Client reporting rollups from Meta, Google, Klaviyo; pacing alerts tied to MER; onboarding that cuts BM-access-to-first-report from 3 weeks to 5 days.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: 400,
              highPrice: 4500,
              offerCount: 6,
            },
            url: 'https://www.opsradar.co/for/paid-media',
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            For paid-media agencies
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            Your Sunday nights were for your family.
          </h1>
          <p className="font-headline text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/80 mb-8">
            Not for stitching Meta + Google + Klaviyo reports.
          </p>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            I build n8n automations for paid-media shops under 20 people. Monthly client reports
            that build themselves. Pacing alerts tied to MER. Onboarding that cuts
            BM-access-to-first-report from 3 weeks to 5 days. You own every workflow in your
            n8n account. I build them, I maintain them, you get your strategy hours back.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── What I build ──────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What I build for paid-media shops
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Six workflows that kill Sunday nights.
          </h2>
          <div className="space-y-0">
            {WHAT_I_BUILD_FOR_PAID_MEDIA.map(({ title, desc }, i) => (
              <div key={title}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4 md:gap-12 py-8 md:py-10">
                  <h3 className="text-base font-semibold text-white/90 tracking-[-0.01em]">
                    {title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-white/[0.65]">
                    {desc}
                  </p>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Your stack ────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Your stack, my workflows
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-10">
            I work inside the tools you already pay for.
          </h2>
          <div className="flex flex-wrap gap-2">
            {YOUR_STACK.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-[13px] text-white/70"
              >
                {tool}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/40 mt-6 max-w-2xl leading-relaxed">
            If your tool isn't here, it probably still works — n8n connects to anything with an API or webhook. Ask me in the audit.
          </p>
        </section>
      </FadeInOnScroll>

      {/* ── Cost of NOT automating ────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What it costs to keep doing it manually
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-8">
            The math most founders don't run.
          </h2>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/[0.7]">
            <p>
              A 10-person paid-media shop typically spends <span className="text-white font-semibold">20–40 hours/week</span> on reporting, onboarding, and alerts — work that automation eliminates within weeks.
            </p>
            <p>
              At $85/hour fully loaded, that's <span className="text-white font-semibold">$88,400–$176,800/year</span> of senior time going to tasks a workflow handles overnight.
            </p>
            <p>
              The same shop pays <span className="text-white font-semibold">$500–$2,000/month for a Zapier retainer</span> that breaks at scale, or <span className="text-white font-semibold">$5,500–$9,500/month for an ops coordinator</span> who still needs managing.
            </p>
            <p>
              OpsRadar retainers run <span className="text-white font-semibold">$400–$1,500/month</span>. Most paid-media shops break even in about six weeks.
            </p>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Questions
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-14">
            What paid-media founders ask me first.
          </h2>
          <div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <div className="py-6">
                  <p className="font-semibold text-[14px] text-white/80 mb-2">{q}</p>
                  <p className="text-[13px] text-[rgba(255,255,255,0.65)] leading-[1.7]">{a}</p>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            Stop pulling reports at 10pm.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Real dollar numbers for your agency. No commitment.
          </p>
          <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
            <Link href="/audit">Start Free Audit &rarr;</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
