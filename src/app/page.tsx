import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { FullDashboardMock } from "<npm>/components/marketing/full-dashboard-mock";
import { FunnelPreview } from "<npm>/components/marketing/funnel-preview";
import { HeroBackdrop } from "<npm>/components/marketing/hero-backdrop";
import { BrowserFrame } from "<npm>/components/marketing/browser-frame";
import { IntegrationsStrip } from "<npm>/components/marketing/integrations-strip";
import { PillarsBento } from "<npm>/components/marketing/pillars-bento";
import { ProcessStepper } from "<npm>/components/marketing/process-stepper";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";
import { SegmentsBento } from "<npm>/components/marketing/segments-bento";
import { Button } from "<npm>/components/ui/button";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

export const metadata: Metadata = {
  title: "OpsRadar — The AI Operating System for agencies",
  description:
    "OpsRadar is AIOS. One platform that runs the manual work, connects every tool your agency already pays for, shows it all in one dashboard with AI that knows your business, and watches it while you sleep.",
  openGraph: {
    title: "OpsRadar — The AI Operating System for agencies",
    description:
      "One platform that runs the manual work, connects every tool your agency uses, shows it all in one dashboard with AI that knows your business, and watches it while you sleep.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "OpsRadar — The AI Operating System for agencies",
    description:
      "One platform that runs the manual work, connects every tool your agency uses, shows it all in one dashboard with AI that knows your business, and watches it while you sleep.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/" />

      <Hero />
      <RevealOnScroll>
        <MetricStrip />
      </RevealOnScroll>
      <RevealOnScroll>
        <PillarsSection />
      </RevealOnScroll>
      <RevealOnScroll>
        <DashboardSection />
      </RevealOnScroll>
      <RevealOnScroll>
        <HowItWorksSection />
      </RevealOnScroll>
      <RevealOnScroll>
        <SegmentSection />
      </RevealOnScroll>
      <RevealOnScroll>
        <WhySection />
      </RevealOnScroll>
      <RevealOnScroll>
        <CloserSection />
      </RevealOnScroll>
      <RevealOnScroll>
        <FinalCTA />
      </RevealOnScroll>

      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto max-w-7xl px-6 pt-14 md:pt-24 pb-20 md:pb-28">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* LEFT — copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-label text-[var(--color-fg-subtle)]">
              <span className="relative inline-flex">
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-[var(--color-success)] opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
              </span>
              <span>AIOS · for agencies under 30 people</span>
            </div>

            <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.5rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
              The AI Operating System for{" "}
              <span className="text-[var(--color-primary)]">agencies</span>.
            </h1>
            <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
              One platform that runs the manual work, connects every tool your
              agency already pays for, shows it all in one dashboard with AI
              that knows your business, and watches it while you sleep.
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

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-[var(--color-fg-subtle)]">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />30 minutes
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />No pitch
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />We tell you if it&apos;s not a fit
              </li>
            </ul>
          </div>

          {/* RIGHT — funnel preview spread (the journey, not a product UI).
              Hidden below lg because the fixed positioning would overflow
              narrow viewports; mobile/tablet get the copy-only hero. */}
          <div className="relative hidden lg:block">
            <div className="mb-4 inline-flex items-center gap-2 text-caption font-mono uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
              <Sparkles
                className="size-3 text-[var(--color-primary)]"
                aria-hidden="true"
              />
              <span>Call · Discovery · Blueprint · Build</span>
            </div>

            <FunnelPreview />
          </div>
        </div>

        {/* INTEGRATIONS STRIP */}
        <div className="mt-14 md:mt-20 pt-8 border-t border-[var(--color-border)]">
          <IntegrationsStrip />
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
    { label: "Tools connected", value: "Most", note: "ads, revenue, CRM, ops" },
    { label: "AI in the dashboard", value: "Always", note: "ask anything, in plain English" },
    { label: "Pricing model", value: "Flat", note: "no per-run fees, no tiers" },
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
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        {/* Narrow editorial intro */}
        <div className="max-w-2xl">
          <p className="text-label text-[var(--color-fg-subtle)]">
            What&apos;s in AIOS
          </p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            Four parts. One platform.
          </h2>
          <p className="mt-5 text-body-lg text-[var(--color-fg-muted)] max-w-xl">
            AIOS is not a tool. It&apos;s the layer that connects every tool
            you already pay for — and adds the parts you don&apos;t have yet.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-14 md:mt-16">
          <PillarsBento />
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
      className="relative overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] border-y border-[var(--color-border)]"
    >
      {/* Ambient indigo halo behind the product reveal */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[42%] h-[900px] w-[1400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent-700) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
      </div>

      {/* Narrow editorial intro */}
      <div className="relative mx-auto max-w-3xl px-6 pt-24 md:pt-32 pb-12 md:pb-16 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
          OBSERVE + BRAIN
        </p>
        <h2 className="mt-5 font-serif text-h1 leading-[1.05] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
          Every tool you use, on one screen.
        </h2>
        <p className="mt-6 text-body-lg text-[var(--color-fg-muted)] text-balance">
          Revenue, ad spend, leads, deliverables, workflow status, hours
          reclaimed — surfaced live in one dashboard, with an AI in the corner
          that knows your business and answers in plain English.
        </p>
      </div>

      {/* Full-bleed product reveal — tilted, glowing, edge-to-edge */}
      <div className="relative w-full pb-24 md:pb-32 lg:[perspective:2200px]">
        <div className="relative mx-auto max-w-[1480px] px-4 md:px-8">
          <div className="origin-top transform-gpu lg:[transform:rotateX(6deg)_rotateY(-2deg)]">
            <BrowserFrame
              url="opsradar.co/dashboard"
              theme="dark"
              className="rounded-[18px] shadow-[0_60px_120px_-40px_rgba(2,6,23,0.65),0_24px_60px_-24px_rgba(79,70,229,0.45)]"
            >
              <FullDashboardMock />
            </BrowserFrame>
          </div>
        </div>
      </div>

      {/* Three value props — demoted band beneath the dashboard */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-border)] border-t border-[var(--color-border)]">
        {VALUE_PROPS.map((v) => (
          <article
            key={v.title}
            className="bg-[var(--color-bg)] px-8 py-10 md:px-10 md:py-12"
          >
            <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">
              {v.title}
            </p>
            <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
              {v.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

const VALUE_PROPS = [
  {
    title: "Every tool, surfaced",
    body: "Revenue, ad spend, CRM pipeline, deliverables, workflow status. Every tool your agency already pays for, pulled into one place — read live.",
  },
  {
    title: "AI in the corner",
    body: "Ask anything in plain English. The AI knows your data, your history, your patterns. It gets sharper every week the system runs.",
  },
  {
    title: "Your accounts. Your data.",
    body: "OpsRadar never stores client data. Workflows run on your accounts; credentials stay in your vault; logs stay on your infrastructure.",
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────── */
/*  How it works — the funnel (audit → discovery → build), no pricing          */
/* ────────────────────────────────────────────────────────────────────────── */

function HowItWorksSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 pt-24 md:pt-32 pb-16 md:pb-24">
        {/* Editorial intro */}
        <div className="max-w-2xl">
          <p className="text-label text-[var(--color-fg-subtle)]">
            How AIOS gets built
          </p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            From first call to live AIOS in four steps.
          </h2>
          <p className="mt-5 text-body-lg text-[var(--color-fg-muted)] max-w-xl">
            The real path starts with a conversation. The 3-minute audit on
            the site is a marketing diagnostic — useful, but not the map.
          </p>
        </div>

        {/* Sticky-scroll stepper */}
        <div className="mt-16 md:mt-24">
          <ProcessStepper />
        </div>
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
        <div className="max-w-2xl mb-14 md:mb-16">
          <p className="text-label text-[var(--color-fg-subtle)]">
            Working inside agencies like
          </p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            AIOS, shaped to your agency.
          </h2>
          <p className="mt-5 text-body-lg text-[var(--color-fg-muted)] max-w-xl">
            AIOS is not a template. Each one is built for the specific
            operations of the agency it runs inside. Here is what it looks
            like for the three shapes we see most.
          </p>
        </div>

        <SegmentsBento />
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
      quote: "We don’t build for agencies we don’t understand.",
      body: "AIOS is not a template you drop into your stack. We diagnose your real operations — your tools, your clients, your team, your patterns — before a single workflow is written. That is the only honest way to build a system for a business.",
    },
    {
      kind: "On ownership",
      quote: "You own all of it. Day one.",
      body: "Every workflow lives on your accounts, on your storage, running on your credentials. If OpsRadar ever disappeared, nothing breaks. You keep the code, the logic, and the logs.",
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
              agency. It runs the work. It surfaces every tool in one screen.
              It watches the platforms. It remembers how you operate, and
              gets sharper every week.
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
          Talk to us about your AIOS.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          A 30-minute call. We listen to how your agency runs, ask the questions
          only operators would ask, and tell you on the call whether AIOS
          belongs at your agency.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Book a call with founders
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
          30 minutes · No pitch · We tell you if it&apos;s not a fit. The
          on-site audit is a marketing diagnostic, not the real map.
        </p>
      </div>
    </section>
  );
}
