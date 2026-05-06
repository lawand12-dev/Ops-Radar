import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'For E-commerce Agencies — OpsRadar',
  description:
    "n8n automation for e-commerce and Shopify Plus partner agencies under 25 people. Multi-store reporting across Shopify, Klaviyo, and Triple Whale. Subscription churn early warning before MRR drops. Klaviyo flow audits without a manual scan. Sale-prep that isn't a 60-hour fire drill.",
  openGraph: {
    title: 'For E-commerce Agencies — OpsRadar',
    description:
      "n8n automation for e-commerce agencies under 25 people. Cross-tool reporting across Shopify + Klaviyo + Triple Whale. Subscription churn early warning. Klaviyo flow audits, automated.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for E-commerce Agencies' }],
  },
  twitter: {
    title: 'For E-commerce Agencies — OpsRadar',
    description:
      "n8n automation for e-commerce agencies under 25 people. Cross-tool reporting across Shopify + Klaviyo + Triple Whale. Subscription churn early warning.",
    images: ['/og-image.png'],
  },
}

const WHAT_I_BUILD_FOR_ECOMMERCE = [
  {
    title: 'Multi-store performance rollups across the whole stack.',
    desc: 'Shopify orders + Klaviyo revenue + Postscript SMS + Northbeam or Triple Whale attribution rolled into one weekly client board. Built across 8+ stores per agency. Saves 12–15 hours of senior strategist time every week.',
  },
  {
    title: 'Klaviyo flow audits, automated.',
    desc: 'Monthly scan of every flow — bounce rates, segment-size drift, inactive list bloat, abandonment open rates. Flags any flow under 15% open rate or any segment dormant 60+ days. Plus an AI-drafted remediation checklist.',
  },
  {
    title: 'Subscription churn early warning.',
    desc: 'Watch Recharge or Skio cancellation events + Klaviyo segment drift + Gorgias ticket spikes. Trigger an alert when churn rises 5% month-over-month — before MRR drops, not after the client calls.',
  },
  {
    title: 'Site speed + checkout monitoring.',
    desc: 'Lighthouse runs on every theme deploy via GitHub Actions. Slack alert when the checkout page slows past your threshold or conversion rate drops post-deploy. Catch regressions before your client emails.',
  },
  {
    title: 'Credential-access orchestration on onboarding.',
    desc: 'Meta partial-access link + Google Ads MCC invite + Shopify staff account + Klaviyo API scope all gated behind a single intake. Cuts the 5–7 day credential-chase that stalls 60–80% of e-com onboardings.',
  },
  {
    title: 'LTV and cohort retention reporting.',
    desc: 'Customers segmented by acquisition month across Shopify + Recharge. Subscription lifetime, repeat-order frequency, and channel decay surfaced in a CFO-friendly cohort deck monthly. Catch the LTV collapse before blended ROAS hides it.',
  },
]

const YOUR_STACK = [
  'Shopify / Shopify Plus',
  'Klaviyo',
  'Postscript / Attentive',
  'Triple Whale / Northbeam / Hyros',
  'Recharge / Skio / Stay AI',
  'Yotpo / Okendo / Judge.me',
  'Gorgias / Help Scout',
  'Rebuy / Bold',
  'Tapcart',
  'GA4 / Google Tag Manager',
  'Meta Ads / Google Ads / TikTok Ads',
  'Slack / Notion / ClickUp',
  'GitHub Actions',
  'Stripe / QuickBooks',
]

const FAQS = [
  {
    q: 'We already use Triple Whale. Why do we need this?',
    a: 'Triple Whale is a dashboard. I’m the operations layer underneath — I monitor your Northbeam data, flag when your Recharge cohorts collapse, watch your Klaviyo segment drift, and alert your Gorgias team before churn accelerates. You keep Triple Whale. I’m the nervous system it doesn’t have.',
  },
  {
    q: 'How do you handle multiple Shopify stores?',
    a: 'n8n calls each store’s API independently and rolls them up. I’ve built rollups across 8+ stores for one agency client — different themes, different apps, different Klaviyo accounts — into one Monday-morning board. Shopify’s GraphQL Admin API is the right surface for new builds; REST for legacy stores.',
  },
  {
    q: 'Can you write Liquid or theme code?',
    a: 'Theme code I refer to a partner. What I do is wire GitHub Actions to your theme repo for auto-Lighthouse runs and version diffs after deploys, so you catch the regression. Anything API, automation, or data-stitch — I build.',
  },
  {
    q: 'We can’t afford another SaaS line item plus a consultant.',
    a: 'At ~50K automatable tasks/month across your stores, Zapier costs around $7,000/year. Self-hosted n8n runs about $600/year. The retainer funds itself from that delta, plus you own the workflows day one — no rental, no lock-in, no vendor dependency.',
  },
]

