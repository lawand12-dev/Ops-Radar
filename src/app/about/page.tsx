import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import FounderPhilosophySection from '<npm>/components/FounderPhilosophySection'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export const metadata: Metadata = {
  title: "About",
  description:
    "OpsRadar builds the operating system that runs your agency. We diagnose how work actually flows, build the system, and keep it running.",
  openGraph: {
    title: "About — OpsRadar",
    description:
      "OpsRadar builds the operating system that runs your agency. We diagnose how work actually flows, build the system, and keep it running.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "About — OpsRadar" }],
  },
  twitter: {
    title: "About — OpsRadar",
    description:
      "OpsRadar builds the operating system that runs your agency. We diagnose how work actually flows, build the system, and keep it running.",
    images: ["/og-image.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'AIOS', href: '/aios' },
  { label: 'About', href: '/about', isActive: true },
]

// ── Data ──────────────────────────────────────────────────────────────────────

const CREDIBILITY_MARKERS = [
  {
    label: 'Delivery model',
    value: 'One team. End to end.',
    detail: 'Same people scope, build, and maintain. No outsourced handoff. The team that knows your system fixes it when it breaks.',
  },
  {
    label: 'Ownership',
    value: 'You own everything.',
    detail: 'Workflows live in your account, on your infrastructure, with your credentials. If you leave, you keep the system. We just stop maintaining it.',
  },
  {
    label: 'Stack depth',
    value: '30+ integrations, hands-on.',
    detail: 'Meta, Google Ads, GA4, HubSpot, Klaviyo, Triple Whale, Ahrefs, Salesforce, Slack, Notion, Airtable — built end-to-end, ready to deploy.',
  },
  {
    label: 'Speed to live',
    value: '5–14 days from kickoff.',
    detail: 'Most builds ship inside two weeks. You get the proposal in 48 hours, the walkthrough on day 9, production on day 10.',
  },
]

const WHY_TRUST = [
  {
    title: 'One team. Full accountability.',
    desc: 'Same people scope it, build it, and maintain it. When it breaks, the team that built it fixes it \u2014 not a stranger reading docs at 2am.',
  },
  {
    title: 'Agency operators, not generic devs.',
    desc: 'We came up inside agency ops. We have watched smart teams bleed margin to broken handoffs, duplicate entry, and automations no one trusted two weeks after launch. OpsRadar exists because operational debt keeps getting dressed up as process.',
  },
  {
    title: 'You own everything. No lock-in.',
    desc: 'Workflows live in your account. Documentation lives with you. Credentials are yours. If you ever want to leave, you keep the entire system \u2014 we just stop maintaining it.',
  },
  {
    title: 'AI drafts. Humans verify.',
    desc: 'AI lets us scope and prototype in hours, not weeks. But nothing touches your live business without a human on our team reviewing it first. Speed without shortcuts.',
  },
]

const FOUNDER_PROFILE = {
  name: 'OpsRadar',
  title: 'AI Operations Team',
  summary:
    'OpsRadar exists because we kept watching the same thing happen. Agencies hire to fix problems that should be automated. They build process docs no one reads. They lose Friday afternoons to reports a script could ship in seconds. We built OpsRadar to end that loop.',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            About
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04]">
            We build the system your agency should already have.
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
            Most agencies do not have an operations problem. They have a system problem.
            <span className="mt-3 block text-white/85">
              OpsRadar diagnoses how your work actually flows, builds the system that runs it, and keeps it running.
            </span>
          </p>
        </div>
      </section>

      {/* ── The Short Version ────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-24">
          <div className="h-px w-full mb-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
            <div className="space-y-6">
              <p className="text-base md:text-lg text-white/[0.65] leading-relaxed">
                We build the brain, the workflows, and the interface your team uses to ask
                how the business is actually running.
              </p>
              <p className="text-base md:text-lg text-white/[0.65] leading-relaxed">
                OpsRadar is not a tool your team has to learn. It is the layer that connects
                the tools you already use, captures the knowledge in your team&apos;s heads,
                and runs the work that should never have been manual.
              </p>
            </div>
            <div>
              <p className="text-base md:text-lg text-white/90 leading-relaxed font-medium">
                We turn how your agency really operates into a system that runs itself —
                and gets sharper every week.
              </p>
            </div>
          </div>
          <div className="h-px w-full mt-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </section>
      </FadeInOnScroll>

      {/* ── Credibility markers ──────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-24">
          <div className="h-px w-full mb-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            The specifics
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-14">
            What you&apos;re actually getting.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {CREDIBILITY_MARKERS.map((marker) => (
              <div key={marker.label}>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/70 mb-2">
                  {marker.label}
                </p>
                <p className="font-headline text-xl md:text-2xl font-bold text-white mb-3 tracking-[-0.01em]">
                  {marker.value}
                </p>
                <p className="text-[14px] leading-relaxed text-white/60">
                  {marker.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="h-px w-full mt-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </section>
      </FadeInOnScroll>

      {/* ── Founder card (existing component) ────────────────────────── */}
      <FounderPhilosophySection
        summary={FOUNDER_PROFILE.summary}
      />

      {/* ── Why Trust Me ─────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-24">
          <div className="h-px w-full mb-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Why Trust Us
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-14">
            Why this model works where retainers fail.
          </h2>

          <div className="space-y-0">
            {WHY_TRUST.map(({ title, desc }, i) => (
              <div key={title}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-12 py-8 md:py-10">
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

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-8 text-white">
            Stop running your agency on memory.
          </h2>
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
          <p className="mt-4 text-xs text-white/20">20 minutes &middot; Free &middot; No commitment</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
