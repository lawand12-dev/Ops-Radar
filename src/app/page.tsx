import type { Metadata } from 'next'
import Link from 'next/link'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import FounderPhilosophySection from '<npm>/components/FounderPhilosophySection'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import OpsRadar from './components/OpsRadar'
import RhythmBreak from './components/RhythmBreak'

export const metadata: Metadata = {
  title: "OpsRadar — AI Operating System for Agencies",
  description:
    "OpsRadar builds the AI Operating System for your agency. Your brain. Your workflows. Your Claude interface. Getting smarter every week.",
  openGraph: {
    title: "OpsRadar — AI Operating System for Agencies",
    description:
      "OpsRadar builds the AI Operating System for your agency. Your brain. Your workflows. Your Claude interface. Getting smarter every week.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — AI Operating System for Agencies" }],
  },
  twitter: {
    title: "OpsRadar — AI Operating System for Agencies",
    description:
      "OpsRadar builds the AI Operating System for your agency. Your brain. Your workflows. Your Claude interface. Getting smarter every week.",
    images: ["/og-image.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/', isActive: true },
  { label: 'AIOS', href: '/aios' },
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

const SYSTEM_COLUMNS = [
  {
    label: 'DIAGNOSE',
    copy: (
      <>
        We evaluate your agency&apos;s real operations — not just what you report, but what is actually breaking.
        We map your tools, your team, your clients, and your biggest operational drain.
      </>
    ),
  },
  {
    label: 'BUILD',
    copy: (
      <>
        We build your Agency Brain — a living knowledge base of how your agency operates.
        Then we deploy the workflows that run on it.
        In your n8n account. Under your control. Forever.
      </>
    ),
  },
  {
    label: 'OPERATE',
    copy: (
      <>
        Your AI Operating System runs permanently.
        Claude answers your team&apos;s questions from your real data.
        Guardian monitors every workflow.
        The brain gets smarter every week.
      </>
    ),
  },
]

const HOMEPAGE_FOUNDER_SUMMARY = (
  <>
    <p>
      OpsRadar is built by a team that spent years studying how agencies actually operate &mdash;
      not how they look on LinkedIn, but where the work leaks, why tools do not talk to each other,
      and why agencies keep hiring for problems that should be automated.
    </p>
    <p>
      We exist because the gap between AI capability and operational reality is still enormous.
      Most agencies have the tools.
      Almost none have the system connecting them.
      We are building that system.
    </p>
  </>
)

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-body selection:bg-primary/20">

      <SiteHeader navLinks={NAV_LINKS} sticky />

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14">
        <BeamsBackground intensity="full" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#000000]" />

        <ResponsiveHeroBanner
          navLinks={NAV_LINKS}
          badgeLabel=""
          badgeText="For agencies under 30 people"
          title="The AI Operating System"
          titleLine2="for agencies."
          description="Most agencies have the tools. Almost none have the system connecting them. OpsRadar is that system."
          primaryButtonText="Book a free 20-min call"
          primaryButtonHref={CALENDLY_STRATEGY_CALL_URL}
          showPrimaryArrowIcon={true}
          secondaryButtonText=""
          secondaryButtonHref=""
          showSecondaryIcon={false}
          subtleLinkText="Or run a 3-minute self-serve audit"
          subtleLinkHref="/audit"
          partnersTitle=""
          partners={[]}
          contentClassName="items-start pt-16 sm:pt-20 lg:pt-24"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 -mt-8">
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

      {/* ── The System ──────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section id="architecture" className="py-24 px-6 max-w-6xl mx-auto scroll-mt-28">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              Architecture
            </p>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-[1.1]">
              The System
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SYSTEM_COLUMNS.map((column) => (
              <div
                key={column.label}
                className="relative rounded-3xl border border-white/[0.08] bg-white/[0.015] p-8 transition-colors hover:border-[#06B6A4]/30 hover:bg-white/[0.03]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#06B6A4] mb-5">
                  {column.label}
                </p>
                <p className="text-[15px] leading-[1.75] text-white/[0.65]">
                  {column.copy}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-center font-body text-2xl md:text-4xl tracking-[-0.02em] text-white leading-[1.15] font-semibold">
            Your agency. Your brain. Your system.
            <br />
            Powered by OpsRadar.
          </p>
        </section>
      </FadeInOnScroll>

      <OpsRadar />

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
            Four rules we won&apos;t break.
          </h2>

          <div className="space-y-0">
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 01
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                Our team builds it directly.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                No freelancers. No handoffs. The system that scopes your AIOS is the system that runs it.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 02
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                We diagnose before we pitch.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Every call starts with a real diagnosis of what your agency is actually losing. We do not take meetings to talk about what we might do for you.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 03
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                We price systems, not task volume.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Flat monthly retainers. No surprise bills. Zapier punishes you for scaling — we do not.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-10 md:py-14">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/50 mb-5">
                — 04
              </p>
              <h3 className="font-headline text-2xl md:text-3xl font-bold tracking-[-0.02em] text-white mb-4 leading-[1.15]">
                We stay for year two.
              </h3>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Your AI Operating System is designed to keep running after launch. Our team is still here when you add client #15 and Triple Whale breaks its API.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
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
            Three things we operate.
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
                  OpsRadar diagnoses.
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
                  OpsRadar builds.
                </h3>
                <p className="text-[15px] leading-[1.7] text-white/[0.65]">
                  Custom n8n workflows, inside your own n8n account. Delivered in 5 to 14 days. You own every workflow from day one.
                </p>
              </div>

              {/* OPERATE */}
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
                  OpsRadar monitors.
                </h3>
                <p className="text-[15px] leading-[1.7] text-white/[0.65]">
                  Meta&apos;s API changes. Triple Whale pushes a breaking update. Our team fixes it, usually before you notice. You never touch the automation layer.
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
              <blockquote className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.02em] text-white leading-[1.1] mb-8">
                You own it.<br />All of it.
              </blockquote>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Every workflow we build lives in your n8n account, on your Google Drive, running on your credentials. If OpsRadar ever left, nothing breaks. You keep the code, the logic, and the logs &mdash; day one.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-16 md:py-20">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/60 mb-8">
                — On reliability
              </p>
              <blockquote className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.02em] text-white leading-[1.1] mb-8">
                Meta breaks something.<br />Guardian knows before you do.
              </blockquote>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                Ad platforms push breaking API changes every quarter. Guardian catches them before your Monday morning report fails. You see the fix, not the error.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="py-16 md:py-20">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400/60 mb-8">
                — On AI
              </p>
              <blockquote className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.02em] text-white leading-[1.1] mb-8">
                AI builds fast.<br />We verify every line.
              </blockquote>
              <p className="text-base md:text-[17px] leading-[1.7] text-white/[0.65] max-w-2xl">
                AI accelerates the build. Our team reviews every workflow before it touches your HubSpot, reports MER to your clients, or sends a branded PDF on the 2nd of the month.
              </p>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </section>
      </FadeInOnScroll>

      <FounderPhilosophySection
        summary={HOMEPAGE_FOUNDER_SUMMARY}
      />

      {/* ── Vision ──────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="px-6 py-24 max-w-4xl mx-auto">
          <div className="border-l-[3px] border-[#06B6A4] bg-white/[0.015] px-7 py-8 md:px-10 md:py-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#06B6A4] mb-6">
              The Vision
            </p>
            <div className="space-y-6 text-base md:text-lg leading-[1.8] text-white/[0.68]">
              <p>
                Every agency that runs on OpsRadar gets their own AI Operating System &mdash;
                built from their real operations, their tools, their data, their history.
              </p>
              <p>
                Their team queries it through Claude.
                Their workflows run on it through n8n.
                Their brain gets richer every week.
              </p>
              <p className="font-body text-2xl md:text-3xl leading-[1.25] tracking-[-0.02em] text-white font-semibold">
                We are not building another automation tool.
              </p>
              <p className="font-body text-2xl md:text-3xl leading-[1.25] tracking-[-0.02em] text-white font-semibold">
                We are building the operating system that runs the agency.
              </p>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── 5. Final CTA ─────────────────────────────────────────────── */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Subtle radial glow behind CTA */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto max-w-2xl h-96 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Radar echo icon */}
          <div className="flex justify-center mb-10" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="rgba(34, 211, 238, 0.12)" strokeWidth="1" />
              <circle cx="32" cy="32" r="20" stroke="rgba(34, 211, 238, 0.22)" strokeWidth="1" />
              <circle cx="32" cy="32" r="12" stroke="rgba(34, 211, 238, 0.38)" strokeWidth="1" />
              <circle cx="32" cy="32" r="6" stroke="rgba(34, 211, 238, 0.65)" strokeWidth="1" />
              <circle cx="32" cy="32" r="3" fill="rgb(34, 211, 238)" />
            </svg>
          </div>

          <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-6 tracking-[-0.03em] text-white leading-[1.05]">
            Ready to see your radar?
          </h2>

          <p className="text-white/55 mb-12 text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
            Free 20-min call. Real numbers on what your agency is losing.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 mb-10">
            <a
              href={CALENDLY_STRATEGY_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-lg font-semibold text-base bg-white text-black hover:bg-white/90 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] btn-press"
            >
              Book a free 20-min call
              <span aria-hidden="true">&rarr;</span>
            </a>
            <Link
              href="/audit"
              className="text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
            >
              Or run a 3-minute self-serve audit
            </Link>
          </div>

          <p className="text-[13px] text-white/40 max-w-md mx-auto leading-relaxed">
            No credit card. No sales pitch. Just the list of workflows burning the most money in your agency right now.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
