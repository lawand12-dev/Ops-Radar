import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardContent } from '<npm>/components/ui/card'
import ResponsiveHeroBanner from '<npm>/components/ui/responsive-hero-banner'
import ShaderBackground from '<npm>/components/ui/shader-background'
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
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body selection:bg-primary/20 page-enter">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14">
        <div className="absolute inset-0 bg-[#030712]" />
        <ShaderBackground
          className="absolute inset-x-0 bottom-[-10%] top-[28%] z-[1] h-auto w-full opacity-58 [mask-image:linear-gradient(180deg,transparent_0%,black_8%,black_100%)] [-webkit-mask-image:linear-gradient(180deg,transparent_0%,black_8%,black_100%)] [transform:scale(1.05)]"
        />
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 16% 18%, rgba(37,99,235,0.16), transparent 22%), radial-gradient(circle at 76% 18%, rgba(79,70,229,0.12), transparent 20%), linear-gradient(180deg, rgba(2,5,12,0.12) 0%, rgba(7,17,31,0.2) 34%, rgba(4,8,18,0.42) 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-[3] pointer-events-none opacity-[0.028]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.82%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          }}
        />
        <div
          className="absolute inset-0 z-[3] pointer-events-none opacity-55"
          style={{
            backgroundImage:
              'linear-gradient(rgba(173,198,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.04) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(180deg, transparent 0%, transparent 18%, black 42%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(180deg, transparent 0%, transparent 18%, black 42%, transparent 100%)',
          }}
        />
        <div className="pointer-events-none absolute inset-x-[18%] top-[7%] z-[4] h-[260px] rounded-full bg-slate-950/42 blur-[120px]" />
        <div className="pointer-events-none absolute left-[-8%] top-[8%] z-[4] h-[420px] w-[420px] rounded-full bg-primary/[0.15] blur-[130px]" />
        <div className="pointer-events-none absolute right-[-8%] top-[12%] z-[4] h-[380px] w-[380px] rounded-full bg-secondary/10 blur-[130px]" />

        <ResponsiveHeroBanner
          navLinks={HOME_NAV_LINKS}
          badgeLabel="OpsRadar"
          badgeText="Done-for-you automation for agencies that need reliable execution"
          title="We Build Your Automations."
          titleLine2="You Focus on Growth."
          description="Stop running the agency through copy-paste, Slack archaeology, and spreadsheet rituals. We engineer the workflow layer that captures leads, routes intent through AI, updates your CRM, and keeps your team moving under load."
          primaryButtonText="Start Free Audit"
          primaryButtonHref="/audit"
          secondaryButtonText="See How It Works"
          secondaryButtonHref="#how"
          partnersTitle="The operating layers we build, wire, and maintain for you"
          contentClassName="items-start pt-4 sm:pt-8 lg:pt-10"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <FadeInOnScroll>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {TRUST_METRICS.map(({ value, label, detail }) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-outline-variant/[0.12] bg-surface-container-low/68 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.24)] backdrop-blur-xl"
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
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">The Problem</span>
          <h2 className="font-headline text-3xl md:text-4xl mt-4 text-on-surface max-w-xl">
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
            <span className="text-primary font-bold text-xs uppercase tracking-widest">Solutions</span>
            <h2 className="font-headline text-4xl mt-4 text-on-surface">
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
