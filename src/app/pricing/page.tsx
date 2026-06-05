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
  title: "Pricing — OpsRadar AI Operating System",
  description:
    "Hybrid model: $750–$3,000/month flat + $15–$25 per approved action. No token surprises. 30–60 day money-back guarantee.",
  openGraph: {
    title: "Price a fractional COO by the action. $750–$3,000/month.",
    description:
      "Approved actions, not API tokens. Company Brain limits. Your agents work like employees. 30–60 day risk-reversal guarantee.",
    url: "https://www.opsradar.co/pricing",
    siteName: "OpsRadar",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Pricing" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Price a fractional COO by the action. $750–$3,000/month.",
    description:
      "Flat + approved actions. 30–60 day guarantee. Agents earn autonomy. No blind automation.",
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
  billingNote: string;
  guarantee?: string;
  tagline: string;
  pitchLine: string;
  includesHeader: string;
  bullets: string[];
  notIncluded?: string;
  outcomeMeter?: string;
  cta: { label: string; href: string };
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$750",
    priceUnit: "/month",
    billingNote: "Billed monthly or annually (17% off = 2 months free) · Cancel anytime",
    guarantee: "30-day money-back guarantee",
    tagline: "For founder-run ops (5–10 person agencies)",
    pitchLine: "A fractional COO charges $10,000/month to do this once a quarter. We do it weekly for less than 1/10th the price.",
    includesHeader: "What's included",
    bullets: [
      "1 owner seat",
      "3 integrations of your choice",
      "Weekly agency health score",
      "Monthly automation audit",
      "Basic dashboard: margin, utilization, cash flow",
      "Company Brain: 25–50 curated documents",
    ],
    notIncluded: "Agentic actions · Multi-seat collaboration · Custom automations",
    cta: { label: "Start free trial", href: "/waitlist" },
  },
  {
    name: "Growth",
    badge: "Most popular",
    badgeTone: "highlight",
    price: "$1,500",
    priceUnit: "/month",
    billingNote: "Billed monthly or annually (17% off = 2 months free) · Cancel anytime",
    guarantee: "30-day money-back guarantee",
    tagline: "For agencies catching margin leaks (10–25 person agencies)",
    pitchLine: "A fractional COO is $10,000/month. We're $1,500. You also get something they can't give you — live numbers, 24/7.",
    includesHeader: "What's included",
    bullets: [
      "3 seats (+$100/seat after)",
      "All 10 integrations (Stripe, HubSpot, ClickUp, Harvest, Notion, etc.)",
      "COO chat with live data context",
      "Per-client profitability + scope creep alerts — catch the leaking client in week 2, not month 3",
      "Peer benchmarks (industry cohorts)",
      "Per-client profitability dashboards",
      "Company Brain: 150–200 documents",
      "50 approved actions/mo included · $25 per action after",
    ],
    cta: { label: "Start free trial", href: "/waitlist" },
  },
  {
    name: "Pro",
    price: "$3,000",
    priceUnit: "/month",
    billingNote: "Billed monthly or annually (17% off = 2 months free) · Cancel anytime",
    guarantee: "60-day money-back guarantee",
    tagline: "For agencies moving faster than humans (25–50 person agencies)",
    pitchLine: "A full-time COO is $25,000–$43,000/month. We're $3,000 — 1/3rd the cost of a fractional COO, with everything they do, 24/7, plus the data they never had.",
    includesHeader: "What's included",
    bullets: [
      "10 seats (+$100/seat after)",
      "Unlimited integrations",
      "Custom alert rules (margin, delivery risk, scope creep)",
      "Webhooks for outbound integrations",
      "Multi-client operations dashboards",
      "Full OpsRadar Index access (peer cohort drill-downs)",
      "Agentic actions (auto-invoice drafts, PM nudges) with 30-minute undo + 5-evaluator safety net",
      "Notion Brain provisioning (20 databases on day 1)",
      "Company Brain: 500 documents (safe limit)",
      "200 approved actions/mo included · $15 per action after",
    ],
    cta: { label: "Start free trial", href: "/waitlist" },
  },
  {
    name: "Fractional Operator",
    badge: "For partners",
    badgeTone: "partner",
    price: "$1,200",
    priceUnit: "/month + $300 per agency",
    billingNote: "Billed monthly or annually (17% off) · Cancel anytime",
    tagline: "For fractional COOs and consultancies (3+ agencies)",
    pitchLine: "Cuts your manual onboarding audit time from weeks to hours. Plus earn 20% commission on every agency you bring.",
    includesHeader: "What's included",
    bullets: [
      "Unlimited seats across your operator org",
      "Multi-client dashboard (one login for every agency)",
      "Side-by-side health scores across all clients",
      "Optional white-label branding",
      "20% referral commission on brought agencies",
      "Per-client audit logs and margin reporting",
      "Everything from Pro",
      "100,000 actions pooled across all managed clients",
    ],
    cta: {
      label: "Talk to founder",
      href: CALENDLY_STRATEGY_CALL_URL,
    },
  },
  {
    name: "Enterprise",
    badge: "Custom",
    badgeTone: "partner",
    price: "Custom",
    priceUnit: "(starts at $5,000/mo)",
    billingNote: "Annual contract · Locked pricing · Custom terms",
    tagline: "For large-scale operations (50+ employees or $5M+ ARR)",
    pitchLine: "Unlimited everything. Designated CSM. Multi-entity reporting.",
    includesHeader: "What's included",
    bullets: [
      "Custom usage allowances (actions, seats, integrations)",
      "Multi-entity reporting (parent + subsidiaries)",
      "Designated Customer Success Manager",
      "Priority support and custom onboarding",
      "Company Brain: Unlimited ingestion",
      "Price-locked annual contracts",
      "Everything from Pro",
    ],
    cta: {
      label: "Talk to founder",
      href: CALENDLY_STRATEGY_CALL_URL,
    },
  },
];

