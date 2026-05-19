import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pricing — AI COO for Agencies ($750–$3,000/mo)",
  description:
    "The AI COO for marketing agencies — from $750/month. One-tenth the cost of a fractional COO, running 24/7 on the tools you already pay for. 30-day money-back. Book a 30-minute call.",
  openGraph: {
    title: "The AI COO for $750/mo. Not $10K/mo.",
    description:
      "Four tiers from $750 to $3,000. Built for $1M–$5M agencies who can't afford a fractional COO but need one. Live on your stack in week one.",
    url: "https://www.opsradar.co/pricing",
    siteName: "OpsRadar",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Pricing" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The AI COO for $500/mo. Not $10K/mo.",
    description:
      "Four tiers from $750 to $3,000. Built for $1M–$5M agencies who can't afford a fractional COO but need one.",
    images: ["/og-image.png"],
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

type Tier = {
  name: string;
  badge?: string;
  badgeTone?: "highlight" | "partner";
  price: string;
  priceUnit: string;
  annualPrice: string;
  annualNote: string;
  tagline: string;
  cooAnchor: string;
  includesHeader: string;
  bullets: string[];
  audience: string;
  outgrow: string;
  cta: { label: string; href: string };
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$750",
    priceUnit: "/month",
    annualPrice: "$7,500/year",
    annualNote: "Annual prepay — 2 months free (17%).",
    tagline:
      "For the owner running ops solo with 3 tools and no time to pull numbers.",
    cooAnchor: "vs a fractional COO: less than 1/10th the cost. Weekly instead of quarterly.",
    includesHeader: "What's included",
    bullets: [
      "3 integrations of your choice (e.g. HubSpot + ClickUp + Harvest)",
      "Weekly agency health score (0–100, per client and overall)",
      "Monthly automation audit — what's leaking, what to fix first",
      "Margin, utilization, and cash flow visibility in one place",
      "Email alerts when something starts going wrong",
      "1 owner seat",
      "30-day money-back guarantee",
    ],
    audience:
      "$500K–$1.5M agency, 5–10 people, founder doing ops in evenings and weekends.",
    outgrow:
      "You'll outgrow this when you connect a 4th tool, or your first unprofitable client costs you more than $750 to find.",
    cta: { label: "Book a 30-min call", href: CALENDLY_STRATEGY_CALL_URL },
  },
  {
    name: "Growth",
    badgeTone: "highlight",
    price: "$1,500",
    priceUnit: "/month",
    annualPrice: "$15,000/year",
    annualNote: "Annual prepay — 2 months free (17%).",
    tagline:
      "For the 10–25 person agency where the owner can't see every client's margin in real time anymore.",
    cooAnchor:
      "vs a fractional COO: 1/7th the cost. With live numbers they never had.",
    includesHeader: "Everything in Starter, plus",
    bullets: [
      "Per-client profitability + scope creep alerts — catch the leaking client in week 2, not month 3",
      "All 10 integrations (HubSpot, Pipedrive, ClickUp, Asana, Monday, Harvest, Toggl, Stripe, Calendly, Apollo)",
      "COO chat — ask \"which client is at risk this month\" and get a real answer with live numbers",
      "Threshold alerts on margin, utilization, cash flow",
      "Peer benchmarks by team size and service mix",
      "50 agentic actions/month included",
      "3 seats included; +$100/seat after that",
      "30-day money-back guarantee",
    ],
    audience:
      "$1.5M–$3M agency, 10–25 people, owner-operator or head of ops, 6–8 tools in active use.",
    outgrow:
      "You'll outgrow this when you want OpsRadar to act on alerts, not just send them.",
    cta: { label: "Book a 30-min call", href: CALENDLY_STRATEGY_CALL_URL },
  },
  {
    name: "Pro",
    price: "$3,000",
    priceUnit: "/month",
    annualPrice: "$30,000/year",
    annualNote: "Annual prepay — 2 months free (17%).",
    tagline:
      "For the 25–50 person agency where decisions need to happen faster than the owner can make them.",
    cooAnchor:
      "vs a fractional COO: 1/3rd the cost — and OpsRadar does what they recommend, not just recommends it.",
    includesHeader: "Everything in Growth, plus",
    bullets: [
      "Agentic actions — OpsRadar drafts the invoice, sends the PM nudge, adjusts the retainer. Every action has a 30-minute undo and a 5-evaluator safety net.",
      "Multi-client view for your in-house head of ops",
      "Custom alerts, webhooks, Slack + Teams routing",
      "OpsRadar Index — drill into peer agency cohorts by service mix and size",
      "Quarterly review with the founder (60 min, recorded, your team can join)",
      "200 agentic actions/month included; $15/action after",
      "10 seats included; +$100/seat after that",
      "60-day money-back guarantee — agentic actions take 2–4 weeks of trust to enable",
    ],
    audience:
      "$3M–$5M agency, 25–50 people, head of ops on payroll or a fractional COO already embedded.",
    outgrow:
      "You'll outgrow this when you cross $5M ARR, run 3+ business units, or exceed 400 actions/month for two months running.",
    cta: { label: "Talk to the founder", href: CALENDLY_STRATEGY_CALL_URL },
  },
  {
    name: "Fractional Operator",
    badge: "For partners",
    badgeTone: "partner",
    price: "$1,200",
    priceUnit: "/month + $300 per agency",
    annualPrice: "Monthly only",
    annualNote: "Partner cash flow matches client cash flow.",
    tagline:
      "For fractional COOs and consultancies managing 3+ agency clients.",
    cooAnchor:
      "vs your manual onboarding audit: weeks of work compressed to hours, on every new client.",
    includesHeader: "What's included",
    bullets: [
      "Multi-client dashboard — one login, every agency",
      "Side-by-side health scores, benchmarks, alerts across your book",
      "Branded as your firm (optional white-label)",
      "25% lifetime referral commission on every agency you bring on — no vesting cliff",
      "Onboarding audit compressed from weeks to hours",
      "Partner permissions and audit logs across the book",
      "30-day money-back guarantee",
    ],
    audience:
      "Fractional COOs, agency ops consultants, and small consultancies running 3–10+ agency clients on retainer.",
    outgrow:
      "You'll outgrow this when you cross 15 agencies — talk to us about Enterprise partner terms.",
    cta: {
      label: "Apply to join the partner program",
      href: CALENDLY_STRATEGY_CALL_URL,
    },
  },
];

