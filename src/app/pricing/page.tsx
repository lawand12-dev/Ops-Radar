import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "<npm>/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "<npm>/components/ui/accordion";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

// ── Production gate ───────────────────────────────────────────────────────────

const PRICING_PAGE_VISIBLE =
  process.env.NEXT_PUBLIC_SHOW_PRICING_PAGE === "true";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pricing — OpsRadar",
  description:
    "AIOS is built to your agency and priced to your Blueprint. Flat retainer once live. No per-run fees, no task-volume surprises. Starts with a call.",
  openGraph: {
    title: "Pricing — OpsRadar",
    description:
      "AIOS is built to your agency and priced to your Blueprint. Flat retainer once live. No per-run fees.",
    url: "https://www.opsradar.co/pricing",
    siteName: "OpsRadar",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Pricing" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — OpsRadar",
    description:
      "AIOS is built to your agency and priced to your Blueprint. Flat retainer once live. No per-run fees.",
    images: ["/og-image.png"],
  },
  robots: { index: false, follow: false },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const FUNNEL_STEPS = [
  {
    n: "01",
    tag: "Call",
    name: "Call",
    tagline: "Start here. 30 minutes. No pitch.",
    priceLabel: "Free",
    priceNote: "Always.",
    highlight: false,
    bullets: [
      "30-minute conversation with the founders",
      "You walk through how your agency runs",
      "We ask the questions only operators would ask",
      "Both sides know if AIOS is a fit by the end",
      "We tell you if it's not a fit — on the call",
    ],
    cta: { label: "Book a call with founders", href: CALENDLY_STRATEGY_CALL_URL, external: true },
  },
  {
    n: "02",
    tag: "Discovery",
    name: "Discovery",
    tagline: "We go deep on your agency before anything gets built.",
    priceLabel: "Free",
    priceNote: "No obligation.",
    highlight: false,
    bullets: [
      "Structured forms and working sessions",
      "We map your tools, clients, team, and patterns",
      "We tell you honestly if AIOS is the right fit",
      "No demo, no deck, no nine-page MSA",
      "We walk away understanding how your agency actually works",
    ],
    cta: { label: "Book a call with founders", href: CALENDLY_STRATEGY_CALL_URL, external: true },
  },
  {
    n: "03",
    tag: "Blueprint",
    name: "Blueprint",
    tagline: "A written plan for your AIOS. With the build price inside.",
    priceLabel: "Paid engagement",
    priceNote: "Quoted on the discovery call.",
    highlight: true,
    bullets: [
      "Current-state diagnosis of your operations",
      "Full plan for what AIOS will do in your agency",
      "Which workflows get built first and why",
      "The build price — fixed, in writing",
      "A buy-or-don't decision with full visibility",
    ],
    cta: { label: "Book a discovery call", href: CALENDLY_STRATEGY_CALL_URL, external: true },
  },
  {
    n: "04",
    tag: "Build",
    name: "Build",
    tagline: "Your AIOS goes live. Flat retainer. No volume surprises.",
    priceLabel: "Custom-scoped",
    priceNote: "Price is in your Blueprint PDF.",
    highlight: false,
    bullets: [
      "Workflows run on your accounts — you own the code",
      "OPERATE, OBSERVE, BRAIN, and GUARD all live",
      "Flat monthly retainer once the system is running",
      "No per-run fees, no task-volume tiers",
      "Every credential, every log — in your accounts",
    ],
    cta: { label: "Book a call with founders", href: CALENDLY_STRATEGY_CALL_URL, external: true },
  },
];

const FLAT_RETAINER_POINTS = [
  {
    label: "No per-run fees",
    copy: "Zapier charges per task. AIOS charges per month. Run 1,000 automations or 1,000,000 — the invoice is the same.",
  },
  {
    label: "No surprise bills",
    copy: "Scope is fixed before build begins. The price lives in your Blueprint PDF. Nothing changes after you say yes.",
  },
  {
    label: "No volume punishment",
    copy: "As your agency grows, AIOS runs more. That is the point. The retainer does not penalise you for using the system.",
  },
];

const NOT_INCLUDED = [
  "Hourly consulting or ad-hoc advisory",
  "Training your team to manage the automation platform",
  "BI dashboards you want to own and maintain yourself",
  "Data warehousing or business intelligence setup",
  "IT infrastructure or cloud hosting",
  "Integrations with tools that have no public API",
];

