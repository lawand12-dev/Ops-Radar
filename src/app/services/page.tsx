import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import FaqAccordion from '../components/FaqAccordion'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardContent } from '<npm>/components/ui/card'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import StaggerChildren, { StaggerItem } from '<npm>/components/animations/StaggerChildren'
import GlowCard from '<npm>/components/animations/GlowCard'

export const metadata: Metadata = {
  title: "Services",
  description:
    "Done-for-you automation services for agencies: workflow builds, CRM integrations, reporting automations, and ongoing maintenance. Fixed monthly pricing, no per-task fees.",
  openGraph: {
    title: "Services — OpsRadar",
    description:
      "Done-for-you automation services for agencies: workflow builds, CRM integrations, reporting automations, and ongoing maintenance. Fixed monthly pricing, no per-task fees.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Services — OpsRadar",
    description:
      "Done-for-you automation services for agencies: workflow builds, CRM integrations, reporting automations, and ongoing maintenance. Fixed monthly pricing, no per-task fees.",
    images: ["/logo.png"],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    n: '01',
    title: 'You Tell Us the Problem',
    desc: 'Start with a free audit or a quick call. Tell us which manual tasks are burning your team\'s time, what tools you use, and where the most friction is. No technical knowledge needed — plain English is fine.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" stroke="#adc6ff" strokeWidth="1.5" fill="rgba(173,198,255,0.1)" />
        <path d="M8 9h6M8 12h4" stroke="#adc6ff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    color: '#adc6ff',
  },
  {
    n: '02',
    title: 'We Scope & Price It',
    desc: 'Within 48 hours you get a clear proposal: exactly what we\'ll build, how it works, how long it takes, and a fixed price — no hourly billing, no scope creep surprises. You approve before anything starts.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="3" stroke="#4cd7f6" strokeWidth="1.5" fill="rgba(76,215,246,0.08)" />
        <path d="M7 11l3 3 5-5" stroke="#4cd7f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#4cd7f6',
  },
  {
    n: '03',
    title: 'We Build & Test',
    desc: 'Our team builds the automation in n8n, integrates it with your existing tools, and tests every path — including edge cases and error handling. We don\'t ship anything that hasn\'t been stress-tested against real data.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#a78bfa" strokeWidth="1.5" fill="rgba(167,139,250,0.08)" />
        <path d="M8 11l2 2 4-4" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 7v1M11 14v1M7 11h1M14 11h1" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    color: '#a78bfa',
  },
  {
    n: '04',
    title: 'You Review & Approve',
    desc: 'We walk you through the live workflow in a recorded session. You see exactly what triggers it, what it does, and how to monitor it. Nothing goes live until you\'ve reviewed it and given the green light.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3C6.6 3 3 6.6 3 11s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" stroke="#34d399" strokeWidth="1.5" fill="rgba(52,211,153,0.08)" />
        <path d="M7.5 11l2.5 2.5 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#34d399',
  },
  {
    n: '05',
    title: 'It Runs 24/7',
    desc: 'We deploy to our hosted infrastructure, set up monitoring and alerts, and maintain the workflow long-term. If an API changes, a tool updates, or something breaks at 3am — we fix it, not you.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2v4M11 16v4M4.93 4.93l2.83 2.83M14.24 14.24l2.83 2.83M2 11h4M16 11h4M4.93 17.07l2.83-2.83M14.24 7.76l2.83-2.83" stroke="#ffb786" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="11" cy="11" r="3" stroke="#ffb786" strokeWidth="1.5" fill="rgba(255,183,134,0.15)" />
      </svg>
    ),
    color: '#ffb786',
  },
]

