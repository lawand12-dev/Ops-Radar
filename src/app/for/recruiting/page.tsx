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
  title: 'AIOS for Recruiting Agencies — OpsRadar',
  description:
    'OpsRadar is AIOS for boutique recruiting and search firms under 25 people. OBSERVE shows the ATS pipeline digest every Monday. GUARD catches candidate follow-up gaps before the req goes cold. OPERATE syncs scorecard data to Notion automatically.',
  openGraph: {
    title: 'AIOS for Recruiting Agencies — OpsRadar',
    description:
      'Pipeline digest, follow-up automation, and scorecard sync — OBSERVE shows the pipeline; GUARD catches the gaps. Built on your accounts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Recruiting Agencies' }],
  },
  twitter: {
    title: 'AIOS for Recruiting Agencies — OpsRadar',
    description:
      'Pipeline digest, follow-up automation, scorecard sync. OBSERVE shows the pipeline; GUARD catches the gaps.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Pipeline',
    title: 'Every req visible every Monday.',
    body: 'OBSERVE pulls Greenhouse, Ashby, or Lever data into a Slack digest every Monday morning — stage, days since last touch, submit-to-interview ratio per req. Recruiters stop reconstructing pipeline state from memory and Slack scroll.',
  },
  {
    tag: 'Follow-up',
    title: 'Candidate gaps caught before reqs go cold.',
    body: 'GUARD monitors Gmail and ATS activity per candidate and fires a Slack alert when any active candidate goes 72 hours without a touch — before the req stalls or the client asks why the pipeline dried up. ~5 hours of follow-up drag per recruiter per week gone.',
  },
  {
    tag: 'Scorecards',
    title: 'Interview notes land in Notion automatically.',
    body: 'OPERATE syncs scorecard submissions from Greenhouse or Ashby to the requisition Notion page — decision, highlights, and red flags populated without anyone copying and pasting. No more "can you paste the scorecard in the doc" Slack messages.',
  },
]

const WORKFLOWS = [
  {
    name: 'ats-pipeline-digest',
    desc: 'Every Monday at 7 a.m.: pulls all active reqs from Greenhouse or Ashby, computes days-since-last-touch and stage per candidate, and posts a formatted Slack summary per recruiter. One read, full pipeline state.',
    touches: ['Greenhouse', 'Ashby', 'Slack'],
    saved: '~6 h / mo',
  },
  {
    name: 'candidate-followup-bot',
    desc: 'Watches Gmail and ATS activity per active candidate. If no outbound touch in 72 hours, fires a Slack nudge to the owning recruiter with candidate name, stage, and last-contact date.',
    touches: ['Gmail', 'Greenhouse', 'Slack'],
    saved: '~8 h / mo per recruiter',
  },
  {
    name: 'scorecard-sync',
    desc: 'On scorecard submission in Greenhouse or Ashby: parses structured feedback, creates or updates the requisition page in Notion with decision, competency ratings, and key notes. No copy-paste required.',
    touches: ['Greenhouse', 'Notion', 'Slack'],
    saved: '~4 h / mo',
  },
]

const BEFORE_AFTER = [
  {
    before: 'Pipeline state reconstructed from ATS scrolling and Slack memory',
    after: 'Monday Slack digest shows every req: stage, days-since-touch, ratios',
  },
  {
    before: 'Follow-up gaps discovered when a candidate goes silent for a week',
    after: 'Slack nudge fires at 72 hours — before the req stalls or client notices',
  },
  {
    before: 'Scorecard notes copy-pasted into Notion doc by a coordinator',
    after: 'Scorecard submission triggers automatic Notion sync — zero manual steps',
  },
  {
    before: 'Submission packet assembly takes 5+ hours per recruiter per week',
    after: 'Resume, screen notes, comp, and scorecard bundled into branded PDF on approval',
  },
  {
    before: 'Time-to-fill and fee revenue visible only at month-end Excel export',
    after: 'Placement velocity and fee revenue surfaced nightly from ATS + CRM',
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ForRecruitingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/recruiting" />
      <SegmentPageAnalytics segment="recruiting" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-label text-[var(--color-primary)] uppercase tracking-[0.12em]">
          AIOS for recruiting agencies
        </p>

        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          Recruiters close placements. Not spreadsheets.
        </h1>

        <p className="mt-5 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          ATS data is scattered across Greenhouse, Gmail, and Notion. Candidate follow-up
          falls through when no one is watching. Scorecards never make it to the req doc.
          OpsRadar is AIOS — the system that closes all three, runs on your accounts,
          and watches your pipeline around the clock.
        </p>

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
      </section>

      {/* ── Three outcomes ────────────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">What changes</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            Three outcomes. One system.
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
            What a typical recruiting AIOS looks like.
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
            What your agency looks like after OpsRadar lands.
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
            — Recruiting firm founder · 11-person agency · pipeline digest live in week one
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            See what your recruiting AIOS looks like.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
            A 30-minute call. We listen to how your agency runs, ask the questions
            only operators would ask, and tell you on the call whether AIOS belongs.
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
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
