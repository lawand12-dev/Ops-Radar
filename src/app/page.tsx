import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardContent } from '<npm>/components/ui/card'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import BeamsBackground from '<npm>/components/ui/beams-background'
import StaggerChildren, { StaggerItem } from '<npm>/components/animations/StaggerChildren'
import GlowCard from '<npm>/components/animations/GlowCard'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SystemFlowSection from '../components/SystemFlowSection'
import SuccessStories from '../components/SuccessStories'

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

const PAIN_CARDS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-error">
        <path d="M14 4v12M14 22v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M5.07 8.5A11 11 0 1 0 25 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 14h8M12 10l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Reporting Waste',
    desc: 'Account managers spending 10+ hours a week manually compiling client data into decks.',
    accent: 'rgba(239,68,68,0.5)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-error">
        <rect x="4" y="6" width="9" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="15" y="6" width="9" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M13 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M13 10.5l2 1.5-2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Data Re-entry',
    desc: 'Information living in 5 different tools, requiring constant manual copying between CRM and PM tools.',
    accent: 'rgba(249,115,22,0.5)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-error">
        <path d="M4 6h20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 3.5V7a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.8" fill="none"/>
        <circle cx="10" cy="13" r="1.2" fill="currentColor"/>
        <circle cx="14" cy="13" r="1.2" fill="currentColor"/>
        <circle cx="18" cy="13" r="1.2" fill="currentColor"/>
        <path d="M20 3l2 2-2 2M22 5h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Follow-ups Failing',
    desc: 'Leads falling through the cracks because the manual follow-up process gets forgotten during busy weeks.',
    accent: 'rgba(239,68,68,0.5)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-error">
        <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M14 8v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 5l2.5 2.5M23 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    title: 'Slow Onboarding',
    desc: 'Taking 7 days to get a client into your Slack and PM tool instead of 7 minutes.',
    accent: 'rgba(249,115,22,0.5)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-error">
        <path d="M4 8h20M4 14h12M4 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="22" cy="20" r="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M20.5 18l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Context Loss',
    desc: 'Critical sales notes never making it to the fulfillment team during handoffs.',
    accent: 'rgba(239,68,68,0.5)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-error">
        <rect x="4" y="5" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M9 10h10M9 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M11 23h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M22 8l2-2M22 8l-1.5-2M22 8l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Slow Proposals',
    desc: 'Losing deals to faster competitors because it takes you 48 hours to generate a custom proposal.',
    accent: 'rgba(249,115,22,0.5)',
  },
]

const SHOWCASE_CARDS = [
  {
    tag: 'Sales Ops', tagClass: 'bg-primary/10 text-primary border border-primary/20',
    title: 'Lead Qualification',
    desc: 'Automatically grade leads based on CRM data, LinkedIn profiles, and company size before they hit your calendar.',
    tools: ['GoHighLevel', 'OpenAI', 'Clay'],
    topBorder: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
  },
  {
    tag: 'Reporting', tagClass: 'bg-secondary/10 text-secondary border border-secondary/20',
    title: 'Automated Reporting',
    desc: 'Real-time dashboards that pull from Meta, Google, and Stripe, delivered to clients via Slack or email weekly.',
    tools: ['Looker Studio', 'Supermetrics', 'Slack'],
    topBorder: 'linear-gradient(90deg, #06b6d4, #2dd4bf)',
  },
  {
    tag: 'Retention', tagClass: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
    title: 'Client Onboarding',
    desc: 'Trigger contract signing, folder creation, Slack channel invites, and welcome emails with a single CRM stage change.',
    tools: ['PandaDoc', 'ClickUp', 'Gmail'],
    topBorder: 'linear-gradient(90deg, #f97316, #fb923c)',
  },
  {
    tag: 'Engagement', tagClass: 'bg-green-400/10 text-green-400 border border-green-400/20',
    title: 'Smart Follow-ups',
    desc: 'Multi-channel sequence that pauses as soon as a meeting is booked or a payment is received.',
    tools: ['Instantly', 'HubSpot', 'n8n'],
    topBorder: 'linear-gradient(90deg, #10b981, #34d399)',
  },
]

