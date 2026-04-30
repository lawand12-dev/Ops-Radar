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
    "OpsRadar is the AI operations team building the AI Operating System for marketing agencies. Your brain, your workflows, your Claude interface.",
  openGraph: {
    title: "About — OpsRadar",
    description:
      "OpsRadar is the AI operations team building the AI Operating System for marketing agencies. Your brain, your workflows, your Claude interface.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "About — OpsRadar" }],
  },
  twitter: {
    title: "About — OpsRadar",
    description:
      "OpsRadar is the AI operations team building the AI Operating System for marketing agencies. Your brain, your workflows, your Claude interface.",
    images: ["/og-image.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'AIOS', href: '/#architecture' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about', isActive: true },
]

// ── Data ──────────────────────────────────────────────────────────────────────

const CREDIBILITY_MARKERS = [
  {
    label: 'Working hours',
    value: '8-hour advantage',
    detail: 'Based in Kurdistan (UTC+3). Your team signs off, our team ships overnight, you wake up to updates.',
  },
  {
    label: 'Primary platform',
    value: 'n8n certified builder',
    detail: 'Every workflow built on n8n in your own account — not a hidden SaaS layer. You keep everything if we part ways.',
  },
  {
    label: 'Stack depth',
    value: '30+ integrations hands-on',
    detail: 'Meta, Google Ads, GA4, HubSpot, Klaviyo, Triple Whale, Ahrefs, Salesforce, Slack, Notion, Airtable — built and tested end-to-end, ready to deploy to your stack.',
  },
  {
    label: 'Delivery model',
    value: 'Team accountability',
    detail: 'No outsourced labor, no agency markup. Every workflow is scoped, built, and maintained by the OpsRadar team.',
  },
]

const WHY_TRUST = [
  {
    title: 'One team, full accountability.',
    desc: 'We scope it, build it, and maintain it inside your n8n account. There\u2019s no outsourced handoff. If something breaks, our team fixes it because we know the system we built.',
  },
  {
    title: 'Agency experience, not just technical skill.',
    desc: 'Our team came up around agency operations. We\u2019ve watched smart teams lose margin to broken handoffs, duplicate entry, and automation setups nobody trusted two weeks after launch. OpsRadar exists because operational debt is still being dressed up as process.',
  },
  {
    title: 'No per-task fees. No vendor lock-in.',
    desc: 'Everything runs on n8n \u2014 in your own account, not ours. You own your workflows from day one. If you ever want to leave, you keep the workflows and the documentation. We just stop maintaining them.',
  },
  {
    title: 'AI-assisted, human-verified.',
    desc: 'We use AI to scope and draft workflows faster. But every single workflow is reviewed by our team before it touches your live business. Speed without cutting corners.',
  },
]

const FOUNDER_PROFILE = {
  name: 'OpsRadar',
  title: 'AI Operations Team',
  summary:
    'OpsRadar was built from years of studying how agencies actually operate: where work leaks, why tools do not talk to each other, and why teams keep hiring for problems that should be automated.',
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
            The team building the agency AI Operating System.
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl">
            OpsRadar scopes, builds, and maintains the Agency Brain and the workflows that run on it.
            <span className="mt-3 block text-white/85">
              Building the AI Operating System for marketing agencies. Claude is the interface. n8n runs the execution.
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
                OpsRadar builds AI Operating Systems for marketing agencies:
                the Agency Brain, the workflows, and the Claude interface that
                lets your team query how the business actually runs.
              </p>
              <p className="text-base md:text-lg text-white/[0.65] leading-relaxed">
                OpsRadar is not another SaaS tool your team has to learn.
                It is the operating layer connecting your tools, data, clients,
                and internal workflows.
              </p>
            </div>
            <div>
              <p className="text-base md:text-lg text-white/90 leading-relaxed font-medium">
                We are the engineering team that turns your agency&apos;s real
                operations into a system your people can use every week.
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
            What you&apos;re actually hiring.
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
        name={FOUNDER_PROFILE.name}
        title={FOUNDER_PROFILE.title}
        imageSrc={null}
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
            Four reasons this model works.
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
            Ready to stop doing it manually?
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
