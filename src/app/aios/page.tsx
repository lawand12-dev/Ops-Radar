import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export const metadata: Metadata = {
  title: 'AIOS — What the system is | OpsRadar',
  description:
    'AIOS is the AI Operating System that runs inside your agency. OPERATE does the work. OBSERVE surfaces every tool. BRAIN answers your questions. GUARD watches while you sleep.',
  openGraph: {
    title: 'AIOS — What the system is | OpsRadar',
    description:
      'AIOS is the AI Operating System that runs inside your agency. OPERATE does the work. OBSERVE surfaces every tool. BRAIN answers your questions. GUARD watches while you sleep.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AIOS — OpsRadar' }],
  },
  twitter: {
    title: 'AIOS — What the system is | OpsRadar',
    description:
      'AIOS is the AI Operating System that runs inside your agency. OPERATE does the work. OBSERVE surfaces every tool. BRAIN answers your questions. GUARD watches while you sleep.',
    images: ['/og-image.png'],
  },
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export default function AiosPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/aios" />

      <PageHeader />
      <PillarOperate />
      <PillarObserve />
      <PillarBrain />
      <PillarGuard />
      <SystemSection />
      <BuildProcessSection />
      <FinalCTA />

      <SiteFooter />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page header                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 pt-14 pb-20 md:pt-20 md:pb-28">
        <p className="text-label text-[var(--color-fg-subtle)]">Product · AIOS</p>
        <h1 className="mt-5 font-serif text-[clamp(3rem,5vw+0.5rem,5.5rem)] leading-[1.02] tracking-[-0.03em] text-[var(--color-fg)]">
          AIOS
        </h1>
        <p className="mt-7 max-w-2xl text-body-lg leading-[1.6] text-[var(--color-fg-muted)]">
          AIOS is the category — the AI Operating System that runs inside an agency.
          Not another automation tool bolted to the side. The system that connects
          every tool you already pay for, runs the work that lives in your team&apos;s heads,
          and watches the whole thing overnight.
        </p>
        <p className="mt-4 max-w-2xl text-body leading-[1.6] text-[var(--color-fg-subtle)]">
          Four parts. One platform. Built specifically for how your agency operates.
        </p>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared pillar layout                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function PillarLayout({
  name,
  title,
  body,
  children,
}: {
  name: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[0.65fr_1.35fr] gap-12 lg:gap-20 items-start">
          {/* Left column — pillar identity */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-caption tracking-[0.22em] text-[var(--color-primary)]">
              {name}
            </p>
            <h2 className="mt-5 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              {title}
            </h2>
            <p className="mt-5 text-body leading-[1.65] text-[var(--color-fg-muted)] max-w-sm">
              {body}
            </p>
          </div>

          {/* Right column — deep content */}
          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  OPERATE                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const OPERATE_WORKFLOWS = [
  {
    name: 'Client onboarding',
    detail: 'Intake form → contract → asset request → kick-off brief — sequenced automatically.',
  },
  {
    name: 'Monthly reporting',
    detail: 'Pulls live data from every connected platform, assembles the deck, delivers it.',
  },
  {
    name: 'Lead routing',
    detail: 'New enquiry lands, gets scored, assigned, and followed up without anyone touching it.',
  },
  {
    name: 'Invoice follow-up',
    detail: 'Overdue by N days? The sequence runs. No one needs to remember to chase it.',
  },
  {
    name: 'Campaign pacing alerts',
    detail: 'Budget burns above threshold → Slack alert with the platform, campaign, and delta.',
  },
  {
    name: 'Scope-change logging',
    detail: 'Every out-of-scope request captured, attributed to the client, and surfaced in the recap.',
  },
]

function PillarOperate() {
  return (
    <PillarLayout
      name="OPERATE"
      title="The engine running your agency."
      body="Automations doing the manual work that currently lives in your team's heads. Reporting, onboarding, lead routing, follow-ups — running quietly in the background, under your control, on your accounts."
    >
      <div className="space-y-4">
        <p className="text-body-sm text-[var(--color-fg-subtle)] mb-8">
          OPERATE is where the workflows live. Each one is built for how your specific
          agency operates — not from a template. These are the categories we build most often:
        </p>

        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {OPERATE_WORKFLOWS.map((w) => (
            <li key={w.name} className="grid grid-cols-[1fr_1.6fr] gap-8 py-5">
              <p className="text-body-sm font-medium text-[var(--color-fg)]">{w.name}</p>
              <p className="text-body-sm leading-[1.6] text-[var(--color-fg-muted)]">{w.detail}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">
            Ownership stays with you.
          </p>
          <p className="mt-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
            Every workflow runs on your accounts, with your credentials, on your infrastructure.
            If OpsRadar ever disappeared, nothing breaks. OPERATE is not a hosted service —
            it is code that runs in your environment and belongs to your agency from day one.
          </p>
        </div>
      </div>
    </PillarLayout>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  OBSERVE                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const OBSERVE_TOOLS = [
  { name: 'Stripe / Chargebee', role: 'Revenue, MRR, churn' },
  { name: 'Meta Ads', role: 'Spend, ROAS, pacing, MER' },
  { name: 'Google Ads', role: 'Spend, CPC, Quality Score' },
  { name: 'Google Analytics 4', role: 'Traffic, conversions, sessions' },
  { name: 'HubSpot / Pipedrive', role: 'Pipeline, deal velocity, CRM' },
  { name: 'Klaviyo', role: 'Email revenue, list health, flows' },
  { name: 'Ahrefs / GSC / Semrush', role: 'Rank, organic traffic, AIO presence' },
  { name: 'Slack', role: 'Workflow alerts, GUARD pings, digest delivery' },
  { name: 'Xero / QuickBooks', role: 'Invoices, accounts receivable, margin' },
  { name: 'TikTok Ads / LinkedIn Ads', role: 'Spend, creatives, pacing' },
]

function PillarObserve() {
  return (
    <PillarLayout
      name="OBSERVE"
      title="Every tool, one screen."
      body="Revenue, ad spend, leads, deliverables, workflow status — every tool your agency already pays for, surfaced in one dashboard. Your agency at a glance, every morning, without opening nine tabs."
    >
      <div className="space-y-8">
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          OBSERVE reads from the tools you already use. It does not replace them — it
          surfaces them. A partial list of what gets connected:
        </p>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="grid grid-cols-[1fr_1.2fr] border-b border-[var(--color-border)] px-5 py-3">
            <p className="text-label text-[var(--color-fg-subtle)]">Tool</p>
            <p className="text-label text-[var(--color-fg-subtle)]">What gets surfaced</p>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {OBSERVE_TOOLS.map((t) => (
              <li key={t.name} className="grid grid-cols-[1fr_1.2fr] gap-4 px-5 py-3.5">
                <p className="text-body-sm font-medium text-[var(--color-fg)]">{t.name}</p>
                <p className="text-body-sm text-[var(--color-fg-muted)]">{t.role}</p>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-[var(--color-border)]">
            <p className="text-caption text-[var(--color-fg-subtle)]">
              Most tools your agency already runs. Exact set confirmed during discovery.
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">
            Data is read live. Never stored here.
          </p>
          <p className="mt-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
            OpsRadar does not persist client business data in its database. Dashboards
            pull live from the source on every load. Your data stays in your accounts.
          </p>
        </div>
      </div>
    </PillarLayout>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  BRAIN                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const BRAIN_EXAMPLES = [
  { q: 'Why was ROAS down on Meta last week?', a: 'Surfaces the campaigns, the creative fatigue signal, and the spend delta — no digging.' },
  { q: 'Which client is most at-risk of churn right now?', a: 'Pulls NPS trend, last invoice date, recent Slack mentions, and deliverable velocity.' },
  { q: 'What did we spend on Google Ads in Q1 vs Q2?', a: 'Compares across both periods with the delta and top-spend campaigns named.' },
  { q: 'Show me every workflow that ran in the last 24 hours.', a: 'Execution log, status, and any exceptions — in a single reply.' },
]

function PillarBrain() {
  return (
    <PillarLayout
      name="BRAIN"
      title="The AI that knows your business."
      body="An LLM lives inside your dashboard. It knows your tools, your history, your patterns. Ask anything in plain English. It does not hallucinate generic answers — it reads your actual data."
    >
      <div className="space-y-8">
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          BRAIN is not a generic chatbot. It is scoped to your agency — your connected
          tools, your workflow history, your client data. Examples of questions it
          answers directly:
        </p>

        <ul className="space-y-4">
          {BRAIN_EXAMPLES.map((ex) => (
            <li
              key={ex.q}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6"
            >
              <p className="font-mono text-body-sm text-[var(--color-fg)] leading-[1.5]">
                &ldquo;{ex.q}&rdquo;
              </p>
              <p className="mt-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                → {ex.a}
              </p>
            </li>
          ))}
        </ul>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">
            Gets sharper every week.
          </p>
          <p className="mt-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
            The operational knowledge that lives in your team&apos;s heads — how clients like
            to be communicated with, what breaks on Monday mornings, which approvals
            need a human — all of it captured, structured, and permanent. When someone
            leaves, nothing is lost. When something breaks, BRAIN already knows the pattern.
          </p>
        </div>
      </div>
    </PillarLayout>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  GUARD                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const GUARD_SCENARIOS = [
  {
    trigger: 'Ad platform pushes a breaking API change at 2 a.m.',
    response: 'GUARD detects the degraded workflow before the Monday recap runs. You receive an alert with the workflow name and the exception. The recap either runs on the fallback or fires the fix.',
  },
  {
    trigger: 'A campaign goes 40% over its daily budget cap.',
    response: 'Pacing alert fires to Slack within minutes with the platform, campaign, spend delta, and the person accountable. No one finds out on a Friday client call.',
  },
  {
    trigger: 'A workflow runs 0 times in a 24-hour window when it should run hourly.',
    response: 'Silence is treated as failure. GUARD flags silent workflows before the downstream consequence — a missed follow-up, an unsent invoice, a stale report.',
  },
  {
    trigger: 'A key integration credential expires.',
    response: 'GUARD surfaces the expiry before the first workflow failure, not after. The fix is scheduled, not reactive.',
  },
]

function PillarGuard() {
  return (
    <PillarLayout
      name="GUARD"
      title="The system watching while you sleep."
      body="Silent failures caught before they cost you. Ad platforms push breaking changes without notice. Workflows degrade without anyone seeing. GUARD watches the whole system and routes the fix before you do."
    >
      <div className="space-y-4">
        <p className="text-body-sm text-[var(--color-fg-subtle)] mb-8">
          GUARD runs permanently. It treats silence the same as failure — a workflow
          that should run and does not is a problem just as much as a workflow that throws
          an error. These are the scenarios GUARD was built for:
        </p>

        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {GUARD_SCENARIOS.map((s) => (
            <li key={s.trigger} className="py-6 space-y-2">
              <div className="flex items-start gap-3">
                <Badge variant="warn" dot>Trigger</Badge>
              </div>
              <p className="text-body-sm font-medium text-[var(--color-fg)] leading-[1.5] pl-0.5">
                {s.trigger}
              </p>
              <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)] pl-0.5">
                {s.response}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">
            Proactive, not reactive.
          </p>
          <p className="mt-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
            Most agencies find out something broke when a client asks about it. GUARD
            inverts that. The monitoring is permanent and continuous — not a weekly
            manual check, not a human eyeballing a dashboard. GUARD is the reason OPERATE
            stays reliable as your agency scales.
          </p>
        </div>
      </div>
    </PillarLayout>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  System — how the four pillars connect                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const SYSTEM_FLOW = [
  {
    from: 'OPERATE',
    arrow: '→',
    to: 'OBSERVE',
    description: 'OPERATE runs the work. OBSERVE surfaces the results — every workflow execution, every metric it produces, visible without opening a tool.',
  },
  {
    from: 'OBSERVE',
    arrow: '→',
    to: 'BRAIN',
    description: 'OBSERVE aggregates the data. BRAIN interprets it — answering questions in plain English, connecting patterns across platforms, explaining what happened.',
  },
  {
    from: 'BRAIN',
    arrow: '→',
    to: 'GUARD',
    description: 'BRAIN knows the pattern of how the system should behave. GUARD uses that knowledge to detect when something deviates before downstream damage occurs.',
  },
  {
    from: 'GUARD',
    arrow: '→',
    to: 'OPERATE',
    description: 'When GUARD catches a failure, OPERATE already has the remediation workflow. The loop closes without a human in the middle.',
  },
]

function SystemSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="max-w-2xl mb-14">
          <p className="text-label text-[var(--color-fg-subtle)]">The system</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            Four parts that run as one.
          </h2>
          <p className="mt-5 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl">
            Each pillar does a specific job. The value of AIOS is how they hand off to
            each other — a closed loop, running continuously, without a human coordinating it.
          </p>
        </div>

        <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {SYSTEM_FLOW.map((step) => (
            <li
              key={step.from}
              className="grid grid-cols-[auto_1fr] gap-8 md:gap-14 py-8 md:py-10 items-start"
            >
              <div className="flex items-center gap-2 pt-0.5 font-mono text-caption tracking-[0.18em] text-[var(--color-primary)] whitespace-nowrap">
                {step.from}
                <span className="text-[var(--color-fg-subtle)]">{step.arrow}</span>
                {step.to}
              </div>
              <p className="text-body leading-[1.65] text-[var(--color-fg-muted)] max-w-2xl">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Build process — brief, funnel summary                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function BuildProcessSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12 lg:gap-20 items-start">
          <div>
            <p className="text-label text-[var(--color-fg-subtle)]">How AIOS gets built</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Call. Discovery. Blueprint. Build.
            </h2>
          </div>

          <div className="space-y-6">
            <p className="text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
              AIOS starts with a conversation — not a form. A 30-minute call where both
              sides decide if the system belongs at your agency. If it does, we go deep
              on how your agency actually works before a single workflow is written.
              Discovery produces a blueprint — a written plan naming what is happening
              to your operations today and what AIOS will do about it. If you proceed,
              OPERATE, OBSERVE, BRAIN, and GUARD go live on your accounts in the order
              that delivers the most leverage first.
            </p>
            <p className="text-body leading-[1.65] text-[var(--color-fg-muted)]">
              We do not build for agencies we do not understand. The Discovery step is
              not skippable. The Blueprint is a buy-or-don&apos;t decision with full
              visibility — no surprises.
            </p>

            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-primary)] hover:text-[var(--color-fg)] transition-colors"
            >
              See the full build process
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Final CTA                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
        <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
        <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance text-[var(--color-fg)]">
          Talk to us about your AIOS.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          A 30-minute call. We listen to how your agency runs, ask the questions only
          operators would ask, and tell you on the call whether AIOS belongs at your agency.
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
              Try the audit
            </Link>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          30 minutes · No pitch · We tell you if it&apos;s not a fit
        </p>
      </div>
    </section>
  )
}
