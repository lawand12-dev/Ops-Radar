import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { DashboardPreview } from "<npm>/components/marketing/dashboard-preview";
import { Button } from "<npm>/components/ui/button";
import { Badge } from "<npm>/components/ui/badge";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

export const metadata: Metadata = {
  title: "OpsRadar — The AI Operating System for agencies",
  description:
    "OpsRadar is AIOS. One platform that runs your workflows, watches them while you sleep, shows everything in one dashboard, and remembers how your shop actually operates.",
  openGraph: {
    title: "OpsRadar — The AI Operating System for agencies",
    description:
      "One platform that runs your workflows, watches them while you sleep, shows everything in one dashboard, and remembers how your shop actually operates.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "OpsRadar — The AI Operating System for agencies",
    description:
      "One platform that runs your workflows, watches them while you sleep, shows everything in one dashboard, and remembers how your shop actually operates.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/" />

      <Hero />
      <MetricStrip />
      <PillarsSection />
      <DashboardSection />
      <HowItWorksSection />
      <SegmentSection />
      <WhySection />
      <CloserSection />
      <FinalCTA />

      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pt-12 md:pt-20 pb-20 md:pb-28">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-label text-[var(--color-fg-subtle)]">
              AIOS · for agencies under 30 people
            </p>
            <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.5rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
              The AI Operating System for{" "}
              <span className="text-[var(--color-primary)]">agencies</span>.
            </h1>
            <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
              One platform that runs your workflows, watches them while you
              sleep, shows everything in one dashboard, and remembers how your
              shop actually operates. Built specifically for your business.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/audit">
                  Start the 3-minute audit
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                  Talk to founders
                </a>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-[var(--color-fg-subtle)]">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />13 questions
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />Free
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />No card, no pitch
              </li>
            </ul>
          </div>

          <div className="relative">
            <DashboardPreview />
            <p className="mt-4 text-caption text-[var(--color-fg-subtle)] font-mono">
              ↑ The OBSERVE dashboard. One screen, every morning.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Metric strip — product capability stats (no delivery promises)             */
/* ────────────────────────────────────────────────────────────────────────── */

function MetricStrip() {
  const metrics = [
    { label: "Audit length", value: "13 Q · 3 min", note: "free, no card" },
    { label: "Tools connected", value: "40+", note: "across n8n + Claude" },
    { label: "Workflows ready", value: "120+", note: "in the AIOS library" },
    { label: "Hours reclaimed", value: "31 / mo", note: "per operator" },
  ];

  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl">
        <ul className="grid grid-cols-2 md:grid-cols-4">
          {metrics.map((m, i) => (
            <li
              key={m.label}
              className={
                "px-6 py-6 md:px-8 md:py-8 " +
                ((i + 1) % 2 === 0
                  ? "md:border-r md:last:border-r-0 border-[var(--color-border)]"
                  : "border-r last:border-r-0 border-[var(--color-border)]") +
                " " +
                (i >= 2 ? "border-t md:border-t-0 border-[var(--color-border)]" : "")
              }
            >
              <p className="text-label text-[var(--color-fg-subtle)]">{m.label}</p>
              <p className="mt-2 font-mono text-h3 font-medium tracking-[-0.01em] tabular-nums">
                {m.value}
              </p>
              <p className="mt-1 text-caption text-[var(--color-fg-subtle)]">{m.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pillars — OPERATE · OBSERVE · BRAIN · GUARD                                */
/* ────────────────────────────────────────────────────────────────────────── */

function PillarsSection() {
  const pillars = [
    {
      name: "OPERATE",
      title: "The engine running your agency.",
      body: "Automations doing the manual work. Your workflows run inside your n8n, on your credentials, under your control.",
    },
    {
      name: "OBSERVE",
      title: "The dashboard showing everything.",
      body: "One screen. Real data. Every morning. What's running, what's broken, what it saved you this week.",
    },
    {
      name: "BRAIN",
      title: "The AI that knows your company.",
      body: "Your data. Your history. Your patterns. Queried through Claude. Gets sharper every week the system runs.",
    },
    {
      name: "GUARD",
      title: "The system watching while you sleep.",
      body: "Silent failures caught before they cost you. Meta breaks something at 3 a.m.; GUARD knows by 3:01.",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12 mb-14 md:mb-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label text-[var(--color-fg-subtle)]">What&apos;s in AIOS</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Four parts. One platform.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              AIOS is not a tool. It&apos;s the layer that connects every tool you
              already pay for — and adds the parts you don&apos;t have yet.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          {pillars.map((p) => (
            <article
              key={p.name}
              className="bg-[var(--color-surface)] p-8 md:p-10"
            >
              <p className="font-mono text-caption text-[var(--color-primary)] tracking-[0.18em]">
                {p.name}
              </p>
              <h3 className="mt-4 font-serif text-h2 text-[var(--color-fg)] tracking-[-0.02em] leading-[1.12] text-balance">
                {p.title}
              </h3>
              <p className="mt-3 text-body leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Big dashboard section (cross-surface — dark on light page)                 */
/* ────────────────────────────────────────────────────────────────────────── */

function DashboardSection() {
  return (
    <section
      data-theme="dark"
      className="bg-[var(--color-bg)] text-[var(--color-fg)] border-b border-[var(--color-border)]"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-label text-[var(--color-fg-subtle)]">OBSERVE</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            Your agency, on one screen.
          </h2>
          <p className="mt-5 text-body-lg text-[var(--color-fg-muted)]">
            Every workflow, every credential, every dollar reclaimed — visible
            the second it changes. No nightly batches. No client data in our
            database. Just your stack, read live.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-[1.6fr_1fr] gap-10 items-start">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <span className="text-label text-[var(--color-fg-subtle)]">opsradar.co / dashboard</span>
              </div>
              <span className="font-mono text-caption text-[var(--color-fg-subtle)]">last sync · 14s ago</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
              {[
                { label: "Hours reclaimed", value: "2,431", trend: "+18%", up: true },
                { label: "Active workflows", value: "87", trend: "+6", up: true },
                { label: "Runs / 24h", value: "12.4k", trend: "+2.1k", up: true },
                { label: "Avg run cost", value: "$0.018", trend: "−12%", up: true },
              ].map((m) => (
                <div key={m.label} className="bg-[var(--color-surface)] px-5 py-4">
                  <p className="text-label text-[var(--color-fg-subtle)]">{m.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="font-mono text-h3 font-medium tabular-nums">{m.value}</p>
                    <p className={m.up ? "text-caption text-[var(--color-success)]" : "text-caption text-[var(--color-danger)]"}>
                      {m.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
              <p className="text-label text-[var(--color-fg-subtle)]">Workflows</p>
              <p className="text-caption font-mono text-[var(--color-fg-subtle)]">12 running · 1 degraded</p>
            </div>

            <ul className="divide-y divide-[var(--color-border)]">
              {[
                { name: "invoice-reminders", runs: "412", status: "Running", last: "2 min ago", flag: "success" },
                { name: "lead-router-v2", runs: "87", status: "Running", last: "14 min ago", flag: "success" },
                { name: "client-monthly-recap", runs: "12", status: "Running", last: "1 hr ago", flag: "success" },
                { name: "slack-recap-daily", runs: "3", status: "Degraded", last: "1 hr ago", flag: "warn" },
                { name: "onboarding-emails", runs: "54", status: "Running", last: "4 min ago", flag: "success" },
                { name: "rank-digest-weekly", runs: "1", status: "Running", last: "11 hr ago", flag: "success" },
              ].map((r) => (
                <li
                  key={r.name}
                  className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr] gap-4 px-6 py-3 items-center"
                >
                  <p className="text-body-sm font-medium">{r.name}</p>
                  <p className="font-mono text-body-sm text-[var(--color-fg-muted)] tabular-nums">{r.runs}</p>
                  <Badge variant={r.flag === "warn" ? "warn" : "success"} dot>{r.status}</Badge>
                  <p className="font-mono text-caption text-[var(--color-fg-subtle)]">{r.last}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-6">
            <Card title="Live, not nightly" body="Workflow status comes straight from your n8n. Nothing is cached longer than 60 seconds. You see the same world your team sees." />
            <Card title="Your data stays yours" body="OpsRadar never stores client data. Workflows run inside your n8n; credentials live in your vault; logs stay on your infrastructure." />
            <Card title="ROI, not vanity charts" body="Every workflow ships with a baseline cost-to-run and an hours-saved target. The dashboard tells you whether AIOS is still earning its keep." />
          </aside>
        </div>
      </div>
    </section>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">{title}</p>
      <p className="mt-2 text-body-sm text-[var(--color-fg-muted)] leading-[1.6]">{body}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  How it works — the funnel (audit → discovery → build), no pricing          */
/* ────────────────────────────────────────────────────────────────────────── */

function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      tag: "Audit",
      title: "Tell us what your agency runs on.",
      body: "13 questions about your tools, your team, and your operations. Free. Three minutes. You get an AI-generated report on where the hours are bleeding out.",
      side: "What you walk away with: a PDF that names the workflows worth automating first, and the dollar figures behind them.",
    },
    {
      n: "02",
      tag: "Discovery",
      title: "We sit with you to understand the business.",
      body: "We do not build AIOS for shops we do not understand. On a call, we go deeper than the audit — your tools, your clients, your team, your patterns, the things only operators know.",
      side: "What we walk away with: a real picture of how your shop actually works. We take roughly a week to evaluate and reason about it.",
    },
    {
      n: "03",
      tag: "Blueprint",
      title: "A written plan for your AIOS.",
      body: "We send you a PDF that shows what's actually happening to your operations today, what the system will do about it, what gets built first, and what the build will cost.",
      side: "What you walk away with: a buy-or-don't decision with full visibility. No surprises, no nine-page MSAs.",
    },
    {
      n: "04",
      tag: "Build",
      title: "Your AIOS goes live.",
      body: "Workflows run in your n8n. The BRAIN learns your shop. OBSERVE shows you everything. GUARD watches it overnight. We can run it for you, or hand it over to your team.",
      side: "What stays with you: every workflow, every credential, every log — in your accounts, under your control, from day one.",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label text-[var(--color-fg-subtle)]">How OpsRadar happens</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              From audit to live AIOS in four steps.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              Free at the front. Honest in the middle. Real ownership at the end.
            </p>
          </div>

          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {steps.map((s) => (
              <li key={s.n} className="grid grid-cols-[auto_1fr] gap-8 md:gap-12 py-10 md:py-12 items-start">
                <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-2">
                  — {s.n}
                </p>
                <div>
                  <p className="text-label text-[var(--color-primary)]">{s.tag}</p>
                  <h3 className="mt-3 font-serif text-h2 text-[var(--color-fg)] leading-[1.12] tracking-[-0.02em] text-balance">
                    {s.title}
                  </h3>
                  <p className="mt-4 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                    {s.body}
                  </p>
                  <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-subtle)] max-w-2xl italic">
                    {s.side}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Segment picker                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function SegmentSection() {
  const segments = [
    {
      href: "/for/paid-media",
      tag: "Paid media",
      headline: "Sunday-night reporting goes away. Pacing alerts find you first.",
      bullets: [
        "Monthly client reports that build themselves",
        "Pacing alerts tied to MER, not last-click ROAS",
        "BM-access-to-first-report from 3 weeks to 5 days",
      ],
    },
    {
      href: "/for/seo",
      tag: "SEO",
      headline: "Track what matters in 2026 — AI Overviews, LLM mentions, rank.",
      bullets: [
        "Weekly rank digests from Ahrefs + GSC + Semrush",
        "AIO presence tracking across ChatGPT, Perplexity, Google AIO",
        "Technical audit alerts before Google notices",
      ],
    },
    {
      href: "/for/full-service",
      tag: "Full-service",
      headline: "Hold your margin as you scale across ad ops, SEO, and content.",
      bullets: [
        "Unified reporting across ad, organic, and content",
        "Utilization alerts before scope creep eats margin",
        "Cross-channel attribution your clients actually believe",
      ],
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-14">
          <p className="text-label text-[var(--color-fg-subtle)]">Working inside agencies like</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            AIOS, shaped to your shop.
          </h2>
          <p className="mt-5 text-body-lg text-[var(--color-fg-muted)] max-w-xl">
            AIOS is not a template. Each one is built for the specific
            operations of the agency it runs inside. Here&apos;s what it looks
            like for the three shapes we see most.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          {segments.map((seg) => (
            <Link
              key={seg.href}
              href={seg.href}
              className="group flex flex-col bg-[var(--color-surface)] p-8 md:p-10 hover:bg-[var(--color-surface-sunken)] transition-colors duration-[var(--duration-fast)]"
            >
              <p className="text-label text-[var(--color-primary)]">{seg.tag}</p>
              <h3 className="mt-5 font-serif text-h3 text-[var(--color-fg)] leading-[1.2] tracking-[-0.015em] text-balance">
                {seg.headline}
              </h3>
              <ul className="mt-6 space-y-2.5 flex-1">
                {seg.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex gap-2.5 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]"
                  >
                    <span className="text-[var(--color-fg-faint)] mt-1 shrink-0">—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] transition-colors">
                See AIOS for {seg.tag.toLowerCase()}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Why — three editorial pull-quotes (product-positioned)                     */
/* ────────────────────────────────────────────────────────────────────────── */

function WhySection() {
  const quotes = [
    {
      kind: "On understanding",
      quote: "We don’t build for shops we don’t understand.",
      body: "AIOS is not a template you drop into your stack. We diagnose your real operations — your tools, your clients, your team, your patterns — before a single workflow is written. That is the only honest way to build a system for a business.",
    },
    {
      kind: "On ownership",
      quote: "You own all of it. Day one.",
      body: "Every workflow lives in your n8n account, on your Google Drive, running on your credentials. If OpsRadar ever disappeared, nothing breaks. You keep the code, the logic, and the logs.",
    },
    {
      kind: "On reliability",
      quote: "GUARD watches the system while you sleep.",
      body: "Ad platforms push breaking changes every quarter. GUARD catches them before your Monday recap fails. You see the fix in your inbox, not the error.",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-12">
          <p className="text-label text-[var(--color-fg-subtle)]">Why this works</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            Three things we hold to.
          </h2>
        </div>

        <div className="space-y-16 md:space-y-20">
          {quotes.map((q) => (
            <div key={q.kind} className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-16">
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-3 lg:min-w-[140px]">
                — {q.kind}
              </p>
              <div>
                <blockquote className="font-serif text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] leading-[1.1] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
                  {q.quote}
                </blockquote>
                <p className="mt-5 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {q.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Closer — replaces FounderNote + Vision                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function CloserSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
          <p className="text-label text-[var(--color-primary)]">The bet</p>
          <div className="mt-6 space-y-6 text-body-lg leading-[1.65] text-[var(--color-fg-muted)] max-w-3xl">
            <p>
              Most agencies have the tools — HubSpot, Meta, Klaviyo, GA4, Slack,
              a Notion no one reads. Almost none have a system connecting them.
              The work lives in someone&apos;s head, the reports get built by
              hand, the platforms break quietly, and the team scales by hiring.
            </p>
            <p>
              AIOS is the platform that ends that. Your data, your history,
              your patterns — fed into a system built specifically for your
              shop. It runs the work. It watches the work. It remembers how
              you operate, and gets sharper every week.
            </p>
            <p className="font-serif text-h2 leading-[1.15] tracking-[-0.02em] text-[var(--color-fg)] text-balance pt-2">
              We are not building another automation tool. We are building the
              operating system that runs the agency.
            </p>
          </div>
        </div>
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
        <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
        <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          See what your AIOS looks like.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          13 questions. Three minutes. An AI-generated report on where your
          operations are bleeding hours — and which workflows are worth
          automating first.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <Link href="/audit">
              Start the audit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Or talk to founders
            </a>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          13 questions · Free · No card, no pitch · 3 minutes to the report.
        </p>
      </div>
    </section>
  );
}
