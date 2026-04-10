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
    title: 'Zero-Touch Client Onboarding',
    description:
      "When a contract gets signed, this workflow kicks off everything automatically: AI parses the contract to extract client details, creates a dedicated Google Drive folder, spins up a Slack channel, and sends the welcome email. Your team goes from 'deal closed' to 'client fully onboarded' without touching a thing.",
    image: '/workflows/workflow-1.png',
    stats: 'Saves ~6 hours per client · 5 tool integrations · Delivered in 4 days',
    flow: 'Contract Webhook → AI Parse → Drive → Slack → Gmail → Response',
  },
  // More workflows added here later
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
            <div className="py-16 first:pt-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-400/80 mb-4">
                {wf.category}
              </p>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-white mb-4">
                {wf.title}
              </h2>
              <p className="text-[15px] leading-[1.8] text-white/[0.65] max-w-2xl mb-10">
                {wf.description}
              </p>

              <WorkflowImage src={wf.image} alt={`${wf.title} — n8n workflow canvas`} />

              <p className="mt-6 text-[13px] text-white/40 tracking-wide">
                {wf.stats}
              </p>
              <p className="mt-2 text-[13px] text-white/30 font-mono tracking-wide">
                {wf.flow}
              </p>
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
