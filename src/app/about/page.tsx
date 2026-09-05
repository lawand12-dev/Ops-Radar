import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'

export const metadata: Metadata = {
  title: 'Built by an operator',
  description:
    'OpsRadar is founder-led. I spent years watching agencies bleed margin on clients they thought were profitable. I built the AI COO I wish those agencies had. — Lawand',
  openGraph: {
    title: 'Built by an operator — OpsRadar',
    description:
      'The AI COO for marketing agencies — by someone who watched the same agency lose $40K in a quarter on a client they thought was profitable.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Built by an operator — OpsRadar' }],
  },
  twitter: {
    title: 'Built by an operator — OpsRadar',
    description:
      'The AI COO for marketing agencies — by someone who watched the same agency lose $40K in a quarter on a client they thought was profitable.',
    images: ['/og-image.png'],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CREDIBILITY_MARKERS = [
  {
    n: '01',
    label: 'Four jobs',
    value: 'The COO does, all the time.',
    detail:
      'OPERATE runs the operational work. OBSERVE shows every client every day. BRAIN answers your questions with live data. GUARD watches the stack while you sleep. Not a tool you log into — a COO that does the watching.',
  },
  {
    n: '02',
    label: 'Your data, your tools',
    value: 'We never store it.',
    detail:
      'The AI COO reads live from HubSpot, ClickUp, Harvest, Stripe, and the rest. Your client business data stays in the tools you already pay for. Revoke access in one click any time.',
  },
  {
    n: '03',
    label: 'Stack depth',
    value: '10 integrations live.',
    detail:
      'HubSpot, Pipedrive, ClickUp, Asana, Monday, Harvest, Toggl, Stripe, Calendly, Apollo. Most agencies are already running 4–6 of them. We add roughly one new integration every two weeks.',
  },
  {
    n: '04',
    label: 'Time to live',
    value: 'Week one. No rip-and-replace.',
    detail:
      'Connect the tools you already pay for, give the AI COO read access, and the first weekly Health Score lands the following Monday. The first $ recovery typically lands in week 3.',
  },
]

const WHY_TRUST = [
  {
    kind: 'On detection lag',
    quote: 'The unprofitable client should be caught in week 2, not month 3.',
    body: 'The benchmark detection lag is 30–90 days. Most agencies discover a money-losing account at quarter-end — when the quarter is already gone. The AI COO reads margin live every day and flags the leak before the second invoice goes out.',
  },
  {
    kind: 'On why this exists',
    quote: 'Built by an operator, not a SaaS marketer.',
    body: 'Years inside agency ops watching good teams bleed margin to scope creep nobody billed for and clients nobody flagged until quarter-end. The fractional COO market priced 60% of agencies out. OpsRadar is the COO sub-$5M agencies could never afford.',
  },
  {
    kind: 'On ownership',
    quote: 'Your data stays in your tools. We only read it.',
    body: 'OpsRadar never writes your client business data to its own database. The AI COO reads live through OAuth and encrypted API keys you control. If OpsRadar disappeared, every tool you already pay for keeps running unchanged.',
  },
  {
    kind: 'On the price gap',
    quote: 'A fractional COO is $10K. OpsRadar starts at $750.',
    body: 'The market floor for a real fractional COO is $7,000/month. A full-time COO is $25,000. A Chief AI Officer averages $400,000/year. OpsRadar Growth at $1,500/month replaces 80% of what they do, runs 24/7, and never quits.',
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
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-20 md:pb-28">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">About</p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-7 text-[var(--color-fg)] text-balance max-w-[18ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Built by an operator who watched agencies bleed margin for years.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={280} offset={48}>
          <p
            className="mt-8 text-[var(--color-fg-muted)] max-w-[42rem]"
            style={{
              fontSize: "var(--text-lead)",
              lineHeight: "var(--text-lead--line-height)",
              fontWeight: 400,
            }}
          >
            I built OpsRadar because I kept watching the same thing happen &mdash;
            agencies growing on the top line, hemorrhaging on the bottom, finding
            out a quarter too late.
          </p>
        </RevealOnScroll>

        {/* ── Founder block ──────────────────────────────────────────── */}
        <RevealOnScroll delay={460} offset={40}>
          <FounderBlock />
        </RevealOnScroll>
      </div>
    </section>
  )
}

function FounderBlock() {
  return (
    <div className="mt-14 md:mt-20 max-w-3xl">
      <div className="flex items-start gap-5 md:gap-6 border-t border-[var(--color-border)] pt-10 md:pt-12">
        <img
          src="/lawand.jpg"
          alt="Lawand — Founder, OpsRadar"
          className="size-16 md:size-20 shrink-0 rounded-full object-cover object-top ring-1 ring-[var(--color-border)]"
        />

        <div className="flex-1">
          <p className="text-label text-[var(--color-fg-subtle)]">Founder</p>
          <p className="mt-1 text-[var(--color-fg)]" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h3)", lineHeight: "var(--text-h3--line-height)", letterSpacing: "var(--text-h3--letter-spacing)", fontWeight: 500 }}>
            Lawand
          </p>
          <p className="mt-3 text-body leading-[1.6] text-[var(--color-fg-muted)] max-w-xl">
            Spent years inside agency ops. Built OpsRadar after watching a $2M
            agency lose $40K in Q3 on a client they thought was profitable —
            the data was in six places, the quarter was gone by the time
            anyone noticed.
          </p>
          <p className="mt-3 text-body-sm leading-[1.55] text-[var(--color-fg-muted)] max-w-xl">
            <span className="text-[var(--color-fg)] font-medium">
              Reply to this email or DM me on LinkedIn. I read everything.
            </span>{" "}
            <a
              href="mailto:lawand@opsradar.co"
              className="font-mono underline-offset-4 hover:underline"
            >
              lawand@opsradar.co
            </a>
          </p>
        </div>
      </div>
    </div>
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
          <RevealOnScroll delay={0} offset={40}>
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-label text-[var(--color-fg-subtle)]">What the AI COO is</p>
              <h2 className="mt-4 text-balance text-[var(--color-fg)]" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1)", lineHeight: "var(--text-h1--line-height)", letterSpacing: "var(--text-h1--letter-spacing)", fontWeight: 500 }}>
                The COO sub-$5M agencies could never afford.
              </h2>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="space-y-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
              <p>
                The AI COO is the intelligence layer for marketing agencies. It reads live from the tools you already pay for — HubSpot, ClickUp, Harvest, Stripe — watches margin, scope, and utilization every minute, and tells you what to do next. It does the four loops every functioning ops leader runs every week: OPERATE the work, OBSERVE the agency, BRAIN your live data, GUARD the stack overnight.
              </p>
              <p>
                A fractional COO is $7K–$15K/month. A full-time COO is $25K. A Chief AI Officer is $400K/year. We charge $750–$3,000/month for software that runs 24/7 and never quits. Sub-$5M agencies finally have a real COO.
              </p>
              <p className="text-balance text-[var(--color-fg)]" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h3)", lineHeight: "var(--text-h3--line-height)", letterSpacing: "var(--text-h3--letter-spacing)", fontWeight: 500 }}>
                The unprofitable client, caught in week 2. Not month 3.
              </p>
            </div>
          </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <div className="max-w-2xl mb-16">
            <p className="text-label text-[var(--color-fg-subtle)]">The specifics</p>
            <h2 className="mt-4 text-balance text-[var(--color-fg)]" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1)", lineHeight: "var(--text-h1--line-height)", letterSpacing: "var(--text-h1--letter-spacing)", fontWeight: 500 }}>
              How the AI COO works.
            </h2>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
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
                <h3 className="text-[var(--color-fg)]" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2)", lineHeight: "var(--text-h2--line-height)", letterSpacing: "var(--text-h2--letter-spacing)", fontWeight: 500 }}>
                  {m.value}
                </h3>
                <p className="mt-3 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {m.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
        </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <div className="flex items-center gap-3 mb-8">
            <span className="size-9 rounded-full bg-[var(--color-accent-100)] flex items-center justify-center overflow-hidden">
              <img src="/logo.svg" alt="OpsRadar" className="size-5 object-contain" />
            </span>
            <div>
              <p className="text-body-sm font-medium text-[var(--color-fg)]">OpsRadar · AI COO</p>
              <p className="text-caption text-[var(--color-fg-subtle)]">Why this exists.</p>
            </div>
          </div>

          <div className="space-y-5 text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
            <p>
              In 2023 I sat with the founder of a $2M agency at her Q3 books review. One client had cost her $40,000 that quarter. The data was in six places — Productive, Harvest, Stripe, two ad accounts, a Slack thread. By the time anyone added it up, the quarter was over. She didn&rsquo;t have a margin problem. She had a visibility problem.
            </p>
            <p>
              The fractional COO market is $7K–$15K/month. Sub-$5M agencies — 60% of the industry — can&rsquo;t afford one. A full-time COO is $25K. A Chief AI Officer is $400K. The agencies that need an ops leader most are the ones priced out of having one.
            </p>
            <p>
              OpsRadar is the AI COO that closes the gap. It reads the same data a human COO would — live, every minute — and tells you the next move. The unprofitable client gets caught in week 2. The unbilled scope gets surfaced as a draft invoice. The pacing alert lands before Monday. From $750/month. One-tenth the cost of a fractional COO.
            </p>
          </div>
        </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <div className="max-w-2xl mb-12">
            <p className="text-label text-[var(--color-fg-subtle)]">The philosophy</p>
            <h2 className="mt-4 text-balance" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1)", lineHeight: "var(--text-h1--line-height)", letterSpacing: "var(--text-h1--letter-spacing)", fontWeight: 500 }}>
              Four things we hold to.
            </h2>
          </div>
        </RevealOnScroll>

        <div className="space-y-16 md:space-y-20">
          {WHY_TRUST.map((q, i) => (
            <RevealOnScroll key={q.kind} delay={i * 80} offset={40}>
            <div className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-16">
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-3 lg:min-w-[160px]">
                — {q.kind}
              </p>
              <div>
                <blockquote className="text-[clamp(1.5rem,2.6vw+0.4rem,2.5rem)] leading-[1.1] text-[var(--color-fg)] text-balance" style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.02em", fontWeight: 500 }}>
                  {q.quote}
                </blockquote>
                <p className="mt-5 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {q.body}
                </p>
              </div>
            </div>
            </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
            <p className="text-label text-[var(--color-primary)]">The bet</p>
            <div className="mt-6 space-y-6 text-body-lg leading-[1.65] text-[var(--color-fg-muted)] max-w-3xl">
              <p>
                At 50 agencies, the AI COO has enough vertical data to surface real benchmarks — utilization by team size, margin by service mix, scope-creep patterns by retainer shape. At 100, those benchmarks become a moat: the OpsRadar Index, published quarterly, that no horizontal AI can replicate.
              </p>
              <p>
                The product that ships today watches your stack. The product that ships in 18 months acts on it with growing autonomy — drafts the invoice, queues the pacing alert, rebalances the team — every action with a 30-minute undo and a 5-evaluator safety net. The COO does more of the COO job, every quarter.
              </p>
              <p className="text-balance text-[var(--color-fg)] pt-2" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2)", lineHeight: "1.15", letterSpacing: "var(--text-h2--letter-spacing)", fontWeight: 500 }}>
                The AI COO sub-$5M agencies could never afford — built for the segment the fractional market priced out.
              </p>
            </div>
          </div>
        </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
          <h2 className="mt-5 text-balance" style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(2.25rem,3.6vw+0.5rem,3.75rem)", lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: 500 }}>
            Talk to the founder.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            A 30-minute call. We open up the data, look at your stack, and tell you within 30 minutes if the AI COO belongs at your agency.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a 30-min call with the founder
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/audit">
                Or try the 3-minute audit
              </Link>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)]">
            30 minutes · No pitch · We tell you if it&apos;s not a fit.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  )
}
