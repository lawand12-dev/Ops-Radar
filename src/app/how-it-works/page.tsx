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
    'The four steps from free audit to live AIOS: Audit, Discovery, Blueprint, Build. Each step explained in full — what happens, what you get, what comes next.',
  openGraph: {
    title: 'How it works — OpsRadar',
    description:
      'Free audit to live AIOS in four steps. Here is exactly what each one looks like.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How it works — OpsRadar' }],
  },
  twitter: {
    title: 'How it works — OpsRadar',
    description:
      'Free audit to live AIOS in four steps. Here is exactly what each one looks like.',
    images: ['/og-image.png'],
  },
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

type Step = {
  id: string
  n: string
  tag: string
  headline: string
  body: string
  yourSide: string[]
  ourSide: string[]
  youGet: string
  note?: string
}

const STEPS: Step[] = [
  {
    id: 'audit',
    n: '01',
    tag: 'Audit',
    headline: 'Tell us what your agency runs on. Get a real diagnosis back.',
    body: `The audit is 13 questions. Free. No card, no pitch. It takes about three minutes. The AI reads your answers — agency type, headcount, tools in the stack, the workflows that eat the most hours, and where the pain is sharpest — and generates a report on the operations underneath your business.`,
    yourSide: [
      'Answer 13 questions: what you do, how many people, which tools you rely on, which workflows your team does by hand, and where the hours disappear.',
      'Get a personalized report: a ranked list of workflows worth automating, the dollar and hour figures behind each, and an honest readiness read.',
    ],
    ourSide: [
      'The AI evaluates your answers alongside public signals about your business and maps them to the AIOS workflow library.',
      'No human is in this step. Fully automated, fully private.',
    ],
    youGet:
      'A PDF-quality results page with a workflow shortlist, annual waste estimate, and a prioritized automation roadmap. Yours to keep and share — no login required.',
    note:
      "What you don't get from the audit: a specific implementation plan. That is what Blueprint is for. The audit tells you what is worth fixing. Blueprint tells you exactly how AIOS will fix it.",
  },
  {
    id: 'discovery',
    n: '02',
    tag: 'Discovery',
    headline: 'We sit with you to understand the business before anything gets built.',
    body: `AIOS is not a template. It is a system built for the specific operations of your shop — and the only way to build that correctly is to understand your shop first. The Discovery call is that step. This is the gate before a Blueprint engagement starts.`,
    yourSide: [
      'Join a call with the founders. Walk through your tools, your clients, your team structure, your repeating workflows.',
      'Tell us the things the audit cannot ask: the client that always fires edge cases, the team member carrying three jobs, the platform that breaks every quarter.',
    ],
    ourSide: [
      'We listen, ask sharp questions, and build a picture of how your agency actually operates — the parts that show up on the audit and the parts that only operators know.',
      'We evaluate fit honestly. If AIOS is not the right call for your shop right now, we say so. No pitch, no follow-up sequence.',
    ],
    youGet:
      'A clear answer on whether AIOS makes sense for your business — and if it does, a shared understanding of your operations that becomes the foundation for the Blueprint.',
    note:
      'We do not build AIOS for shops we do not understand. This call is not a sales step. It is the diagnostic step. If you are not a fit, we tell you directly.',
  },
  {
    id: 'blueprint',
    n: '03',
    tag: 'Blueprint',
    headline: 'A written plan for your AIOS. No surprises before anything starts.',
    body: `After Discovery, the system goes to work evaluating and reasoning about your business. The output is a PDF Blueprint — a complete picture of your current-state operations, what AIOS will do about it, and what gets built first. This is a paid discovery engagement.`,
    yourSide: [
      'Review the Blueprint. Every section is written in plain language — no consulting jargon, no nine-page MSAs.',
      'Ask questions, push back, request clarifications. The Blueprint is your buy-or-don\'t decision document.',
    ],
    ourSide: [
      'Take roughly a week to evaluate what Discovery surfaced — your tools, your patterns, the workflows worth automating first.',
      'Produce a PDF that covers: current-state diagnosis (what is actually happening in your ops today), why your shop needs AIOS, what AIOS will do about it, what gets built first, and what the build will cost.',
    ],
    youGet:
      'A Blueprint PDF with full visibility into what AIOS will do, what gets built in what order, and what the build engagement costs. A decision you can make with confidence.',
    note:
      'The Blueprint is the only way to get a real build price. We cannot price something we have not diagnosed.',
  },
  {
    id: 'build',
    n: '04',
    tag: 'Build',
    headline: 'Your AIOS goes live. All four pillars online.',
    body: `Build is where AIOS comes to life in your stack. All four pillars activate: OPERATE runs your workflows inside your n8n. OBSERVE shows everything on opsradar.co/dashboard. BRAIN starts ingesting your data and building memory of how your shop works. GUARD watches the system and catches what breaks.`,
    yourSide: [
      'Confirm tool access and credentials. Nothing runs on our infrastructure.',
      'Choose how you want to operate it: we run it for you (managed), you run it with your team (self-serve), or both.',
    ],
    ourSide: [
      'Build workflows inside your n8n account — not ours, never ours.',
      'Activate OBSERVE on opsradar.co/dashboard so you see real status, real run counts, and real hours reclaimed from day one.',
      'Wire BRAIN to your data sources. It starts learning your shop immediately and gets sharper every week.',
      'Set GUARD to watch for silent failures: platform API changes, credential expirations, the things that break at 3 a.m. and compound by morning.',
    ],
    youGet:
      'A live AIOS — four pillars running, dashboard visible, system watching. Every workflow, every credential, every log lives in your accounts under your control from day one.',
    note:
      'You own all of it. Day one. If OpsRadar ever disappeared, nothing breaks. The code, the logic, the logs — yours.',
  },
]

