import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { FullDashboardMock } from "<npm>/components/marketing/full-dashboard-mock";
import { BrowserFrame } from "<npm>/components/marketing/browser-frame";
import { IntegrationsStrip } from "<npm>/components/marketing/integrations-strip";
import { ProcessStepper } from "<npm>/components/marketing/process-stepper";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";
import { SegmentsBento } from "<npm>/components/marketing/segments-bento";
import { Button } from "<npm>/components/ui/button";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

export const metadata: Metadata = {
  title: "The AI COO for marketing agencies — OpsRadar",
  description:
    "21.5% of agencies are losing money in 2026. OpsRadar watches your margin, scope, and utilization in real time — at under 8% of a fractional COO's retainer. From $750/month.",
  openGraph: {
    title: "Your AI COO. Watching your margin while you're on the call.",
    description:
      "Real-time margin, scope, and utilization for marketing agencies. $750–$3,000/mo, not $10K. Plugs into the stack you already pay for.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Your AI COO. Watching your margin while you're on the call.",
    description:
      "Real-time margin, scope, and utilization for marketing agencies. $750–$3,000/mo, not $10K. Plugs into the stack you already pay for.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/" />

      <Hero />
      <ThesisBillboard />
      <StatBillboard />
      <PillarsSection />
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
    <section className="relative overflow-hidden border-b border-[var(--color-border)]">
      {/* Mercury composition: stacked single column. H1 huge, generous padding,
          the alert card sits BELOW the copy as the hero composite —
          full-width, the centerpiece, not a sidebar. */}
      <div className="relative mx-auto max-w-6xl px-6 pt-20 md:pt-32 pb-20 md:pb-28">
        {/* Eyebrow */}
        <RevealOnScroll delay={0} offset={32}>
          <div className="inline-flex items-center gap-2 text-label text-[var(--color-fg-subtle)] uppercase">
            <span className="relative inline-flex">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-[var(--color-success)] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
            </span>
            <span>AI COO · for marketing agencies $1M&ndash;$5M</span>
          </div>
        </RevealOnScroll>

        {/* H1 — massive, no clamp ceiling */}
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-8 text-[var(--color-fg)] text-balance max-w-[18ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            The fractional COO that costs{" "}
            <span className="text-[var(--color-primary)]">$750</span>,
            not&nbsp;$10,000.
          </h1>
        </RevealOnScroll>

        {/* Lead — 21px Mercury spec */}
        <RevealOnScroll delay={280} offset={48}>
          <p
            className="mt-8 max-w-[42rem] text-[var(--color-fg-muted)]"
            style={{
              fontSize: "var(--text-lead)",
              lineHeight: "var(--text-lead--line-height)",
              fontWeight: 400,
            }}
          >
            OpsRadar is the AI COO for marketing agencies. We watch margin, scope, and utilization across your stack &mdash; and catch the unprofitable client in week 2, not month 3.
          </p>
        </RevealOnScroll>

        {/* CTAs */}
        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a 30-min call with the founder
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/audit">
                Or get a free 3-minute audit &rarr;
              </Link>
            </Button>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={600} offset={32}>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)]">
            30 minutes &middot; No pitch &middot; We tell you if it&rsquo;s not a fit
          </p>
        </RevealOnScroll>

        {/* Hero composite — real product screenshot (Cursor pattern: "Screenshot is the demo").
            Full-bleed dashboard mockup on a slim tilted browser frame with the
            Notion 5-layer shadow + soft radar glow behind, so it floats off the cream. */}
        <div className="relative mt-24 md:mt-32">
          {/* Soft radial backdrop only behind the dashboard */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-12 -inset-y-16"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 40%, rgba(0,102,255,0.10) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 text-caption font-mono uppercase tracking-[0.1em] text-[var(--color-fg-subtle)]">
              <Sparkles className="size-3 text-[var(--color-primary)]" aria-hidden />
              <span>Inside the dashboard</span>
            </div>

            <div className="origin-top lg:[transform:perspective(2400px)_rotateX(2deg)]">
              <BrowserFrame
                url="opsradar.co/dashboard"
                theme="dark"
                className="rounded-[14px] shadow-[0_60px_120px_-40px_rgba(2,6,23,0.30),0_24px_60px_-24px_rgba(0,102,255,0.18)]"
              >
                <FullDashboardMock />
              </BrowserFrame>
            </div>
          </div>
        </div>

        {/* INTEGRATIONS STRIP */}
        <div className="mt-20 md:mt-28 pt-10 border-t border-[var(--color-border)]">
          <p className="text-label text-[var(--color-fg-subtle)] mb-6 uppercase">
            Reads from the tools you already pay for
          </p>
          <IntegrationsStrip />
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Mercury thesis billboard — single 42px H2 standing alone, 160px padding   */
/* ────────────────────────────────────────────────────────────────────────── */

function ThesisBillboard() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-5xl px-6 py-32 md:py-40 text-center">
        <RevealOnScroll delay={0} offset={48}>
          <h2
            className="text-[var(--color-fg)] text-balance mx-auto"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-display)",
              lineHeight: "var(--text-display--line-height)",
              letterSpacing: "var(--text-display--letter-spacing)",
              fontWeight: 480,
              maxWidth: "22ch",
            }}
          >
            Agencies grow revenue and lose money at the same time.{" "}
            <span style={{ color: "var(--color-fg-subtle)" }}>
              Nobody sees it until it&rsquo;s too expensive to fix.
            </span>
          </h2>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Ramp-style Stat Billboard — 64px numbers in standalone panels             */
