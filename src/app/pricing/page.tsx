import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import { Badge } from "<npm>/components/ui/badge";
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
    "Flat retainers. No per-run fees. OpsRadar builds and maintains your agency's n8n automations — from a free audit to a fully managed system.",
  openGraph: {
    title: "Pricing — OpsRadar",
    description:
      "Flat retainers. No per-run fees. Three tiers: free audit, one-time build, fully managed.",
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
      "Flat retainers. No per-run fees. Three tiers: free audit, one-time build, fully managed.",
    images: ["/og-image.png"],
  },
  robots: { index: false, follow: false },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: "Audit",
    tagline: "Know exactly what to automate first.",
    price: "$0",
    priceNote: "Free. No card required.",
    highlight: false,
    bullets: [
      "3-minute questionnaire. Real numbers, not ranges.",
      "Dollar-figure ROI estimate per workflow",
      "Shortlist of the 3 highest-leverage automations",
      "Recommendations tied to your actual tool stack",
      "Instant delivery — no waiting on a sales call",
    ],
    cta: { label: "Run the free audit", href: "/audit", external: false },
    badge: null,
  },
  {
    name: "Build",
    tagline: "We build the workflows. You own them.",
    price: "$4,500–$18,000",
    priceNote: "One-time, fixed price.",
    highlight: false,
    bullets: [
      "Fixed-price proposal within 48 h of kickoff",
      "Workflows built in your n8n account — you own the code",
      "Delivered in 5–14 business days depending on scope",
      "Video walkthrough before anything goes live",
      "30-day bug fix guarantee after delivery",
      "Covers 1–8 workflows depending on complexity",
    ],
    cta: { label: "Talk to founders", href: CALENDLY_STRATEGY_CALL_URL, external: true },
    badge: null,
  },
  {
    name: "Managed",
    tagline: "We run it. You stop thinking about it.",
    price: "$3,500/mo",
    priceNote: "Flat. No overage. Cancel with 30 days notice.",
    highlight: true,
    bullets: [
      "Everything in Build, recurring",
      "24/7 monitoring — we see failures before you do",
      "API breakage recovery when Meta or Google changes something",
      "Monthly performance review with numbers, not anecdotes",
      "New workflow requests included (queue-based, not hourly)",
      "Credentials and logs stay in your infrastructure — always",
      "Your team queries Claude directly against your own data",
    ],
    cta: { label: "Talk to founders", href: CALENDLY_STRATEGY_CALL_URL, external: true },
    badge: "Most popular",
  },
];

const FLAT_RETAINER_POINTS = [
  {
    label: "No per-run fees",
    copy: "Zapier charges per task. We charge per month. Run 1,000 automations or 1,000,000 — the invoice is the same.",
  },
  {
    label: "No surprise bills",
    copy: "Scope is fixed before we start. You see the full price in writing before we write a line of code.",
  },
  {
    label: "No volume punishment",
    copy: "As your agency grows, your automation runs more. That's the point. We don't penalise you for it.",
  },
];

const NOT_INCLUDED = [
  "Training your team to use n8n",
  "Hourly consulting or ad-hoc advisory",
  "Dashboards you want to own and maintain yourself",
  "Data warehousing or business intelligence setup",
  "IT infrastructure or cloud hosting",
  "Integrations with tools that have no public API",
];