export default function ForEcommercePage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky />
      <SegmentPageAnalytics segment="ecommerce" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'n8n Automation for E-commerce Agencies',
            provider: {
              '@type': 'Organization',
              name: 'OpsRadar',
              url: 'https://www.opsradar.co',
              founder: { '@type': 'Person', name: 'Lawand Soran' },
            },
            areaServed: ['US', 'CA', 'GB', 'AU', 'IE'],
            audience: {
              '@type': 'BusinessAudience',
              audienceType: 'E-commerce Agencies',
              numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 25 },
            },
            description:
              'Custom AI Operating System (AIOS) builds for e-commerce and Shopify Plus partner agencies under 25 people. Multi-store reporting across Shopify, Klaviyo, Postscript, and Triple Whale; subscription churn early warning; Klaviyo flow audits; site speed monitoring; LTV cohort reporting.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: 400,
              highPrice: 4500,
              offerCount: 6,
            },
            url: 'https://www.opsradar.co/for/ecommerce',
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            For e-commerce agencies
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            Your strategists were hired to grow stores.
          </h1>
          <p className="font-headline text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/80 mb-8">
            Not to copy Shopify exports into Klaviyo dashboards.
          </p>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            We build the AI Operating System (AIOS) for e-commerce and Shopify Plus partner agencies under 25
            people. Multi-store reporting across Shopify, Klaviyo, and Triple Whale. Subscription
            churn early warning before MRR drops. Klaviyo flow audits without a manual scan.
            You own every workflow in your n8n account. We build them, we maintain them, you get
            your strategy hours back.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call &rarr;
              </a>
            </Button>
            <Link
              href="/audit"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-sm text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition-colors"
            >
              Run a 3-minute self-serve audit →
            </Link>
          </div>
        </div>
      </section>

      {/* ── What I build ──────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What I build for e-commerce agencies
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Six workflows that surface what your stack already knows.
          </h2>
          <div className="space-y-0">
            {WHAT_I_BUILD_FOR_ECOMMERCE.map(({ title, desc }, i) => (
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
            If your tool isn&apos;t here, it probably still works — n8n connects to anything with an API or webhook. Ask me in the audit.
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
            The math most founders don&apos;t run.
          </h2>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/[0.7]">
            <p>
              A 10-person e-com agency typically burns <span className="text-white font-semibold">~137 hours/month</span> — 30+ hours/week — on cross-tool reporting, Klaviyo flow audits, and credential chasing during onboarding. Single-workflow automation typically saves <span className="text-white font-semibold">$50K+/year</span>.
            </p>
            <p>
              At $65–$85/hour fully loaded for a senior strategist, manual reporting alone runs <span className="text-white font-semibold">$3,100–$3,900/month</span> — <span className="text-white font-semibold">$37,000–$47,000/year</span> of billable time spent on tasks workflows do overnight.
            </p>
            <p>
              The typical core ecom stack already runs <span className="text-white font-semibold">$3,650–$5,190/month</span> — Shopify Plus, Klaviyo, Recharge, Gorgias, Northbeam, Triple Whale, Yotpo. Most of that data never reaches one screen.
            </p>
            <p>
              OpsRadar retainers run <span className="text-white font-semibold">$750–$3,000/month</span>. Most e-com agencies break even in four to seven weeks.
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
            What e-commerce founders ask me first.
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
            Stop reporting on growth. Start delivering it.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Real dollar numbers for your agency. No commitment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call &rarr;
              </a>
            </Button>
          </div>
          <Link
            href="/audit"
            className="inline-block mt-4 text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
          >
            Or run a 3-minute self-serve audit
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