const COMPARISON_ANCHOR = [
  {
    name: "Fractional COO",
    cost: "$7,000–$15,000/mo",
    detail:
      "Part-time human. Quarterly reviews. Knowledge leaves when they do.",
  },
  {
    name: "Full-time COO",
    cost: "$25,000–$43,000/mo",
    detail:
      "A real one. If you can afford one, you're not in our ICP.",
  },
  {
    name: "OpsRadar AI COO",
    cost: "$750–$3,000/mo",
    detail:
      "24/7 on your stack. Built only for agencies. Sees every client every day.",
    highlight: true,
  },
];


const FAQS = [
  {
    q: "$1,500 is steep for us.",
    a: "If you compare $1,500 to a software subscription, yes — it's high. If you compare it to manual reporting time, the cost of finding an unprofitable client in month 3 instead of week 2, and the fractional COO you're either paying or thinking about hiring, it's not even close. Tell us what you're paying now to do these things and we'll show you the math in five minutes. If the number isn't 3x what you'd pay us, don't sign.",
  },
  {
    q: "Why is Pro 2x Growth?",
    a: "Because Pro replaces the part of a fractional COO that acts. Growth tells you what to do. Pro does it — invoice drafts, PM nudges, retainer adjustments, with a 30-minute undo on everything. That saves 30 to 40 hours a month of owner or head-of-ops time. At $250/hour, that's $7,500 to $10,000 of value. Pro is $3,000. The 2x ratio is conservative.",
  },
  {
    q: "Can we do month-to-month?",
    a: "Yes. Every tier is month-to-month by default. Annual saves you 17% (2 months free). Most agencies start monthly, stay 3 months, then switch to annual when they're ready to lock the price.",
  },
  {
    q: "We need to start at the lowest tier and prove it.",
    a: "Starter is built for exactly that. The agencies that stay on Starter forever are running 3 tools and one or two clients — probably not you. Most agencies move to Growth in month 2 or 3 because per-client profitability pays for the upgrade twice over. We'll tell you when the math says move up.",
  },
  {
    q: "Our fractional COO costs less than your Pro.",
    a: "Which one? The market floor for a real fractional COO is $7,000/month. If yours is under $3,000, they're either brand new, doing this on the side, or both — meaning their knowledge walks out the door the moment they get a bigger client. If they're generating $40K of value a month, keep them. Run OpsRadar Starter alongside so they have live numbers instead of stale spreadsheets.",
  },
  {
    q: "Do you discount?",
    a: "Annual prepay: 17% off (2 months free). Multi-year prepay: 22% year 1, 25% year 2, price-locked. Founder pricing: 50% off for 3 months, capped at the first 10 logos. That's it. We don't match competitor prices because we're not competing on price with a PSA — we're competing on outcome with a fractional COO.",
  },
  {
    q: "What if I want to cancel?",
    a: "Email or message us. 30-day money-back, no questions asked. 60-day on Pro. After that, cancel any time at the end of your billing cycle. Your data was never trapped in us — it lives in HubSpot, ClickUp, Harvest, Stripe, etc. We were only reading from them.",
  },
  {
    q: "Why isn't there a free tier?",
    a: "Because a free tier turns the founder into a free-tier support engineer, and the founder needs to ride the first 100 customers to capture what's actually working. Our free surface is the audit at /audit — three minutes, real dollar number, no credit card. Then a 30-minute call, then paid.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/pricing" />

      <PageHeader />
      <ComparisonAnchorSection />
      <TiersSection />
      <RiskReversalSection />
      <FounderPricingSection />
      <NotAPSASection />
      <FaqSection />
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
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-20 md:pb-24">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            Pricing — flat per agency, not per user
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-7 text-[var(--color-fg)] text-balance max-w-[16ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            The AI COO for{" "}
            <span className="text-[var(--color-primary)]">$750/mo</span>.
            Not&nbsp;$10K/mo.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={280} offset={48}>
          <p
            className="mt-8 max-w-[42rem] text-[var(--color-fg-muted)]"
            style={{
              fontSize: "var(--text-lead)",
              lineHeight: "var(--text-lead--line-height)",
              fontWeight: 400,
            }}
          >
            Every tier reads from the tools you already pay for, watches margin
            and utilization 24/7, and tells you the next move. Flat per agency.
            No seat tax. 30-day money-back, no questions asked.
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a 30-min call
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/audit">Or run the 3-minute audit first &rarr;</Link>
            </Button>
          </div>
        </RevealOnScroll>

      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Comparison anchor (the WTP frame)                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function ComparisonAnchorSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] max-w-2xl">
            Before you read the prices, know what you&rsquo;re comparing them to
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={100} offset={40}>
        <div className="mt-6 grid gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden md:grid-cols-3">
          {COMPARISON_ANCHOR.map((item) => (
            <div
              key={item.name}
              className={
                "bg-[var(--color-surface)] p-6 md:p-8 flex flex-col gap-2 " +
                (item.highlight
                  ? "ring-1 ring-inset ring-[var(--color-primary)]"
                  : "")
              }
            >
              <p className="text-label text-[var(--color-fg-subtle)]">
                {item.name}
              </p>
              <p
                className={
                  "font-mono text-h3 font-medium tabular-nums tracking-[-0.02em] " +
                  (item.highlight
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-fg)]")
                }
              >
                {item.cost}
              </p>
              <p className="text-body-sm leading-[1.55] text-[var(--color-fg-muted)] mt-1">
                {item.detail}
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
/*  Tier cards                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function TiersSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-[92rem] px-6 py-14 md:py-20">
        <RevealOnScroll delay={0} offset={40}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-stretch">
            {TIERS.map((tier) => (
              <TierCard key={tier.name} tier={tier} />
            ))}
          </div>
          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-2xl">
            Agentic actions: +$25/action over 50 on Growth, +$15/action over 200 on
            Pro. Additional seats: +$100/seat after the included quota. Discovery
            + Blueprint are bundled into your first month on Growth and Pro.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const isHighlight = tier.badgeTone === "highlight";
  const isPartner = tier.badgeTone === "partner";

  return (
    <div
      className={
        "flex flex-col rounded-[var(--radius-md)] bg-[var(--color-surface)] " +
        (isHighlight
          ? "shadow-[var(--shadow-md)] ring-1 ring-inset ring-[var(--color-primary)]/20"
          : isPartner
            ? "border border-dashed border-[var(--color-border-strong)]"
            : "border border-[var(--color-border)]")
      }
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
            — {tier.name}
          </p>
          {isPartner && (
            <span className="font-mono text-caption uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]">
              For partners
            </span>
          )}
        </div>

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
          {tier.name}
        </h3>
        <p className="mt-1.5 text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          {tier.tagline}
        </p>

        <div className="mt-4">
          <p
            className="font-mono tabular-nums text-[var(--color-fg)] tracking-[-0.02em]"
            style={{ fontSize: "var(--text-h2)", fontWeight: 500 }}
          >
            {tier.price}
            <span className="text-body text-[var(--color-fg-muted)] font-normal">
              {tier.priceUnit}
            </span>
          </p>
          <p className="mt-1 text-caption text-[var(--color-fg-subtle)]">
            {tier.annualPrice} · {tier.annualNote}
          </p>
        </div>

        <p className="mt-3 text-body-sm leading-[1.5] text-[var(--color-primary)] font-medium">
          {tier.cooAnchor}
        </p>
      </div>

      {/* Bullets */}
      <div className="flex-1 px-5 py-5">
        <p className="text-label text-[var(--color-fg-subtle)] mb-3">
          {tier.includesHeader}
        </p>
        <ul className="space-y-2">
          {tier.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]"
            >
              <Check className="size-4 shrink-0 mt-0.5 text-[var(--color-success)]" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
          <div>
            <p className="text-label text-[var(--color-fg-subtle)] mb-1">Who this is for</p>
            <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">{tier.audience}</p>
          </div>
          <div>
            <p className="text-label text-[var(--color-fg-subtle)] mb-1">You&rsquo;ll outgrow this when</p>
            <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">{tier.outgrow}</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Button asChild variant={isHighlight ? "default" : "outline"} className="w-full">
          <a href={tier.cta.href} target="_blank" rel="noopener noreferrer">
            {tier.cta.label}
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Risk reversal                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function RiskReversalSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12">
          <RevealOnScroll delay={0} offset={40}>
          <div>
            <p className="text-label text-[var(--color-fg-subtle)]">
              Risk reversal
            </p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              30-day money-back. No questions asked.
            </h2>
          </div>
          </RevealOnScroll>
          <RevealOnScroll delay={100} offset={40}>
          <div className="space-y-6">
            <p className="text-body leading-[1.6] text-[var(--color-fg-muted)] max-w-2xl">
              If OpsRadar isn&rsquo;t earning its keep in the first month, we
              send the money back the same day. Pro tier gets 60 days, because
              agentic actions take 2 to 4 weeks of trust before you turn them on
              for real clients.
            </p>
            <p className="text-body leading-[1.6] text-[var(--color-fg-muted)] max-w-2xl">
              <span className="text-[var(--color-fg)] font-medium">
                We don&rsquo;t promise &ldquo;we&rsquo;ll find $X or it&rsquo;s
                free&rdquo;
              </span>{" "}
              because the moment you put a dollar guarantee on it, the audit
              becomes a contract you litigate every month. We&rsquo;d rather
              refund and learn why than argue about whether $4,800 of utilization
              recovery counts.
            </p>
            <ol className="space-y-3 text-body-sm leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
              <li className="flex gap-3">
                <span className="font-mono text-caption text-[var(--color-fg-subtle)] mt-0.5">
                  01
                </span>
                <span>
                  <Link
                    href="/audit"
                    className="text-[var(--color-fg)] underline-offset-4 hover:underline"
                  >
                    Free audit
                  </Link>{" "}
                  — get a real dollar number on what you&rsquo;re leaking in 3
                  minutes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-caption text-[var(--color-fg-subtle)] mt-0.5">
                  02
                </span>
                <span>
                  30-minute call with the founder — no pitch, no slides. We tell
                  you if we&rsquo;re not a fit.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-caption text-[var(--color-fg-subtle)] mt-0.5">
                  03
                </span>
                <span>
                  30-day money-back (60-day on Pro) after you sign on.
                </span>
              </li>
            </ol>
          </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Founder pricing                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function FounderPricingSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">
            Founder pricing
          </p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance max-w-3xl">
            First 10 agencies pay 50% off for the first 3 months.
          </h2>
          <p className="mt-5 max-w-2xl text-body leading-[1.6] text-[var(--color-fg-muted)]">
            Then full price. No lifetime discounts. Three months is enough to
            see the value and build the case study together. Full price at
            month 4 is on us, not on you.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <div className="mt-10 grid gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden md:grid-cols-3">
            {[
              { name: "Starter", was: "$750", now: "$375" },
              { name: "Growth", was: "$1,500", now: "$750" },
              { name: "Pro", was: "$3,000", now: "$1,500" },
            ].map((row) => (
              <div
                key={row.name}
                className="bg-[var(--color-surface)] p-6 md:p-8"
              >
                <p className="text-label text-[var(--color-fg-subtle)]">
                  {row.name}
                </p>
                <p className="mt-3 font-mono text-body text-[var(--color-fg-muted)] tabular-nums">
                  <span className="line-through">{row.was}/mo</span>
                </p>
                <p className="font-mono text-h2 font-medium tabular-nums text-[var(--color-primary)] tracking-[-0.02em]">
                  {row.now}/mo
                </p>
                <p className="mt-2 text-caption text-[var(--color-fg-subtle)]">
                  for 3 months, then list price
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Button asChild size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Claim a founder slot
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  What we are not                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function NotAPSASection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">What we are not</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            OpsRadar is not a PSA.
          </h2>
          <p className="mt-6 text-body leading-[1.6] text-[var(--color-fg-muted)]">
            It doesn&apos;t replace ClickUp, Harvest, or HubSpot. It sits on top of
            them and tells you what&apos;s going wrong before you find out the hard
            way. If you need a system of record, buy a PSA. If you need someone
            watching the numbers 24/7 and telling you what to do about them,
            that&apos;s us.
          </p>
        </RevealOnScroll>
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
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">
            Questions about pricing
          </p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance mb-12">
            The objections we hear most.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
        <Accordion type="multiple">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
          <p className="text-label text-[var(--color-fg-subtle)]">Two ways to start</p>
          <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            Both free.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Thirty minutes with the founder. No pitch, no slides. If we&rsquo;re
            not a fit, we tell you on the call.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a 30-min call with the founder
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/audit">Run the 3-minute audit first</Link>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
            30 minutes · No pitch · We tell you if it&rsquo;s not a fit.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
