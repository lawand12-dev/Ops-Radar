import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import BeamsBackground from '<npm>/components/ui/beams-background'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'

export const metadata: Metadata = {
  title: "OpsRadar — Done-For-You Automation for Agencies",
  description:
    "I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow.",
  openGraph: {
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow.",
    images: ["/logo.png"],
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
    desc: 'A 3-minute AI audit identifies exactly where your agency is losing time and money. Free, no signup.',
  },
  {
    title: 'I build.',
    desc: 'Custom n8n workflows built on my infrastructure, tested, documented, delivered in days.',
  },
  {
    title: 'I maintain.',
    desc: 'I host, monitor, and fix broken workflows. You never touch the automation layer.',
  },
]

const WHY_US = [
  {
    title: 'Freelancers disappear. I stay.',
    desc: 'Every build includes a bug-fix window plus optional retainer for ongoing care.',
  },
  {
    title: 'Zapier charges per task. n8n doesn\u2019t.',
    desc: 'Your workflows run on my infrastructure with zero per-task fees. Run 100 or 100,000 tasks. Same cost.',
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
          badgeText="Done-for-you agency automation"
          title="Your agency's operations,"
          titleLine2="running on autopilot."
          description="I'm Lawand. I build, host, and maintain custom automations for agencies using n8n. You tell me what's broken. I fix it. You never touch a workflow."
          primaryButtonText="Start Free Audit"
          primaryButtonHref="/audit"
          showPrimaryArrowIcon={true}
          secondaryButtonText="Book a 20-min call"
          secondaryButtonHref="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
          showSecondaryIcon={false}
          partnersTitle=""
          partners={[]}
          contentClassName="items-start pt-16 sm:pt-20 lg:pt-24"
        />
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
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-6">
            Automations I&apos;ve built and shipped
          </h2>

          <div className="h-px w-full mb-10" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="max-w-2xl mx-auto">
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <Image
                src="/workflows/workflow-1.png"
                alt="Zero-Touch Client Onboarding — n8n workflow"
                width={1400}
                height={800}
                className="block w-full h-auto"
                sizes="(max-width: 768px) 100vw, 672px"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]" style={{ aspectRatio: '1400/800' }}>
                <span className="text-sm text-white/30 tracking-wide">Screenshot coming</span>
              </div>
            </div>
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
            Free audit. No signup. No credit card.
          </p>
          <Button asChild className="px-10 py-4 h-auto rounded-lg font-semibold text-base bg-white text-black hover:bg-white/90 shadow-none border-0">
            <Link href="/audit">Start Free Audit &rarr;</Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t py-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-bold text-white">OpsRadar</div>
          <p className="text-xs uppercase tracking-widest text-white/30">
            &copy; 2026 OpsRadar. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/services"  className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Services</Link>
            <Link href="/workflows" className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Workflows</Link>
            <Link href="/pricing"   className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Pricing</Link>
            <Link href="/about"     className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">About</Link>
            <Link href="/audit"    className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
