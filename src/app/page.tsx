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
  title: "Hire an AI workforce. Keep the brain it builds — OpsRadar",
  description:
    "28 named AI employees run your agency across Stripe, HubSpot, ClickUp, Gmail. They write everything they learn into a Notion you own. $499/mo.",
  openGraph: {
    title: "Hire an AI workforce. Keep the brain it builds.",
    description:
      "28 named AI employees that run your agency across 25+ tools — and write what they learn into a Notion you own forever. $499/mo.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Hire an AI workforce. Keep the brain it builds.",
    description:
      "28 named AI employees that run your agency across 25+ tools — and write what they learn into a Notion you own forever. $499/mo.",
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
            <span>The AI Operating System &middot; One workforce, one brain, your stack</span>
          </div>
        </RevealOnScroll>

        {/* H1 — massive, no clamp ceiling */}
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-8 text-[var(--color-fg)] text-balance max-w-[22ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Hire an AI workforce.{" "}
            <span className="text-[var(--color-primary)]">Keep the brain</span>{" "}
            it&nbsp;builds.
          </h1>
        </RevealOnScroll>

        {/* Lead — 21px Mercury spec — what / who-for / what-you-keep in 29 words */}
        <RevealOnScroll delay={280} offset={48}>
          <p
            className="mt-8 max-w-[44rem] text-[var(--color-fg-muted)]"
            style={{
              fontSize: "var(--text-lead)",
              lineHeight: "var(--text-lead--line-height)",
              fontWeight: 400,
            }}
          >
            OpsRadar gives every agency 28 named AI employees that run your operations across Stripe, HubSpot, Harvest, ClickUp, Gmail and 20 more &mdash; and writes everything they learn into a Notion you own forever.
          </p>
        </RevealOnScroll>

        {/* Sub-subhead — the named-agent curiosity hook */}
        <RevealOnScroll delay={400} offset={40}>
          <p
            className="mt-5 max-w-[44rem] text-body text-[var(--color-fg-muted)] leading-[1.65]"
          >
            <span className="text-[var(--color-fg)]">Riley</span> watches your revenue.{" "}
            <span className="text-[var(--color-fg)]">Cole</span> drafts collections.{" "}
            <span className="text-[var(--color-fg)]">Scott</span> catches scope creep.{" "}
            <span className="text-[var(--color-fg)]">Brian</span> writes your morning brief. The other 24 are listed below.
          </p>
        </RevealOnScroll>

        {/* CTAs */}
        <RevealOnScroll delay={520} offset={40}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/pricing">
                Start free trial — hire in 4 minutes
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/how-it-works">
                See how the workforce + brain works &rarr;
              </Link>
            </Button>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={640} offset={32}>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)]">
            $499/mo &middot; 14-day free trial &middot; Brain stays in your Notion &middot; Exportable any time
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
            Agencies pay $5,200/month for 10 AI tools that don&rsquo;t talk.{" "}
            <span style={{ color: "var(--color-fg-subtle)" }}>
              We replace them with one workforce that builds the brain you exit on.
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
      number: "$5,200",
      label: "is what a 15-person agency pays for 10 separate AI tools every month.",
      caption: "More than two full-time salaries — for tools that don't talk to each other.",
      source: "BizTech Magazine, 2025",
    },
    {
      number: "8–12×",
      label: "EBITDA is the exit multiple for agencies with documented operations.",
      caption: "Undocumented peers exit at 5–9×. On a $2M-EBITDA agency, that's $6M extra.",
      source: "First Page Sage + Wayfront M&A data",
    },
    {
      number: "$499/mo",
      label: "is OpsRadar Growth. Replaces all 10 tools, builds the brain you exit on.",
      caption: "Flat tiers. No tokens billed. Outcome meter bounded by your approval.",
      source: "OpsRadar pricing",
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
      name: "BRAIN",
      headline: "The asset you exit on.",
      body: "Every AI employee writes findings — Pattern Cards, Decision Log, Risk Register, Real P&L — into a versioned brain mirrored to your Notion. Signed by the agent that wrote it. Diffable. Exportable. Yours.",
      stat: "8–12×",
      statLabel: "EBITDA multiple for documented agencies",
    },
    {
      name: "WORKFORCE",
      headline: "28 named specialists. Hire more in plain English.",
      body: "Riley (Revenue), Cole (Collections), Scott (Scope), Brian (Briefing), Penny (Profitability), and 23 more ship the moment you sign in. Hire custom ones from the Hire chat: “I want a Bookkeeper named Sarah, every morning at 8.”",
      stat: "28",
      statLabel: "specialists running on day one",
    },
    {
      name: "AUTONOMY",
      headline: "Earned, not blind.",
      body: "High-risk actions (firing a client, sending invoices) stay Ask forever. Routine actions auto-fire after you've approved them 30+ times at 90%+ rate. The anti-11x by structure — agents earn autonomy, they don't get it free.",
      stat: "30",
      statLabel: "approvals before an action graduates to auto",
    },
    {
      name: "APPRENTICE",
      headline: "Every “no” becomes a rule forever.",
      body: "Reject an action and OpsRadar derives a generalizable rule from your reason, writes it to that employee's learned-rules memory. Next run, they read it. They don't make the same mistake twice.",
      stat: "100%",
      statLabel: "of rejections become permanent rules",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <RevealOnScroll delay={0} offset={40}>
          <div className="max-w-3xl mb-16 md:mb-20">
            <p className="text-label uppercase text-[var(--color-fg-subtle)]">
              The four things OpsRadar builds for you
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
              A brain, a workforce, earned autonomy, and an apprentice that never forgets.
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
              Hire your first AI employee in 4 minutes.
            </h2>
            <p className="mt-5 text-body-lg text-[var(--color-fg-muted)] max-w-xl">
              Connect Stripe. Open the Hire chat. Describe who you want — &ldquo;Bookkeeper named Sarah, every morning at 8, watching Stripe.&rdquo; We compile the spec. You click Hire. She starts tomorrow at 8 AM. No setup calls. No implementation team. The product is the demo.
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
              Built first for agencies. Doubled for fractional operators.
            </h2>
            <p
              className="mt-5 text-[var(--color-fg-muted)] max-w-xl"
              style={{
                fontSize: "var(--text-body-lg)",
                lineHeight: "var(--text-body-lg--line-height)",
              }}
            >
              10&ndash;50 person agencies running on retainers. If you&rsquo;re a fractional COO running 5&ndash;10 client agencies, there&rsquo;s a multi-tenant version of the same product designed for exactly that.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <SegmentsBento />
        </RevealOnScroll>

        {/* Fractional Operator callout — the multi-tenant leverage layer */}
        <RevealOnScroll delay={200} offset={40}>
          <div className="mt-16 md:mt-20 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] p-8 md:p-10">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--radar-500)]">
              &mdash; FOR FRACTIONAL OPERATORS
            </p>
            <h3
              className="mt-4 text-[var(--color-fg)] text-balance max-w-2xl"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-h2)",
                lineHeight: "var(--text-h2--line-height)",
                letterSpacing: "var(--text-h2--letter-spacing)",
                fontWeight: 500,
              }}
            >
              Running multiple agencies? Run them from one workspace.
            </h3>
            <p className="mt-5 max-w-2xl text-body text-[var(--color-fg-muted)] leading-[1.65]">
              If you&rsquo;re a fractional COO managing 5&ndash;10 client agencies, OpsRadar runs as a multi-tenant workspace. White-label your brand. Aggregate dashboard. Per-client brain. $2,999/mo for unlimited clients.
            </p>
            <div className="mt-7">
              <Button asChild variant="ghost">
                <Link href="/for/fractional-coo">
                  See the Fractional Operator workspace &rarr;
                </Link>
              </Button>
            </div>
          </div>
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
      kind: "On the brain",
      quote: "The brain you build is the asset you exit on.",
      body: "Agencies with documented operations sell at 8–12× EBITDA. Undocumented peers exit at 5–9× (First Page Sage, Wayfront). Every AI employee writes findings into a versioned Notion brain you own. Signed, dated, exportable. When you sell the agency, the brain goes with it as exit-value IP.",
    },
    {
      kind: "On earned autonomy",
      quote: "Earned autonomy. Not blind autonomy.",
      body: "High-risk actions (firing a client, sending invoices, mass email) stay Ask forever. Routine actions auto-fire only after you've approved them 30+ times at a 90%+ rate. The anti-11x by structure — agents earn autonomy through the proof of their own track record.",
    },
    {
      kind: "On pricing",
      quote: "No tokens billed. No premium-model multipliers. No surprise invoices.",
      body: "Flat tiers $99–$2,999/mo. The only thing that runs the meter past your cap is an action you literally clicked Approve on. Reject it and the meter doesn't move. The 40% of customers Gartner says abandon agentic AI because of unforeseen variable costs? We made that structurally impossible.",
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
            The workforce builds the brain.{" "}
            <span style={{ color: "rgba(255,255,255,0.5)" }}>
              The brain is the asset you keep, exit on, and never lose to a vendor.
            </span>
          </h2>
        </RevealOnScroll>

        {/* Stat row — three big numbers under the thesis, in radar blue */}
        <RevealOnScroll delay={120} offset={40}>
        <div className="mt-20 md:mt-24 grid md:grid-cols-3 gap-12 md:gap-16 max-w-4xl mx-auto">
          {[
            {
              n: "28",
              l: "named AI specialists run on day one. Hire custom ones in plain English.",
            },
            {
              n: "8–12×",
              l: "EBITDA exit multiple for documented agencies (vs 5–9× undocumented).",
            },
            {
              n: "$99",
              l: "per month for OpsRadar Starter. The asset compounds. The bill doesn't surprise you.",
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
            Hire your first AI employee.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Connect Stripe. Open the Hire chat. Describe a teammate you wish you had. We compile the spec, you click Hire, they start tomorrow at 8 AM. Or book a 20-minute call with the founder if you&rsquo;d rather see it run first.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/pricing">
                Start free trial &mdash; hire in 4 minutes
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Or talk to the founder
              </a>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
            $499/mo &middot; 14-day free trial &middot; No credit card &middot; Brain stays in your Notion
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
