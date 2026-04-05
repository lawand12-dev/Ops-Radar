import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardContent } from '<npm>/components/ui/card'
import AnimatedGradientText from '<npm>/components/animations/AnimatedGradientText'
import StaggerChildren, { StaggerItem } from '<npm>/components/animations/StaggerChildren'
import GlowCard from '<npm>/components/animations/GlowCard'
import FloatingParticles from '<npm>/components/animations/FloatingParticles'
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body selection:bg-primary/20 page-enter">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full bg-slate-900/60 backdrop-blur-2xl shadow-[0_0_64px_rgba(173,198,255,0.08)] border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="OpsRadar" width={32} height={32} className="h-8 w-auto rounded-[6px] shrink-0" />
            <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-headline">
              OpsRadar
            </span>
          </Link>
          <div className="hidden md:flex gap-8 items-center text-sm tracking-tight">
            <Link href="/services" className="text-on-surface-variant hover:text-on-surface transition-colors">Services</Link>
            <Link href="/about"    className="text-on-surface-variant hover:text-on-surface transition-colors">About</Link>
            <a href="#pain"        className="text-on-surface-variant hover:text-on-surface transition-colors">Problems</a>
            <a href="#how"         className="text-on-surface-variant hover:text-on-surface transition-colors">How It Works</a>
            <a href="#showcase"    className="text-on-surface-variant hover:text-on-surface transition-colors">Systems</a>
          </div>
          <Button asChild className="bg-primary-container text-on-primary-container hover:bg-primary-container/80 px-5 py-2 h-auto rounded-lg font-semibold text-sm btn-spring">
            <Link href="/audit">Start Free Audit</Link>
          </Button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-32 px-6 overflow-hidden">
        {/* Dot grid texture */}
        <div className="absolute inset-0 grid-texture pointer-events-none" />
        {/* Blur orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
        {/* Floating particles */}
        <FloatingParticles />

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
          {/* Badge */}
          <FadeInOnScroll delay={0.1}>
            <Badge variant="outline" className="inline-flex items-center gap-2 px-3 py-1 h-auto rounded-full bg-surface-container-high border-outline-variant/20 text-on-surface-variant mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold">
                Done-For-You Agency Automation
              </span>
            </Badge>
          </FadeInOnScroll>

          {/* H1 */}
          <FadeInOnScroll delay={0.2}>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface leading-[1.08] mb-6">
              We Build Your Automations.{' '}
              <br />
              <AnimatedGradientText className="text-6xl md:text-8xl">
                You Focus on Growth.
              </AnimatedGradientText>
            </h1>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.3}>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-10 leading-relaxed">
              Stop wrestling with Zapier and outdated spreadsheets. We architect, build, and maintain
              the custom operational systems your agency needs to scale profitably.
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="px-8 py-4 h-auto rounded-lg font-bold btn-spring btn-main-sheen cta-pulse gap-2">
                <Link href="/audit">
                  Start Free Audit
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3.75 9h10.5m-4.5-4.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </Button>
              <Button asChild variant="outline" className="px-8 py-4 h-auto rounded-lg font-semibold text-on-surface border-outline-variant/30 hover:bg-surface-container-high/40 hover:border-outline-variant/50 bg-transparent">
                <a href="#how">See How It Works</a>
              </Button>
            </div>
          </FadeInOnScroll>
        </div>

        {/* Workflow mock dashboard */}
        <FadeInOnScroll delay={0.5} className="mt-20 w-full max-w-5xl">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/50 backdrop-blur-sm p-4 shadow-2xl">
            <WorkflowMock />
          </div>
        </FadeInOnScroll>
      </section>

      {/* ── Pain Points ──────────────────────────────────────────────── */}
      <section id="pain" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeInOnScroll className="mb-16">
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">The Problem</span>
          <h2 className="font-headline text-3xl md:text-4xl mt-4 text-on-surface max-w-xl">
            Operational debt is the silent agency killer.
          </h2>
        </FadeInOnScroll>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PAIN_CARDS.map(({ icon, title, desc, accent }) => (
            <StaggerItem key={title}>
              <GlowCard glowColor="rgba(239,68,68,0.08)" className="h-full rounded-xl">
                <Card
                  className="h-full p-8 bg-surface-container-low border-outline-variant/10 ring-0 shadow-none cursor-default rounded-xl overflow-hidden relative"
                  style={{ borderLeft: `3px solid ${accent}` }}
                >
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

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how" className="py-32 bg-surface-container-lowest overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInOnScroll className="text-center mb-20">
            <h2 className="font-headline text-3xl md:text-5xl font-bold text-on-surface">
              From Chaos to Clockwork
            </h2>
          </FadeInOnScroll>
          <div className="relative">
            {/* Connecting line with glow */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" style={{ boxShadow: '0 0 8px 1px rgba(173,198,255,0.25)' }} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
              {[
                { n: '1', title: 'Free Audit',    desc: 'We identify your biggest operational bottlenecks for free.', active: true },
                { n: '2', title: 'Scope & Price', desc: 'Custom blueprint designed for your specific tech stack.',    active: false },
                { n: '3', title: 'We Build It',   desc: 'Our engineers handle the complex logic and integration.',    active: false },
                { n: '4', title: 'It Runs 24/7',  desc: 'White-glove maintenance and 99.9% uptime guaranteed.',       active: true },
              ].map(({ n, title, desc, active }, i) => (
                <FadeInOnScroll key={n} delay={i * 0.1} direction="up">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-6 ${
                        active
                          ? 'bg-surface-container-high border border-primary/50 text-primary shadow-[0_0_20px_rgba(173,198,255,0.2)]'
                          : 'bg-surface-container-high border border-outline-variant text-on-surface'
                      }`}
                    >
                      {n}
                    </div>
                    <h4 className="font-bold mb-2 text-on-surface">{title}</h4>
                    <p className="text-xs text-on-surface-variant px-4 leading-relaxed">{desc}</p>
                  </div>
                </FadeInOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Systems Showcase ─────────────────────────────────────────── */}
      <section id="showcase" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeInOnScroll className="flex justify-between items-end mb-16">
          <div className="max-w-xl">
            <span className="text-primary font-bold text-xs uppercase tracking-widest">Solutions</span>
            <h2 className="font-headline text-4xl mt-4 text-on-surface">
              Enterprise-grade systems for boutique agencies.
            </h2>
          </div>
        </FadeInOnScroll>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHOWCASE_CARDS.map(({ tag, tagClass, title, desc, tools, topBorder }) => (
            <StaggerItem key={title}>
              <GlowCard className="h-full rounded-xl">
                <Card className="group relative h-full bg-surface-container border-outline-variant/10 ring-0 shadow-none glow-hover overflow-hidden cursor-default rounded-xl">
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
            <h2 className="font-headline text-3xl md:text-5xl font-bold text-center mb-20 text-on-surface">
              Choose Your Operational Path
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {/* DIY */}
              <div className="p-12 border border-outline-variant/20 bg-surface-container-lowest opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <h4 className="text-lg font-bold mb-6 text-on-surface">DIY Tools</h4>
                <ul className="space-y-4 text-sm text-on-surface-variant">
                  {['High learning curve','Constant API breakages','You are the tech support'].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-error shrink-0">
                        <path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* OpsRadar — featured */}
              <div className="p-12 border-2 border-primary bg-surface-container-low shadow-[0_0_80px_rgba(173,198,255,0.15)] relative z-20 scale-105 rounded-xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-bold px-4 py-1 rounded-full uppercase">
                  Highly Recommended
                </div>
                <h4 className="text-2xl font-bold mb-6 text-on-surface">OpsRadar</h4>
                <ul className="space-y-4 text-on-surface">
                  {[
                    'Built by agency veterans',
                    'Proactive maintenance',
                    'Done-for-you migration',
                    'Fixed monthly pricing',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-primary shrink-0">
                        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.15"/>
                        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-10 py-4 h-auto rounded-lg font-bold btn-spring btn-main-sheen">
                  <Link href="/audit">Get Started Free</Link>
                </Button>
              </div>

              {/* Freelancers */}
              <div className="p-12 border border-outline-variant/20 bg-surface-container-lowest opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <h4 className="text-lg font-bold mb-6 text-on-surface">Freelancers</h4>
                <ul className="space-y-4 text-sm text-on-surface-variant">
                  {['Hit or miss reliability','Hidden hourly costs','Ghost you when busy'].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-error shrink-0">
                        <path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {item}
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
      <footer className="bg-slate-950 border-t border-white/5 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-bold text-slate-300">OpsRadar</div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            © 2026 OpsRadar. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/services" className="text-xs uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Services</Link>
            <Link href="/about"    className="text-xs uppercase tracking-widest text-slate-500 hover:text-white transition-colors">About</Link>
            <Link href="/audit"    className="text-xs uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Workflow mock (replaces external screenshot) ──────────────────────────────

function WorkflowMock() {
  const nodes = [
    { label: 'New Lead',       sub: 'Webhook Trigger', color: '#4d8eff', textColor: '#d8e2ff' },
    { label: 'Score & Filter', sub: 'OpenAI + Logic',  color: '#03b5d3', textColor: '#acedff' },
    { label: 'Route to CRM',   sub: 'HubSpot Node',    color: '#4d8eff', textColor: '#d8e2ff' },
    { label: 'Notify Team',    sub: 'Slack Message',   color: '#10b981', textColor: '#d1fae5' },
  ]

  return (
    <div className="rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/10 p-6" style={{ minHeight: 160 }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 text-[11px] text-on-surface-variant font-mono">lead-qualification.workflow</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-semibold uppercase tracking-wide">Active</span>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-center shrink-0">
            <div
              className="flex flex-col gap-1 p-3 rounded-lg min-w-[120px]"
              style={{ background: `${node.color}12`, border: `1px solid ${node.color}30` }}
            >
              <span className="text-[11px] font-bold" style={{ color: node.textColor }}>{node.label}</span>
              <span className="text-[10px] text-on-surface-variant">{node.sub}</span>
              <div className="flex gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: node.color }} />
                <div className="w-1.5 h-1.5 rounded-full opacity-40" style={{ background: node.color }} />
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div className="flex items-center mx-1 shrink-0">
                <div className="w-6 h-px bg-outline-variant/50" />
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-outline-variant">
                  <path d="M1 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/10">
        <div className="flex gap-4">
          {[['847', 'executions today'], ['12ms', 'avg latency'], ['100%', 'success rate']].map(([val, lbl]) => (
            <div key={lbl}>
              <span className="text-[13px] font-bold text-primary">{val}</span>
              <span className="text-[10px] text-on-surface-variant ml-1">{lbl}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-on-surface-variant">Last run: 2 min ago</span>
      </div>
    </div>
  )
}
