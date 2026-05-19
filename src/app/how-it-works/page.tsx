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
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'
import { StepsTOC } from '<npm>/components/marketing/steps-toc'

export const metadata: Metadata = {
  title: 'How it works — From first call to your AI COO going live',
  description:
    'Four steps from call to a live AI COO watching your agency 24/7. What happens in each one, how long it takes, what it costs, and what you walk away with.',
  openGraph: {
    title: 'How it works — Call to live AI COO in four steps',
    description:
      'A 30-minute call, a one-week Discovery, a written Blueprint, then your AI COO goes live. Here is exactly what each step costs and what you get.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How it works — OpsRadar' }],
  },
  twitter: {
    title: 'How it works — Call to live AI COO in four steps',
    description:
      'A 30-minute call, a one-week Discovery, a written Blueprint, then your AI COO goes live. Here is exactly what each step costs and what you get.',
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
    id: 'call',
    n: '01',
    tag: 'Call',
    headline: 'We talk. No pitch.',
    body: `A 30-minute conversation. You explain how your agency runs. We listen and ask the questions only operators would ask. By the end of the call, both sides know if AI COO belongs at your agency.`,
    yourSide: [
      'Walk us through your tools, your clients, your team structure, your repeating workflows.',
      'Tell us the things no questionnaire can ask: the client that always fires edge cases, the team member carrying three jobs, the platform that breaks every quarter.',
    ],
    ourSide: [
      'We listen, ask sharp questions, and build a picture of how your agency actually operates — the parts that are visible and the parts that only operators know.',
      'We evaluate fit honestly. If AI COO is not the right call for your agency right now, we say so. No pitch, no follow-up sequence.',
    ],
    youGet:
      'A clear yes-or-no on fit. If we are not the right system for you, we say so on the call.',
    note:
      'Skip the call if you want a number first: the 3-minute audit on the site returns a real dollar estimate of what your agency is leaking. It is the same diagnostic the AI COO runs on every prospect — just compressed into seven questions.',
  },
  {
    id: 'discovery',
    n: '02',
    tag: 'Discovery',
    headline: 'We go deep on the business before anything gets built.',
    body: `AI COO is not a template. It is a system built for the specific operations of your agency — and the only way to build that correctly is to understand your agency first. If the call confirms a fit, we move into discovery. This is the gate before a Blueprint engagement starts.`,
    yourSide: [
      'Complete structured forms about your tools, workflows, clients, and recurring patterns.',
      'Join working sessions where we map the things that only insiders know.',
    ],
    ourSide: [
      'We evaluate and reason through everything Discovery surfaces — your tools, your patterns, the workflows worth automating first.',
      'We do not build AI COO for agencies we do not understand. We take roughly a week to reason through what we learn before writing anything down.',
    ],
    youGet:
      'A shared understanding of your operations that becomes the foundation for the Blueprint.',
    note:
      'We do not build AI COO for agencies we do not understand. Discovery is not a sales step — it is the diagnostic step. If you are not a fit, we tell you directly.',
  },
  {
    id: 'blueprint',
    n: '03',
    tag: 'Blueprint',
    headline: 'A written plan for your AI COO. No surprises before anything starts.',
    body: `After Discovery, the system goes to work evaluating and reasoning about your business. The output is a PDF Blueprint — a complete picture of your current-state operations, what AI COO will do about it, and what gets built first. This is a paid discovery engagement.`,
    yourSide: [
      'Review the Blueprint. Every section is written in plain language — no consulting jargon, no nine-page MSAs.',
      'Ask questions, push back, request clarifications. The Blueprint is your buy-or-don\'t decision document.',
    ],
    ourSide: [
      'Take roughly a week to evaluate what Discovery surfaced — your tools, your patterns, the workflows worth automating first.',
      'Produce a PDF that covers: current-state diagnosis (what is actually happening in your ops today), why your agency needs AI COO, what AI COO will do about it, what gets built first, and what the build will cost.',
    ],
    youGet:
      'A Blueprint PDF with full visibility into what AI COO will do, what gets built in what order, and what the build engagement costs. A decision you can make with confidence.',
    note:
      'The Blueprint is the only way to get a real build price. We cannot price something we have not diagnosed.',
  },
  {
    id: 'build',
    n: '04',
    tag: 'Build',
    headline: 'Your AI COO goes live. All four pillars online.',
    body: `Build is where AI COO comes to life in your stack. All four pillars activate: OPERATE runs your workflows on your accounts. OBSERVE shows everything on opsradar.co/dashboard — revenue, ad spend, leads, workflow status, hours reclaimed. BRAIN starts ingesting your data and building memory of how your agency works. GUARD watches the system and catches what breaks.`,
    yourSide: [
      'Confirm tool access and credentials. Nothing runs on our infrastructure.',
      'Choose how you want to operate it: we run it for you (managed), you run it with your team (self-serve), or both.',
    ],
    ourSide: [
      'Build workflows on your accounts — not ours, never ours.',
      'Activate OBSERVE on opsradar.co/dashboard so you see real status, real run counts, and real hours reclaimed from day one.',
      'Wire BRAIN to your data sources. It starts learning your agency immediately and gets sharper every week.',
      'Set GUARD to watch for silent failures: connector drift, credential expirations, the things that break at 3 a.m. and compound by morning.',
    ],
    youGet:
      'A live AI COO — four pillars running, every client health-scored every week, alerts firing in real time. Subscription tier kicks in here: Starter ($750/mo), Growth ($1,500/mo, most popular), Pro ($3,000/mo with agentic actions), or Fractional Operator ($1,200/mo + $300/agency for partners).',
    note:
      'Your data stays in your tools — HubSpot, ClickUp, Harvest, Stripe. OpsRadar never writes your client business data to its own database. Revoke access in one click any time.',
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
      'We tell you directly — no follow-up sequence, no pitch. AI COO is built for agencies we understand. If the operations are too early-stage, too large, or just a bad match for the system, the honest answer is the right one. You walk away with a clearer picture of what you actually need.',

  },
  {
    id: 'blueprint-no-build',
    question: 'What if we get the Blueprint but decide not to build?',
    answer:
      'The Blueprint belongs to you. It is a diagnosis of your current-state ops and a written plan for what AI COO would do about it. You can use it to hire someone else, DIY it, or shelve it. There is no obligation to build after receiving a Blueprint.',
  },
  {
    id: 'ownership',
    question: 'What do we actually own after Build?',
    answer:
      'Everything. Workflows run on your accounts, on your credentials, connected to your tools. The OBSERVE dashboard reads your stack live — nothing sits in our database. If you stop working with OpsRadar, all four pillars keep running. BRAIN stays connected to your data. GUARD keeps watching. You or anyone you hire can maintain the system from that point.',
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
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label text-[var(--color-fg-subtle)]">How it works</p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1 className="mt-5 text-balance" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-hero)", lineHeight: "var(--text-hero--line-height)", letterSpacing: "var(--text-hero--letter-spacing)", fontWeight: 500 }}>
            From first call to live{' '}
            <span className="text-[var(--color-primary)]">AI COO</span>{' '}
            in four steps.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={280} offset={48}>
          <p className="mt-6 max-w-2xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
            A 30-minute call this week, a Discovery week, a written Blueprint, then your AI COO goes live &mdash; typical agencies are running inside 30 days. Here is exactly what each step involves, what you get, and what comes next.
          </p>
        </RevealOnScroll>
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

        {/* Sticky sidebar TOC — active state tracks scroll position */}
        <StepsTOC steps={STEPS.map(({ id, n, tag }) => ({ id, n, tag }))} />

        {/* Step entries */}
        <div>
          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {STEPS.map((step) => (
              <li
                key={step.id}
                id={step.id}
                className="py-12 md:py-16 scroll-mt-24"
              >
                <RevealOnScroll delay={0} offset={40}>
                  {/* Step identifier row */}
                  <div className="flex items-center gap-2.5 mb-5">
                    <span className="font-mono text-caption text-[var(--color-fg-faint)] tracking-[0.08em]">
                      {step.n}
                    </span>
                    <span className="text-[var(--color-border)]">·</span>
                    <p className="text-label text-[var(--color-primary)]">{step.tag}</p>
                  </div>

                  {/* Headline + body */}
                  <h2 className="text-balance mb-5" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2)", lineHeight: "var(--text-h2--line-height)", letterSpacing: "var(--text-h2--letter-spacing)", fontWeight: 500 }}>
                    {step.headline}
                  </h2>
                  <p className="text-body-lg leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
                    {step.body}
                  </p>

                  {/* Your side / Our side — contained in a surface panel */}
                  <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
                      <div className="p-5 md:p-6 bg-[var(--color-surface-sunken)]">
                        <p className="text-label text-[var(--color-fg-subtle)] mb-4">Your side</p>
                        <ul className="space-y-3">
                          {step.yourSide.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                              <span className="text-[var(--color-fg-faint)] mt-0.5 shrink-0">—</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-5 md:p-6 bg-[var(--color-surface-sunken)]">
                        <p className="text-label text-[var(--color-fg-subtle)] mb-4">{"OpsRadar’s side"}</p>
                        <ul className="space-y-3">
                          {step.ourSide.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                              <span className="text-[var(--color-fg-faint)] mt-0.5 shrink-0">—</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {/* What you get — accent footer inside the panel */}
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 md:px-6 py-4">
                      <p className="text-label text-[var(--color-primary)] mb-1.5">What you walk away with</p>
                      <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                        {step.youGet}
                      </p>
                    </div>
                  </div>

                  {/* Note — subtle callout */}
                  {step.note && (
                    <div className="mt-4 flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-subtle)]">
                      <span className="shrink-0 mt-0.5">↳</span>
                      <p>{step.note}</p>
                    </div>
                  )}
                </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
        <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
          <p className="text-label text-[var(--color-primary)] mb-4">
            On ownership
          </p>
          <h2 className="text-balance mb-5" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1)", lineHeight: "var(--text-h1--line-height)", letterSpacing: "var(--text-h1--letter-spacing)", fontWeight: 500 }}>
            You own all of it. Day one.
          </h2>
          <div className="space-y-4 max-w-3xl text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
            <p>
              Every workflow AI COO builds runs on your accounts, on credentials you control,
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
        </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] mb-4">Realistic concerns</p>
          <h2 className="text-balance mb-12" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1)", lineHeight: "var(--text-h1--line-height)", letterSpacing: "var(--text-h1--letter-spacing)", fontWeight: 500 }}>
            What agency founders ask before they start.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
        <Accordion type="multiple" className="border-y border-[var(--color-border)]">
          {CONCERNS.map((c) => (
            <AccordionItem key={c.id} value={c.id}>
              <AccordionTrigger className="py-6" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h3)", lineHeight: "var(--text-h3--line-height)", letterSpacing: "var(--text-h3--letter-spacing)", fontWeight: 500 }}>
                {c.question}
              </AccordionTrigger>
              <AccordionContent className="text-body leading-[1.7]">
                {c.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        </RevealOnScroll>
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
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
          <h2
            className="mt-5 text-balance"
            style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-hero)", lineHeight: "var(--text-hero--line-height)", letterSpacing: "var(--text-hero--letter-spacing)", fontWeight: 500 }}
          >
            The call is step one.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            A 30-minute call. We listen to how your agency runs, ask the questions
            only operators would ask, and tell you on the call whether AI COO
            belongs at your agency.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a 30-min call with the founder
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
  )
}