const FAQS = [
  {
    q: "What's actually different about flat pricing?",
    a: "Most automation tools charge per task, per run, or per seat. Zapier's Business plan runs $103/mo for 2,000 tasks — a single report workflow can burn through that in a week. OpsRadar charges one flat number regardless of how many times your workflows execute.",
  },
  {
    q: "What tools can you connect?",
    a: "Anything with an API or webhook: HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, Notion, Airtable, Stripe, QuickBooks, Triple Whale, Klaviyo, Meta Ads, Google Ads, GA4, Calendly, and hundreds more via n8n's native library. If it has an API, we can reach it.",
  },
  {
    q: "How long does a build take?",
    a: "A single workflow takes 5–10 business days. A multi-workflow system takes 2–4 weeks. You get a specific timeline in the proposal before committing — not a range after you've paid.",
  },
  {
    q: "What if a workflow breaks after delivery?",
    a: "On Managed, our team is monitoring 24/7 and fixes it before you notice. On Build, every delivery includes 30 days of free bug fixes. After 30 days, you can upgrade to Managed or handle it yourself — you own the code either way.",
  },
  {
    q: "Do I need to understand n8n to work with you?",
    a: "No. You describe the problem in plain English. We build it, walk you through the logic on a recorded video, and deploy it. You'll understand what it does — you won't need to touch the code.",
  },
  {
    q: "What happens if I cancel Managed?",
    a: "Cancel with 30 days notice. Your workflows keep running in your n8n account — we just stop maintaining them. Nothing breaks on cancellation because we never held your code hostage.",
  },
  {
    q: "Do you store my clients' data?",
    a: "No. Client data from your connected tools (HubSpot, Google Ads, etc.) is never written to OpsRadar's database. Workflows read your data live through your credentials. Your data stays on your infrastructure.",
  },
  {
    q: "How is the Build price calculated?",
    a: "$4,500 covers a straightforward single-workflow build (e.g. a lead router or invoice reminder). Complex multi-step, multi-tool systems with branching logic can reach $18,000. You'll have a fixed number in writing within 48 hours of the kickoff call.",
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
      <TierGrid />
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
          Flat retainers. No per-run fees.
        </h1>
        <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          You pay one number per month. Your workflows run as many times as they
          need to. Zapier charges for every task. We never do.
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Tier cards                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function TierGrid() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {TIERS.map((tier) => (
            <TierCard key={tier.name} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: (typeof TIERS)[number] }) {
  return (
    <Card
      className={
        tier.highlight
          ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
          : ""
      }
    >
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3 mb-1">
          <CardTitle className="font-serif text-h3 tracking-[-0.02em]">
            {tier.name}
          </CardTitle>
          {tier.badge && (
            <Badge variant="default" className="shrink-0 mt-0.5">
              {tier.badge}
            </Badge>
          )}
        </div>
        <CardDescription>{tier.tagline}</CardDescription>
        <div className="pt-4">
          <p className="font-mono text-h2 font-medium tabular-nums text-[var(--color-fg)] tracking-[-0.02em]">
            {tier.price}
          </p>
          <p className="mt-1 text-caption text-[var(--color-fg-subtle)]">
            {tier.priceNote}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <ul className="space-y-3">
          {tier.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]">
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
        {tier.cta.external ? (
          <Button
            asChild
            variant={tier.highlight ? "default" : "outline"}
            className="w-full"
          >
            <a
              href={tier.cta.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tier.cta.label}
              <ArrowRight className="size-4" />
            </a>
          </Button>
        ) : (
          <Button
            asChild
            variant={tier.highlight ? "default" : "outline"}
            className="w-full"
          >
            <Link href={tier.cta.href}>
              {tier.cta.label}
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
              Automation tools tax your growth. We price against the system, not
              the runs.
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
            We price systems, not task volume.
          </blockquote>
          <p className="mt-4 text-body text-[var(--color-fg-muted)] max-w-xl leading-[1.6]">
            Zapier punishes you when your agency grows. We are aligned with your
            growth — we benefit when you use the system more, not when we bill
            you more for it.
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
              We do three things well. We don&rsquo;t pretend to do everything.
              Here is what falls outside our work.
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
        <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
        <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          Talk to founders.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          A 20-minute call. We start with a real diagnosis, not a demo.
          Bring your tool stack or just show up — no prep needed.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Talk to founders
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/audit">Run the audit first</Link>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          No credit card. No pitch. Just the shortlist of workflows
          burning the most money in your agency right now.
        </p>
      </div>
    </section>
  );
}
