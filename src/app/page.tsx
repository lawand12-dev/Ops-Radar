import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import BeamsBackground from '<npm>/components/ui/beams-background'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'

export const metadata: Metadata = {
  title: "OpsRadar — Done-For-You Automation for Agencies",
  description:
    "We build, host, and maintain custom automation systems for agencies. Stop wasting hours on manual work — start your free operations audit today.",
  openGraph: {
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "We build, host, and maintain custom automation systems for agencies. Stop wasting hours on manual work — start your free operations audit today.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "OpsRadar — Done-For-You Automation for Agencies",
    description:
      "We build, host, and maintain custom automation systems for agencies. Stop wasting hours on manual work — start your free operations audit today.",
    images: ["/logo.png"],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    title: 'Reporting Waste',
    desc: 'Account managers spending 10+ hours a week manually compiling client data into decks.',
  },
  {
    title: 'Data Re-entry',
    desc: 'Information living in 5 different tools, requiring constant manual copying between CRM and PM tools.',
  },
  {
    title: 'Follow-ups Failing',
    desc: 'Leads falling through the cracks because the manual follow-up process gets forgotten during busy weeks.',
  },
  {
    title: 'Slow Onboarding',
    desc: 'Taking 7 days to get a client into your Slack and PM tool instead of 7 minutes.',
  },
  {
    title: 'Context Loss',
    desc: 'Critical sales notes never making it to the fulfillment team during handoffs.',
  },
  {
    title: 'Slow Proposals',
    desc: 'Losing deals to faster competitors because it takes you 48 hours to generate a custom proposal.',
  },
]

const SOLUTIONS = [
  {
    tag: 'Sales Ops',
    title: 'Lead Qualification',
    desc: 'Automatically grade leads based on CRM data, LinkedIn profiles, and company size before they hit your calendar.',
    tools: ['GoHighLevel', 'OpenAI', 'Clay'],
  },
  {
    tag: 'Reporting',
    title: 'Automated Reporting',
    desc: 'Real-time dashboards that pull from Meta, Google, and Stripe, delivered to clients via Slack or email weekly.',
    tools: ['Looker Studio', 'Supermetrics', 'Slack'],
  },
  {
    tag: 'Retention',
    title: 'Client Onboarding',
    desc: 'Trigger contract signing, folder creation, Slack channel invites, and welcome emails with a single CRM stage change.',
    tools: ['PandaDoc', 'ClickUp', 'Gmail'],
  },
  {
    tag: 'Engagement',
    title: 'Smart Follow-ups',
    desc: 'Multi-channel sequence that pauses as soon as a meeting is booked or a payment is received.',
    tools: ['Instantly', 'HubSpot', 'n8n'],
  },
]

const HOME_NAV_LINKS = [
  { label: 'Home', href: '/', isActive: true },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Problems', href: '/#pain' },
  { label: 'How It Works', href: '/#how' },
  { label: 'Systems', href: '/#showcase' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-body selection:bg-primary/20">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14">
        <BeamsBackground intensity="full" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        <ResponsiveHeroBanner
          navLinks={HOME_NAV_LINKS}
          badgeLabel=""
          badgeText="Done-for-you automation for agencies that need reliable execution"
          title="We Build Your Automations."
          titleLine2="You Focus on Growth."
          description="I build, host, and maintain custom n8n automations for agencies. You tell me what's broken. I fix it. You never touch a workflow."
          primaryButtonText="Start Free Audit"
          primaryButtonHref="/audit"
          showPrimaryArrowIcon={true}
          secondaryButtonText="See How It Works"
          secondaryButtonHref="#how"
          showSecondaryIcon={false}
          partnersTitle=""
          partners={[]}
          contentClassName="items-start pt-16 sm:pt-20 lg:pt-24"
        />
      </section>

      {/* ── Pain Points ──────────────────────────────────────────────── */}
      <section id="pain" className="py-32 px-6 max-w-5xl mx-auto">
        <FadeInOnScroll className="mb-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            The Problem
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] max-w-xl" style={{ letterSpacing: '-0.03em' }}>
            Operational debt is the silent agency killer.
          </h2>
        </FadeInOnScroll>

        <div className="space-y-0">
          {PAIN_POINTS.map(({ title, desc }, i) => (
            <div key={title}>
              {i === 0 && (
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-16 py-8 md:py-10">
                <h3 className="text-base font-semibold text-white/90 tracking-[-0.01em]" style={{ letterSpacing: '0.01em' }}>
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

      {/* ── Solutions Showcase ─────────────────────────────────────────── */}
      <section id="showcase" className="py-32 px-6 max-w-5xl mx-auto">
        <FadeInOnScroll className="mb-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Solutions
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] max-w-xl" style={{ letterSpacing: '-0.03em' }}>
            Enterprise-grade systems for boutique agencies.
          </h2>
        </FadeInOnScroll>

        <div className="space-y-0">
          {SOLUTIONS.map(({ tag, title, desc, tools }, i) => (
            <div key={title}>
              {i === 0 && (
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <div className="py-10 md:py-12">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/30 mb-3">
                  {tag}
                </p>
                <h3 className="text-xl md:text-2xl font-bold text-white/90 mb-4 tracking-[-0.02em]" style={{ letterSpacing: '-0.02em' }}>
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/50 max-w-2xl mb-5">
                  {desc}
                </p>
                <div className="flex gap-4 flex-wrap">
                  {tools.map(t => (
                    <span key={t} className="text-[13px] text-white/30 hover:text-white/60 transition-colors">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-40 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-8 tracking-[-0.03em] text-white" style={{ letterSpacing: '-0.03em' }}>
            Stop managing automations.{' '}
            <br />
            <span className="text-white/50">Start using them.</span>
          </h2>
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
            <Link href="/services" className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Services</Link>
            <Link href="/about"    className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">About</Link>
            <Link href="/audit"    className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