const WHAT_WE_BUILD = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 5h16M3 11h10M3 17h7" stroke="#adc6ff" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="15" r="3.5" stroke="#adc6ff" strokeWidth="1.3" fill="rgba(173,198,255,0.1)" />
        <path d="M15.5 15l1 1 2-2" stroke="#adc6ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Lead Qualification & Routing',
    desc: 'New leads are scored against your criteria the moment they arrive, then routed to the right rep with context already filled in. Hot leads get a follow-up within 90 seconds — automatically.',
    color: '#adc6ff',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="6" width="16" height="12" rx="2" stroke="#4cd7f6" strokeWidth="1.5" fill="rgba(76,215,246,0.08)" />
        <path d="M7 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" stroke="#4cd7f6" strokeWidth="1.4" />
        <path d="M11 11v4M9 13h4" stroke="#4cd7f6" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    title: 'Client Onboarding Automation',
    desc: 'A single form submission triggers contracts, tool access provisioning, welcome email sequences, Slack notifications, and project setup — all without anyone on your team lifting a finger.',
    color: '#4cd7f6',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="2" stroke="#a78bfa" strokeWidth="1.5" fill="rgba(167,139,250,0.08)" />
        <path d="M7 14l3-4 2 2.5 2-3.5 2 2" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Automated Reporting & Analytics',
    desc: 'Pull data from Google Ads, Meta, GA4, and your CRM on schedule. Merge it, format it, and deliver branded client reports automatically — every week, with zero manual work.',
    color: '#a78bfa',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" stroke="#34d399" strokeWidth="1.5" fill="rgba(52,211,153,0.08)" />
        <path d="M8 9h6M8 12h4" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    title: 'Email & Follow-up Sequences',
    desc: 'Context-aware follow-ups that write themselves based on deal stage, time since last contact, and prior interactions. Leads stop going cold because the system never forgets to send the next message.',
    color: '#34d399',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="13" rx="2" stroke="#ffb786" strokeWidth="1.5" fill="rgba(255,183,134,0.08)" />
        <path d="M7 9h8M7 12h5" stroke="#ffb786" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="16" cy="7" r="2.5" stroke="#ffb786" strokeWidth="1.2" fill="rgba(255,183,134,0.15)" />
        <path d="M15 7h2M16 6v2" stroke="#ffb786" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    title: 'Invoice & Payment Processing',
    desc: 'Project completion triggers invoice generation in your billing tool, sends it to the client, follows up if unpaid, and notifies your team when it clears — no one has to chase payments manually.',
    color: '#ffb786',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="6" cy="11" r="3" stroke="#f87171" strokeWidth="1.4" fill="rgba(248,113,113,0.08)" />
        <circle cx="16" cy="11" r="3" stroke="#f87171" strokeWidth="1.4" fill="rgba(248,113,113,0.08)" />
        <path d="M9 11h4" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M12 9l2 2-2 2" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Data Sync Between Tools',
    desc: 'Keep your CRM, project management, invoicing, and communication tools in sync automatically. One update propagates everywhere — no duplicate entry, no data drift, no version conflicts.',
    color: '#f87171',
  },
]

