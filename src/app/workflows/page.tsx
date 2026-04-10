import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background'
import WorkflowImage from '<npm>/components/ui/workflow-image'

export const metadata: Metadata = {
  title: "Workflows",
  description:
    "Real n8n automations I've designed and shipped. Every node connected to real tools — replacing hours of manual work with something that runs 24/7.",
  openGraph: {
    title: "Workflows — OpsRadar",
    description:
      "Real n8n automations I've designed and shipped. Every node connected to real tools — replacing hours of manual work with something that runs 24/7.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Workflows — OpsRadar",
    description:
      "Real n8n automations I've designed and shipped. Every node connected to real tools — replacing hours of manual work with something that runs 24/7.",
    images: ["/logo.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Workflows', href: '/workflows', isActive: true },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

// ── Workflow Data ─────────────────────────────────────────────────────────────

const WORKFLOWS = [
  {
    category: 'CLIENT OPS',
    categoryColor: 'text-blue-400/80',
    title: 'Zero-Touch Client Onboarding',
    description:
      "The moment a contract gets signed, this workflow handles everything manually done before. AI parses the contract to extract client details, a Google Drive folder is created for assets, a dedicated Slack channel goes live for team communication, and a personalized welcome email ships out. Your ops team goes from 'deal closed' to 'client fully onboarded' without lifting a finger.",
    image: '/workflows/workflow-1.png',
    stats: 'Saves ~6 hours per client · 5 tool integrations · Runs 24/7',
    flow: 'Contract Webhook → AI Parse → Drive Folder → Slack Channel → Welcome Email → Done',
    tools: ['Webhook', 'OpenAI', 'Google Drive', 'Slack', 'Gmail'],
  },
  {
    category: 'REVENUE OPS',
    categoryColor: 'text-emerald-400/80',
    title: 'Daily Client Performance Briefing',
    description:
      "Every weekday at 8AM, this workflow pulls live ad metrics and analytics data, compares them against yesterday's numbers, and sends an AI-generated executive briefing to the team. When something goes wrong — a sudden spend spike, a conversion drop, a delivery issue — it routes an urgent Slack alert instead of the regular report. Your account managers walk in already knowing what needs attention.",
    image: '/workflows/workflow-2.png',
    stats: 'Saves ~10 hours per week · 6 tool integrations · Runs every weekday',
    flow: 'Schedule → Ad Metrics + GA4 → Merge → AI Analysis → Routing → Slack or Email',
    tools: ['Schedule', 'HTTP Request', 'OpenAI', 'Slack', 'Gmail'],
  },
  {
    category: 'SALES OPS',
    categoryColor: 'text-purple-400/80',
    title: 'AI Lead Qualification & Routing',
    description:
      'Every new lead hits the webhook, gets enriched with firmographic data, then runs through an AI scorer with conversation memory that grades them 1-100 based on company size, role, and intent. Hot leads (70+) fire straight into HubSpot and ping the sales team in Slack for immediate follow-up. Cold leads go to the nurture sequence automatically. No more hot leads cooling off because someone was busy.',
    image: '/workflows/workflow-3.png',
    stats: 'Saves ~12 hours per week · 5 tool integrations · Real-time scoring',
    flow: 'Webhook → Enrich → AI Scorer → Hot/Cold Router → HubSpot + Slack',
    tools: ['Webhook', 'GPT-4o', 'Postgres', 'HubSpot', 'Slack'],
  },
  {
    category: 'CONTENT OPS',
    categoryColor: 'text-orange-400/80',
    title: 'AI Content Machine — Multi-Channel Repurposing',
    description:
      'Feed it one article, it generates a LinkedIn post, Twitter thread, Instagram caption, and Facebook post — all tailored to each platform\'s voice and audience. Every piece gets logged to a Google Sheet for tracking, then routed through a Slack approval request. You write once, publish everywhere, and never burn hours on manual repurposing again.',
    image: '/workflows/workflow-4.png',
    stats: 'Saves ~8 hours per article · 7 tool integrations · One input, four channels',
    flow: 'Content Webhook → Fetch → Extract → AI Strategist → 4 Channels → Merge → Sheets → Slack',
    tools: ['Webhook', 'OpenAI', 'Google Sheets', 'Slack'],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-body selection:bg-primary/20">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-8">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        <div className="relative z-10">
          <SiteHeader navLinks={NAV_LINKS} />

          <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-5">
              Proof of Work
            </span>
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-white mb-6">
              Real workflows. Built and shipped.
            </h1>
            <p className="text-[17px] leading-[1.8] text-white/[0.55] max-w-2xl">
              These are actual automations I&apos;ve designed in n8n. Every box you see is a
              real node connected to real tools &mdash; replacing hours of manual work with
              something that runs 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* ── Workflows ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        {WORKFLOWS.map((wf, i) => (
          <FadeInOnScroll key={wf.title}>
            <div className="py-20 first:pt-0">
              <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${wf.categoryColor} mb-4`}>
                {wf.category}
              </p>
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-[-0.02em] text-white mb-5">
                {wf.title}
              </h2>
              <p className="text-base leading-[1.8] text-white/[0.7] max-w-2xl mb-10">
                {wf.description}
              </p>

              <div className="rounded-2xl overflow-hidden border border-white/10">
                <WorkflowImage src={wf.image} alt={`${wf.title} — n8n workflow canvas`} />
              </div>

              <p className="mt-6 text-[13px] text-white/40 tracking-wide">
                {wf.stats}
              </p>
              <p className="mt-2 text-[13px] text-white/30 font-mono tracking-wide">
                {wf.flow}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {wf.tools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-block rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/50 tracking-wide"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {i < WORKFLOWS.length - 1 && (
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            )}
          </FadeInOnScroll>
        ))}

        <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-40 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-5 tracking-[-0.03em] text-white">
            Want one of these built for your agency?
          </h2>
          <p className="text-white/40 mb-10 text-lg max-w-xl mx-auto">
            Start with the free audit. I&apos;ll identify which workflow would save you the
            most time, then scope the exact build.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-10 py-4 h-auto rounded-lg font-semibold text-base bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
            <Link
              href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Or book a 20-min call
            </Link>
          </div>
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
            <Link href="/services"  className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Services</Link>
            <Link href="/workflows" className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Workflows</Link>
            <Link href="/pricing"   className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Pricing</Link>
            <Link href="/about"     className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">About</Link>
            <Link href="/audit"     className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
