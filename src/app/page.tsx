import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import BeamsBackground from '<npm>/components/ui/beams-background'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import WorkflowImage from '<npm>/components/ui/workflow-image'
import Footer from '<npm>/components/Footer'

export const metadata: Metadata = {
  title: "OpsRadar — Done-For-You Automation for Agencies",
  description:
    "I build and maintain custom n8n automations for agencies. You own the workflow in your n8n account. I handle the building and the maintenance.",
  openGraph: {
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "I build and maintain custom n8n automations for agencies. You own the workflow in your n8n account. I handle the building and the maintenance.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Done-For-You Automation for Agencies" }],
  },
  twitter: {
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "I build and maintain custom n8n automations for agencies. You own the workflow in your n8n account. I handle the building and the maintenance.",
    images: ["/og-image.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/', isActive: true },
  { label: 'Services', href: '/services' },
  { label: 'Workflows', href: '/workflows' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

// ── Data ──────────────────────────────────────────────────────────────────────

const WHAT_I_DO = [
  {
    title: 'I diagnose.',
    desc: 'A 3-minute AI audit identifies exactly where your agency is losing time and money. Free audit. Results sent to your email.',
  },
  {
    title: 'I build.',
    desc: 'Custom n8n workflows built inside your n8n account, tested, documented, delivered in days. You own it from day one.',
  },
  {
    title: 'I maintain.',
    desc: 'I monitor and fix your workflows. You never touch the automation layer.',
  },
]

const WHY_US = [
  {
    title: 'Freelancers disappear. I stay.',
    desc: 'Every build includes a bug-fix window plus optional retainer for ongoing care.',
  },
  {
    title: 'Zapier charges per task. n8n doesn\u2019t.',
    desc: 'Your workflows run in your own n8n — one predictable monthly cost from n8n, whether you run 100 tasks or 100,000.',
  },
  {
    title: 'AI builds fast. I verify every line.',
    desc: 'AI accelerates the build. A human (me) reviews every workflow before it touches your business.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-body selection:bg-primary/20">

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14">
        <BeamsBackground intensity="full" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        <ResponsiveHeroBanner
          navLinks={NAV_LINKS}
          badgeLabel=""
          badgeText="n8n automation for agencies"
          title="Your agency loses 20 hours a week"
          titleLine2="on reporting, lead routing, and onboarding."
          description="I'm Lawand. I build the n8n workflows that do it for you — inside your n8n account, so you own the system. I just build it and maintain it."
          primaryButtonText="Start Free Audit"
          primaryButtonHref="/audit"
          showPrimaryArrowIcon={true}
          secondaryButtonText=""
          secondaryButtonHref=""
          showSecondaryIcon={false}
          partnersTitle=""
          partners={[]}
          contentClassName="items-start pt-16 sm:pt-20 lg:pt-24"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 -mt-8">
          <p className="text-[13px] italic text-white/30 mb-4">
            &ldquo;I only take calls with agencies who&apos;ve completed the audit. It saves us both time.&rdquo;
          </p>
          <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              3-minute AI audit
            </span>
            <span className="text-white/20">&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              3 minutes. Results to your inbox.
            </span>
            <span className="text-white/20">&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Real dollar numbers, not fluff
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Who ───────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 max-w-5xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Who
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            One operator. No middlemen.
          </h2>

          <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 py-12">
            <p className="text-[15px] leading-[1.8] text-white/[0.65]">
              I&apos;m Lawand Soran, founder of OpsRadar. I build automation
              systems for agencies from Kurdistan. You work directly with
              the person building your workflow &mdash; no account managers,
              no sales handoffs, no project managers between you and the work.
            </p>
            <ul className="space-y-6">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                <span className="text-[15px] text-white/80">
                  <span className="font-semibold text-white/90">Direct founder access</span>
                  {' '}&mdash; every message reaches me, not a ticket queue
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                <span className="text-[15px] text-white/80">
                  <span className="font-semibold text-white/90">8-hour timezone advantage</span>
                  {' '}&mdash; work ships while your team sleeps
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                <span className="text-[15px] text-white/80">
                  <span className="font-semibold text-white/90">Days, not weeks</span>
                  {' '}&mdash; most builds delivered in 5&ndash;14 days
                </span>
              </li>
            </ul>
          </div>

          <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </section>
      </FadeInOnScroll>

      {/* ── Recent Work ────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 max-w-5xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Recent Work
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-3">
            Automations I&apos;ve built and shipped
          </h2>
          <p className="text-[15px] text-white/40 mb-6">
            Real automations, built and shipped &mdash; including advanced AI-powered lead intelligence systems.
          </p>

          <div className="h-px w-full mb-10" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Flagship preview */}
          <Link href="/workflows" className="group block mb-6">
            <div className="rounded-xl overflow-hidden p-px bg-gradient-to-r from-pink-500/60 via-purple-500/60 to-pink-500/60 shadow-[0_0_30px_rgba(236,72,153,0.15)] transition-shadow group-hover:shadow-[0_0_40px_rgba(236,72,153,0.25)]">
              <div className="rounded-[11px] overflow-hidden bg-black">
                <WorkflowImage
                  src="/workflows/workflow-5.png"
                  alt="AI Inbound Lead Intelligence System — n8n workflow"
                  sizes="(max-width: 640px) 100vw, 100vw"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-400/80">
                Sales Intelligence
              </p>
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-pink-300">
                Flagship
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-white/70 group-hover:text-white/90 transition-colors">
              AI Inbound Lead Intelligence System
            </p>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { src: '/workflows/workflow-1.png', title: 'Zero-Touch Client Onboarding', category: 'CLIENT OPS', color: 'text-blue-400/80' },
              { src: '/workflows/workflow-2.png', title: 'Daily Client Performance Briefing', category: 'REVENUE OPS', color: 'text-emerald-400/80' },
              { src: '/workflows/workflow-3.png', title: 'AI Lead Qualification & Routing', category: 'SALES OPS', color: 'text-purple-400/80' },
              { src: '/workflows/workflow-4.png', title: 'AI Content Machine', category: 'CONTENT OPS', color: 'text-orange-400/80' },
            ].map((wf) => (
              <Link key={wf.src} href="/workflows" className="group block">
                <div className="rounded-xl overflow-hidden border border-white/10 transition-colors group-hover:border-white/20">
                  <WorkflowImage
                    src={wf.src}
                    alt={`${wf.title} — n8n workflow`}
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <p className={`mt-3 text-[10px] font-bold uppercase tracking-[0.25em] ${wf.color}`}>
                  {wf.category}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                  {wf.title}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/workflows" className="text-sm text-white/50 hover:text-white/80 transition-colors">
              See all workflows &rarr;
            </Link>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── 3. What ──────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 max-w-5xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Three things I do, nothing else.
          </h2>

          <div className="space-y-0">
            {WHAT_I_DO.map(({ title, desc }, i) => (
              <div key={title}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-16 py-8 md:py-10">
                  <h3 className="text-lg font-bold text-white/90 tracking-[-0.01em]">
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

      {/* ── 4. Why ───────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 max-w-5xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Why
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Why agencies choose OpsRadar.
          </h2>

          <div className="space-y-0">
            {WHY_US.map(({ title, desc }, i) => (
              <div key={title}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 md:gap-16 py-8 md:py-10">
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

      {/* ── 5. Final CTA ─────────────────────────────────────────────── */}
      <section className="py-40 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-5 tracking-[-0.03em] text-white">
            See exactly what to automate, in 3 minutes.
          </h2>
          <p className="text-white/40 mb-10 text-lg">
            Free audit. Results sent to your email.
          </p>
          <Button asChild className="px-10 py-4 h-auto rounded-lg font-semibold text-base bg-white text-black hover:bg-white/90 shadow-none border-0">
            <Link href="/audit">Start Free Audit &rarr;</Link>
          </Button>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              3-minute AI audit
            </span>
            <span className="text-white/20">&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              3 minutes. Results to your inbox.
            </span>
            <span className="text-white/20">&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Real dollar numbers, not fluff
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
