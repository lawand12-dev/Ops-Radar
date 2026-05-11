import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '<npm>/components/ui/accordion'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export const metadata: Metadata = {
  title: 'How it works — OpsRadar',
  description:
    'From first message to first workflow running: 10 business days. Exact timeline, what you do, what we do, what you get at each phase.',
  openGraph: {
    title: 'How it works — OpsRadar',
    description:
      "From first message to first workflow running in 10 business days. Here's exactly what that looks like.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How it works — OpsRadar' }],
  },
  twitter: {
    title: 'How it works — OpsRadar',
    description:
      "From first message to first workflow running in 10 business days. Here's exactly what that looks like.",
    images: ['/og-image.png'],
  },
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

type Phase = {
  id: string
  dayRange: string
  phaseTitle: string
  headline: string
  yourSide: string[]
  ourSide: string[]
  youGet: string
  timeCost: string
}

const PHASES: Phase[] = [
  {
    id: 'audit',
    dayRange: 'Day 0',
    phaseTitle: 'Audit',
    headline: 'You run the 3-minute audit. Results hit your inbox.',
    yourSide: [
      'Spend 3 minutes answering 13 questions about your ops.',
      'Get a personalized report: annual waste estimate, top 4 workflow opportunities, your automation readiness score.',
    ],
    ourSide: [
      'The AI synthesizes your answers + public website signals into a diagnosis tuned for your segment (paid-media / SEO / full-service / other).',
      'No human in this step yet. Fully automated, fully private.',
    ],
    youGet:
      'A results page you can forward to your team. A share link. A concrete number for how much manual ops is costing you annually.',
    timeCost: '3 minutes. No commitment beyond.',
  },
  {
    id: 'kickoff',
    dayRange: 'Day 1–2',
    phaseTitle: 'Kickoff',
    headline: 'We get on a 30-minute call. You approve a fixed scope.',
    yourSide: [
      'Book a 30-min call using the link in your audit results.',
      'Tell us which workflow is priority #1 and why.',
      "Share tool access (Meta, Google Ads, HubSpot, Klaviyo — whatever's involved).",
    ],
    ourSide: [
      'We listen, ask sharp questions, and leave the call with a clear scope.',
      'Within 48 hours we send you a written proposal: exactly what we\'ll build, every tool we\'ll touch, timeline, fixed price.',
      "You review and approve — or we iterate once on scope. Nothing starts until you say go.",
    ],
    youGet:
      'A written scope document with fixed price, exact deliverables, and timeline. No hourly billing surprises.',
    timeCost: '30-min call + ~15 min to review the proposal.',
  },
  {
    id: 'build',
    dayRange: 'Day 3–8',
    phaseTitle: 'Build',
    headline: "We build in a dev environment. You stay focused on clients.",
    yourSide: [
      'Go back to your actual work. Serve your clients.',
      'Respond to one mid-build check-in (async Slack or email — takes 5 minutes on your end).',
    ],
    ourSide: [
      "We build the workflow in an isolated dev n8n instance. Every node connected to real APIs — no mock data, no \"we'll figure it out in production.\"",
      "We test every edge case: what happens when the Meta API times out, when Klaviyo rate-limits, when a field is missing. Error handling is built in from day one.",
      "We send you one mid-build update so you know it's on track. No status meetings, no check-in theater.",
    ],
    youGet: 'A tested, production-ready workflow waiting for your review — not a demo.',
    timeCost: '~5 minutes of your time total during the build.',
  },
  {
    id: 'walkthrough',
    dayRange: 'Day 9',
    phaseTitle: 'Walkthrough',
    headline: 'We show you the live workflow. You approve it.',
    yourSide: [
      'Join a 20-minute screen share. We record it so your team can watch later.',
      'Ask anything, request tweaks, or give the green light.',
    ],
    ourSide: [
      "We walk you through every node — what it does, what it's connected to, what triggers it.",
      'We show you the output live (a test run in front of you, not a screenshot).',
      'If you want something different, we note it and iterate before going live.',
    ],
    youGet:
      'A recorded walkthrough your team can reference forever, plus full confidence in what you\'re about to deploy.',
    timeCost: '20 minutes on a call.',
  },
  {
    id: 'deploy',
    dayRange: 'Day 10',
    phaseTitle: 'Deploy',
    headline: "The workflow goes live in your n8n account. First automated run happens.",
    yourSide: [
      'Confirm deployment is healthy.',
      'Watch the first automated run complete.',
    ],
    ourSide: [
      "We migrate the workflow from dev to your own n8n account (not ours, never ours).",
      "We deploy monitoring and alerts — if something breaks at 3am, our team gets paged, not you.",
      'We send you a documentation doc: what the workflow does, how to pause it, how to change thresholds, who owns what.',
    ],
    youGet:
      "The workflow running automatically inside your own n8n account. A written doc. A direct line to me if anything needs attention.",
    timeCost: '15 minutes to confirm deployment.',
  },
  {
    id: 'operates',
    dayRange: 'Day 11+',
    phaseTitle: 'It runs',
    headline: "You stop thinking about it. That's the whole point.",
    yourSide: [
      'Do the strategy work you actually got into this business for.',
      "Tell us when something changes (new tool, new client structure, new goal) — we adapt the workflow.",
    ],
    ourSide: [
      "We monitor 24/7. If an API deprecates, a vendor changes auth, or anything breaks, we fix it before you notice.",
      'Monthly check-in email with performance metrics: hours saved, errors caught, edge cases hit.',
    ],
    youGet:
      "Your Sunday nights back. Your strategy hours back. An ops layer that compounds silently instead of breaking loudly.",
    timeCost: 'Near zero, ongoing.',
  },
]

type Concern = {
  id: string
  question: string
  answer: string
}

const CONCERNS: Concern[] = [
  {
    id: 'slammed',
    question: 'What if our team is slammed with client work mid-build?',
    answer:
      "You won't derail the timeline. The build is self-contained — we need about 5 minutes of your time total during Day 3–8 for one async check-in. If you're heads-down, just reply when you can. We build, you serve your clients.",
  },
  {
    id: 'miss',
    question: 'What if the workflow you build misses something important?',
    answer:
      "Day 9 exists for exactly this. You see the live workflow before it touches production. If something's off, we adjust it before deploy. If we misunderstood something in scope, we fix it on our time, not yours.",
  },
  {
    id: 'stop-day0',
    question: 'What if we want to stop after Day 0?',
    answer:
      "You stop. The audit is free. There's no follow-up pressure, no \"but wait.\" You keep the results. If you want to use them to hire someone else or DIY, that's fine — the report is yours.",
  },
  {
    id: 'stop-deploy',
    question: 'What if we want to stop after deploy?',
    answer:
      "You keep everything. The workflow is already in your n8n account (not ours). The documentation is already yours. You just stop the monthly retainer. The workflow keeps running — you or anyone else can maintain it from that point.",
  },
  {
    id: 'faster',
    question: 'Can this move faster than 10 days?',
    answer:
      "Yes, for simpler workflows or when you need it fast for a client deadline. Single workflows can ship in 3–4 days when the scope is tight and you're responsive on tool access. We won't promise faster than 10 in the proposal unless we've actually sized it and we're confident.",
  },
]

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/how-it-works" />

      <PageHeader />
      <TimelineSection />
      <OwnershipPanel />
      <ConcernsSection />
      <FinalCTA />

      <SiteFooter />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page header                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <header className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 pt-12 pb-16 md:pt-20 md:pb-20">
        <p className="text-label text-[var(--color-fg-subtle)]">How it works</p>
        <h1 className="mt-5 font-serif text-[clamp(2.25rem,3.8vw+0.5rem,4rem)] leading-[1.04] tracking-[-0.025em] text-balance">
          From first message to first workflow running:{' '}
          <span className="text-[var(--color-primary)]">10 business days.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          No mystery, no &ldquo;we&apos;ll figure it out as we go.&rdquo; Every phase is concrete — what
          you do, what we do, what you get at the end, and how much of your time it
          actually costs.
        </p>
        <p className="mt-4 text-body text-[var(--color-fg-muted)]">
          Here&apos;s exactly what that looks like on your side.
        </p>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Timeline + sticky sidebar layout                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

function TimelineSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid lg:grid-cols-[220px_1fr] gap-12 lg:gap-16 items-start">

        {/* Sticky sidebar TOC */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <p className="text-label text-[var(--color-fg-subtle)] mb-5">Steps</p>
          <nav>
            <ol className="space-y-1">
              {PHASES.map((phase, i) => (
                <li key={phase.id}>
                  <a
                    href={`#${phase.id}`}
                    className="group flex items-center gap-3 py-1.5 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)]"
                  >
                    <span className="font-mono text-caption text-[var(--color-fg-faint)] group-hover:text-[var(--color-fg-subtle)] w-6 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{phase.phaseTitle}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Timeline entries */}
        <div>
          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {PHASES.map((phase, i) => (
              <li
                key={phase.id}
                id={phase.id}
                className="grid grid-cols-[auto_1fr] gap-8 md:gap-14 py-12 md:py-16 items-start scroll-mt-24"
              >
                {/* Step marker */}
                <div className="pt-1 w-14 shrink-0">
                  <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
                    — {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1.5 text-label text-[var(--color-fg-faint)] uppercase tracking-widest">
                    {phase.dayRange}
                  </p>
                </div>

                {/* Step content */}
                <div>
                  <p className="text-label text-[var(--color-primary)] mb-3">
                    {phase.phaseTitle}
                  </p>
                  <h2 className="font-serif text-h2 leading-[1.15] tracking-[-0.02em] text-balance mb-8">
                    {phase.headline}
                  </h2>

                  {/* Your side / Our side */}
                  <div className="grid sm:grid-cols-2 gap-8 mb-8">
                    <div>
                      <p className="text-label text-[var(--color-fg-subtle)] mb-3">Your side</p>
                      <ul className="space-y-2.5">
                        {phase.yourSide.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]"
                          >
                            <span className="text-[var(--color-fg-faint)] mt-1 shrink-0">—</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-label text-[var(--color-fg-subtle)] mb-3">Our side</p>
                      <ul className="space-y-2.5">
                        {phase.ourSide.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]"
                          >
                            <span className="text-[var(--color-fg-faint)] mt-1 shrink-0">—</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* You get */}
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-4">
                    <p className="text-label text-[var(--color-fg-subtle)] mb-2">What you get</p>
                    <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                      {phase.youGet}
                    </p>
                  </div>

                  {/* Time cost */}
                  <p className="text-caption text-[var(--color-fg-subtle)]">
                    <span className="font-medium text-[var(--color-fg-muted)]">Your time cost: </span>
                    {phase.timeCost}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Ownership panel                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function OwnershipPanel() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
          <p className="text-label text-[var(--color-primary)] mb-4">
            The part most automation agencies won&apos;t tell you
          </p>
          <h2 className="font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance mb-5">
            Every workflow lives in your n8n account. Not ours.
          </h2>
          <div className="space-y-4 max-w-3xl text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
            <p>
              When we build for you, it goes into a n8n instance you own, with credentials you control,
              on infrastructure you pay for (or self-host). If you ever want to stop working with
              OpsRadar, you keep everything. The workflows. The documentation. The entire system.
              We just stop maintaining it.
            </p>
            <p>
              No vendor lock-in. No &ldquo;your data is hostage.&rdquo; No per-task pricing that scales
              against you. That&apos;s the single biggest reason we built OpsRadar this way instead of
              running a Zapier-retainer model or a locked automation subscription.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Realistic concerns (Accordion)                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function ConcernsSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-label text-[var(--color-fg-subtle)] mb-4">Realistic concerns</p>
        <h2 className="font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance mb-12">
          What actually worries agency founders before they start.
        </h2>

        <Accordion type="multiple" className="border-y border-[var(--color-border)]">
          {CONCERNS.map((c) => (
            <AccordionItem key={c.id} value={c.id}>
              <AccordionTrigger className="font-serif text-h3 leading-[1.2] tracking-[-0.015em] py-6">
                {c.question}
              </AccordionTrigger>
              <AccordionContent className="text-body leading-[1.7]">
                {c.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Final CTA                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
        <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.5rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          Start with the audit.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          3 minutes. Free. You&apos;ll know by the end whether this is worth a kickoff call.
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

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          No credit card. No sales pitch. Just the shortlist of workflows burning the most
          money in your agency right now.
        </p>
      </div>
    </section>
  )
}
