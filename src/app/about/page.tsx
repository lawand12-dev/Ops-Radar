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
    'OpsRadar is AIOS — the AI Operating System for agencies. Four surfaces, one platform, built for how your shop actually operates.',
  openGraph: {
    title: 'About — OpsRadar',
    description:
      'OpsRadar is AIOS — the AI Operating System for agencies. Four surfaces, one platform, built for how your shop actually operates.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About — OpsRadar' }],
  },
  twitter: {
    title: 'About — OpsRadar',
    description:
      'OpsRadar is AIOS — the AI Operating System for agencies. Four surfaces, one platform, built for how your shop actually operates.',
    images: ['/og-image.png'],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CREDIBILITY_MARKERS = [
  {
    n: '01',
    label: 'Platform model',
    value: 'One system. Four surfaces.',
    detail:
      'OPERATE runs your workflows. OBSERVE shows you everything. BRAIN holds your institutional knowledge. GUARD watches the system while you sleep.',
  },
  {
    n: '02',
    label: 'Ownership',
    value: 'You own everything.',
    detail:
      'Workflows live in your n8n account, on your infrastructure, with your credentials. If you ever leave, you keep the entire system — workflows, logic, and logs.',
  },
  {
    n: '03',
    label: 'Stack depth',
    value: '40+ tools connected.',
    detail:
      'Meta, Google Ads, GA4, HubSpot, Klaviyo, Triple Whale, Ahrefs, Salesforce, Slack, Notion, Airtable — 120+ workflows ready inside the AIOS library.',
  },
  {
    n: '04',
    label: 'How we build',
    value: 'We don\'t build for shops we don\'t understand.',
    detail:
      'Discovery comes before design. We learn your real operations — your tools, your clients, your team, your patterns — before a single workflow is written.',
  },
]

const WHY_TRUST = [
  {
    kind: 'On philosophy',
    quote: 'We don\'t build for shops we don\'t understand.',
    body: 'AIOS is not a template. Discovery comes before every build. We go deeper than the audit — your tools, your clients, your team, your patterns, the things only operators know. That is the only honest way to build a system for a business.',
  },
  {
    kind: 'On why this exists',
    quote: 'Built from the inside out.',
    body: 'We spent years inside agency ops watching good teams bleed margin to broken handoffs, duplicate entry, and automations nobody trusted two weeks after launch. OpsRadar is the response: the operating system that should have existed.',
  },
  {
    kind: 'On ownership',
    quote: 'You own everything. No lock-in.',
    body: 'Every workflow runs inside your n8n. Credentials live in your vault. Logs stay on your infrastructure. If OpsRadar ever disappeared, nothing breaks. You keep the code, the logic, and the history.',
  },
  {
    kind: 'On intelligence',
    quote: 'The system gets sharper every week.',
    body: 'BRAIN learns your shop over time — your data, your history, your patterns — queried through Claude. The longer AIOS runs, the more it knows about how your agency actually operates.',
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
            The AI Operating System for agencies.
          </h1>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
            Most agencies have the tools. Almost none have a system connecting them.
            OpsRadar is AIOS — one platform that runs your workflows, watches them while you sleep,
            shows everything in one dashboard, and remembers how your shop actually operates.
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
            <p className="text-label text-[var(--color-fg-subtle)]">What AIOS is</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Four surfaces. One platform.
            </h2>
          </div>

          <div className="space-y-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
            <p>
              AIOS is not a tool — it&apos;s the layer that connects every tool you already pay for
              and adds the parts you don&apos;t have yet. OPERATE runs the work. OBSERVE shows you
              what&apos;s happening. BRAIN holds your institutional knowledge. GUARD catches silent
              failures before they cost you.
            </p>
            <p>
              The platform is built specifically for each agency it runs inside. Your data, your
              history, your patterns — not a generic template dropped into your stack.
            </p>
            <p className="font-serif text-h3 tracking-[-0.015em] text-[var(--color-fg)] text-balance">
              Your agency&apos;s real operations, running inside a system that gets sharper every week.
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
            How the platform works.
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
            <p className="text-body-sm font-medium text-[var(--color-fg)]">OpsRadar · AIOS</p>
            <p className="text-caption text-[var(--color-fg-subtle)]">Why this exists.</p>
          </div>
        </div>

        <div className="space-y-5 text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
          <p>
            OpsRadar exists because we kept watching the same thing happen. Agencies hire to fix
            problems that should be automated. They build process docs no one reads. They lose
            Friday afternoons to reports the system could ship in seconds.
          </p>
          <p>
            We spent years inside agency ops studying how good teams bleed margin to broken
            handoffs, spreadsheet rituals, and automations that looked clever in demos but broke
            in production. AIOS is the response: the operating system we built because it
            should have existed.
          </p>
          <p>
            Most agencies have the tools — HubSpot, Meta, GA4, Klaviyo, Slack. Almost none have
            the layer connecting them. AIOS is that layer.
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
          <p className="text-label text-[var(--color-fg-subtle)]">The philosophy</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            Four things we hold to.
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
          <p className="text-label text-[var(--color-primary)]">The bet</p>
          <div className="mt-6 space-y-6 text-body-lg leading-[1.65] text-[var(--color-fg-muted)] max-w-3xl">
            <p>
              Every agency that runs on AIOS gets an operations layer built from
              their real workflows, their tools, their data, their history — not
              a template, not a category average.
            </p>
            <p>
              The team queries institutional knowledge through Claude. Automations run
              inside their n8n. GUARD watches the stack overnight. The system gets
              sharper every week without manual upkeep.
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
        <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
        <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          See what your AIOS looks like.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          13 questions. Three minutes. An AI-generated report on where your
          operations are bleeding hours — and which workflows are worth
          automating first.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <Link href="/audit">
              Start the audit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Talk to founders
            </a>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)]">
          13 questions · Free · No card, no pitch · 3 minutes to the report.
        </p>
      </div>
    </section>
  )
}