const FAQS = [
  {
    q: "How much does AIOS cost?",
    a: "Build cost is set in your Blueprint PDF after OpsRadar understands your agency. There is no list price because there is no list AIOS — every one is built for the business it runs inside. The Blueprint is where the number lives.",
  },
  {
    q: "What is the Blueprint, and why is the price there?",
    a: "The Blueprint is a paid engagement delivered as a PDF. It shows the current-state diagnosis of your operations, the full plan for your AIOS, what gets built first, and the fixed build price. The price belongs there — not on a webpage — because scope determines cost, and scope comes from understanding your agency, not guessing at it.",
  },
  {
    q: "What does flat retainer actually mean?",
    a: "Once AIOS is live, you pay one flat number each month. Your workflows can execute as many times as they need to. There are no per-run fees, no task-volume tiers, and no usage-based surcharges. The invoice is the same whether the system runs ten times or ten thousand times.",
  },
  {
    q: "How is AIOS different from Zapier or ad-hoc consulting?",
    a: "Zapier charges per task — it punishes you for growing. Consulting charges by the hour — you pay for time whether or not anything ships. AIOS is a built system, delivered to your infrastructure, running on a flat retainer. You pay for outcomes, not inputs.",
  },
  {
    q: "What tools can AIOS connect?",
    a: "Anything with an API or webhook: HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, Notion, Airtable, Stripe, QuickBooks, Triple Whale, Klaviyo, Meta Ads, Google Ads, GA4, Calendly, and most tools your agency already pays for. If it has an API, AIOS can reach it.",
  },
  {
    q: "Do you store my clients' data?",
    a: "No. Client data from your connected tools is never written to OpsRadar's database. Workflows read your data live through your credentials. Your data stays on your infrastructure, not ours.",
  },
  {
    q: "What happens to my workflows if I stop working with OpsRadar?",
    a: "Every workflow runs on your accounts, on your credentials, under your control from day one. If OpsRadar ever disappeared, nothing would break. The code is yours and always has been.",
  },
  {
    q: "How long does a build take?",
    a: "Timeline is part of the Blueprint. OpsRadar gives you a specific delivery window in writing before you commit — not a range after you have paid.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  if (!PRICING_PAGE_VISIBLE) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/pricing" />

      <PageHeader />
      <FunnelSection />
      <FlatRetainerSection />
      <NotIncludedSection />
      <FaqSection />
      <FinalCTA />

      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page header                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 pt-14 md:pt-20 pb-20 md:pb-24">
        <p className="text-label text-[var(--color-fg-subtle)]">Pricing</p>
        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4vw+0.5rem,4rem)] leading-[1.05] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-2xl">
          Built to your agency. Priced to your Blueprint.
        </h1>
        <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          AIOS is not a template with a price tag. It is built for the specific
          operations of your agency. The build price lives in your Blueprint PDF
          — after OpsRadar has understood your agency. Flat retainer once live.
          No per-run fees. No Zapier-style task-volume punishment.
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Funnel — 4 steps as cards                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function FunnelSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl mb-14">
          <p className="text-label text-[var(--color-fg-subtle)]">How OpsRadar works</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            Call → Discovery → Blueprint → Build.
          </h2>
          <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
            Every engagement follows the same four steps. The price is not a
            number on this page — it is a fixed line in a document written
            specifically for your agency.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {FUNNEL_STEPS.map((step) => (
            <FunnelCard key={step.name} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FunnelCard({ step }: { step: (typeof FUNNEL_STEPS)[number] }) {
  return (
    <Card
      className={
        step.highlight
          ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
          : ""
      }
    >
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
            — {step.n}
          </p>
        </div>
        <p className="text-label text-[var(--color-primary)] mb-1">{step.tag}</p>
        <CardTitle className="font-serif text-h3 tracking-[-0.02em]">
          {step.name}
        </CardTitle>
        <CardDescription>{step.tagline}</CardDescription>
        <div className="pt-4">
          <p className="font-mono text-h2 font-medium tabular-nums text-[var(--color-fg)] tracking-[-0.02em]">
            {step.priceLabel}
          </p>
          <p className="mt-1 text-caption text-[var(--color-fg-subtle)]">
            {step.priceNote}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <ul className="space-y-3">
          {step.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]"
            >
              <Check
                className="size-4 shrink-0 mt-0.5 text-[var(--color-success)]"
                aria-hidden
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-2 pb-2">
        {step.cta.external ? (
          <Button
            asChild
            variant={step.highlight ? "default" : "outline"}
            className="w-full"
          >
            <a
              href={step.cta.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {step.cta.label}
              <ArrowRight className="size-4" />
            </a>
          </Button>
        ) : (
          <Button
            asChild
            variant={step.highlight ? "default" : "outline"}
            className="w-full"
          >
            <Link href={step.cta.href}>
              {step.cta.label}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Flat retainer callout                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function FlatRetainerSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label text-[var(--color-fg-subtle)]">What flat means</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              One number. Every month.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              Automation tools tax your growth. AIOS prices against the system,
              not the runs.
            </p>
          </div>

          <div className="space-y-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {FLAT_RETAINER_POINTS.map((pt) => (
              <div
                key={pt.label}
                className="bg-[var(--color-surface)] p-8 md:p-10 grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-start"
              >
                <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-1 min-w-[140px]">
                  {pt.label}
                </p>
                <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">
                  {pt.copy}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pull-quote */}
        <div className="mt-20 border-l-2 border-[var(--color-primary)] pl-8 md:pl-10 max-w-3xl">
          <blockquote className="font-serif text-[clamp(1.5rem,2.6vw+0.4rem,2.25rem)] leading-[1.15] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            AIOS prices systems, not task volume.
          </blockquote>
          <p className="mt-4 text-body text-[var(--color-fg-muted)] max-w-xl leading-[1.6]">
            Zapier punishes you when your agency grows. AIOS is aligned with
            your growth — the system runs more because it is earning its keep.
            Not because we found another line item to charge.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  What's NOT included — editorial honesty                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function NotIncludedSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-28">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12 items-start">
          <div>
            <p className="text-label text-[var(--color-fg-subtle)]">Honesty section</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              What&rsquo;s out of scope.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              AIOS does a specific set of things very well. It does not pretend
              to do everything. Here is what falls outside the work.
            </p>
          </div>

          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {NOT_INCLUDED.map((item) => (
              <li
                key={item}
                className="flex items-center gap-4 py-5 text-body text-[var(--color-fg-muted)]"
              >
                <X
                  className="size-4 shrink-0 text-[var(--color-fg-faint)]"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  FAQ                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function FaqSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <p className="text-label text-[var(--color-fg-subtle)]">Questions</p>
        <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance mb-14">
          Frequently asked.
        </h2>

        <Accordion type="multiple">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
          The price is in the Blueprint.
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
          <Button asChild variant="outline" size="lg">
            <Link href="/audit">
              Or try the 3-minute audit
            </Link>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          30 minutes · No pitch · We tell you if it&apos;s not a fit.
        </p>
      </div>
    </section>
  );
}
