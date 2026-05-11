import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '<npm>/components/ui/card'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'For Design Agencies — OpsRadar',
  description:
    'OpsRadar builds the automation layer for design and creative studios under 15 people. Feedback consolidated from Figma, Frame.io, and Loom into one queue. Project status in one Monday Slack digest. Utilization visible weekly, not at quarter-end.',
  openGraph: {
    title: 'For Design Agencies — OpsRadar',
    description:
      'Feedback consolidated. Status in one digest. Utilization weekly. Built inside your n8n account in 5 to 14 days.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Design Agencies' }],
  },
  twitter: {
    title: 'For Design Agencies — OpsRadar',
    description:
      'Feedback consolidated. Status in one digest. Utilization weekly. Built inside your n8n account.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Feedback',
    title: 'One queue. No more triage.',
    body: 'Figma comments, Frame.io notes, Loom replies, Slack DMs, and client emails collapsed into a single Notion or Asana queue per project. Designers stop triaging sources. PMs stop chasing threads. ~4 hours per designer back each week.',
  },
  {
    tag: 'Status',
    title: 'Monday digest replaces the stand-up.',
    body: 'Notion, Asana, or ClickUp pulled into one Slack message every Monday at 8 a.m. — revision status, approval blockers, deadline drift per project. The 30-minute status meeting disappears.',
  },
  {
    tag: 'Utilization',
    title: 'Under-billing surfaces in days.',
    body: 'Harvest, Toggl, or Clockify rolled into a weekly Slack digest showing utilization per designer. Scope-creep alert fires when hours pass the retainer floor — the same week, not at month-end when the conversation is already awkward.',
  },
]

const WORKFLOWS = [
  {
    name: 'design-handoff-pipeline',
    desc: 'On Figma project approval: bundles final frames, source files, and brand guidelines from Drive into a client portal link. Sends delivery email and logs the handoff in Notion. Kills the "where\'s the logo file" email.',
    touches: ['Figma', 'Google Drive', 'Notion', 'Slack'],
    saved: '~3 h / project',
  },
  {
    name: 'client-revision-tracker',
    desc: 'Watches Figma for new comments and Asana for revision requests. Collapses both into one prioritized queue per designer. Pings the PM in Slack if a revision sits unassigned for 24 hours.',
    touches: ['Figma', 'Asana', 'Slack'],
    saved: '~5 h / mo per designer',
  },
  {
    name: 'weekly-creative-recap',
    desc: 'Every Friday at 4 p.m.: pulls Drive activity, Figma version history, and Slack threads for the week. Posts a per-project summary to the agency Slack channel — what shipped, what\'s pending, what\'s at risk.',
    touches: ['Google Drive', 'Figma', 'Slack'],
    saved: '~4 h / mo',
  },
]

const BEFORE_AFTER = [
  {
    before: 'Figma, Frame.io, Loom, Slack, and email checked separately for feedback',
    after: 'All feedback collapsed into one Notion queue — one place to start the day',
  },
  {
    before: 'Status meeting reconstructs project state from memory and Slack scroll',
    after: 'Monday Slack digest shows revision status, blockers, and drift per project',
  },
  {
    before: 'Over-scope discovered at invoicing — conversation already awkward',
    after: 'Slack alert fires the week hours cross the retainer threshold',
  },
  {
    before: 'Final asset delivery is a manual zip-and-send after project close',
    after: 'Handoff pipeline delivers portal link and logs completion in Notion',
  },
  {
    before: 'Utilization gaps visible at quarter-end, not when they open',
    after: 'Weekly digest flags anyone under-billed before the week is gone',
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ForDesignPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/design" />
      <SegmentPageAnalytics segment="design" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-label text-[var(--color-primary)] uppercase tracking-[0.12em]">
          For design agencies
        </p>

        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          Designers stop doing handoffs at 8 pm.
        </h1>

        <p className="mt-5 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          Figma feedback, Frame.io revisions, and Loom replies all land in different places.
          Status meetings reconstruct state from memory. OpsRadar builds the automation layer
          that closes all three gaps — inside your n8n account, in 5 to 14 days.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/audit">
              Start your audit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Talk to founders
            </a>
          </Button>
        </div>
      </section>

      {/* ── Three outcomes ────────────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">What changes</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            Three outcomes, delivered in weeks.
          </h2>

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
        </div>
      </section>

      {/* ── Workflow cards ────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">Live examples</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            What a typical design studio AIOS looks like.
          </h2>

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
        </div>
      </section>

      {/* ── Before / After table ──────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">Before vs. after</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            What your studio looks like after OpsRadar lands.
          </h2>

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
        </div>
      </section>

      {/* ── Testimonial slot ──────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">From the field</p>
          <blockquote className="mt-8 font-serif text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            &ldquo;[Operator quote — to be replaced with real customer]&rdquo;
          </blockquote>
          <p className="mt-6 font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.05em]">
            — Design studio founder · 8-person shop · 4 h/week back per designer
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            Run a design studio audit.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
            3 minutes. Real figures on the hours your studio loses to feedback triage,
            status meetings, and late-night handoffs. No pitch, no card.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/audit">
                Start your audit
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Talk to founders
              </a>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
