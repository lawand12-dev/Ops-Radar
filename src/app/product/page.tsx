import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Product — OpsRadar AI Operating System",
  description:
    "AI employees + company brain in your Notion + every integration you use. One workspace replaces 10 AI tools. Apprentice Mode learns from every \"no\".",
  openGraph: {
    title: "Your AI workforce builds the company brain you exit on.",
    description:
      "28 named specialists run on your stack. They write what they learn into a versioned brain mirrored to your Notion. Approval-gated by default, earned-autonomy as trust accumulates.",
    url: "https://www.opsradar.co/product",
    siteName: "OpsRadar",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Product" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your AI workforce builds the company brain you exit on.",
    description:
      "28 named AI employees. Versioned company brain mirrored to your Notion. Earned autonomy, no token billing.",
    images: ["/og-image.png"],
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const NAMED_AGENTS: Array<{ emoji: string; name: string; role: string }> = [
  { emoji: "💰", name: "Riley", role: "Revenue Analyst" },
  { emoji: "📨", name: "Cole", role: "Collections Lead" },
  { emoji: "📐", name: "Scott", role: "Scope Watchdog" },
  { emoji: "🚚", name: "Devon", role: "Delivery Manager" },
  { emoji: "📰", name: "Brian", role: "Daily Briefer" },
  { emoji: "📊", name: "Penny", role: "Profitability Analyst" },
  { emoji: "👥", name: "Tia", role: "Team Lead" },
  { emoji: "📈", name: "Grace", role: "Growth Strategist" },
  { emoji: "🔁", name: "Renee", role: "Renewals Lead" },
  { emoji: "🧰", name: "Sam", role: "Stack Auditor" },
  { emoji: "🧐", name: "Evan", role: "Evaluator" },
];

const BRAIN_LOCATIONS: Array<{ where: string; body: string }> = [
  {
    where: "At OpsRadar",
    body: "3-table versioned Postgres (documents, immutable versions, commits). Curated paths get pgvector embeddings so the COO can semantic-search across them. Everything else stays markdown-only.",
  },
  {
    where: "In your Notion",
    body: "Every brain write is mirrored to a corresponding Notion page in your workspace. You can read it on Notion mobile at 3 AM with no OpsRadar login.",
  },
  {
    where: "At /dashboard/brain/download",
    body: "The full versioned brain, exportable as a markdown zip, any time, on any tier.",
  },
];

const HIRE_STEPS: Array<{ n: string; body: string }> = [
  { n: "01", body: "Open /dashboard/hire and describe the role. Plain English." },
  { n: "02", body: "We compile the spec — name, role, schedule, scoped tools, system prompt, first task. You read it as a card." },
  { n: "03", body: "Click Hire. Sarah starts running tomorrow at 8 AM." },
  { n: "04", body: "Sarah has her own chat page at /dashboard/employees/sarah. Talk to her like a teammate. She remembers." },
];

const BRAIN_KNOWS: string[] = [
  "Every Stripe transaction Riley has looked at, with the margin context she derived",
  "Every overdue invoice and Cole's notes on the customer payment pattern",
  "Every scope risk Scott flagged, with the Harvest hours that triggered it",
  "Every decision YOU made in the COO chat — recorded as a Decision Log entry, signed by you",
  "Every rejection you gave an AI employee — recorded as a Pattern Card and applied permanently (see: Apprentice Mode)",
];

const DIFFERENTIATORS: Array<{
  n: string;
  title: string;
  pitch: string;
  body: string;
  example?: { day1: string; rest: string };
}> = [
  {
    n: "01",
    title: "Apprentice Mode",
    pitch: "Your AI workforce gets smarter every time you say \"no.\"",
    body: "Every time you reject an action, OpsRadar derives a generalizable rule from your reason and writes it to that employee's permanent learned-rules brain prefix. The next time Sarah is about to do the thing you didn't want, she reads the rule and doesn't.",
    example: {
      day1: "Day 1: Sarah drafts a follow-up email to an international Stripe customer. You reject it: \"We don't auto-follow-up international customers — they're on a different cadence.\"",
      rest: "Day 2 onwards: Sarah never drafts a follow-up to an international Stripe customer again. The rule is in her brain, signed by you, dated, reversible if you ever change your mind.",
    },
  },
  {
    n: "02",
    title: "Approval-history personalization",
    pitch: "After 30 approvals it drafts like you. After 100, your team can't tell the difference.",
    body: "Every approve / reject / edit you make on an action feeds into every agent's next prompt as a \"your past decisions\" block. The system literally reads your decision history before drafting anything for you. The voice converges on yours.",
  },
  {
    n: "03",
    title: "Cross-agent synthesis",
    pitch: "One COO that reads 17 specialist agents and tells you the one thing that matters today.",
    body: "You don't get 10 separate AI reports to read. You get one daily briefing, synthesized across every agent's findings, ranked by what's actually at stake. The other 9 reports stay one click away if you want to drill in.",
  },
];

const RECEIPTS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Versioned commit-graph brain (git-style)",
    body: "Every brain entry has an immutable version row. Every commit has a message and an author (the agent that wrote it). You can diff what changed between two versions. You can roll back any agent edit. It's the only AI-knowledge-base architecture in the category that gives you git-style operations on your company's memory.",
  },
  {
    n: "02",
    title: "Agent-as-author attribution",
    body: "Every fact in your brain is signed by the agent that wrote it, the timestamp, and the agent_run_id that produced it. When your COO chat tells you something, you can click through to see which agent learned it, when, and from what data.",
  },
  {
    n: "03",
    title: "Earned autonomy (risk-tiered + confidence-graduated)",
    body: "Three autonomy tiers, set per tool. High-risk actions (firing a client, sending invoices, mass email) stay Ask forever. Medium-risk actions (drafting replies, scheduling meetings) auto-fire with notification once they've earned 30+ approvals at >90% rate. Low-risk actions (Notion writes, internal logs) fire silently. The agents earn their autonomy. They don't get it on day one. You can always override the tier per tool: Ask, Auto, Off.",
  },
];