const TRUST_METRICS = [
  {
    value: '48h',
    label: 'scoped proposal',
    detail: 'Clear build plan, timeline, and fixed price after the audit.',
  },
  {
    value: '5-14d',
    label: 'common delivery window',
    detail: 'Quick Win and Core System builds ship in days, not months.',
  },
  {
    value: '$1.5k+',
    label: 'entry build pricing',
    detail: 'Agencies can start with a focused automation before committing bigger.',
  },
  {
    value: '24h',
    label: 'fastest support SLA',
    detail: 'Growth retainers include rapid response when a workflow breaks.',
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
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body selection:bg-primary/20">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14">
        <BeamsBackground intensity="full" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/50" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/30" />

        <ResponsiveHeroBanner
          navLinks={HOME_NAV_LINKS}
          badgeLabel=""
          badgeText="Done-for-you automation for agencies that need reliable execution"
          title="We Build Your Automations."
          titleLine2="You Focus on Growth."
          description="Stop running the agency through copy-paste, Slack archaeology, and spreadsheet rituals. We engineer the workflow layer that captures leads, routes intent through AI, updates your CRM, and keeps your team moving under load."
          primaryButtonText="Start Free Audit →"
          primaryButtonHref="/audit"
          showPrimaryArrowIcon={false}
          secondaryButtonText="See How It Works"
          secondaryButtonHref="#how"
          showSecondaryIcon={false}
          partnersTitle="THE OPERATING LAYERS WE BUILD, WIRE, AND MAINTAIN FOR YOU"
          contentClassName="items-start pt-16 sm:pt-20 lg:pt-24"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <FadeInOnScroll>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {TRUST_METRICS.map(({ value, label, detail }) => (
                <div
                  key={label}
                  className="surface-card rounded-[24px] p-5"
                >
                  <p className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                    {label}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* ── Pain Points ──────────────────────────────────────────────── */}
      <section id="pain" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeInOnScroll className="mb-16">
          <span className="section-tag">The Problem</span>
          <h2 className="section-title mt-4 max-w-xl text-3xl md:text-4xl">
            Operational debt is the silent agency killer.
          </h2>
        </FadeInOnScroll>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PAIN_CARDS.map(({ icon, title, desc, accent }) => (
            <StaggerItem key={title}>
              <GlowCard glowColor="rgba(96,165,250,0.14)" className="h-full rounded-[24px]">
                <Card
                  className="hardware-card relative h-full cursor-default overflow-hidden rounded-[24px] p-8 ring-0 shadow-none"
                >
                  <div
                    className="pointer-events-none absolute bottom-7 left-5 top-7 w-px rounded-full"
                    style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }}
                    aria-hidden
                  />
                  <CardContent className="p-0">
                    <div className="mb-6">{icon}</div>
                    <h3 className="text-lg font-bold mb-3 text-on-surface">{title}</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      <SystemFlowSection />

      <SuccessStories />

      {/* ── Systems Showcase ─────────────────────────────────────────── */}
      <section id="showcase" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeInOnScroll className="flex justify-between items-end mb-16">
          <div className="max-w-xl">
            <span className="section-tag text-primary">Solutions</span>
            <h2 className="section-title mt-4 text-4xl">
              Enterprise-grade systems for boutique agencies.
            </h2>
          </div>
        </FadeInOnScroll>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHOWCASE_CARDS.map(({ tag, tagClass, title, desc, tools, topBorder }) => (
            <StaggerItem key={title}>
              <GlowCard glowColor="rgba(96,165,250,0.14)" className="h-full rounded-[24px]">
                <Card className="hardware-card relative h-full cursor-default overflow-hidden rounded-[24px] ring-0 shadow-none">
                  {/* Colored top border */}
                  <div className="h-[2px] w-full" style={{ background: topBorder }} />
                  <CardContent className="p-8 pt-6">
                    <div className="flex justify-between items-start mb-6">
                      <Badge variant="outline" className={`h-auto px-3 py-1 text-[10px] font-bold rounded uppercase border-0 ${tagClass}`}>{tag}</Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-on-surface">{title}</h3>
                    <p className="text-on-surface-variant mb-8 leading-relaxed">{desc}</p>
                    <div className="flex gap-2 flex-wrap">
                      {tools.map(t => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="h-auto px-2 py-1 text-[10px] bg-surface-container-high rounded text-on-surface-variant border-outline-variant/20"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* ── Why OpsRadar ─────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <span className="section-tag justify-center">Why OpsRadar</span>
              <h2 className="section-title mt-4 text-3xl md:text-5xl">
                Choose Your Operational Path
              </h2>
              <p className="section-copy mx-auto mt-5">
                Most automation options look fine during setup. The real difference is who owns the
                workflow once it becomes business-critical and something breaks under load.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="surface-card rounded-[28px] p-8 lg:mt-6">
                <span className="section-tag text-[10px] text-error">DIY Stack</span>
                <h4 className="mt-5 text-xl font-bold text-on-surface">DIY Tools</h4>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  Flexible on paper, but your team inherits the setup, breakages, and every edge case.
                </p>
                <ul className="mt-8 space-y-4 text-sm text-on-surface-variant">
                  {['High learning curve', 'Constant API breakages', 'You are the tech support'].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="mt-1 shrink-0 text-error">
                        <path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface-card surface-card-strong relative rounded-[30px] p-8 lg:-mt-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary/14 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Best Fit
                </div>
                <span className="section-tag text-[10px] text-primary">Done-For-You Layer</span>
                <h4 className="mt-5 text-[1.7rem] font-bold tracking-tight text-on-surface">OpsRadar</h4>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  We scope it, build it, host it, and stay accountable for reliability after launch.
                </p>
                <ul className="mt-8 space-y-4 text-on-surface">
                  {[
                    'Built by agency veterans',
                    'Proactive maintenance',
                    'Done-for-you migration',
                    'Fixed monthly pricing',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0 text-primary">
                        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.15"/>
                        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="btn-spring btn-main-sheen mt-10 w-full rounded-xl py-4 text-base font-bold">
                  <Link href="/audit">Get Started Free</Link>
                </Button>
              </div>

              <div className="surface-card rounded-[28px] p-8 lg:mt-6">
                <span className="section-tag text-[10px] text-tertiary">Freelance Support</span>
                <h4 className="mt-5 text-xl font-bold text-on-surface">Freelancers</h4>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  Useful for one-off tasks, but reliability gets uneven once their bandwidth shifts.
                </p>
                <ul className="mt-8 space-y-4 text-sm text-on-surface-variant">
                  {['Hit or miss reliability', 'Hidden hourly costs', 'Ghost you when busy'].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="mt-1 shrink-0 text-error">
                        <path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-40 px-6 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-8 tracking-tight text-on-surface">
              Stop managing automations.{' '}
              <br />
              <span className="text-on-surface/60">Start using them.</span>
            </h2>
            <p className="text-on-surface-variant text-lg mb-12 max-w-2xl mx-auto">
              Get your custom roadmap during a 30-minute operational audit. Zero cost, massive clarity.
            </p>
            <Button asChild className="px-12 py-5 h-auto rounded-xl font-bold text-lg btn-spring btn-main-sheen shadow-[0_0_50px_rgba(173,198,255,0.4)]">
              <Link href="/audit">Start Your Free Audit →</Link>
            </Button>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="footer-shell py-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-bold text-on-surface">OpsRadar</div>
          <p className="text-xs uppercase tracking-widest text-on-surface-variant/70">
            © 2026 OpsRadar. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/services" className="text-xs uppercase tracking-widest text-on-surface-variant/70 hover:text-on-surface transition-colors">Services</Link>
            <Link href="/about"    className="text-xs uppercase tracking-widest text-on-surface-variant/70 hover:text-on-surface transition-colors">About</Link>
            <Link href="/audit"    className="text-xs uppercase tracking-widest text-on-surface-variant/70 hover:text-on-surface transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
