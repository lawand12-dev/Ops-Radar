import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "<npm>/components/ui/accordion";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";
import { StepsTOC } from "<npm>/components/marketing/steps-toc";

export const metadata: Metadata = {
  title: "How OpsRadar works — AI Operating System",
  description:
    "Connect 5 tools. Meet 28 named AI employees. Hire your own in plain English. Watch the company brain build itself under an earned-autonomy approval gate.",
  openGraph: {
    title: "How OpsRadar works — four steps, twenty minutes",
    description:
      "Connect. Meet your built-in workforce. Hire a custom AI employee. Approve, reject, watch the brain compound.",
    url: "https://www.opsradar.co/how-it-works",
    siteName: "OpsRadar",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "How it works — OpsRadar" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How OpsRadar works — four steps, twenty minutes",
    description:
      "Connect, meet the workforce, hire a custom AI employee, watch the brain compound under earned autonomy.",
    images: ["/og-image.png"],
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type Step = {
  id: string;
  n: string;
  tag: string;
  duration: string;
  headline: string;
  body: string;
  yourSide: string[];
  ourSide: string[];
  youGet: string;
  note?: string;
};

const STEPS: Step[] = [
  {
    id: "connect",
    n: "01",
    tag: "Connect",
    duration: "~5 minutes",
    headline: "Connect the tools you already use.",
    body: "Sign in. You see the integrations page. Click Stripe → OAuth in 4 clicks. Click HubSpot → OAuth in 4 clicks. Click ClickUp, Harvest, Gmail, Notion, Slack — whatever stack your business runs on. Composio handles every OAuth handshake. We never see your API keys.",
    yourSide: [
      "Click the integrations you use. Stripe + HubSpot + ClickUp + Harvest + Gmail + Notion + Slack is the common starter set.",
      "Approve each OAuth scope as it pops up — read scopes by default, write scopes per tool.",
    ],
    ourSide: [
      "Composio brokers the OAuth and holds the token. OpsRadar never stores customer API keys.",
      "Every read live-fetches from source — your client business data never lands in our database.",
      "25 integrations live today, growing toward Composio's full 500+ catalog.",
    ],
    youGet:
      "Your AI workforce now has the live data it needs to start working. No CSV uploads, no nightly ETL jobs, no syncing.",
    note: "Stripe, HubSpot, ClickUp, Harvest, Gmail, Notion, Slack, Calendly, Pipedrive, Apollo, QuickBooks, Google Calendar / Analytics / Ads, LinkedIn, Asana, Monday, Toggl, BambooHR, Gusto, Typeform, Intercom, Zendesk are live now.",
  },
  {
    id: "workforce",
    n: "02",
    tag: "Meet the workforce",
    duration: "Instant",
    headline:
      "28 named AI employees already work for you. They started the moment you signed in.",
    body: "💰 Riley already has access to your Stripe. 📐 Scott already has access to your Harvest. 📨 Cole already has access to your overdue invoices. None of them have done anything yet — they ship daily and weekly schedules. You can also run any of them on demand from the COO chat. Each has their own emoji, their own bio, their own page.",
    yourSide: [
      "Open /dashboard/agents to see the grid of 28 employees on day one.",
      "Click any one to read their bio, schedule, and which tools they're scoped to.",
      "Toggle the autonomy tier per tool — Ask / Auto / Off — if you want to override the defaults.",
    ],
    ourSide: [
      "11 named domain agents — Riley (Revenue), Cole (Collections), Scott (Scope), Devon (Delivery), Brian (Briefing), Penny (Profitability), Tia (Team), Grace (Growth), Renee (Renewals), Sam (Stack), Evan (Evaluator).",
      "17 toolkit specialists underneath them — Stripe Specialist, HubSpot Specialist, Harvest Specialist, and so on. They feed findings up to the named domain agents (orchestrator-worker pattern).",
      "Senior-COO operator judgment baked into every prompt — signals, thresholds, decision trees, verbatim conversation scripts.",
    ],
    youGet:
      "A full team running on day one. No build phase. No 30-day onboarding. No template configuration. They're hired the moment you are.",
    note:
      "The 28 ship the same for every customer. Your custom hires (step 3) are where the workforce becomes yours.",
  },
  {
    id: "hire",
    n: "03",
    tag: "Hire",
    duration: "~4 minutes",
    headline: "Describe a role. Sign the offer. They start tomorrow.",
    body: 'Open the Hire chat at /dashboard/hire. Tell us who you want: "I want a Bookkeeper named Sarah, every day at 8 AM, she pulls yesterday\'s Stripe charges and flags anything over $5,000 for my approval." We compile the spec — name, role, schedule, scoped tools, system prompt, first task on hire. You read it as an inline card. Click Hire. Sarah starts tomorrow at 8 AM.',
    yourSide: [
      'Describe the role in plain English. No JSON, no templates, no nodes.',
      "Read the spec card. Edit anything you want (system prompt, tools, schedule) before clicking Hire.",
      "Sarah appears in your sidebar under YOUR TEAM. Click her name → her own chat page opens. She greets you.",
    ],
    ourSide: [
      "Compile the spec from your description — name, schedule, tools, scope, first task, 30-50 line system prompt.",
      "Provision Sarah's row in custom_employees + register her cron on Trigger.dev.",
      "Sarah gets her own /dashboard/employees/sarah page, her own memory, her own approval queue inheritance.",
    ],
    youGet:
      "A custom AI employee, scoped to the tools you chose, running on the schedule you set. The first hire takes 4 minutes. Most customers spend the next 10 minutes hiring two more.",
  },
  {
    id: "approve",
    n: "04",
    tag: "Approve · learn · graduate",
    duration: "Forever",
    headline:
      "Earned autonomy. The workforce starts cautious. Graduates to fast as you build trust.",
    body: "Every time an employee wants to do something — send an email, create an invoice, update a deal, post in Slack — the first 30 times that action type fires, it shows up in your approval queue at /dashboard/actions. You read it, see exactly what it'll do, approve or reject. Reject something? OpsRadar learns the rule (Apprentice Mode). After 30+ approvals at >90% rate on a routine action type, that action graduates to Auto-with-notification. Your time stops being burned on the obvious yeses.",
    yourSide: [
      "Read the queue at /dashboard/actions. Approve, reject, or edit each proposed action with a reason.",
      "Reject anything. The reason you give becomes a permanent rule for that employee (Apprentice Mode).",
      "Trust accumulates per action-type, not globally. High-risk actions stay Ask forever, regardless of confidence.",
    ],
    ourSide: [
      "Classify every proposed action by risk tier: HIGH (Ask forever), MEDIUM (Ask → Auto-with-notify after earned trust), LOW (silent Auto).",
      "Track approve/reject/edit history per action type per employee. Graduate to Auto only after 30+ approvals at >90% rate on routine action types.",
      "Apprentice Mode: derive a generalizable rule from every rejection reason. Write it to the employee's permanent learned-rules brain prefix.",
    ],
    youGet:
      "Week 1: Sarah has written 14 Pattern Cards to Real P&L. Week 4: ~80 Pattern Cards, ~40 Decision Logs, ~12 Risks. Apprentice Mode has applied 22 of your rejections as permanent learned rules. Week 12: the brain knows your business. Every employee sounds like a member of your team, not like ChatGPT.",
    note:
      "Three things have to align in the same moment: the agent has to propose it, you have to see it, you have to click Approve. The product is structurally incapable of acting without you.",
  },
];

type Concern = {
  id: string;
  question: string;
  answer: string;
};

const CONCERNS: Concern[] = [
  {
    id: "rogue",
    question: "What stops an AI employee from going rogue?",
    answer:
      "Three locks. (1) Every billable action routes through /dashboard/actions before execution — agents are structurally incapable of acting without you on day one. (2) High-risk action types (firing a client, sending invoices, mass email) stay Ask forever, regardless of confidence — there is no threshold that unlocks them. (3) Routine actions only graduate to Auto-with-notify after 30+ of your approvals at >90% rate on that specific action type. Trust is earned per-type, not granted globally.",
  },
  {
    id: "ownership",
    question: "What do we actually own?",
    answer:
      "The company brain. Every agent writes findings into a versioned brain mirrored to YOUR Notion workspace. If OpsRadar disappeared tomorrow, your Notion still has every Pattern Card, every Decision Log entry, every Risk Register row your agents wrote — signed by author, dated, with commit messages. You can also download the full versioned brain as a markdown zip from /dashboard/brain/download at any time, on any tier.",
  },
  {
    id: "data",
    question: "Where does our client business data live?",
    answer:
      "In your connected tools — Stripe, HubSpot, ClickUp, Harvest. Every dashboard view live-fetches from source on every load. OpsRadar never persists your customer business data in its own database. Only computed metadata — agent actions, alert rules, briefings, learned rules, approval history — lives in OpsRadar's Postgres. This is a hard architectural rule, not a marketing promise.",
  },
  {
    id: "custom",
    question: "What if the 28 built-in agents don't cover what we need?",
    answer:
      "Hire a custom one (step 3). Plain English description, 4 minutes, ships tomorrow. Available on Growth ($499/mo) and above. Custom employees inherit the same earned-autonomy approval gate, write to the same company brain, and can be assigned managers + direct reports (org-chart delegation on Pro).",
  },
  {
    id: "tokens",
    question: "Will we get a surprise bill from token usage?",
    answer:
      "No. OpsRadar is structurally incapable of surprising you with a token bill. Flat tiers from $99/mo include all OpenAI / Anthropic / embedding tokens. The only meter past your cap is $0.05 per approved action — and that meter only moves on actions you clicked Approve on in /dashboard/actions. Reject it, the meter doesn't move. Three things have to align: agent proposes, you read, you approve.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/how-it-works" />

      <PageHeader />
      <StepsSection />
      <ArchitectureSection />
      <FourMinutePath />
      <OwnershipPanel />
      <ConcernsSection />
      <FinalCTA />

      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page header                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <header className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 pt-12 pb-16 md:pt-20 md:pb-20">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            How it works
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-5 text-balance max-w-[22ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Four steps. Twenty minutes. You have an{" "}
            <span className="text-[var(--color-primary)]">AI workforce</span>.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={280} offset={48}>
          <p className="mt-6 max-w-2xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
            Connect the tools you already use. Meet 28 named AI employees the
            moment you sign in. Hire your own in plain English. Approve, reject,
            watch the company brain compound under an earned-autonomy gate. The
            product is the demo.
          </p>
        </RevealOnScroll>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Steps — 4 step funnel with sticky TOC                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

function StepsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid lg:grid-cols-[220px_1fr] gap-12 lg:gap-16 items-start">
        <StepsTOC steps={STEPS.map(({ id, n, tag }) => ({ id, n, tag }))} />

        <div>
          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {STEPS.map((step) => (
              <li
                key={step.id}
                id={step.id}
                className="py-12 md:py-16 scroll-mt-24"
              >
                <RevealOnScroll delay={0} offset={40}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <span className="font-mono text-caption text-[var(--color-fg-faint)] tracking-[0.08em]">
                      {step.n}
                    </span>
                    <span className="text-[var(--color-border)]">·</span>
                    <p className="text-label uppercase text-[var(--color-primary)]">
                      {step.tag}
                    </p>
                    <span className="text-[var(--color-border)]">·</span>
                    <p className="text-caption text-[var(--color-fg-subtle)] font-mono tabular-nums">
                      {step.duration}
                    </p>
                  </div>

                  <h2
                    className="text-balance mb-5"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-h2)",
                      lineHeight: "var(--text-h2--line-height)",
                      letterSpacing: "var(--text-h2--letter-spacing)",
                      fontWeight: 500,
                    }}
                  >
                    {step.headline}
                  </h2>
                  <p className="text-body-lg leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
                    {step.body}
                  </p>

                  <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
                      <div className="p-5 md:p-6 bg-[var(--color-surface-sunken)]">
                        <p className="text-label uppercase text-[var(--color-fg-subtle)] mb-4">
                          Your side
                        </p>
                        <ul className="space-y-3">
                          {step.yourSide.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]"
                            >
                              <span className="text-[var(--color-fg-faint)] mt-0.5 shrink-0">
                                —
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-5 md:p-6 bg-[var(--color-surface-sunken)]">
                        <p className="text-label uppercase text-[var(--color-fg-subtle)] mb-4">
                          OpsRadar&rsquo;s side
                        </p>
                        <ul className="space-y-3">
                          {step.ourSide.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]"
                            >
                              <span className="text-[var(--color-fg-faint)] mt-0.5 shrink-0">
                                —
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 md:px-6 py-4">
                      <p className="text-label uppercase text-[var(--color-primary)] mb-1.5">
                        What you walk away with
                      </p>
                      <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                        {step.youGet}
                      </p>
                    </div>
                  </div>

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
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Architecture diagram                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

function ArchitectureSection() {
  const diagram = `You ──→ COO chat / Hire chat / per-employee chat
                           │
                           ▼
                    streamText loop
                           │
                           ▼
                  Composio tool call
                           │
                           ▼
                   Approval gate
                  (Ask / Auto / Off)
                           │
                           ▼
                   ┌───────┴───────┐
                   │               │
                Stripe        HubSpot   (and 23 more)
                  │               │
                  ▼               ▼
              [response]      [response]
                  │               │
                  └───────┬───────┘
                          │
                          ▼
                  Agent writes finding
                  to your company brain
                          │
                          ▼
                  ┌───────┴───────┐
                  │               │
        OpsRadar Postgres   Your Notion
            (versioned)       (mirror)`;

  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            What&rsquo;s running underneath
          </p>
          <h2
            className="mt-4 text-balance max-w-3xl"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            The architecture, in one diagram.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <pre
            className="mt-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 overflow-x-auto font-mono text-caption md:text-body-sm leading-[1.5] text-[var(--color-fg)]"
            aria-label="OpsRadar request architecture diagram"
          >
            {diagram}
          </pre>
          <p className="mt-5 text-body-sm leading-[1.65] text-[var(--color-fg-muted)] max-w-3xl">
            Every read live-fetches from source. Every write routes through the
            approval gate. Every finding is signed by the agent and written to
            two places &mdash; OpsRadar Postgres (versioned, immutable) and your
            Notion (your copy, your forever).
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  The 4-minute path walkthrough                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function FourMinutePath() {
  const path: Array<{ n: string; what: string; time: string }> = [
    { n: "01", what: "Sign up — email + password. No credit card.", time: "15 sec" },
    { n: "02", what: "Connect Stripe — OAuth, 4 clicks.", time: "45 sec" },
    { n: "03", what: "Connect HubSpot — OAuth, 4 clicks.", time: "45 sec" },
    {
      n: "04",
      what:
        "Open /dashboard/hire. Describe your first AI employee in plain English.",
      time: "60 sec",
    },
    { n: "05", what: "Read the spec card. Click Hire.", time: "15 sec" },
    {
      n: "06",
      what:
        "Click their name in the sidebar. Chat with them. They greet you.",
      time: "30 sec",
    },
    {
      n: "07",
      what: "That's it. They start working on their cron tomorrow.",
      time: "0 sec",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            From sign-in to first hire
          </p>
          <h2
            className="mt-4 text-balance max-w-3xl"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            The first four minutes, click by click.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <ol className="mt-12 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {path.map((p) => (
              <li
                key={p.n}
                className="grid grid-cols-[3rem_1fr_5rem] md:grid-cols-[4rem_1fr_6rem] gap-4 md:gap-6 py-4 md:py-5 items-baseline"
              >
                <span className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
                  {p.n}
                </span>
                <p className="text-body-sm md:text-body leading-[1.6] text-[var(--color-fg)]">
                  {p.what}
                </p>
                <p className="font-mono text-caption md:text-body-sm text-[var(--color-fg-subtle)] tabular-nums text-right">
                  {p.time}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-body-sm leading-[1.65] text-[var(--color-fg-muted)] max-w-2xl">
            <span className="text-[var(--color-fg)] font-medium">
              Total time: 3 minutes 30 seconds.
            </span>{" "}
            Most customers spend the next 10 minutes hiring two more employees.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Ownership panel                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

function OwnershipPanel() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <RevealOnScroll delay={0} offset={40}>
          <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
            <p className="text-label uppercase text-[var(--color-primary)] mb-4">
              On ownership
            </p>
            <h2
              className="text-balance mb-5"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-h1)",
                lineHeight: "var(--text-h1--line-height)",
                letterSpacing: "var(--text-h1--letter-spacing)",
                fontWeight: 500,
              }}
            >
              The brain is the asset. It&rsquo;s yours.
            </h2>
            <div className="space-y-4 max-w-3xl text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
              <p>
                Every AI employee writes findings to a versioned company brain
                &mdash; Pattern Cards, Decision Log, Risk Register, Real
                P&amp;L, KPI Snapshots, Client Profiles. Every entry is signed
                by the agent that wrote it, with a timestamp and a commit
                message. The whole brain is mirrored to your Notion workspace.
              </p>
              <p>
                If OpsRadar disappeared tomorrow, your Notion still has
                everything. You can also download the full versioned brain as
                a markdown zip from /dashboard/brain/download at any time, on
                any tier. The brain is the artifact you sell when you exit
                &mdash; documented agencies sell at 8&ndash;12× EBITDA vs
                5&ndash;9× undocumented.
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Realistic concerns (Accordion)                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function ConcernsSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)] mb-4">
            Realistic concerns
          </p>
          <h2
            className="text-balance mb-12"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            What founders ask before they start.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <Accordion type="multiple" className="border-y border-[var(--color-border)]">
            {CONCERNS.map((c) => (
              <AccordionItem key={c.id} value={c.id}>
                <AccordionTrigger
                  className="py-6"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-h3)",
                    lineHeight: "var(--text-h3--line-height)",
                    letterSpacing: "var(--text-h3--letter-spacing)",
                    fontWeight: 500,
                  }}
                >
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
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Final CTA                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            Start here
          </p>
          <h2
            className="mt-5 text-balance"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Get on the list.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            OpsRadar is in private beta. Join the waitlist for when the front
            door opens &mdash; or talk to the founder for 20 minutes if
            you&rsquo;d rather see it run on your stack first.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/waitlist">
                Coming soon &mdash; join waitlist
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to the founder &mdash; 20 min
              </a>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
            Private beta &middot; Limited spots &middot; Brain stays in your Notion
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
