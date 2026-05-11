import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export const metadata: Metadata = {
  title: 'About — OpsRadar',
  description:
    'OpsRadar builds the operating system that runs your agency. We diagnose how work actually flows, build the system, and keep it running.',
  openGraph: {
    title: 'About — OpsRadar',
    description:
      'OpsRadar builds the operating system that runs your agency. We diagnose how work actually flows, build the system, and keep it running.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About — OpsRadar' }],
  },
  twitter: {
    title: 'About — OpsRadar',
    description:
      'OpsRadar builds the operating system that runs your agency. We diagnose how work actually flows, build the system, and keep it running.',
    images: ['/og-image.png'],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CREDIBILITY_MARKERS = [
  {
    n: '01',
    label: 'Delivery model',
    value: 'One team. End to end.',
    detail:
      'Same people scope, build, and maintain. No outsourced handoff. The team that knows your system fixes it when it breaks.',
  },
  {
    n: '02',
    label: 'Ownership',
    value: 'You own everything.',
    detail:
      'Workflows live in your account, on your infrastructure, with your credentials. If you leave, you keep the system. We just stop maintaining it.',
  },
  {
    n: '03',
    label: 'Stack depth',
    value: '30+ integrations, hands-on.',
    detail:
      'Meta, Google Ads, GA4, HubSpot, Klaviyo, Triple Whale, Ahrefs, Salesforce, Slack, Notion, Airtable — built end-to-end, ready to deploy.',
  },
  {
    n: '04',
    label: 'Speed to live',
    value: '5–14 days from kickoff.',
    detail:
      'Most builds ship inside two weeks. You get the proposal in 48 hours, the walkthrough on day 9, production on day 10.',
  },
]

const WHY_TRUST = [
  {
    kind: 'On accountability',
    quote: 'One team. Full accountability.',
    body: 'Same people scope it, build it, and maintain it. When it breaks, the team that built it fixes it — not a stranger reading docs at 2am.',
  },
  {
    kind: 'On experience',
    quote: 'Agency operators, not generic devs.',
    body: 'We came up inside agency ops. We watched smart teams bleed margin to broken handoffs, duplicate entry, and automations no one trusted two weeks after launch. OpsRadar exists because operational debt keeps getting dressed up as process.',
  },
  {
    kind: 'On ownership',
    quote: 'You own everything. No lock-in.',
    body: 'Workflows live in your account. Documentation lives with you. Credentials are yours. If you ever want to leave, you keep the entire system — we just stop maintaining it.',
  },
  {
    kind: 'On AI',
    quote: 'AI drafts. Humans verify.',
    body: 'AI lets us scope and prototype in hours, not weeks. But nothing touches your live business without a human on our team reviewing it first. Speed without shortcuts.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/about" />

      <PageHeader />
      <ShortVersion />
      <CredibilitySection />
      <OriginNote />
      <WhySection />
      <VisionCallout />
      <FinalCTA />

      <SiteFooter />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page header                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-3xl">
          <p className="text-label text-[var(--color-fg-subtle)]">About</p>
          <h1 className="mt-5 font-serif text-[clamp(2.5rem,4vw+0.5rem,4rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
            We build the system your agency should already have.
          </h1>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
            Most agencies do not have an operations problem. They have a system problem.
            OpsRadar diagnoses how your work actually flows, builds the system that runs it,
            and keeps it running.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Short version                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function ShortVersion() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label text-[var(--color-fg-subtle)]">What we do</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              The brain, the workflows, and the interface.
            </h2>
          </div>

          <div className="space-y-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
            <p>
              We build the brain, the workflows, and the interface your team uses to ask
              how the business is actually running.
            </p>
            <p>
              OpsRadar is not a tool your team has to learn. It is the layer that connects
              the tools you already use, captures the knowledge in your team&apos;s heads,
              and runs the work that should never have been manual.
            </p>
            <p className="font-serif text-h3 tracking-[-0.015em] text-[var(--color-fg)] text-balance">
              We turn how your agency really operates into a system that runs itself —
              and gets sharper every week.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Credibility markers — numbered editorial list                              */
/* ────────────────────────────────────────────────────────────────────────── */

function CredibilitySection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-16">
          <p className="text-label text-[var(--color-fg-subtle)]">The specifics</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            What you&apos;re actually getting.
          </h2>
        </div>

        <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {CREDIBILITY_MARKERS.map((m) => (
            <li
              key={m.n}
              className="grid grid-cols-[auto_1fr] gap-8 md:gap-16 py-10 md:py-12 items-start"
            >
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-2">
                — {m.n}
              </p>
              <div>
                <p className="text-label text-[var(--color-primary)] mb-2">{m.label}</p>
                <h3 className="font-serif text-h2 text-[var(--color-fg)] leading-[1.12] tracking-[-0.02em]">
                  {m.value}
                </h3>
                <p className="mt-3 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {m.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Origin note                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function OriginNote() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-28">
        <div className="flex items-center gap-3 mb-8">
          <span className="size-9 rounded-full bg-[var(--color-accent-100)] flex items-center justify-center text-[var(--color-primary)] font-serif text-body-lg">
            O
          </span>
          <div>
            <p className="text-body-sm font-medium text-[var(--color-fg)]">OpsRadar · AI Operations Team</p>
            <p className="text-caption text-[var(--color-fg-subtle)]">Why we exist.</p>
          </div>
        </div>

        <div className="space-y-5 text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
          <p>
            OpsRadar exists because we kept watching the same thing happen. Agencies hire to fix
            problems that should be automated. They build process docs no one reads. They lose
            Friday afternoons to reports a script could ship in seconds. We built OpsRadar to end
            that loop.
          </p>
          <p>
            We spent years inside agencies watching good teams lose margin to broken handoffs,
            spreadsheet rituals, and automations that looked clever in demos but collapsed in
            production. OpsRadar is the response: an operator-minded team designing systems that
            stay useful after launch.
          </p>
          <p>
            We exist because the gap between AI capability and operational reality is still
            enormous. Most agencies have the tools. Almost none have the system connecting them.
            We are building that system.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Why trust us — pull-quote section                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function WhySection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-12">
          <p className="text-label text-[var(--color-fg-subtle)]">Why trust us</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            Why this model works where retainers fail.
          </h2>
        </div>

        <div className="space-y-16 md:space-y-20">
          {WHY_TRUST.map((q) => (
            <div key={q.kind} className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-16">
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-3 lg:min-w-[160px]">
                — {q.kind}
              </p>
              <div>
                <blockquote className="font-serif text-[clamp(1.5rem,2.6vw+0.4rem,2.5rem)] leading-[1.1] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
                  {q.quote}
                </blockquote>
                <p className="mt-5 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {q.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Vision callout                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function VisionCallout() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-28">
        <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
          <p className="text-label text-[var(--color-primary)]">The vision</p>
          <div className="mt-6 space-y-6 text-body-lg leading-[1.65] text-[var(--color-fg-muted)] max-w-3xl">
            <p>
              Every agency that runs on OpsRadar gets their own AI Operating System —
              built from their real operations, their tools, their data, their history.
            </p>
            <p>
              Their team queries it through Claude. Their workflows run on it through
              n8n. Their brain gets richer every week.
            </p>
            <p className="font-serif text-h2 leading-[1.15] tracking-[-0.02em] text-[var(--color-fg)] text-balance pt-2">
              We are not building another automation tool. We are building the
              operating system that runs the agency.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Final CTA                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
        <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
        <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          Stop running your agency on memory.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          A 20-minute call. Real numbers on what your agency is losing. The
          shortlist of workflows worth automating first.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Book a free 20-min call
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/audit">Or run a self-serve audit</Link>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)]">
          20 minutes · Free · No commitment
        </p>
      </div>
    </section>
  )
}