/* ────────────────────────────────────────────────────────────────────────── */

function StatBillboard() {
  const stats = [
    {
      number: "21.5%",
      label: "of marketing agencies are losing money in 2026.",
      caption: "Up from 13% the year before.",
      source: "Planable, 2026",
    },
    {
      number: "$500K",
      label: "per year is what 47% of agencies lose to untracked billable hours.",
      caption: "OpsRadar surfaces them in the next health digest.",
      source: "Mosaic, 2026",
    },
    {
      number: "$10K/mo",
      label: "is what a fractional COO charges to do this quarterly.",
      caption: "OpsRadar does it 24/7, starting at $750.",
      source: "Industry benchmark",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)] mb-12">
            The bleed is well-documented
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
        <div className="grid gap-12 md:gap-16 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.number} className="flex flex-col">
              <p
                className="text-[var(--color-primary)] tabular-nums"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-stat)",
                  lineHeight: "var(--text-stat--line-height)",
                  letterSpacing: "var(--text-stat--letter-spacing)",
                  fontWeight: 480,
                }}
              >
                {s.number}
              </p>
              <p
                className="mt-6 text-[var(--color-fg)] text-balance"
                style={{
                  fontSize: "var(--text-body-lg)",
                  lineHeight: "var(--text-body-lg--line-height)",
                  fontWeight: 500,
                }}
              >
                {s.label}
              </p>
              <p className="mt-3 text-body-sm text-[var(--color-fg-muted)] leading-[1.6]">
                {s.caption}
              </p>
              <p className="mt-6 pt-4 text-caption text-[var(--color-fg-subtle)] font-mono border-t border-[var(--color-border)]">
                {s.source}
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
/*  Pillars — OPERATE · OBSERVE · BRAIN · GUARD                                */
/* ────────────────────────────────────────────────────────────────────────── */

