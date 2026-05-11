import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Button } from '<npm>/components/ui/button'
import SiteHeader from '<npm>/components/ui/site-header'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export const metadata: Metadata = {
  title: 'AIOS — Your agency. Running itself.',
  description:
    'OpsRadar maps how your agency actually works, builds the system that runs it, and monitors it permanently. Every week it gets smarter.',
  openGraph: {
    title: 'AIOS — Your agency. Running itself.',
    description:
      'OpsRadar maps how your agency actually works, builds the system that runs it, and monitors it permanently. Every week it gets smarter.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AIOS — OpsRadar' }],
  },
  twitter: {
    title: 'AIOS — Your agency. Running itself.',
    description:
      'OpsRadar maps how your agency actually works, builds the system that runs it, and monitors it permanently. Every week it gets smarter.',
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'AIOS', href: '/aios', isActive: true },
  { label: 'About', href: '/about' },
]

const BEFORE_ITEMS = [
  'Reports built by hand every Friday',
  'Leads sitting in inboxes for hours',
  'Campaigns breaking silently',
  'Onboarding lives in the founder’s head',
  'One person leaving breaks everything',
  'CEO checking everything manually',
]

const AFTER_ITEMS = [
  'Reports delivered automatically every Friday',
  'Leads routed in under 8 minutes',
  'Failures caught before clients notice',
  'Onboarding runs itself from day one',
  'Knowledge lives in the system forever',
  'CEO sees everything on one dashboard',
]

const LAYERS = [
  {
    n: '01',
    title: 'Diagnose',
    body: 'We map your real operations — not what you think happens, but what actually breaks.',
  },
  {
    n: '02',
    title: 'Build',
    body: 'We build the automation system from your exact tools, team, and workflows. Deployed in your own n8n account. You own it forever.',
  },
  {
    n: '03',
    title: 'Monitor',
    body: 'Guardian watches every workflow permanently. Catches failures before your clients do. Alerts you before anything breaks.',
  },
  {
    n: '04',
    title: 'Learn',
    body: 'Every run, every failure, every decision is stored in your agency brain. The system gets smarter every week. Nothing is ever lost.',
  },
]

export default function AiosPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* ── Section 1 — Headline ─────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-24">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            The AI Operating System
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.05] mb-8">
            Your agency.
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              Running itself.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/[0.7] max-w-2xl leading-relaxed">
            OpsRadar maps how your agency actually works, builds the system that runs it,
            and monitors it permanently. Every week it gets smarter.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
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
            Or run the free 3-minute audit first
          </Link>
        </div>
      </section>

      {/* ── Section 2 — Before / After ───────────────────────────────── */}
      <div>
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEFORE */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 md:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-red-400/80 mb-3">
                Before
              </p>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-white mb-8">
                Without OpsRadar
              </h2>
              <ul className="space-y-4">
                {BEFORE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-500/15 text-red-400/90"
                      aria-hidden="true"
                    >
                      <X className="h-3 w-3" />
                    </span>
                    <span className="text-[15px] leading-relaxed text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AFTER */}
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-8 md:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400/90 mb-3">
                After
              </p>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-white mb-8">
                With OpsRadar
              </h2>
              <ul className="space-y-4">
                {AFTER_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-[15px] leading-relaxed text-white/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* ── Section 3 — The Four Layers ──────────────────────────────── */}
      <div>
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              The four layers
            </p>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-[1.05]">
              How the operating system works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {LAYERS.map(({ n, title, body }) => (
              <div
                key={n}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-4 mb-5">
                  <span className="font-headline text-sm font-bold tracking-[0.18em] text-cyan-400/80">
                    {n}
                  </span>
                  <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
                </div>
                <h3 className="font-headline text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-white mb-4 uppercase">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/[0.7]">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Section 4 — The Brain ────────────────────────────────────── */}
      <div>
        <section className="max-w-4xl mx-auto px-6 py-28">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 md:p-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400/80 mb-5">
              The brain
            </p>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-[1.05] mb-8">
              Your agency gets a brain
            </h2>
            <p className="text-[16px] md:text-lg leading-relaxed text-white/[0.75] mb-8 max-w-3xl">
              The operational knowledge that lives in your team&apos;s heads — how clients
              like to be communicated with, what breaks on Monday mornings, which approvals
              need a human — all of it captured, structured, and permanent.
            </p>
            <div className="space-y-4 border-l-2 border-cyan-400/40 pl-6">
              <p className="text-[15px] md:text-base text-white/85 leading-relaxed">
                <span className="text-white font-semibold">When someone leaves</span>
                <span className="text-white/60"> — nothing is lost.</span>
              </p>
              <p className="text-[15px] md:text-base text-white/85 leading-relaxed">
                <span className="text-white font-semibold">When something breaks</span>
                <span className="text-white/60"> — we already know why.</span>
              </p>
              <p className="text-[15px] md:text-base text-white/85 leading-relaxed">
                <span className="text-white font-semibold">When you want to know what happened</span>
                <span className="text-white/60"> — you ask.</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Section 5 — CTA ──────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-6 text-white">
            Ready to give your agency a brain?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call &rarr;
              </a>
            </Button>
          </div>
          <Link
            href="/audit"
            className="inline-block mt-4 text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
          >
            Or run the free 3-minute audit first
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
