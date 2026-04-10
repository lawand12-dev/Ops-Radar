import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import FounderPhilosophySection from '<npm>/components/FounderPhilosophySection'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background'

export const metadata: Metadata = {
  title: "About",
  description:
    "OpsRadar builds and maintains automation systems for agencies. We exist because agencies shouldn't waste time on busywork — we handle the ops so you can focus on growth.",
  openGraph: {
    title: "About — OpsRadar",
    description:
      "OpsRadar builds and maintains automation systems for agencies. We exist because agencies shouldn't waste time on busywork — we handle the ops so you can focus on growth.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "About — OpsRadar",
    description:
      "OpsRadar builds and maintains automation systems for agencies. We exist because agencies shouldn't waste time on busywork — we handle the ops so you can focus on growth.",
    images: ["/logo.png"],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const DIFF_POINTS = [
  {
    title: 'We Own the Infrastructure',
    desc: 'Your workflows run on our servers, not a third-party cloud you\'ve never heard of. We monitor uptime, handle deployments, and know immediately when something fails — before you do.',
  },
  {
    title: 'No Per-Task Fees',
    desc: 'Unlike Zapier or Make, n8n charges nothing per task execution. Run 10 automations or 10,000 — the cost stays the same. Scaling your ops doesn\'t mean scaling your bill.',
  },
  {
    title: 'Human Quality Gate',
    desc: 'AI helps us scope and draft workflows faster. But a human reviews every single workflow before it touches your live business. Speed without skipping the part that matters.',
  },
]

const FOUNDER_PROFILE = {
  name: 'Lawand',
  title: 'Founder & Lead Automation Architect',
  summary:
    'I came up on the agency side, where smart people still lost margin to broken handoffs, duplicate entry, and automation setups nobody trusted two weeks after launch. I built OpsRadar because I got tired of seeing operational debt dressed up as process.',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader
        sticky
        navLinks={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'About', href: '/about', isActive: true },
          { label: 'Problems', href: '/#pain' },
          { label: 'How It Works', href: '/#how' },
          { label: 'Systems', href: '/#showcase' },
        ]}
      />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            About OpsRadar
          </p>
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-[-0.04em] text-white leading-[1.08]">
            We Exist Because Agencies Shouldn&apos;t{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Waste Time on Busywork
            </span>
          </h1>
        </div>
      </section>

      {/* ── The Story ────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="h-px w-full mb-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <FadeInOnScroll>
          <div className="space-y-6">
            <p className="text-base md:text-lg text-white/50 leading-relaxed">
              Most agencies know they need automation. But learning n8n, Zapier, or Make takes months.
              Hiring a developer costs thousands per month. And the freelancer who built your last
              integration disappeared after delivery.
            </p>
            <p className="text-base md:text-lg text-white/50 leading-relaxed">
              OpsRadar exists to solve that. We build, host, and maintain your automations — so you get
              the results without the overhead. Every workflow is built on n8n, an open-source platform
              with no per-task fees, running on infrastructure we own and monitor 24/7.
            </p>
            <p className="text-base md:text-lg text-white/90 leading-relaxed font-medium">
              We&apos;re not a tool you have to learn. We&apos;re not a course you have to take.
              We&apos;re the engineering layer that makes your operations run themselves.
            </p>
          </div>
        </FadeInOnScroll>
        <div className="h-px w-full mt-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </section>

      <FounderPhilosophySection
        name={FOUNDER_PROFILE.name}
        title={FOUNDER_PROFILE.title}
        summary={FOUNDER_PROFILE.summary}
      />

      {/* ── How We're Different ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="h-px w-full mb-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <FadeInOnScroll>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What Sets Us Apart
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-14">
            How We&apos;re Different
          </h2>
        </FadeInOnScroll>

        <div className="space-y-0">
          {DIFF_POINTS.map(({ title, desc }, i) => (
            <div key={title}>
              {i === 0 && (
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-12 py-8 md:py-10">
                <h3 className="text-base font-semibold text-white/90 tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/50">
                  {desc}
                </p>
              </div>
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-8 text-white">
            Ready to stop doing it manually?
          </h2>
          <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
            <Link href="/audit">
              Start Free Audit &rarr;
            </Link>
          </Button>
          <p className="mt-4 text-xs text-white/20">3 minutes &middot; Free &middot; No commitment</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/20">&copy; 2026 OpsRadar</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-white/20 hover:text-white/50 transition-colors">Home</Link>
            <Link href="/services" className="text-xs text-white/20 hover:text-white/50 transition-colors">Services</Link>
            <Link href="/about" className="text-xs text-white/50 hover:text-white transition-colors font-semibold">About</Link>
            <Link href="/audit" className="text-xs text-white/20 hover:text-white/50 transition-colors">Free Audit &rarr;</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
