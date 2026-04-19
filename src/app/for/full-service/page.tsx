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
  title: 'For Full-Service Digital Agencies — OpsRadar',
  description:
    "n8n automation for full-service digital agencies (10-25 people). Client reporting that protects delivery margin. Utilization dashboards. Scope-creep flagging. Onboarding that locks in expectations before the first sprint. Built inside your n8n account.",
  openGraph: {
    title: 'For Full-Service Digital Agencies — OpsRadar',
    description:
      "n8n automation for 10-25 person agencies fighting delivery margin compression. Reporting, utilization, scope creep, onboarding — automated inside your n8n account.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Full-Service Digital Agencies' }],
  },
  twitter: {
    title: 'For Full-Service Digital Agencies — OpsRadar',
    description:
      "n8n automation for 10-25 person full-service agencies. Delivery margin protection, utilization visibility, scope-creep flagging.",
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Paid-Media', href: '/for/paid-media' },
  { label: 'SEO', href: '/for/seo' },
  { label: 'Full-Service', href: '/for/full-service', isActive: true },
  { label: 'Services', href: '/services' },
  { label: 'Process', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

const WHAT_I_BUILD_FOR_FULL_SERVICE = [
  {
    title: 'Client reporting that protects delivery margin.',
    desc: 'Monthly rollups across Google Ads, Meta, GA4, HubSpot, and whatever reporting tool your account managers live in. Automated on the 2nd of every month. The 4–8 hours per client per month your team currently burns on reporting, returned to billable work.',
  },
  {
    title: 'Utilization and capacity dashboards.',
    desc: 'Harvest, Toggl, or Float data pulled nightly into a Slack digest your ops lead actually reads. See utilization dipping below 55% before the P&L does. Parakeeto-style delivery margin math, surfaced on schedule instead of discovered at quarter-end.',
  },
  {
    title: 'Scope-creep flagging.',
    desc: 'Watches Slack and email for client requests without a corresponding ticket ID, pings the PM before the work gets done on the house. The #1 retainer-eroding habit in full-service shops — caught in real time.',
  },
  {
    title: 'Structured onboarding that locks expectations before sprint one.',
    desc: 'Contract signed triggers a 6-phase onboarding workflow — provisioning, intake, kickoff, setup, first deliverable, steady state — with gates at each phase. The 48% of churn Setup Marketing attributes to delivery dissatisfaction starts in weeks 1–4. I fix the trajectory-setter.',
  },
  {
    title: 'HubSpot / Asana / ClickUp sync without double-entry.',
    desc: 'Your PMs live in one tool, clients live in another, leadership reports from a third. I build the sync layer so status updates propagate automatically — without the HubSpot Operations Hub seat count you\'d need to do it their way.',
  },
  {
    title: 'AR and invoicing reconciliation.',
    desc: 'Project milestones trigger invoice generation in QuickBooks or Xero. 60-day AR gets flagged in Slack before it becomes 90. Cash flow visibility for ops leads who are tired of learning it from the accountant after month close.',
  },
]

const YOUR_STACK = [
  'HubSpot CRM',
  'Asana / ClickUp / Monday / Teamwork',
  'Harvest / Toggl / Float',
  'QuickBooks / Xero',
  'Slack',
  'Notion / Google Workspace',
  'Figma',
  'Loom',
  'AgencyAnalytics / Databox',
  'Google Ads / Meta / GA4',
  'Mailchimp / Klaviyo / HubSpot Marketing',
  'Linear / Jira',
]

const FAQS = [
  {
    q: 'We already use HubSpot Operations Hub. Why would we add this?',
    a: 'Operations Hub is powerful if you\'re already committed to HubSpot as your CRM and have the seat budget. But it solves HubSpot-shaped problems. A 15-person full-service agency typically has Asana, Harvest, Figma, and Slack living outside HubSpot — and that\'s where the ops debt actually lives. I connect HubSpot to the rest of your stack without making you pay per-seat for every person who needs their work synced.',
  },
  {
    q: 'We tried an ops consultant before. It was a 9-month nightmare.',
    a: 'Fair. The ERP-style implementation pattern kills full-service agencies. My work is different: I deliver workflows in 7–21 days, scoped to one specific pain, with a fixed price. If the first workflow doesn\'t prove itself within a month, we stop. No 9-month transformation. You pay for outcomes, not a journey.',
  },
  {
    q: 'Can we get references from other 15-20 person agencies?',
    a: 'Honest answer: I\'m a solo founder building this one agency at a time. Early clients are early — I\'m not going to fabricate a list of logos to close you. What I can do is walk you through the exact workflow I\'d build for your agency on the free audit, show you the n8n canvas, and let you judge my craft before committing. References will come; right now, the work speaks.',
  },
  {
    q: 'Our COO needs to sign off. Do you do demos?',
    a: 'Yes. After the audit, I\'ll do a 30-minute Loom walkthrough of what I\'d build for you, no call required. Your ops lead can watch on their own time and send questions async. I find this converts better than scheduled calls because it removes the calendar friction. If you want a live call after, I do that too.',
  },
]

export default function ForFullServicePage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />
      <SegmentPageAnalytics segment="full-service" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'n8n Automation for Full-Service Digital Agencies',
            provider: {
              '@type': 'Organization',
              name: 'OpsRadar',
              url: 'https://www.opsradar.co',
              founder: { '@type': 'Person', name: 'Lawand Soran' },
            },
            areaServed: ['US', 'CA', 'GB', 'AU', 'IE'],
            audience: {
              '@type': 'BusinessAudience',
              audienceType: 'Full-Service Digital Agencies',
              numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 25 },
            },
            description:
              'Custom n8n automations for full-service digital agencies (10-25 people). Client reporting that protects delivery margin; utilization dashboards; scope-creep flagging; structured onboarding.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: 400,
              highPrice: 4500,
              offerCount: 6,
            },
            url: 'https://www.opsradar.co/for/full-service',
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            For full-service digital agencies
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            Your delivery margin is bleeding.
          </h1>
          <p className="font-headline text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/80 mb-8">
            Let me find the leaks.
          </p>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            I build n8n automations for 10–25 person full-service digital agencies. Reporting
            that protects your margin. Utilization dashboards your ops lead actually reads.
            Scope-creep flagging that catches erosion in real time. Onboarding that locks in
            expectations before sprint one. You own every workflow in your n8n account — no
            seat-count tax, no Operations Hub lock-in. I build them, I maintain them, you get
            back the hours you've been losing to manual status work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
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
            What I build for full-service shops
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Six workflows that defend the P&amp;L.
          </h2>
          <div className="space-y-0">
            {WHAT_I_BUILD_FOR_FULL_SERVICE.map(({ title, desc }, i) => (
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
            I connect the twelve tools your team already pays for.
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
            Every workflow below runs in production for a real agency. Click through to see all of them.
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
            The delivery-margin math.
          </h2>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/[0.7]">
            <p>
              Parakeeto's review of 2023 agency data put industry net margin at <span className="text-white font-semibold">14%, down from 17% in 2021</span>. Every hour of billable senior time lost to manual reporting, status updates, and scope creep comes directly out of that 14%.
            </p>
            <p>
              A typical 15-person full-service agency loses <span className="text-white font-semibold">4–8 hours per client per month</span> to manual reporting alone, across a book of 15–30 clients. At $120/hour fully loaded, that's <span className="text-white font-semibold">$86,400–$345,600/year</span> of margin erosion from one workflow.
            </p>
            <p>
              HubSpot Operations Hub starts at <span className="text-white font-semibold">$800/month for 3 users</span> and scales with seat count. Hiring an ops coordinator runs <span className="text-white font-semibold">$5,500–$9,500/month fully loaded</span> and still needs managing.
            </p>
            <p>
              OpsRadar retainers run <span className="text-white font-semibold">$400–$1,500/month</span>, flat. No per-seat tax, no management overhead. Most full-service shops see payback within a quarter.
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
            What full-service founders and ops leads ask me first.
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
            Defend the margin. Ship the playbook.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Real dollar numbers for your agency. Shareable with your ops lead.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
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
