import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import { Card, CardContent } from '<npm>/components/ui/card'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import StaggerChildren, { StaggerItem } from '<npm>/components/animations/StaggerChildren'
import GlowCard from '<npm>/components/animations/GlowCard'
import FounderPhilosophySection from '<npm>/components/FounderPhilosophySection'
import SiteHeader from '<npm>/components/ui/site-header'

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

const DIFF_CARDS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" stroke="#adc6ff" strokeWidth="1.5" fill="rgba(173,198,255,0.08)" />
        <path d="M7 10h10M7 14h6" stroke="#adc6ff" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="19" cy="5" r="3" fill="#34d399" stroke="#0a0e16" strokeWidth="1.5" />
        <path d="M17.8 5l.8.8 1.4-1.4" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#adc6ff',
    title: 'We Own the Infrastructure',
    desc: 'Your workflows run on our servers, not a third-party cloud you\'ve never heard of. We monitor uptime, handle deployments, and know immediately when something fails — before you do.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#4cd7f6" strokeWidth="1.5" fill="rgba(76,215,246,0.08)" />
        <path d="M8 12h8M12 8l4 4-4 4" stroke="#4cd7f6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 7l2.5 2.5M7 17l2.5-2.5" stroke="#4cd7f6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    color: '#4cd7f6',
    title: 'No Per-Task Fees',
    desc: 'Unlike Zapier or Make, n8n charges nothing per task execution. Run 10 automations or 10,000 — the cost stays the same. Scaling your ops doesn\'t mean scaling your bill.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="#a78bfa" strokeWidth="1.5" fill="rgba(167,139,250,0.08)" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 13l1.5 1.5L21 12" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#a78bfa',
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
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body overflow-x-hidden">
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
      <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-20">
        <div className="absolute inset-0 grid-texture pointer-events-none" />
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              About OpsRadar
            </span>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tight text-on-surface leading-[1.08]">
            We Exist Because Agencies Shouldn&apos;t{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Waste Time on Busywork
            </span>
          </h1>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* ── The Story ────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <FadeInOnScroll>
          <div className="rounded-xl overflow-hidden bg-surface-container border border-outline-variant/10">
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }} />
            <div className="p-8 sm:p-10 space-y-6">
              <p className="text-base md:text-lg text-on-surface-variant leading-relaxed font-light">
                Most agencies know they need automation. But learning n8n, Zapier, or Make takes months.
                Hiring a developer costs thousands per month. And the freelancer who built your last
                integration disappeared after delivery.
              </p>
              <p className="text-base md:text-lg text-on-surface-variant leading-relaxed font-light">
                OpsRadar exists to solve that. We build, host, and maintain your automations — so you get
                the results without the overhead. Every workflow is built on n8n, an open-source platform
                with no per-task fees, running on infrastructure we own and monitor 24/7.
              </p>
              <p className="text-base md:text-lg text-on-surface leading-relaxed font-medium">
                We&apos;re not a tool you have to learn. We&apos;re not a course you have to take.
                We&apos;re the engineering layer that makes your operations run themselves.
              </p>
            </div>
          </div>
        </FadeInOnScroll>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      <FounderPhilosophySection
        name={FOUNDER_PROFILE.name}
        title={FOUNDER_PROFILE.title}
        summary={FOUNDER_PROFILE.summary}
      />

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── How We're Different ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <FadeInOnScroll>
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">What Sets Us Apart</span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-12 text-on-surface">
            How We&apos;re Different
          </h2>
        </FadeInOnScroll>

        <StaggerChildren className="grid sm:grid-cols-3 gap-5">
          {DIFF_CARDS.map(({ icon, color, title, desc }) => (
            <StaggerItem key={title}>
              <GlowCard glowColor={`${color}12`} className="h-full rounded-xl">
                <Card
                  className="p-6 flex flex-col gap-4 h-full bg-surface-container border-outline-variant/10 ring-0 shadow-none overflow-hidden rounded-xl"
                  style={{ borderTopColor: 'transparent' }}
                >
                  <CardContent className="p-0 flex flex-col gap-4">
                    <div
                      className="h-[2px] -mx-6 -mt-6 mb-2 rounded-t-xl"
                      style={{ background: `linear-gradient(90deg, ${color}, ${color}00 55%)` }}
                    />
                    <div
                      className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0"
                      style={{ background: `${color}10`, border: `1px solid ${color}25` }}
                    >
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-[16px] text-on-surface mb-2 leading-snug">
                        {title}
                      </h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(173,198,255,0.06) 0%, transparent 65%)' }} />
          <div className="relative z-10 max-w-xl mx-auto">
            <p className="text-sm text-on-surface-variant/50 mb-3">See what we&apos;d automate for you</p>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-8 text-on-surface">
              Ready to stop doing it manually?
            </h2>
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-bold gap-2 shadow-[0_0_30px_rgba(173,198,255,0.3)] hover:shadow-[0_0_45px_rgba(173,198,255,0.5)] btn-spring">
              <Link href="/audit">
                Start Free Audit
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3.75 9h10.5m-4.5-4.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </Button>
            <p className="mt-4 text-xs text-on-surface-variant/30">3 minutes · Free · No commitment</p>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-outline-variant/10 bg-slate-950">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant/40">© 2026 OpsRadar</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Home</Link>
            <Link href="/services" className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Services</Link>
            <Link href="/about" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors font-semibold">About</Link>
            <Link href="/audit" className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Free Audit →</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
