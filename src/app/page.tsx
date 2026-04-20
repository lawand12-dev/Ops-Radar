import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import BeamsBackground from '<npm>/components/ui/beams-background'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import WorkflowImage from '<npm>/components/ui/workflow-image'
import Footer from '<npm>/components/Footer'
import WasteCalculator from './components/WasteCalculator'
import OpsRadar from './components/OpsRadar'
import RhythmBreak from './components/RhythmBreak'
import BookCallButton from './components/BookCallButton'

export const metadata: Metadata = {
  title: "OpsRadar — Ops Automation for Marketing Agencies",
  description:
    "I build n8n automations for paid-media, SEO, and full-service agencies under 25 people. Client reports that build themselves. You own the workflow, I build and maintain it.",
  openGraph: {
    title: "OpsRadar — Ops Automation for Marketing Agencies",
    description:
      "I build n8n automations for paid-media, SEO, and full-service agencies under 25 people. Client reports that build themselves. You own the workflow, I build and maintain it.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Ops Automation for Marketing Agencies" }],
  },
  twitter: {
    title: "OpsRadar — Ops Automation for Marketing Agencies",
    description:
      "I build n8n automations for paid-media, SEO, and full-service agencies under 25 people. Client reports that build themselves. You own the workflow, I build and maintain it.",
    images: ["/og-image.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/', isActive: true },
  { label: 'Paid-Media', href: '/for/paid-media' },
  { label: 'SEO', href: '/for/seo' },
  { label: 'Full-Service', href: '/for/full-service' },
  { label: 'Services', href: '/services' },
  { label: 'Process', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

// ── Data ──────────────────────────────────────────────────────────────────────

const SEGMENTS = [
  {
    href: '/for/paid-media',
    label: 'Paid-media',
    headline: 'Sunday nights are for your family, not for Meta + Google + Klaviyo reports.',
    bullets: ['Monthly client reports that build themselves', 'Pacing alerts tied to MER, not last-click ROAS', 'BM-access-to-first-report from 3 weeks to 5 days'],
  },
  {
    href: '/for/seo',
    label: 'SEO',
    headline: 'Track what matters in 2026 — including AI Overviews and LLM mentions.',
    bullets: ['Weekly rank digests from Ahrefs + GSC + Semrush', 'AIO presence tracking across ChatGPT, Perplexity, Google AIO', 'Technical audit alerts before Google notices'],
  },
  {
    href: '/for/full-service',
    label: 'Full-service',
    headline: 'Defend your delivery margin while scaling across ad ops, SEO, and content.',
    bullets: ['Unified reporting across ad + organic + content', 'Utilization alerts before scope creep eats margin', 'Cross-channel attribution your clients actually believe'],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-body selection:bg-primary/20">

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14">
        <BeamsBackground intensity="full" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#000000]" />

        <ResponsiveHeroBanner
          navLinks={NAV_LINKS}
          badgeLabel=""
          badgeText="Ops automation for marketing agencies"
          title="AI is eating the craft."
          titleLine2="Let me eat the ops."
          description="I'm Lawand. I build the automation layer for marketing agencies — in your own n8n account, maintained by me. Reporting, onboarding, pacing alerts. The work your team does at 11pm, handled while you sleep."
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
          <p className="text-[13px] text-white/30 mb-4">
            I only take calls with agencies who&apos;ve completed the audit — it saves us both time.
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

        <div className="relative z-10 flex justify-center mt-12 mb-2" aria-hidden="true">
          <div className="scroll-cue flex flex-col items-center gap-1.5 text-white/40">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Scroll</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      <OpsRadar />

      <WasteCalculator />

      {/* ── Segment picker ──────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              Built for three kinds of shop
            </p>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-[1.1]">
              Which one are you running?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SEGMENTS.map((seg) => (
              <Link
                key={seg.href}
                href={seg.href}
                className="group relative rounded-3xl border border-white/[0.08] bg-white/[0.015] p-8 transition-all hover:border-cyan-400/30 hover:bg-white/[0.03]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400/70 mb-5">
                  For {seg.label}
                </p>
                <h3 className="font-headline text-xl font-bold text-white mb-5 leading-[1.3] tracking-[-0.01em]">
                  {seg.headline}
                </h3>
                <ul className="space-y-2.5 mb-8">
                  {seg.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/55">
                      <span className="text-cyan-400/50 mt-1 shrink-0">—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] text-white/50 group-hover:text-white/85 transition-colors inline-flex items-center gap-1.5">
                  See the {seg.label} page
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── 2. Who ───────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Who
          </p>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white mb-16 leading-[1.1]">
            Four rules I won&apos;t break.
          </h2>

          <div className="space-y-0">
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 01
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                I build it myself.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                No freelancer handoffs. No outsourced labor. The person who scopes your workflow is the person who ships it — and the person who fixes it when Meta&apos;s API changes at 3am.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 02
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                I audit before I pitch.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Every call starts with a real diagnosis of what your agency is actually losing. I don&apos;t take meetings to talk about what I might do for you.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 03
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                I charge per workflow, not per task.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Flat monthly retainers. No surprise bills. Zapier punishes you for scaling — I don&apos;t.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 04
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                I stay for year two.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Most freelancers disappear after launch. I&apos;m still here when you add client #15 and Triple Whale breaks its API.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
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
        <section className="py-32 px-6 max-w-6xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What
          </p>
          <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white mb-4 leading-[1.1]">
            Three things I do.
          </h2>
          <p className="text-base md:text-lg text-white/[0.55] mb-14 max-w-xl leading-relaxed">
            Nothing else. Not hourly consulting. Not training. Not dashboards you have to maintain. Just these three, end to end.
          </p>

          <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.015] overflow-hidden">
            <div className="grid md:grid-cols-3">
              {/* DIAGNOSE */}
              <div className="relative p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/[0.06]">
                <div className="flex items-start justify-between mb-8">
                  <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-400/70">
                    Step 01
                  </p>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <circle cx="20" cy="20" r="18" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="1" />
                    <circle cx="20" cy="20" r="13" stroke="rgba(34, 211, 238, 0.35)" strokeWidth="1" />
                    <circle cx="20" cy="20" r="8" stroke="rgba(34, 211, 238, 0.55)" strokeWidth="1" />
                    <circle cx="20" cy="20" r="3" fill="rgb(34, 211, 238)" />
                  </svg>
                </div>
                <h3 className="font-headline text-2xl md:text-[28px] font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                  I diagnose.
                </h3>
                <p className="text-[15px] leading-[1.7] text-white/[0.65]">
                  A 3-minute audit shows exactly what your agency is losing: real dollar figures, tied to the tools you already run.
                </p>
              </div>

              {/* BUILD */}
              <div className="relative p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/[0.06]">
                <div className="flex items-start justify-between mb-8">
                  <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-400/70">
                    Step 02
                  </p>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect x="3" y="7" width="10" height="8" rx="2" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="1" />
                    <rect x="27" y="7" width="10" height="8" rx="2" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="1" />
                    <rect x="15" y="24" width="10" height="8" rx="2" stroke="rgba(34, 211, 238, 0.8)" strokeWidth="1" fill="rgba(34, 211, 238, 0.12)" />
                    <path d="M8 15 L20 24" stroke="rgba(34, 211, 238, 0.45)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M32 15 L20 24" stroke="rgba(34, 211, 238, 0.45)" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-headline text-2xl md:text-[28px] font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                  I build.
                </h3>
                <p className="text-[15px] leading-[1.7] text-white/[0.65]">
                  Custom n8n workflows, inside your own n8n account. Delivered in 5 to 14 days. You own every workflow from day one.
                </p>
              </div>

              {/* MAINTAIN */}
              <div className="relative p-8 md:p-10">
                <div className="flex items-start justify-between mb-8">
                  <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-400/70">
                    Step 03
                  </p>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <path d="M20 4 L34 10 L34 22 C34 30 27 35 20 37 C13 35 6 30 6 22 L6 10 Z" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="1" fill="rgba(34, 211, 238, 0.06)" />
                    <path d="M13 20 L17.5 24.5 L27 15" stroke="rgba(34, 211, 238, 0.95)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-headline text-2xl md:text-[28px] font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                  I maintain.
                </h3>
                <p className="text-[15px] leading-[1.7] text-white/[0.65]">
                  Meta&apos;s API changes. Triple Whale pushes a breaking update. I fix it, usually before you notice. You never touch the automation layer.
                </p>
              </div>
            </div>

            {/* Connector pulse dots at card junctions (desktop only) */}
            <div className="hidden md:block pointer-events-none">
              <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7),0_0_20px_rgba(34,211,238,0.35)]" />
              <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7),0_0_20px_rgba(34,211,238,0.35)]" />
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      <RhythmBreak />

      {/* ── 4. Why ───────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Why
          </p>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white mb-20 leading-[1.1]">
            Why this works.
          </h2>

          <div className="space-y-0">
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-16 md:py-20">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/60 mb-8">
                — On ownership
              </p>
              <blockquote className="font-serif italic text-3xl md:text-5xl tracking-[-0.02em] text-white leading-[1.1] mb-8">
                You own it.<br />All of it.
              </blockquote>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Every workflow I build lives in your n8n account, on your Google Drive, running on your credentials. If I disappear tomorrow, nothing breaks. You keep the code, the logic, and the logs &mdash; day one.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-16 md:py-20">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/60 mb-8">
                — On reliability
              </p>
              <blockquote className="font-serif italic text-3xl md:text-5xl tracking-[-0.02em] text-white leading-[1.1] mb-8">
                Meta breaks something.<br />I know before you do.
              </blockquote>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Ad platforms push breaking API changes every quarter. My monitoring catches them before your Monday morning report fails. You see the fix, not the error.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-16 md:py-20">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/60 mb-8">
                — On AI
              </p>
              <blockquote className="font-serif italic text-3xl md:text-5xl tracking-[-0.02em] text-white leading-[1.1] mb-8">
                AI builds fast.<br />I verify every line.
              </blockquote>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                AI accelerates the build. I review every workflow before it touches your HubSpot, reports MER to your clients, or sends a branded PDF on the 2nd of the month.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-10 py-4 h-auto rounded-lg font-semibold text-base bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
            <BookCallButton />
          </div>

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