const ANTI_LINDY_RULES = [
  {
    n: "01",
    title: "Background work is free.",
    body: "Reading Slack, synthesizing briefings, gathering data — all free. You only burn action quota when agents propose a high-stakes decision and you click Approve. Reconnaissance costs nothing.",
  },
  {
    n: "02",
    title: "No token multipliers.",
    body: "We never charge more because we routed a task to GPT-5.5 instead of GPT-4. One approved action = flat $15–$25, depending on tier. The model choice is ours. The price per action is yours.",
  },
  {
    n: "03",
    title: "Company Brain has guardrails.",
    body: "Each tier caps document ingestion (Starter: 50, Growth: 200, Pro: 500). Limits prevent DAG compaction and keep Notion fast. You own every document. You control what goes in.",
  },
  {
    n: "04",
    title: "Earned autonomy, never blind autonomy.",
    body: "High-risk actions (firing clients, invoices, mass email) stay Ask-only forever. Routine actions earn autonomy after 30+ approvals at 90%+ rate. Agents work like employees, not rogue bots.",
  },
];

const WEDGE_ROWS = [
  {
    tool: "Fractional COO (10–20 hrs/week)",
    cost: "$10,000/month",
    why: "Weekly audits, alerts, actions 24/7. No vacation, no sleep.",
  },
  {
    tool: "In-house ops manager",
    cost: "$6,000–$8,000/month",
    why: "Margin reporting, scope alerts, invoice tracking, integrations.",
  },
  {
    tool: "Bookkeeper (part-time)",
    cost: "$1,500–$2,500/month",
    why: "Invoice creation, overdue tracking, MRR, payment reminders.",
  },
  {
    tool: "Sales ops / RevOps",
    cost: "$5,000–$7,000/month",
    why: "Pipeline alerts, deal tracking, HubSpot automation, forecasting.",
  },
  {
    tool: "Project manager (part-time)",
    cost: "$3,000–$4,000/month",
    why: "ClickUp routing, delivery health, scope tracking, reminders.",
  },
  {
    tool: "Marketing analyst",
    cost: "$4,000–$6,000/month",
    why: "Analytics tracking, ad spend, conversions, reporting.",
  },
  {
    tool: "Executive assistant",
    cost: "$3,500–$5,000/month",
    why: "Calendar sync, meeting summaries, Slack, action follow-ups.",
  },
];

