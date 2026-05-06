import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import { WORKFLOWS } from '<npm>/lib/workflows-catalog'

export const metadata: Metadata = {
  title: 'Workflow Blueprints',
  description:
    'Eight production-ready n8n workflow blueprints for marketing agencies — handoff routing, retainer invoicing, client health scoring, brand-namespaced reporting, partner commissions, performance billing, project closure, and white-label reports.',
  openGraph: {
    title: 'Workflow Blueprints — OpsRadar',
    description:
      'Eight production-ready n8n workflow blueprints for marketing agencies, mapped to the operational pain each one solves.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Workflow Blueprints — OpsRadar' }],
  },
  twitter: {
    title: 'Workflow Blueprints — OpsRadar',
    description:
      'Eight production-ready n8n workflow blueprints for marketing agencies, mapped to the operational pain each one solves.',
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Workflows', href: '/workflows' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
]

export default function WorkflowsIndexPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            Workflow Blueprints
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.08] mb-6">
            Eight workflows. Eight pains.
          </h1>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            Each blueprint is the answer to one operational pain we see across agencies — invoice
            churn, brand leakage, zombie automations after a project ends, partner commissions paid
            before invoices clear. Built on n8n. Deployed to your account. Maintained by us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call &rarr;
              </a>
            </Button>
          </div>
          <Link
            href="/audit"
            className="inline-flex mt-4 text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
          >
            Or run a 3-minute self-serve audit
          </Link>
        </div>
      </section>

      {/* ── Cards ────────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WORKFLOWS.map((wf) => (
              <Link
                key={wf.slug}
                href={`/workflows/${wf.slug}`}
                className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 transition-all hover:border-white/[0.18] hover:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
                    {wf.agencyProfile}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
                      wf.complexity === 'High'
                        ? 'border-amber-400/30 text-amber-300/90 bg-amber-400/[0.06]'
                        : 'border-emerald-400/30 text-emerald-300/90 bg-emerald-400/[0.06]'
                    }`}
                  >
                    {wf.complexity}
                  </span>
                </div>

                <h2 className="font-headline text-2xl md:text-[26px] font-extrabold tracking-[-0.02em] text-white mb-3 leading-[1.15] group-hover:text-white/95">
                  {wf.title}
                </h2>

                <p className="text-[14.5px] leading-relaxed text-white/[0.65] mb-5">
                  {wf.shortPain}
                </p>

                <div className="flex items-center gap-4 text-[12px] text-white/45 mt-auto pt-4 border-t border-white/[0.06]">
                  <span>
                    <span className="text-white/30">Trigger ·</span> {wf.trigger.split('(')[0].trim()}
                  </span>
                  <span className="text-white/20">·</span>
                  <span>
                    <span className="text-white/30">Build ·</span> {wf.deliveryDays}
                  </span>
                </div>

                <span className="absolute top-7 right-7 text-white/30 group-hover:text-white/70 transition-colors text-lg">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            Not sure which one fits?
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            Run the 3-minute audit. We&apos;ll point at the workflows that match your stack and where the time bleeds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <Link href="/audit">Run the audit &rarr;</Link>
            </Button>
            <a
              href={CALENDLY_STRATEGY_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
            >
              Or book a 20-minute call
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