const AUTOMATION_RECEIPTS: string[] = [
  "Built on Composio Triggers — 20+ webhook events across HubSpot, Stripe, ClickUp, Gmail, Calendly, and more",
  "Executed durably on Trigger.dev — retries 5 times with exponential backoff if something fails",
  "Every action still routes through the approval gate by default — automation doesn't mean autonomy",
];

const ORG_RECEIPTS: string[] = [
  "Built on Trigger.dev's tasks.triggerAndWait pattern — the manager pauses, the report runs, the manager resumes with the result",
  "Cycle-detection prevents infinite loops (managers can't report up the chain to themselves)",
  "Visible at /dashboard/employees as an indented org tree",
];

const STACK: Array<{ label: string; value: string }> = [
  { label: "Frontend", value: "Next.js 16 · React 19 · Tailwind v4 · shadcn/Radix · Framer Motion" },
  { label: "Backend", value: "Vercel Fluid Compute · Vercel AI SDK v6 · Vercel AI Gateway" },
  { label: "Database", value: "Supabase Postgres · pgvector · row-level security · multi-tenant" },
  { label: "Durable workflows", value: "Trigger.dev v3 (per-employee execution, delegation, automation runner)" },
  { label: "Scheduled cron", value: "Vercel Cron (28 built-in agents)" },
  { label: "AI models", value: "OpenAI GPT-5.5 / 5.4 / 4o / 4.1-nano · text-embedding-3-small · Anthropic Claude (scaffolded)" },
  { label: "Tool brokerage", value: "Composio (25 live integrations, growing to 500+)" },
  { label: "Web search", value: "Tavily" },
  { label: "Knowledge layer", value: "Anthropic Agent Skills (46 SKILL.md files across 9 domains)" },
  { label: "Observability", value: "Sentry · Statsig · Langfuse" },
  { label: "Rate limiting + cache", value: "Upstash Redis" },
  { label: "Email", value: "Resend" },
  { label: "MCP server", value: "OpsRadar's own brain is queryable as MCP by external agents" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/product" />

      <PageHeader />
      <PillarBrain />
      <PillarWorkforce />
      <CrossSynthesisSection />
      <DifferentiatorsSection />
      <ReceiptsSection />
      <AutomationsSection />
      <OrgChartSection />
      <StackSection />
      <FinalCTA />

      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 pt-14 pb-20 md:pt-20 md:pb-28">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            The product
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-7 text-[var(--color-fg)] text-balance max-w-[20ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Your AI workforce builds the{" "}
            <span className="text-[var(--color-primary)]">company brain</span>{" "}
            you exit on.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={280} offset={48}>
          <p
            className="mt-8 max-w-[44rem] text-[var(--color-fg-muted)]"
            style={{
              fontSize: "var(--text-lead)",
              lineHeight: "var(--text-lead--line-height)",
              fontWeight: 400,
            }}
          >
            28 named specialists run on your stack. They write what they learn
            into a versioned brain mirrored to your Notion. Documented
            agencies sell at 8&ndash;12× EBITDA &mdash; that&rsquo;s the asset.
            Approval-gated by default, earned-autonomy as trust accumulates.
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/waitlist">
                Coming soon — join waitlist
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/pricing">See pricing &rarr;</Link>
            </Button>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared pillar layout                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function PillarLayout({
  name,
  title,
  body,
  children,
}: {
  name: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[0.65fr_1.35fr] gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <RevealOnScroll delay={0} offset={40}>
              <p className="font-mono text-caption tracking-[0.22em] text-[var(--color-primary)] uppercase">
                {name}
              </p>
              <h2
                className="mt-5 text-[var(--color-fg)] text-balance"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h1)",
                  lineHeight: "var(--text-h1--line-height)",
                  letterSpacing: "var(--text-h1--letter-spacing)",
                  fontWeight: 500,
                }}
              >
                {title}
              </h2>
              <p className="mt-5 text-body leading-[1.65] text-[var(--color-fg-muted)] max-w-sm">
                {body}
              </p>
            </RevealOnScroll>
          </div>

          <div>
            <RevealOnScroll delay={100} offset={40}>
              {children}
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pillar A — The company brain (the asset)                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function PillarBrain() {
  return (
    <PillarLayout
      name="Pillar A · The Brain"
      title="A second brain for your business — written by your AI workforce, owned by you forever."
      body="Every AI employee writes findings to a shared, versioned brain. Every entry is signed by the agent that wrote it, with a timestamp and a commit message. Mirrored to your Notion."
    >
      <div className="space-y-10">
        <p className="text-body leading-[1.65] text-[var(--color-fg-muted)]">
          Every AI employee writes findings to a shared, versioned brain
          &mdash; Pattern Cards (what&rsquo;s normal for client X), Decision
          Log (what we decided and why), Risk Register (what could hurt us
          next quarter), Real P&amp;L, KPI Snapshots, Client Profiles. Every
          entry is signed by the agent that wrote it, with a timestamp and a
          commit message. The whole brain is mirrored to your Notion
          workspace.
        </p>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <p
            className="text-[var(--color-fg)]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h3)",
              lineHeight: "var(--text-h3--line-height)",
              letterSpacing: "var(--text-h3--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Why the brain is the asset (not the workforce).
          </p>
          <p className="mt-4 text-body leading-[1.65] text-[var(--color-fg-muted)]">
            Documented agencies sell at 8&ndash;12× EBITDA. Undocumented
            agencies sell at 5&ndash;9×. For a $2M-EBITDA agency,
            that&rsquo;s $6M of extra exit value. The agents commoditize
            &mdash; OpenAI Agents SDK lets any competent dev rebuild
            &ldquo;28 agents&rdquo; in a sprint. What they CAN&rsquo;T
            rebuild is two years of your accumulated, signed-author,
            git-versioned brain. That&rsquo;s the moat. That&rsquo;s the
            artifact you sell when you exit.
          </p>
        </div>

        <div>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase mb-4">
            Where the brain lives
          </p>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {BRAIN_LOCATIONS.map((b) => (
              <li
                key={b.where}
                className="grid grid-cols-[14rem_1fr] gap-6 py-5"
              >
                <p className="font-mono text-body-sm text-[var(--color-fg)] tracking-[-0.01em]">
                  {b.where}
                </p>
                <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                  {b.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PillarLayout>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pillar B — The AI workforce (the engine that builds it)                    */
/* ────────────────────────────────────────────────────────────────────────── */

function PillarWorkforce() {
  return (
    <PillarLayout
      name="Pillar B · The Workforce"
      title="28 named specialists. Hire more in plain English."
      body="Every customer starts with 28 named built-in AI employees the moment they sign in — 11 domain agents plus 17 toolkit specialists. Hire custom ones in plain English."
    >
      <div className="space-y-10">
        <p className="text-body leading-[1.65] text-[var(--color-fg-muted)]">
          Every OpsRadar customer starts with 28 named built-in AI employees
          the moment they sign in &mdash; all shipped with senior-COO
          operator judgment baked into their prompts. Hire custom ones in
          plain English: &ldquo;I want a Bookkeeper named Sarah.&rdquo;
        </p>

        <div>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase mb-4">
            The 11 named domain agents
          </p>
          <div className="grid sm:grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {NAMED_AGENTS.map((a) => (
              <div
                key={a.name}
                className="bg-[var(--color-surface)] px-5 py-4 flex items-center gap-3"
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {a.emoji}
                </span>
                <div>
                  <p className="text-body-sm text-[var(--color-fg)] font-medium">
                    {a.name}
                  </p>
                  <p className="text-caption text-[var(--color-fg-subtle)]">
                    {a.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-caption text-[var(--color-fg-subtle)]">
            Plus 17 toolkit specialists (Stripe Specialist, HubSpot
            Specialist, Harvest Specialist, ClickUp Specialist, &amp; more).
          </p>
        </div>

        <div>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase mb-4">
            How a custom hire works
          </p>
          <ol className="space-y-3">
            {HIRE_STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-mono text-caption text-[var(--color-fg-subtle)] mt-1 shrink-0">
                  {s.n}
                </span>
                <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <p
            className="text-[var(--color-fg)]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h3)",
              lineHeight: "var(--text-h3--line-height)",
              letterSpacing: "var(--text-h3--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Built on the senior-COO playbook.
          </p>
          <p className="mt-4 text-body leading-[1.65] text-[var(--color-fg-muted)]">
            The 28 built-in agents don&rsquo;t just call APIs. Their prompts
            contain operator judgment distilled from agency-operator
            publications &mdash; signals + thresholds, decision trees,
            verbatim conversation scripts. Cole (Collections Lead)
            doesn&rsquo;t just say &ldquo;this invoice is overdue.&rdquo;
            He says: at $X days late, send Y; at $Z days late, queue a
            margin-alert action with this draft email. Penny (Profitability
            Analyst) flags clients trending toward unprofitable in week 2,
            not at quarterly review.
          </p>
        </div>

        <div>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase mb-4">
            What the brain knows about your business after 30 days
          </p>
          <ul className="space-y-2.5">
            {BRAIN_KNOWS.map((b) => (
              <li
                key={b}
                className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)]"
              >
                <Check
                  className="size-4 shrink-0 mt-0.5 text-[var(--color-success)]"
                  aria-hidden
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PillarLayout>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Cross-tool synthesis                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function CrossSynthesisSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            Ask about your business
          </p>
          <h2
            className="mt-4 text-[var(--color-fg)] text-balance max-w-3xl"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            One COO. Seventeen specialist agents underneath. The one answer
            that matters.
          </h2>
          <p className="mt-6 max-w-3xl text-body leading-[1.65] text-[var(--color-fg-muted)]">
            When you ask the COO chat &ldquo;which clients should I worry
            about?&rdquo;, it doesn&rsquo;t make up an answer. It reads what
            Riley (Revenue), Penny (Profitability), and Cole (Collections)
            have written to the brain in the last 30 days. Synthesizes
            across them. Cites the entries by author + date. Then answers
            &mdash; with a clickable trail back to the source brain entries.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            <div className="bg-[var(--color-surface)] p-6 md:p-8">
              <p className="font-mono text-caption tracking-[0.18em] text-[var(--color-fg-subtle)] uppercase">
                Tool specialists (17)
              </p>
              <p className="mt-4 text-body leading-[1.65] text-[var(--color-fg-muted)]">
                Watch one app each &mdash; Stripe Specialist, HubSpot
                Specialist, Harvest Specialist, ClickUp Specialist, and so
                on. They go deep on their toolkit.
              </p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 md:p-8">
              <p className="font-mono text-caption tracking-[0.18em] text-[var(--color-fg-subtle)] uppercase">
                Domain agents (10)
              </p>
              <p className="mt-4 text-body leading-[1.65] text-[var(--color-fg-muted)]">
                Read what the tool agents wrote &mdash; Revenue, Collections,
                Scope, Delivery, Briefing &mdash; and synthesize across
                multiple tools. Riley reads what Stripe + HubSpot +
                QuickBooks specialists wrote and produces the actual
                revenue health summary.
              </p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 md:p-8">
              <p className="font-mono text-caption tracking-[0.18em] text-[var(--color-primary)] uppercase">
                COO chat (1)
              </p>
              <p className="mt-4 text-body leading-[1.65] text-[var(--color-fg-muted)]">
                Reads the domain agents and writes the daily briefing. You
                read one thing, not seventeen.
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Three differentiators                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function DifferentiatorsSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            Why OpsRadar is not a chatbot
          </p>
          <h2
            className="mt-4 text-[var(--color-fg)] text-balance max-w-3xl"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Three things ChatGPT, Lindy, and 11x literally cannot do.
          </h2>
        </RevealOnScroll>

        <div className="mt-14 space-y-14">
          {DIFFERENTIATORS.map((d, i) => (
            <RevealOnScroll key={d.n} delay={i * 100} offset={40}>
              <div className="grid lg:grid-cols-[0.6fr_1.4fr] gap-10 lg:gap-16 items-start">
                <div>
                  <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.18em]">
                    Differentiator {d.n}
                  </p>
                  <h3
                    className="mt-3 text-[var(--color-fg)]"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-h2)",
                      lineHeight: "var(--text-h2--line-height)",
                      letterSpacing: "var(--text-h2--letter-spacing)",
                      fontWeight: 500,
                    }}
                  >
                    {d.title}
                  </h3>
                </div>
                <div className="space-y-5">
                  <p className="text-body-lg leading-[1.55] text-[var(--color-fg)] font-medium max-w-2xl">
                    {d.pitch}
                  </p>
                  <p className="text-body leading-[1.65] text-[var(--color-fg-muted)] max-w-2xl">
                    {d.body}
                  </p>
                  {d.example && (
                    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 space-y-3">
                      <p className="font-mono text-caption text-[var(--color-fg-subtle)] uppercase tracking-[0.1em]">
                        Concrete example
                      </p>
                      <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                        {d.example.day1}
                      </p>
                      <p className="text-body-sm leading-[1.65] text-[var(--color-fg)]">
                        {d.example.rest}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Receipts                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function ReceiptsSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            What&rsquo;s under the hood
          </p>
          <h2
            className="mt-4 text-[var(--color-fg)] text-balance max-w-3xl"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Three more durable moats. The receipts.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {RECEIPTS.map((r) => (
              <div
                key={r.n}
                className="bg-[var(--color-surface)] p-6 md:p-8 flex flex-col gap-3"
              >
                <p className="font-mono text-caption tracking-[0.18em] text-[var(--color-fg-subtle)] uppercase">
                  Receipt {r.n}
                </p>
                <h3
                  className="text-[var(--color-fg)]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-h3)",
                    lineHeight: "var(--text-h3--line-height)",
                    letterSpacing: "var(--text-h3--letter-spacing)",
                    fontWeight: 500,
                  }}
                >
                  {r.title}
                </h3>
                <p className="text-body-sm leading-[1.65] text-[var(--color-fg-muted)]">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Customer-built automations                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function AutomationsSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-start">
          <RevealOnScroll delay={0} offset={40}>
            <div>
              <p className="text-label uppercase text-[var(--color-fg-subtle)]">
                When X happens, do Y
              </p>
              <h2
                className="mt-4 text-[var(--color-fg)] text-balance"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h1)",
                  lineHeight: "var(--text-h1--line-height)",
                  letterSpacing: "var(--text-h1--letter-spacing)",
                  fontWeight: 500,
                }}
              >
                Automations the way you&rsquo;d describe them out loud.
              </h2>
              <p className="mt-6 text-body leading-[1.65] text-[var(--color-fg-muted)] max-w-md">
                &ldquo;When a HubSpot deal moves to closed-won, post in #ops
                Slack and create a Notion kickoff page&rdquo; &mdash;
                that&rsquo;s an automation. You describe it to the COO chat
                in plain English. We compile it to a typed spec, show it to
                you as a card, you click Install. It runs forever.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120} offset={40}>
            <ul className="space-y-3">
              {AUTOMATION_RECEIPTS.map((r) => (
                <li
                  key={r}
                  className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                >
                  <Check
                    className="size-4 shrink-0 mt-0.5 text-[var(--color-success)]"
                    aria-hidden
                  />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Org chart + delegation                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function OrgChartSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-start">
          <RevealOnScroll delay={0} offset={40}>
            <div>
              <p className="text-label uppercase text-[var(--color-fg-subtle)]">
                Your AI workforce has hierarchy
              </p>
              <h2
                className="mt-4 text-[var(--color-fg)] text-balance"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h1)",
                  lineHeight: "var(--text-h1--line-height)",
                  letterSpacing: "var(--text-h1--letter-spacing)",
                  fontWeight: 500,
                }}
              >
                An org chart your AI workforce actually follows.
              </h2>
              <p className="mt-6 text-body leading-[1.65] text-[var(--color-fg-muted)] max-w-md">
                Custom AI employees can have managers and direct reports.
                When Marcus the Account Manager needs a Stripe lookup, he
                delegates to Sarah the Bookkeeper &mdash; pauses his run,
                waits for her to finish, reads her summary, and continues.
                Real hierarchy, real delegation, real durable wait.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120} offset={40}>
            <ul className="space-y-3">
              {ORG_RECEIPTS.map((r) => (
                <li
                  key={r}
                  className="flex gap-3 text-body-sm leading-[1.65] text-[var(--color-fg-muted)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                >
                  <Check
                    className="size-4 shrink-0 mt-0.5 text-[var(--color-success)]"
                    aria-hidden
                  />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Tech stack                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function StackSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            Stack
          </p>
          <h2
            className="mt-4 text-[var(--color-fg)] text-balance max-w-3xl"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Built on what 2026 actually ships.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <ul className="mt-12 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {STACK.map((s) => (
              <li
                key={s.label}
                className="grid grid-cols-[12rem_1fr] gap-6 py-4 md:py-5"
              >
                <p className="font-mono text-body-sm text-[var(--color-fg-subtle)] tracking-[-0.01em] uppercase">
                  {s.label}
                </p>
                <p className="text-body-sm leading-[1.65] text-[var(--color-fg)]">
                  {s.value}
                </p>
              </li>
            ))}
          </ul>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Final CTA                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            One workspace. Replaces 10 AI tools.
          </p>
          <h2
            className="mt-5 text-[var(--color-fg)] text-balance mx-auto"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(2.25rem, 3.6vw + 0.5rem, 3.75rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              fontWeight: 500,
            }}
          >
            Starts at $99.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            OpsRadar is in private beta. Join the waitlist for when the front
            door opens &mdash; or talk to the founder if you&rsquo;d rather
            see it run on your stack first.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/waitlist">
                Coming soon — join waitlist
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
