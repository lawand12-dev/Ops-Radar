import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import WorkflowImage from '<npm>/components/ui/workflow-image'
import SegmentPageAnalytics from '../SegmentPageAnalytics'
import BookCallButton from '../../components/BookCallButton'

export const metadata: Metadata = {
  title: 'For SEO Agencies — OpsRadar',
  description:
    "n8n automation for SEO agencies under 20 people. Weekly rank rollups from Ahrefs + GSC. AI Overview mention tracking across ChatGPT, Perplexity, Google AIO. Technical audit alerts from Screaming Frog. Built inside your n8n account.",
  openGraph: {
    title: 'For SEO Agencies — OpsRadar',
    description:
      "n8n automation for SEO agencies under 20 people. Rank tracking rollups. AIO mention monitoring. Technical audit alerts. Client reporting that includes AI Overview presence.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for SEO Agencies' }],
  },
  twitter: {
    title: 'For SEO Agencies — OpsRadar',
    description:
      "n8n automation for SEO agencies under 20 people. Rank tracking rollups. AIO mention monitoring. Technical audit alerts.",
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Paid-Media', href: '/for/paid-media' },
  { label: 'SEO', href: '/for/seo', isActive: true },
  { label: 'Full-Service', href: '/for/full-service' },
  { label: 'Services', href: '/services' },
  { label: 'Process', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

const WHAT_I_BUILD_FOR_SEO = [
  {
    title: 'Weekly rank-tracking rollups, white-labeled.',
    desc: 'Ahrefs + GSC + Semrush data merged into a branded weekly digest. Delivered to your Slack or to the client\u2019s inbox. No more pasting keyword positions into a Google Doc every Monday morning.',
  },
  {
    title: 'AI Overview and LLM mention tracking.',
    desc: 'Monitor your clients\u2019 brand visibility across ChatGPT, Perplexity, and Google AI Overviews. Track which queries surface them, which cite competitors, and which miss them entirely. A category that barely existed a year ago — and is the new line item you can charge for.',
  },
  {
    title: 'Technical audit alerting.',
    desc: 'Daily Screaming Frog diffs. Core Web Vitals regressions pulled from CrUX. Schema markup breakage. Status code spikes. Flagged in Slack before the client notices — or before Google does.',
  },
  {
    title: 'Content brief automation.',
    desc: 'Frase, SurferSEO, or Clearscope briefs piped automatically into a Google Doc with your on-brand template, client folder, and writer assignment. 30 minutes of setup work per brief turned into 30 seconds.',
  },
  {
    title: 'Backlink monitoring and disavow workflows.',
    desc: 'New backlinks detected in Ahrefs or GSC, enriched with spam score and topical relevance, routed to you for review. Toxic links assembled into a disavow file ready to upload. No more monthly manual audits.',
  },
  {
    title: 'Client reporting that includes AIO presence.',
    desc: 'Monthly client reports that actually acknowledge 2026 reality — AI Overview presence percentage, LLM citation coverage, share-of-voice against competitors. The metrics no incumbent dashboard reports well.',
  },
]

const YOUR_STACK = [
  'Ahrefs',
  'Semrush',
  'Screaming Frog',
  'Sitebulb',
  'Google Search Console',
  'Google Analytics 4',
  'SurferSEO / Clearscope / Frase',
  'Profound / Peec AI / Otterly',
  'Looker Studio',
  'AgencyAnalytics',
  'Google Docs / Notion',
  'Slack',
]

const FAQS = [
  {
    q: 'We already use Zapier for some of this. Why switch?',
    a: 'Zapier breaks at SEO scale. Weekly rank-tracking pulls across 50+ clients with hundreds of keywords each quickly hit Zapier\u2019s per-task ceiling — that\u2019s where the $500–$2,000/month retainers come from. On your own n8n account, it\u2019s a flat $20/month, unlimited runs. I move the workflows over and rebuild them properly.',
  },
  {
    q: 'How is this different from SEOmonitor, Nightwatch, or Local Falcon?',
    a: 'Those tools each solve one slice — rank tracking, local SEO, technical monitoring. I connect them together and plug the gaps. Most SEO founders I talk to want to keep their existing subscriptions and have me stitch them into one workflow that feeds client reports, Slack alerts, and internal dashboards.',
  },
  {
    q: 'Could I just hire a VA for $1,500/month to do this manually?',
    a: 'You could — and many SEO agencies do. The problem is a VA still needs managing, training, and QA. I deliver the outcome, not the labor. When Ahrefs\u2019 API changes or Google updates AIO rendering, I fix it once and every client benefits. A VA has to re-learn every workflow when something breaks.',
  },
  {
    q: 'Can you track AI Overviews reliably? That space keeps changing.',
    a: 'Yes, with caveats I\u2019ll be honest about. AIO rendering varies by query, geography, and user context. I use Profound and Peec AI where available, supplemented with direct SERP scraping on a rotating proxy for brand-owned queries. We\u2019ll capture 80% of what\u2019s trackable today and iterate as the tools mature.',
  },
]

export default function ForSeoPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />
      <SegmentPageAnalytics segment="seo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'n8n Automation for SEO Agencies',
            provider: {
              '@type': 'Organization',
              name: 'OpsRadar',
              url: 'https://www.opsradar.co',
              founder: { '@type': 'Person', name: 'Lawand Soran' },
            },
            areaServed: ['US', 'CA', 'GB', 'AU', 'IE'],
            audience: {
              '@type': 'BusinessAudience',
              audienceType: 'SEO Agencies',
              numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 20 },
            },
            description:
              'Custom n8n automations for SEO agencies under 20 people. Weekly rank rollups from Ahrefs and GSC; AI Overview and LLM mention tracking; technical audit alerting from Screaming Frog.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: 400,
              highPrice: 4500,
              offerCount: 6,
            },
            url: 'https://www.opsradar.co/for/seo',
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            For SEO agencies
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            Google's AI Overviews ate your CTRs.
          </h1>
          <p className="font-headline text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/80 mb-8">
            Let me automate what's left to fight for.
          </p>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            I build n8n automations for SEO agencies under 20 people. Weekly rank rollups from
            Ahrefs and GSC. AI Overview and LLM mention tracking across ChatGPT, Perplexity, and
            Google AIO. Technical audit alerts from Screaming Frog. You own every workflow in
            your n8n account. I build them, I maintain them, you get the hours back to do the
            strategy work AI can't replace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
            <Link
              href="/workflows"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-sm text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition-colors"
            >
              See real workflows I&apos;ve built →
            </Link>
          </div>
        </div>
      </section>

      {/* ── What I build ──────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What I build for SEO shops
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Six workflows for the 2026 SEO reality.
          </h2>
          <div className="space-y-0">
            {WHAT_I_BUILD_FOR_SEO.map(({ title, desc }, i) => (
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

      {/* ── Real builds proof ────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Real builds, not mockups
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-3">
            A look at the work.
          </h2>
          <p className="text-[15px] text-white/45 mb-10">
            Real n8n workflows I&apos;ve built and tested end-to-end. No Figma mockups, no stock screenshots. Click through to see all of them.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/workflows" className="group block">
              <div className="rounded-xl overflow-hidden border border-white/10 transition-colors group-hover:border-white/25">
                <WorkflowImage
                  src="/workflows/workflow-2.png"
                  alt="Daily client performance briefing — n8n workflow"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/80">
                Revenue Ops
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70 group-hover:text-white/95 transition-colors">
                Daily Client Performance Briefing
              </p>
            </Link>
            <Link href="/workflows" className="group block">
              <div className="rounded-xl overflow-hidden border border-white/10 transition-colors group-hover:border-white/25">
                <WorkflowImage
                  src="/workflows/workflow-1.png"
                  alt="Zero-touch client onboarding — n8n workflow"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400/80">
                Client Ops
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70 group-hover:text-white/95 transition-colors">
                Zero-Touch Client Onboarding
              </p>
            </Link>
          </div>

          <div className="mt-10 text-center">
            <Link href="/workflows" className="text-sm text-white/50 hover:text-white/85 transition-colors">
              See all workflows →
            </Link>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Cost of NOT automating ────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What it costs to keep doing it manually
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-8">
            The math in a price-compressed market.
          </h2>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/[0.7]">
            <p>
              Per SE Ranking's 2025 survey of 260 SEO agencies, <span className="text-white font-semibold">64% charge under $1,000/month</span> per client. That means every hour spent on manual rank tracking, briefs, and reports eats your already-thin margin.
            </p>
            <p>
              A typical 10-person SEO agency loses <span className="text-white font-semibold">15–30 hours/week</span> to manual reporting, backlink audits, and content brief assembly — work that automation eliminates within weeks.
            </p>
            <p>
              The common alternative — hiring a VA at <span className="text-white font-semibold">$1,500/month</span> — replaces the labor but not the management overhead. You still train, QA, and hand-hold.
            </p>
            <p>
              OpsRadar retainers run <span className="text-white font-semibold">$400–$1,500/month</span>. The outcome, without the management layer. At those numbers, most SEO agencies should break even in about six weeks.
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
            What SEO founders ask me first.
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
            Build automations for 2026, not 2020.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Real dollar numbers for your agency. No commitment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
            <BookCallButton />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
