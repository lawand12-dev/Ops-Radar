import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '<npm>/components/ui/card'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'AI COO for Full-Service Digital Agencies',
  description:
    'OpsRadar is the AI COO for full-service marketing agencies (10–25 people). Cross-channel margin protection. Utilization alerts before scope creep eats your P&L. OBSERVE shows everything; GUARD catches it before it costs you.',
  openGraph: {
    title: 'AI COO for Full-Service Digital Agencies',
    description:
      'Cross-channel reporting, utilization alerts, and scope-creep flagging — OPERATE runs the workflows, OBSERVE shows the gaps. Built on your accounts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Full-Service Agencies' }],
  },
  twitter: {
    title: 'AI COO for Full-Service Digital Agencies',
    description:
      'Cross-channel reporting, utilization alerts, scope-creep flagging. OPERATE runs it; OBSERVE shows it.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Reporting',
    title: 'Cross-channel reporting that defends margin.',
    body: 'OPERATE merges Google Ads, Meta, GA4, HubSpot, and SEO data into one branded monthly rollup — automated on the 2nd. The 4–8 hours per client your team burns on reporting each month go back to billable work.',
  },
  {
    tag: 'Utilization',
    title: 'Utilization visible before the P&L hurts.',
    body: 'OBSERVE pulls Harvest, Toggl, or Float data nightly into a Slack digest your ops lead actually reads. See utilization dipping below 55% before it becomes a quarter-end conversation with your accountant.',
  },
  {
    tag: 'Onboarding',
    title: 'Structured onboarding that locks expectations.',
    body: 'OPERATE triggers a 6-phase onboarding workflow on signed contract — provisioning, intake, kickoff, setup, first deliverable, steady state — with gates at each step. 48% of churn starts in weeks 1–4. This is where you fix the trajectory.',
  },
]

const WORKFLOWS = [
  {
    name: 'client-monthly-recap',
    desc: 'Pulls Google Ads, Meta, GA4, and HubSpot data on the 1st. Renders a cross-channel PDF per client and emails it on the 2nd — no AM touches required.',
    touches: ['Google Ads', 'Meta API', 'HubSpot', 'GA4'],
    saved: '~6 h / client / mo',
  },
  {
    name: 'utilization-weekly-digest',
    desc: 'Every Friday at 4 p.m.: pulls Harvest time logs, computes utilization per person, and posts a Slack summary flagging anyone below 55% or over 90%.',
    touches: ['Harvest', 'Slack', 'Float'],
    saved: '~5 h / mo',
  },
  {
    name: 'scope-creep-watchdog',
    desc: 'Monitors Slack and email for client requests that lack a ticket ID. Pings the PM to create a ticket before work begins — before the retainer absorbs it silently.',
    touches: ['Slack', 'Asana', 'HubSpot'],
    saved: 'Variable — catches retainer erosion',
  },
]

const BEFORE_AFTER = [
  {
    before: 'AMs assemble cross-channel reports manually each month',
    after: 'Cross-channel PDF generated on the 1st, delivered on the 2nd',
  },
  {
    before: 'Utilization dip noticed at quarter-end performance review',
    after: 'Weekly Slack digest flags anyone below 55% in real time',
  },
  {
    before: 'Scope creep absorbed silently until the retainer is underwater',
    after: 'Scope-creep watchdog pings PM before unbilled work is done',
  },
  {
    before: 'Client onboarding varies by AM — expectations set inconsistently',
    after: '6-phase onboarding workflow with hard gates, every client',
  },
  {
    before: 'AR aging discovered during accountant call at month close',
    after: '60-day AR flagged in Slack — before it becomes 90-day',
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ForFullServicePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/full-service" />
      <SegmentPageAnalytics segment="full-service" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label text-[var(--color-primary)] uppercase tracking-[0.12em]">
            AI COO for full-service agencies
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={48}>
          <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
            Hold your margin as you scale.
          </h1>
        </RevealOnScroll>

        <RevealOnScroll delay={280} offset={48}>
          <p className="mt-5 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
            Cross-channel reporting eats your senior time. Utilization dips go unnoticed until
            quarter-end. Scope creep absorbs retainer silently. OpsRadar is AI COO — the system
            that closes all three leaks, runs on your accounts, and gets sharper every
            week the data flows through it.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a call with founders
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/audit">
                Or try the 3-minute audit
              </Link>
            </Button>
          </div>
        </RevealOnScroll>
      </section>

      {/* ── Three outcomes ────────────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">What changes</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
              Three outcomes. One system.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="mt-14 grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
              {OUTCOMES.map((o) => (
                <div
                  key={o.tag}
                  className="bg-[var(--color-surface)] p-8 md:p-10 flex flex-col gap-4"
                >
                  <Badge variant="accent">{o.tag}</Badge>
                  <h3 className="font-serif text-h3 leading-[1.2] tracking-[-0.015em] text-[var(--color-fg)]">
                    {o.title}
                  </h3>
                  <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">{o.body}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Workflow cards ────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">Live examples</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
              What a typical full-service AI COO looks like.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="mt-14 grid md:grid-cols-3 gap-6">
              {WORKFLOWS.map((wf) => (
                <Card key={wf.name}>
                  <CardHeader className="border-b border-[var(--color-border)]">
                    <CardTitle>
                      <span className="font-mono text-body-sm tracking-[-0.01em]">{wf.name}</span>
                    </CardTitle>
                    <CardDescription>{wf.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {wf.touches.map((t) => (
                        <Badge key={t} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                    <p className="text-caption text-[var(--color-fg-subtle)] font-mono">{wf.saved} saved</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Before / After table ──────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">Before vs. after</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
              What your agency looks like after OpsRadar lands.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="mt-12 rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
              <div className="grid grid-cols-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border)]">
                <div className="px-6 py-3 text-label text-[var(--color-fg-subtle)]">Before</div>
                <div className="px-6 py-3 text-label text-[var(--color-primary)] border-l border-[var(--color-border)]">
                  After OpsRadar
                </div>
              </div>
              {BEFORE_AFTER.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 border-b last:border-b-0 border-[var(--color-border)]"
                >
                  <div className="px-6 py-4 text-body-sm text-[var(--color-fg-muted)] leading-[1.55]">
                    {row.before}
                  </div>
                  <div className="px-6 py-4 text-body-sm text-[var(--color-fg)] leading-[1.55] border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                    {row.after}
                  </div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
            <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
              See what your full-service AI COO looks like.
            </h2>
            <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
              A 30-minute call. We listen to how your agency runs, ask the questions
              only operators would ask, and tell you on the call whether AI COO belongs.
            </p>

            <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
              <Button asChild size="lg">
                <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                  Book a call with founders
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/audit">
                  Or try the 3-minute audit
                </Link>
              </Button>
            </div>

            <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
              30 minutes · No pitch · We tell you if it&apos;s not a fit.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