const FAQS = [
  {
    q: 'What tools can you connect?',
    a: 'Any tool with an API or webhook support — which covers most modern SaaS products. That includes HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, Notion, Airtable, Stripe, QuickBooks, Calendly, Mailchimp, ActiveCampaign, and hundreds more via n8n\'s native node library. If your tool isn\'t natively supported, we can connect it via HTTP request.',
  },
  {
    q: 'How long does it take to build?',
    a: 'Most single-workflow builds take 5–10 business days from approval to deployment. More complex systems involving multiple workflows, custom logic, or integrations with uncommon tools can take 2–4 weeks. We give you a specific timeline in the proposal before you commit.',
  },
  {
    q: 'What if something breaks?',
    a: 'On the Managed Automation plan, we monitor every workflow 24/7 and get alerted the moment something fails. We fix it, usually before you even notice. On the One-Time Build plan, we provide 30 days of free bug fixes after delivery, then ongoing support is available as a paid add-on.',
  },
  {
    q: 'Do we need technical knowledge?',
    a: 'No. You describe your problem in plain English — we handle all the technical implementation. You\'ll review the workflow in a walkthrough session, but you won\'t need to touch any code or config. That\'s the point.',
  },
  {
    q: 'Can we see the workflow before it goes live?',
    a: 'Yes — always. We record a walkthrough video showing exactly how it works, what it does at each step, and how to monitor it. Nothing gets deployed to production without your explicit sign-off. You own the review process.',
  },
  {
    q: 'What happens if we cancel?',
    a: 'On the Managed plan, you can cancel anytime with 30 days notice. We\'ll export your workflows and document them fully so you can self-host or hand them to your team. You never lose access to the automations we built for you.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body overflow-x-hidden">

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
            <Link href="/services" className="text-on-surface font-semibold">Services</Link>
            <Link href="/about"    className="text-on-surface-variant hover:text-on-surface transition-colors">About</Link>
            <a href="/#pain"       className="text-on-surface-variant hover:text-on-surface transition-colors">Problems</a>
            <a href="/#how"        className="text-on-surface-variant hover:text-on-surface transition-colors">How It Works</a>
            <a href="/#showcase"   className="text-on-surface-variant hover:text-on-surface transition-colors">Systems</a>
          </div>
          <Button asChild className="bg-primary-container text-on-primary-container hover:bg-primary-container/80 px-5 py-2 h-auto rounded-lg font-semibold text-sm btn-spring">
            <Link href="/audit">Start Free Audit</Link>
          </Button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-28 px-6">
        <div className="absolute inset-0 grid-texture pointer-events-none" />
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Done-For-You Service
            </span>
          </div>

          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface leading-[1.08] mb-6">
            Automation That Runs Itself.{' '}
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Built By Us.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            From scoping to deployment to ongoing monitoring — we handle your entire automation
            infrastructure so you don&apos;t have to.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-bold btn-spring btn-main-sheen gap-2 shadow-[0_0_30px_rgba(173,198,255,0.3)]">
              <Link href="/audit">
                Start Free Audit
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3.75 9h10.5m-4.5-4.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </Button>
            <Button asChild variant="outline" className="px-8 py-4 h-auto rounded-lg font-semibold text-on-surface border-outline-variant/30 hover:bg-surface-container-high/40 hover:border-outline-variant/50 bg-transparent">
              <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" target="_blank" rel="noopener noreferrer">
                Book a Strategy Call
              </a>
            </Button>
          </div>

          {/* Trust stats */}
          <div className="flex items-center justify-center gap-12 mt-14 flex-wrap">
            {[
              ['Fixed Price', 'No hourly billing'],
              ['5–10 Days', 'Avg. build time'],
              ['24/7', 'Monitoring & support'],
            ].map(([stat, label]) => (
              <div key={stat} className="text-center">
                <p className="font-headline font-extrabold text-2xl text-primary leading-none">{stat}</p>
                <p className="text-xs text-on-surface-variant mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── The Process ──────────────────────────────────────────────── */}
      <section id="process" className="max-w-4xl mx-auto px-6 py-28">
        <FadeInOnScroll>
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">How We Work</span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-4 text-on-surface">
            The Process
          </h2>
          <p className="text-on-surface-variant max-w-lg mb-14 leading-relaxed">
            Transparent from day one. You always know what&apos;s happening, what it costs, and what comes next.
          </p>
        </FadeInOnScroll>

        {/* Vertical timeline */}
        <div className="relative pl-14">
          {/* Line */}
          <div
            className="absolute left-5 top-6 bottom-6 w-[2px] rounded-full"
            style={{ background: 'linear-gradient(180deg, #adc6ff 0%, #4cd7f6 25%, #a78bfa 50%, #34d399 75%, #ffb786 100%)' }}
          />

          <StaggerChildren className="space-y-6">
            {PROCESS_STEPS.map(({ n, title, desc, icon, color }) => (
              <StaggerItem key={n}>
                <div className="relative flex gap-6 items-start">
                  {/* Node */}
                  <div
                    className="absolute -left-14 w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 top-0.5"
                    style={{
                      background: `${color}12`,
                      border: `1.5px solid ${color}35`,
                      boxShadow: `0 0 20px ${color}20`,
                    }}
                  >
                    {icon}
                  </div>

                  {/* Card */}
                  <GlowCard glowColor={`${color}10`} className="flex-1 rounded-xl">
                    <Card className="flex-1 p-6 bg-surface-container border-outline-variant/10 ring-0 shadow-none rounded-xl">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-[9px] font-bold tracking-[2.5px] text-on-surface-variant/40">
                            {n}
                          </span>
                          <Badge
                            variant="outline"
                            className="h-auto px-2.5 py-[3px] rounded-full text-[10px] font-semibold border-0"
                            style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                          >
                            Step {parseInt(n)}
                          </Badge>
                        </div>
                        <h3 className="font-headline font-bold text-[17px] text-on-surface mb-2 leading-snug">
                          {title}
                        </h3>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                      </CardContent>
                    </Card>
                  </GlowCard>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── What We Build ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <FadeInOnScroll>
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">Service Catalogue</span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-4 text-on-surface">
            What We Build
          </h2>
          <p className="text-on-surface-variant max-w-lg mb-12 leading-relaxed">
            Production-ready workflows, custom-fit to your stack. These are the systems agencies use most — and the ones that pay back the fastest.
          </p>
        </FadeInOnScroll>

        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WHAT_WE_BUILD.map(({ icon, title, desc, color }) => (
            <StaggerItem key={title}>
              <GlowCard glowColor={`${color}10`} className="h-full rounded-xl">
                <Card
                  className="h-full p-6 bg-surface-container border-outline-variant/10 ring-0 shadow-none cursor-default rounded-xl overflow-hidden"
                  style={{ borderTopColor: 'transparent' }}
                >
                  <CardContent className="p-0">
                    <div className="h-[2px] -mx-6 -mt-6 mb-5 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}00 60%)` }} />
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${color}12`, border: `1px solid ${color}25` }}
                    >
                      {icon}
                    </div>
                    <h3 className="font-headline font-bold text-[15px] text-on-surface mb-2 leading-snug">{title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── Two Ways to Work With Us ──────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-28">
        <FadeInOnScroll>
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">Pricing Models</span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-4 text-on-surface">
            Two Ways to Work With Us
          </h2>
          <p className="text-on-surface-variant max-w-lg mb-12 leading-relaxed">
            Both options start with a free audit and a fixed-price proposal. Pick the model that fits how your team operates.
          </p>
        </FadeInOnScroll>

          <div className="grid sm:grid-cols-2 gap-5 items-start">
            {/* Card 1: One-Time Build */}
            <GlowCard className="rounded-xl">
            <Card className="p-8 bg-surface-container border-outline-variant/10 ring-0 shadow-none flex flex-col rounded-xl">
              <CardContent className="p-0 flex flex-col flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-on-surface-variant/40 mb-4">Option 01</p>
                <h3 className="font-headline font-extrabold text-2xl text-on-surface mb-1">One-Time Build</h3>
                <p className="font-headline font-bold text-3xl text-primary mb-5 leading-none">
                  from $1,500
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'We build and deliver the complete workflow',
                    'You own it, run it on your infrastructure',
                    'Testing, documentation, and training included',
                    '30 days of post-launch bug fixes',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-on-surface-variant leading-relaxed">
                      <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold bg-primary/10 border border-primary/25 text-primary">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="p-3.5 rounded-lg mb-6 bg-surface-container-high border border-outline-variant/10">
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-on-surface-variant/40 mb-1">Best for</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Teams with technical staff who can self-host and maintain workflows after delivery.
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full px-6 py-3 h-auto rounded-lg text-sm font-semibold text-on-surface-variant border-outline-variant/30 hover:border-outline-variant/60 hover:text-on-surface bg-transparent btn-spring">
                  <Link href="/audit">Start with a Free Audit</Link>
                </Button>
              </CardContent>
            </Card>
            </GlowCard>

            {/* Card 2: Managed Automation (highlighted) */}
            <GlowCard glowColor="rgba(173,198,255,0.08)" className="rounded-xl">
            <Card className="p-8 flex flex-col relative overflow-hidden border-2 border-primary scale-[1.02] bg-surface-container ring-0 shadow-[0_0_80px_rgba(173,198,255,0.15)] rounded-xl">
              <CardContent className="p-0 flex flex-col flex-1">
                {/* Most Popular badge */}
                <Badge className="absolute top-5 right-5 h-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 border border-primary/30 text-primary">
                  Most Popular
                </Badge>

                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-primary/70 mb-4">Option 02</p>
                <h3 className="font-headline font-extrabold text-2xl text-on-surface mb-1">Managed Automation</h3>
                <p className="font-headline font-bold text-3xl text-primary mb-5 leading-none">
                  from $500<span className="text-lg font-medium text-on-surface-variant">/mo</span>
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'We build, host, monitor, and maintain everything',
                    'Monthly subscription — cancel anytime',
                    '24/7 monitoring with automatic error recovery',
                    'Priority support, new versions included',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-on-surface leading-relaxed">
                      <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold bg-secondary/10 border border-secondary/25 text-secondary">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="p-3.5 rounded-lg mb-6 bg-primary/5 border border-primary/15">
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-primary/60 mb-1">Best for</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Agencies who want automation running without managing infrastructure or dealing with breaks.
                  </p>
                </div>

                <Button asChild className="w-full px-6 py-3 h-auto rounded-lg text-sm font-bold btn-spring btn-main-sheen">
                  <Link href="/audit">Start with a Free Audit →</Link>
                </Button>
              </CardContent>
            </Card>
            </GlowCard>
          </div>
        </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">Questions</span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-14 text-on-surface">
            Frequently Asked
          </h2>

          <FaqAccordion faqs={FAQS} />
        </section>
      </FadeInOnScroll>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-outline-variant/20" />
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="py-32 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(173,198,255,0.06) 0%, transparent 65%)' }} />
          <div className="relative z-10 max-w-xl mx-auto">
            <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">Get Started</span>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mt-4 mb-5 text-on-surface">
              Ready to Automate?
            </h2>
            <p className="text-on-surface-variant mb-10 leading-relaxed">
              Start with a free audit — takes 3 minutes and shows you exactly what to automate and what it&apos;s worth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild className="px-8 py-4 h-auto rounded-lg font-bold btn-spring btn-main-sheen gap-2 shadow-[0_0_30px_rgba(173,198,255,0.3)]">
                <Link href="/audit">
                  Start Free Audit
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3.75 9h10.5m-4.5-4.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </Button>
              <Button asChild variant="outline" className="px-8 py-4 h-auto rounded-lg font-semibold text-on-surface border-outline-variant/30 hover:bg-surface-container-high/40 hover:border-outline-variant/50 bg-transparent">
                <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" target="_blank" rel="noopener noreferrer">
                  Book a Strategy Call
                </a>
              </Button>
            </div>
            <p className="mt-5 text-xs text-on-surface-variant/40">
              No commitment · Fixed pricing · We handle everything
            </p>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-outline-variant/10 bg-slate-950">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant/40">© 2026 OpsRadar</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Home</Link>
            <Link href="/services" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors font-semibold">Services</Link>
            <Link href="/about" className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">About</Link>
            <Link href="/audit" className="text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Free Audit →</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