function PillarsSection() {
  const pillars = [
    {
      name: "OPERATE",
      headline: "The COO takes the next action.",
      body: "Drafts the invoice for unbilled scope. Sends the PM nudge. Queues the pacing alert. Every action has a 30-minute undo and a 5-evaluator safety net.",
      stat: "~$4K",
      statLabel: "recovered per agency / month",
    },
    {
      name: "OBSERVE",
      headline: "Every client, every day.",
      body: "Margin, utilization, scope, cash flow — read live from the tools you already pay for. Health-scored 0–100 per client every Monday morning.",
      stat: "Week 2",
      statLabel: "unprofitable client caught — not month 3",
    },
    {
      name: "BRAIN",
      headline: "Ask anything about your business.",
      body: "A frontier LLM grounded in your live data. “Which client lost margin this quarter and why?” — answered in 4 seconds with named clients and dollar deltas.",
      stat: "39.75 hrs",
      statLabel: "saved per strategist / month",
    },
    {
      name: "GUARD",
      headline: "Watches it while you sleep.",
      body: "Pacing alerts catch overshooting media spend Sunday night. Silent connector failures flagged before Monday's digest fails. Your weekend stays yours.",
      stat: "71%",
      statLabel: "of campaigns at risk — caught",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <RevealOnScroll delay={0} offset={40}>
          <div className="max-w-3xl mb-16 md:mb-20">
            <p className="text-label uppercase text-[var(--color-fg-subtle)]">
              What the AI COO actually does
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
              Four jobs a COO runs. Done by software. On your stack.
            </h2>
          </div>
        </RevealOnScroll>

        {/* Editorial 2x2 grid. Each cell stands alone with hairline divider, no card. */}
        <RevealOnScroll delay={100} offset={40}>
        <div className="grid md:grid-cols-2 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[12px] overflow-hidden">
          {pillars.map((p) => (
            <article
              key={p.name}
              className="bg-[var(--color-bg)] p-10 md:p-12 flex flex-col"
            >
              <p
                className="font-mono text-[11px] tracking-[0.18em] text-[var(--radar-500)]"
                style={{ fontWeight: 500 }}
              >
                — {p.name}
              </p>
              <h3
                className="mt-5 text-[var(--color-fg)] text-balance"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h3)",
                  lineHeight: "var(--text-h3--line-height)",
                  letterSpacing: "var(--text-h3--letter-spacing)",
                  fontWeight: 500,
                }}
              >
                {p.headline}
              </h3>
              <p className="mt-4 text-body text-[var(--color-fg-muted)] leading-[1.65] max-w-prose">
                {p.body}
              </p>

              <div className="mt-auto pt-8">
                <p
                  className="font-mono text-[var(--radar-500)] tabular-nums"
                  style={{
                    fontSize: "clamp(1.75rem, 1.5vw + 1rem, 2.5rem)",
                    fontWeight: 480,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {p.stat}
                </p>
                <p className="mt-1 text-caption text-[var(--color-fg-subtle)] uppercase tracking-[0.08em]">
                  {p.statLabel}
                </p>
              </div>
            </article>
          ))}
        </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* DashboardSection removed — the FullDashboardMock now lives in the Hero (Cursor "screenshot is the demo" pattern). */

/* ────────────────────────────────────────────────────────────────────────── */
/*  How it works — the funnel (audit → discovery → build), no pricing          */
/* ────────────────────────────────────────────────────────────────────────── */

function HowItWorksSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 pt-24 md:pt-32 pb-16 md:pb-24">
        {/* Editorial intro */}
        <RevealOnScroll delay={0} offset={40}>
          <div className="max-w-2xl">
            <p className="text-label text-[var(--color-fg-subtle)]">
              HOW IT WORKS
            </p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Live in the time it takes to onboard a new client.
            </h2>
            <p className="mt-5 text-body-lg text-[var(--color-fg-muted)] max-w-xl">
              No rip-and-replace. No 6-month implementation. The AI COO plugs into the stack you already pay for and starts watching the same week. Two entry points: take the 3-minute audit for an instant dollar figure, or skip ahead to a 30-minute call.
            </p>
          </div>
        </RevealOnScroll>

        {/* Sticky-scroll stepper */}
        <RevealOnScroll delay={100} offset={40}>
          <div className="mt-16 md:mt-24">
            <ProcessStepper />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Segment picker                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function SegmentSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <RevealOnScroll delay={0} offset={40}>
          <div className="max-w-2xl mb-14 md:mb-16">
            <p className="text-label text-[var(--color-fg-subtle)] uppercase">
              Who it's built for
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
              Paid media. SEO. Full-service.
            </h2>
            <p
              className="mt-5 text-[var(--color-fg-muted)] max-w-xl"
              style={{
                fontSize: "var(--text-body-lg)",
                lineHeight: "var(--text-body-lg--line-height)",
              }}
            >
              Same AI COO, calibrated to the margin patterns, tool stacks, and scope creep shapes specific to each. The first weekly Health Score lands the Monday after you connect.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <SegmentsBento />
        </RevealOnScroll>
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
      kind: "On detection lag",
      quote: "The unprofitable client should be caught in week 2, not month 3.",
      body: "The benchmark detection lag is 30–90 days. Most agencies discover a money-losing account at quarter-end — when the quarter is already gone. The AI COO reads margin live every day and flags the leak before the second invoice goes out.",
    },
    {
      kind: "On ownership",
      quote: "Your data stays in your tools. We never store it.",
      body: "OpsRadar never writes your client business data to its own database. The AI COO reads live from HubSpot, ClickUp, Harvest, Stripe through OAuth and encrypted API keys you control. Revoke access in one click any time.",
    },
    {
      kind: "On the price gap",
      quote: "A fractional COO is $10K. OpsRadar starts at $750.",
      body: "The market floor for a real fractional COO is $7,000/month. A full-time COO is $25,000. Sub-$5M agencies have neither — and 60% of them don't have any COO at all. The AI COO is the layer that closes the gap.",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)] mb-3">
            The three things we hold to
          </p>
        </RevealOnScroll>

        {/* Ramp pull-quote treatment: 28px sans, no italics, no quote glyphs.
            Attribution below in mono. Three quotes stacked with generous
            spacing — let them breathe. */}
        <div className="mt-12 grid gap-16 md:gap-20">
          {quotes.map((q, i) => (
            <RevealOnScroll key={q.kind} delay={i * 120} offset={40}>
            <div
              key={q.kind}
              className={
                "grid md:grid-cols-12 gap-8 md:gap-12 " +
                (i > 0 ? "pt-16 md:pt-20 border-t border-[var(--color-border)]" : "")
              }
            >
              {/* Left: index + kind */}
              <div className="md:col-span-3 flex md:flex-col items-baseline md:items-start gap-4 md:gap-3">
                <span
                  className="font-mono text-[var(--color-fg-subtle)] tabular-nums"
                  style={{ fontSize: "13px", letterSpacing: "0.06em" }}
                >
                  0{i + 1}
                </span>
                <span
                  className="font-mono uppercase text-[var(--color-fg-subtle)]"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                  }}
                >
                  {q.kind}
                </span>
              </div>

              {/* Right: quote */}
              <blockquote className="md:col-span-9">
                <p
                  className="text-[var(--color-fg)] text-balance"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(1.5rem, 1.6vw + 1rem, 2rem)",
                    lineHeight: 1.25,
                    letterSpacing: "-0.018em",
                    fontWeight: 480,
                  }}
                >
                  {q.quote}
                </p>
                <p className="mt-6 text-body text-[var(--color-fg-muted)] leading-[1.7] max-w-[60ch]">
                  {q.body}
                </p>
              </blockquote>
            </div>
            </RevealOnScroll>
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
    <section
      data-theme="dark"
      className="relative overflow-hidden border-b"
      style={{
        background: "var(--ink-0, #020203)",
        borderColor: "var(--ink-line)",
      }}
    >
      {/* Soft radar gradient — instrument-panel feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 30%, rgba(0,102,255,0.18) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-32 md:py-40">
        <RevealOnScroll delay={0} offset={32}>
          <p
            className="text-center font-mono uppercase mb-12"
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "12px",
              letterSpacing: "0.18em",
            }}
          >
            What we&rsquo;re actually building
          </p>

          {/* Massive Mercury thesis statement, in dark */}
          <h2
            className="text-center mx-auto text-balance"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(2.5rem, 3.5vw + 1rem, 4.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.028em",
              fontWeight: 500,
              color: "#FFFFFF",
              maxWidth: "22ch",
            }}
          >
            The COO sub-$5M agencies could never afford.{" "}
            <span style={{ color: "rgba(255,255,255,0.5)" }}>
              Built for the segment the fractional market priced out.
            </span>
          </h2>
        </RevealOnScroll>

        {/* Stat row — three big numbers under the thesis, in radar blue */}
        <RevealOnScroll delay={120} offset={40}>
        <div className="mt-20 md:mt-24 grid md:grid-cols-3 gap-12 md:gap-16 max-w-4xl mx-auto">
          {[
            {
              n: "60%",
              l: "of sub-$5M agencies have no COO at all.",
            },
            {
              n: "$10K",
              l: "per month — the floor for a real fractional COO.",
            },
            {
              n: "$750",
              l: "per month for OpsRadar Starter. Less than 1/10th the cost.",
            },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <p
                className="font-mono tabular-nums"
                style={{
                  color: "var(--radar-500)",
                  fontSize: "clamp(2.5rem, 4vw + 0.5rem, 4rem)",
                  fontWeight: 480,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {s.n}
              </p>
              <p
                className="mt-4 text-balance mx-auto"
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "15px",
                  lineHeight: 1.55,
                  maxWidth: "20ch",
                }}
              >
                {s.l}
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
/*  Final CTA                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">Start here</p>
          <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            Talk to the founder.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            A 30-minute call. We listen to how your agency runs, ask the questions
            only operators would ask, and tell you on the call whether the AI COO
            belongs at your agency.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a 30-min call
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
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
  );
}