type Concern = {
  id: string
  question: string
  answer: string
}

const CONCERNS: Concern[] = [
  {
    id: 'fit',
    question: 'What if we go through Discovery and we are not a fit?',
    answer:
      'We tell you directly — no follow-up sequence, no pitch. AIOS is built for agencies we understand. If the operations are too early-stage, too large, or just a bad match for the system, the honest answer is the right one. You walk away with a clearer picture of what you actually need.',
  },
  {
    id: 'blueprint-no-build',
    question: 'What if we get the Blueprint but decide not to build?',
    answer:
      'The Blueprint belongs to you. It is a diagnosis of your current-state ops and a written plan for what AIOS would do about it. You can use it to hire someone else, DIY it, or shelve it. There is no obligation to build after receiving a Blueprint.',
  },
  {
    id: 'ownership',
    question: 'What do we actually own after Build?',
    answer:
      'Everything. Workflows run inside your n8n account, on your credentials, connected to your tools. The OBSERVE dashboard reads your stack live — nothing sits in our database. If you stop working with OpsRadar, all four pillars keep running. BRAIN stays connected to your data. GUARD keeps watching. You or anyone you hire can maintain the system from that point.',
  },
  {
    id: 'managed-vs-selfserve',
    question: 'Can we run it ourselves without OpsRadar managing it?',
    answer:
      'Yes. Self-serve means your team owns the day-to-day — adding workflows, adjusting thresholds, reading OBSERVE. Managed means OpsRadar watches it, handles breakage, and adapts the system as your tools and team change. Both options start from the same Build. You choose how much you want us involved after go-live.',
  },
  {
    id: 'audit-only',
    question: 'What if we just want the audit and nothing else?',
    answer:
      'The audit is free and complete on its own. The report names the workflows worth automating first and puts dollar figures behind them. You can use that report however you want — share it with your team, take it to another vendor, or just file it. There is no follow-up pressure.',
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
      <StepsSection />
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
          From free audit to live{' '}
          <span className="text-[var(--color-primary)]">AIOS</span>{' '}
          in four steps.
        </h1>
        <p className="mt-6 max-w-2xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          Free at the front. Honest in the middle. Real ownership at the end.
          Here is what each step actually looks like — what happens, what you get, and what comes next.
        </p>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Steps — 4-step funnel with deep editorial content                           */
/* ─────────────────────────────────────────────────────────────────────────── */

function StepsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid lg:grid-cols-[220px_1fr] gap-12 lg:gap-16 items-start">

        {/* Sticky sidebar TOC */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <p className="text-label text-[var(--color-fg-subtle)] mb-5">Steps</p>
          <nav>
            <ol className="space-y-1">
              {STEPS.map((step) => (
                <li key={step.id}>
                  <a
                    href={`#${step.id}`}
                    className="group flex items-center gap-3 py-1.5 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)]"
                  >
                    <span className="font-mono text-caption text-[var(--color-fg-faint)] group-hover:text-[var(--color-fg-subtle)] w-6 shrink-0">
                      {step.n}
                    </span>
                    <span>{step.tag}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Step entries */}
        <div>
          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {STEPS.map((step) => (
              <li
                key={step.id}
                id={step.id}
                className="grid grid-cols-[auto_1fr] gap-8 md:gap-14 py-12 md:py-16 items-start scroll-mt-24"
              >
                {/* Step marker */}
                <div className="pt-1 w-14 shrink-0">
                  <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
                    — {step.n}
                  </p>
                </div>

                {/* Step content */}
                <div>
                  <p className="text-label text-[var(--color-primary)] mb-3">
                    {step.tag}
                  </p>
                  <h2 className="font-serif text-h2 leading-[1.15] tracking-[-0.02em] text-balance mb-6">
                    {step.headline}
                  </h2>
                  <p className="text-body-lg leading-[1.6] text-[var(--color-fg-muted)] mb-8 max-w-prose">
                    {step.body}
                  </p>

                  {/* Your side / Our side */}
                  <div className="grid sm:grid-cols-2 gap-8 mb-8">
                    <div>
                      <p className="text-label text-[var(--color-fg-subtle)] mb-3">Your side</p>
                      <ul className="space-y-2.5">
                        {step.yourSide.map((item, idx) => (
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
                      <p className="text-label text-[var(--color-fg-subtle)] mb-3">
                        {"OpsRadar’s side"}
                      </p>
                      <ul className="space-y-2.5">
                        {step.ourSide.map((item, idx) => (
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

                  {/* What you get */}
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-4">
                    <p className="text-label text-[var(--color-fg-subtle)] mb-2">What you walk away with</p>
                    <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                      {step.youGet}
                    </p>
                  </div>

                  {/* Note */}
                  {step.note && (
                    <p className="text-body-sm leading-[1.65] text-[var(--color-fg-subtle)] italic">
                      {step.note}
                    </p>
                  )}
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
            On ownership
          </p>
          <h2 className="font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance mb-5">
            You own all of it. Day one.
          </h2>
          <div className="space-y-4 max-w-3xl text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
            <p>
              Every workflow AIOS builds runs inside your n8n account, on credentials you control,
              connected to infrastructure you own. OBSERVE reads your stack live — nothing is cached
              in our database. BRAIN ingests your data into your environment.
            </p>
            <p>
              If OpsRadar ever disappeared, nothing breaks. The workflows keep running.
              GUARD keeps watching. You or anyone you hire can maintain the system from that point.
              The code, the logic, the logs — yours from the first day of Build.
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
          What agency founders ask before they start.
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
        <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.5rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          The audit is step one.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          13 questions. Three minutes. An AI-generated report on where your operations are bleeding hours
          and which workflows are worth automating first. Free, no card, no pitch.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <Link href="/audit">
              Start the audit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Talk to founders first
            </a>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          13 questions · Free · No card, no pitch · 3 minutes to the report.
        </p>
      </div>
    </section>
  )
}
