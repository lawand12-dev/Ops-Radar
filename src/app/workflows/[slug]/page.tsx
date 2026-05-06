import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import WorkflowDiagram from '<npm>/components/WorkflowDiagram'
import WorkflowGraph from '<npm>/components/WorkflowGraph'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import { WORKFLOWS, getWorkflowBySlug } from '<npm>/lib/workflows-catalog'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Workflows', href: '/workflows' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
]

export function generateStaticParams() {
  return WORKFLOWS.map((wf) => ({ slug: wf.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const wf = getWorkflowBySlug(slug)
  if (!wf) return { title: 'Workflow not found' }
  const title = `${wf.title} — Workflow Blueprint`
  return {
    title,
    description: wf.shortPain,
    openGraph: {
      title: `${wf.title} — OpsRadar`,
      description: wf.shortPain,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title: `${wf.title} — OpsRadar`,
      description: wf.shortPain,
      images: ['/og-image.png'],
    },
  }
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const wf = getWorkflowBySlug(slug)
  if (!wf) notFound()

  const otherWorkflows = WORKFLOWS.filter((w) => w.slug !== wf.slug).slice(0, 3)

  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-16 pt-12 sm:pt-16">
        <div className="relative z-10 max-w-4xl mx-auto">
          <Link
            href="/workflows"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white/85 transition-colors mb-8"
          >
            ← All workflows
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
              {wf.agencyProfile}
            </span>
            <span className="text-white/20">·</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
                wf.complexity === 'High'
                  ? 'border-amber-400/30 text-amber-300/90 bg-amber-400/[0.06]'
                  : 'border-emerald-400/30 text-emerald-300/90 bg-emerald-400/[0.06]'
              }`}
            >
              {wf.complexity} complexity
            </span>
            <span className="text-white/20">·</span>
            <span className="text-[12px] text-white/55">
              {wf.deliveryDays} build
            </span>
          </div>

          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-[-0.04em] text-white leading-[1.05] mb-6">
            {wf.title}
          </h1>

          <p className="text-lg md:text-xl text-white/[0.7] max-w-3xl mb-10 leading-relaxed">
            {wf.fullPain}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press"
            >
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a build call &rarr;
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="px-8 py-4 h-auto rounded-lg font-semibold border-white/15 bg-transparent text-white hover:bg-white/[0.04]"
            >
              <Link href="/audit">See if this fits — run the audit</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Diagram ──────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                The flow
              </p>
              {wf.graph && (
                <p className="text-[10px] text-white/30 hidden sm:block">
                  Drag to pan · pinch / +- to zoom
                </p>
              )}
            </div>
            {wf.graph ? (
              <WorkflowGraph graph={wf.graph} height={680} />
            ) : (
              <WorkflowDiagram technicalFlow={wf.techFlow} />
            )}
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/45 md:pt-1">
              How it works
            </p>
            <div className="space-y-4">
              {wf.howItWorks.map((step, i) => (
                <div
                  key={i}
                  className="flex gap-4 items-start pb-4 border-b border-white/[0.05] last:border-0"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-[11px] font-bold text-white/60">
                    {i + 1}
                  </span>
                  <p className="text-[15px] leading-relaxed text-white/[0.75]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Guarantees (optional) ────────────────────────────────────── */}
      {wf.guarantees && wf.guarantees.length > 0 && (
        <FadeInOnScroll>
          <section className="max-w-4xl mx-auto px-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400/70 md:pt-1">
                Built-in guarantees
              </p>
              <div className="space-y-3">
                {wf.guarantees.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.03] px-4 py-3 text-[14.5px] leading-relaxed text-white/[0.8]"
                  >
                    {g}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInOnScroll>
      )}

      {/* ── Wire up ──────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/45 mb-2">
                What we wire up
              </p>
              <p className="text-[12px] text-white/40 leading-relaxed">
                Credentials and endpoints we connect on your side before this goes live.
              </p>
            </div>
            <ul className="space-y-2">
              {wf.wireUp.map((w, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start text-[14.5px] leading-relaxed text-white/[0.75]"
                >
                  <span className="shrink-0 mt-2 w-1 h-1 rounded-full bg-white/40" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Trigger summary card ─────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2">
                Trigger
              </p>
              <p className="text-[14px] text-white/85 leading-relaxed">{wf.trigger}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2">
                Build time
              </p>
              <p className="text-[14px] text-white/85 leading-relaxed">{wf.deliveryDays}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2">
                Best fit
              </p>
              <p className="text-[14px] text-white/85 leading-relaxed">{wf.agencyProfile}</p>
            </div>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Other workflows ──────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            Related workflows
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherWorkflows.map((other) => (
              <Link
                key={other.slug}
                href={`/workflows/${other.slug}`}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:border-white/[0.18] hover:bg-white/[0.035]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/70 mb-3">
                  {other.agencyProfile}
                </p>
                <h3 className="font-headline text-lg font-bold tracking-[-0.01em] text-white mb-2 leading-tight">
                  {other.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-white/55 mb-3 line-clamp-3">
                  {other.shortPain}
                </p>
                <span className="text-[12px] text-white/40 group-hover:text-white/70 transition-colors">
                  Read blueprint →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-28 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            Want this in your n8n?
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            We deploy to your own n8n account. You own the workflow from day one. We maintain it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press"
            >
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a build call &rarr;
              </a>
            </Button>
            <Link
              href="/audit"
              className="text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
            >
              Or run the 3-minute audit
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