const FAQS = [
  {
    q: "What counts as \"an approved action\"?",
    a: "Anything your AI agents do on a connected tool when you've clicked Approve: sending Gmail drafts, creating Stripe invoices, updating HubSpot deals, posting in Slack, creating Notion pages, adjusting retainers. Reads—fetching data, looking things up—never count. Only writes you approved count toward your meter.",
  },
  {
    q: "What if I never hit my action cap?",
    a: "Then you pay only the flat tier price. Growth includes 50 actions; Pro includes 200. Most agencies under 25 people stay within their tier cap forever. Background work (briefings, synthesis, Slack monitoring) costs nothing.",
  },
  {
    q: "How does Company Brain capacity work?",
    a: "Each tier has a document limit (Starter: 50, Growth: 200, Pro: 500, Enterprise: unlimited). Those are Pattern Cards, SOPs, Decision Logs—knowledge your agents read to stay context-aware. You control what goes in. When full, archive old docs or upgrade tiers.",
  },
  {
    q: "What if I cancel?",
    a: "Your agents stop running. Your company brain stays in your Notion—it was always there, we just wrote to it. Download a full markdown zip any time from /dashboard/brain/download. We don't hold your data hostage.",
  },
  {
    q: "Can I downgrade or upgrade tiers?",
    a: "Yes. Anytime. End of month. No retention call, no friction. Downgrading from Pro to Growth auto-pauses high-tier features until you reactivate or upgrade again.",
  },
  {
    q: "What about the 30/60-day money-back guarantee?",
    a: "Starter & Growth: 30 days, no questions asked. Pro: 60 days (agentic actions take longer to prove). Fractional Operator & Enterprise: Custom SLAs. If you're not seeing alerts or actions that matter, we'll refund.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/pricing" />

      <PageHeader />
      <TwoPromisesSection />
      <TiersSection />
      <AntiLindySection />
      <WedgeTableSection />
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
            Pricing — approved actions, not API tokens
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-7 text-[var(--color-fg)] text-balance max-w-[24ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Price a fractional COO{" "}
            <span className="text-[var(--color-primary)]">by the action.</span>
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
            A fractional COO costs $10,000/month. We cost $750–$3,000. You get
            the weekly health audits, margin alerts, invoice drafts, retainer
            adjustments — and you control every action they take. Bounded by your
            approval. Agents earn autonomy. They never get it by default.
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/waitlist">
                Start free trial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to founder first &rarr;
              </a>
            </Button>
          </div>
        </RevealOnScroll>
        <RevealOnScroll delay={580} offset={32}>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)]">
            14 days free &middot; No credit card &middot; Brain stays in your Notion &middot; 30–60 day guarantee
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Two promises stripe (above the tiers)                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function TwoPromisesSection() {
  const cards = [
    {
      headline: "Background work is free.",
      body: "Reading Slack, synthesizing briefings, gathering data—all free. Your agents only burn quota when they propose a high-stakes decision and you click Approve. Reconnaissance costs nothing.",
    },
    {
      headline: "Company Brain has guardrails.",
      body: "Each tier caps document ingestion (Starter: 50, Growth: 200, Pro: 500) to prevent data leaks and DAG compaction. You own every document. You control what goes in.",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            Before the tiers — two promises
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={100} offset={40}>
          <div className="mt-8 grid gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden md:grid-cols-2">
            {cards.map((c) => (
              <div
                key={c.headline}
                className="bg-[var(--color-surface)] p-6 md:p-8 flex flex-col gap-3"
              >
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
                  {c.headline}
                </h3>
                <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">
                  {c.body}
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
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            Pick a tier · change anytime
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
            Five tiers. Built around the size and scope of your agency.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-stretch">
            {TIERS.map((tier) => (
              <TierCard key={tier.name} tier={tier} />
            ))}
          </div>
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
          ? "shadow-[var(--shadow-md)] ring-1 ring-inset ring-[var(--color-primary)]/30"
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
          {tier.badge && (
            <span
              className={
                "font-mono text-caption uppercase tracking-[0.1em] px-2 py-0.5 rounded-full " +
                (isHighlight
                  ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
                  : "bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]")
              }
            >
              {tier.badge}
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
            {tier.billingNote}
          </p>
        </div>

        <p className="mt-3 text-body-sm leading-[1.5] text-[var(--color-primary)] font-medium">
          {tier.pitchLine}
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

        {(tier.outcomeMeter || tier.notIncluded || tier.guarantee) && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
            {tier.guarantee && (
              <div>
                <p className="text-body-sm leading-[1.5] text-[var(--color-success)] font-medium flex items-center gap-2">
                  <Check className="size-4" aria-hidden />
                  {tier.guarantee}
                </p>
              </div>
            )}
            {tier.outcomeMeter && (
              <div>
                <p className="text-label text-[var(--color-fg-subtle)] mb-1">Outcome meter</p>
                <p className="text-body-sm leading-[1.5] text-[var(--color-fg)] font-mono tabular-nums">
                  {tier.outcomeMeter}
                </p>
              </div>
            )}
            {tier.notIncluded && (
              <div>
                <p className="text-label text-[var(--color-fg-subtle)] mb-1">Not in {tier.name}</p>
                <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">{tier.notIncluded}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Button asChild variant={isHighlight ? "default" : "outline"} className="w-full">
          {tier.cta.href.startsWith("http") ? (
            <a href={tier.cta.href} target="_blank" rel="noopener noreferrer">
              {tier.cta.label}
              <ArrowRight className="size-4" />
            </a>
          ) : (
            <Link href={tier.cta.href}>
              {tier.cta.label}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Anti-Lindy four rules                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function AntiLindySection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            Four rules we&rsquo;ll never break
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
            Why your bill from us looks the same way every month — and why
            your agents never go rogue.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden md:grid-cols-2">
            {ANTI_LINDY_RULES.map((rule) => (
              <div
                key={rule.n}
                className="bg-[var(--color-surface)] p-6 md:p-8 flex flex-col gap-3"
              >
                <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
                  Rule {rule.n}
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
                  {rule.title}
                </h3>
                <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">
                  {rule.body}
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
/*  $5,200 wedge comparison table                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function WedgeTableSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            What you replace
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
            A 15-person agency pays $5,200/mo for these 10 tools. OpsRadar
            Growth costs $499.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
            <div className="grid grid-cols-[1.1fr_0.9fr_2fr] bg-[var(--color-surface-sunken)] border-b border-[var(--color-border)]">
              <div className="px-5 py-3 text-label text-[var(--color-fg-subtle)] uppercase">
                Tool you cancel
              </div>
              <div className="px-5 py-3 text-label text-[var(--color-fg-subtle)] uppercase border-l border-[var(--color-border)]">
                Monthly cost
              </div>
              <div className="px-5 py-3 text-label text-[var(--color-primary)] uppercase border-l border-[var(--color-border)]">
                OpsRadar replaces it because
              </div>
            </div>
            {WEDGE_ROWS.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.1fr_0.9fr_2fr] border-b last:border-b-0 border-[var(--color-border)]"
              >
                <div className="px-5 py-4 text-body-sm text-[var(--color-fg)] leading-[1.55] font-medium">
                  {row.tool}
                </div>
                <div className="px-5 py-4 text-body-sm text-[var(--color-fg-muted)] leading-[1.55] font-mono tabular-nums border-l border-[var(--color-border)]">
                  {row.cost}
                </div>
                <div className="px-5 py-4 text-body-sm text-[var(--color-fg-muted)] leading-[1.55] border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                  {row.why}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)] max-w-3xl">
            Total replaced: ~$3,500–$5,200/mo (varies by team size). OpsRadar
            Growth: $499/mo. The 7–9× difference is the math customers usually
            run themselves in their first meeting.
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
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            Questions about pricing
          </p>
          <h2
            className="mt-4 text-[var(--color-fg)] text-balance mb-12"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--text-h1--line-height)",
              letterSpacing: "var(--text-h1--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Five questions, five honest answers.
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
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            Replace 10 AI tools with one
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
            Get on the list.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            OpsRadar is in private beta. Self-serve signup ships next. Talk to
            the founder to get a spot in the first batch &mdash; or join the
            waitlist for when the front door opens.
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
                See it in action — 20 min with the founder
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
