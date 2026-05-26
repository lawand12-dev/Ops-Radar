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
    "Flat tiers from $99/mo. $0.05 per approved action over cap. No token surprises, no credit anxiety. Replaces $5,200/mo in scattered AI tools.",
  openGraph: {
    title: "One workforce. One brain. Starts at $99/mo.",
    description:
      "The 10 AI tools you're paying $5,200 a month for — replaced by one workspace. Flat tiers, outcome meter bounded by your approval. No surprises.",
    url: "https://www.opsradar.co/pricing",
    siteName: "OpsRadar",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar — Pricing" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "One workforce. One brain. Starts at $99/mo.",
    description:
      "Flat tiers from $99/mo. $0.05 per approved action over cap. No token surprises.",
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
    price: "$99",
    priceUnit: "/month",
    billingNote: "Billed monthly · Cancel anytime",
    tagline: "For solo operators + tiny teams",
    pitchLine: "Get one AI employee + the brain. Connect 5 tools.",
    includesHeader: "What's included",
    bullets: [
      "1 seat",
      "Up to 5 integrations connected",
      "500 approved actions/mo included",
      "All 28 built-in agents (Revenue, Collections, Scope, Delivery, Briefing, and 23 more)",
      "Company brain — versioned, mirrored to your Notion, exportable any time",
    ],
    notIncluded:
      "Custom AI employees · automations · org-chart delegation · multi-client view",
    cta: { label: "Start free trial", href: "/pricing" },
  },
  {
    name: "Growth",
    badge: "Most popular",
    badgeTone: "highlight",
    price: "$499",
    priceUnit: "/month",
    billingNote: "Billed monthly · Cancel anytime",
    tagline: "For 5–15 person agencies",
    pitchLine: "Hire custom AI employees. Connect everything. Automate everything.",
    includesHeader: "What's included",
    bullets: [
      "5 seats",
      "Unlimited integrations",
      "5,000 approved actions/mo included",
      "Hire custom AI employees from the Hire chat — name them, schedule them, scope their tools",
      "Event-triggered automations (\"when HubSpot deal closes-won, do X\")",
      "All 28 built-in agents",
      "Apprentice Mode — workforce learns from every rejection",
    ],
    outcomeMeter: "$0.05 per approved action over 5,000/mo",
    cta: { label: "Start free trial", href: "/pricing" },
  },
  {
    name: "Pro",
    price: "$1,499",
    priceUnit: "/month",
    billingNote: "Billed monthly · Cancel anytime",
    tagline: "For agencies running multiple retainers",
    pitchLine: "Org-chart delegation. Priority models. The full workforce.",
    includesHeader: "What's included",
    bullets: [
      "20 seats",
      "Unlimited integrations",
      "25,000 approved actions/mo included",
      "Org-chart delegation — managers delegate to direct reports (Trigger.dev triggerAndWait)",
      "Priority models — your queue jumps the line on GPT-5.5",
      "Notion Brain provisioning (20 databases shipped on day 1)",
      "Webhook outbox to your own systems",
      "Everything from Growth",
    ],
    outcomeMeter: "$0.05 per approved action over 25,000/mo",
    cta: { label: "Start free trial", href: "/pricing" },
  },
  {
    name: "Fractional Operator",
    badge: "For partners",
    badgeTone: "partner",
    price: "$2,999",
    priceUnit: "/month",
    billingNote: "Billed monthly · Cancel anytime",
    tagline: "For fractional COOs running multiple clients",
    pitchLine: "Multi-client white-label. Your brand, our engine.",
    includesHeader: "What's included",
    bullets: [
      "Unlimited seats inside your FO org",
      "White-label branding — your logo, your color, your domain",
      "100,000 approved actions/mo pooled across all clients",
      "Multi-client aggregate dashboard at /dashboard/fo",
      "Client switcher built into every surface",
      "Per-client audit log and margin reporting",
      "Everything from Pro",
    ],
    outcomeMeter: "$0.05 per approved action over 100,000/mo, pooled",
    cta: {
      label: "Talk to founder",
      href: CALENDLY_STRATEGY_CALL_URL,
    },
  },
];

const ANTI_LINDY_RULES = [
  {
    n: "01",
    title: "No token billing.",
    body: "OpenAI, Anthropic, embedding tokens — all included in your tier. The 40% of customers Gartner says abandon agentic AI because of unforeseen variable costs? We made sure that's never us.",
  },
  {
    n: "02",
    title: "No premium-model multipliers.",
    body: "Lindy charges 60 credits for one GPT-4 call and 2 for a \"lite\" call. We charge the same flat $0.05 whether your employee used GPT-5.5 or GPT-4.1-nano. The model is our choice, not your bill.",
  },
  {
    n: "03",
    title: "Outcome meter is bounded by your finger.",
    body: "The only thing that runs the meter past your cap is an action you literally clicked Approve on in /dashboard/actions. Reject it and the meter doesn't move. We are structurally incapable of surprising you with a bill.",
  },
  {
    n: "04",
    title: "Earned autonomy, never blind autonomy.",
    body: "Every high-risk action (firing a client, sending an invoice, mass email) stays Ask-only forever. Routine actions auto-fire only after you've approved them 30+ times at a 90%+ rate. The agents earn autonomy. They don't get it on day one. Anti-11x by structure, not by marketing.",
  },
];

const WEDGE_ROWS = [
  {
    tool: "Notion AI",
    cost: "$20/user × 15 = $300",
    why: "Brain lives in your Notion, written by your AI workforce",
  },
  {
    tool: "Lindy 3.0 (Business tier)",
    cost: "$300 + overages",
    why: "Custom AI employees + automations native, no credit anxiety",
  },
  {
    tool: "Zapier Pro",
    cost: "$73/mo + tasks",
    why: "25+ integrations native via Composio, growing to 500",
  },
  {
    tool: "AI SDR (11x or similar)",
    cost: "$1,000+/mo",
    why: "Hire an SDR employee directly with the role you actually need",
  },
  {
    tool: "ChatGPT Team",
    cost: "$50 + per-seat",
    why: "COO chat answers any business question with your live data",
  },
  {
    tool: "AI bookkeeper",
    cost: "$400/mo",
    why: "Hire a Bookkeeper employee scoped to Stripe + QuickBooks",
  },
  {
    tool: "Glean Light or search",
    cost: "$40/user × 15 = $600",
    why: "Brain knows everything across all 25 tools, no separate search needed",
  },
  {
    tool: "AI meeting summarizer",
    cost: "$30/user × 15 = $450",
    why: "Calendly + Notion → briefing agent does this nightly",
  },
  {
    tool: "Marketing AI writer",
    cost: "$200/mo",
    why: "Hire a marketing employee, scoped to Google Ads + Analytics",
  },
  {
    tool: "Bardeen / productivity AI",
    cost: "$129/mo",
    why: "Automations + per-employee hires cover this surface",
  },
];

const FAQS = [
  {
    q: "What counts as \"an approved action\"?",
    a: "Anything your AI workforce does on a connected tool: sending a Gmail draft, creating a Stripe invoice, updating a HubSpot deal, posting in Slack, creating a Notion page. Reads — fetching data, looking something up — never count. Only writes count. And only writes you clicked Approve on count toward your meter.",
  },
  {
    q: "What if I never hit my action cap?",
    a: "Then you pay only the flat tier price. The outcome meter is opt-in upside on Pro+, not core pricing. Most agencies under 20 people stay within their tier cap forever.",
  },
  {
    q: "Can I bring my own AI keys (BYOK)?",
    a: "Not in v1. We aggregate AI cost across all customers and that's how we hold the flat tier price. If you have a strong reason to BYOK (regulated industry, internal compliance), talk to the founder.",
  },
  {
    q: "What happens if I cancel?",
    a: "Your workforce stops running. Your company brain stays in your Notion — it was always there, we just wrote to it. You can also download a full markdown zip of the brain from /dashboard/brain/download any time. We don't hold your data hostage.",
  },
  {
    q: "Can I downgrade tiers?",
    a: "Yes. Anytime. End of month. No retention call, no friction. Click Settings → Billing → Switch plan. Custom employees from a higher tier get auto-paused if they don't fit your new tier, until you reactivate.",
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
            Pricing — flat tiers, outcome meter bounded by your approval
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
            Build the asset you exit on.{" "}
            <span className="text-[var(--color-primary)]">Starts at $99/mo.</span>
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
            Replace $5,200/mo of scattered AI tools. Your AI workforce writes
            the SOPs into a Notion you keep. Documented agencies sell at 8–12×
            EBITDA vs 5–9× undocumented &mdash; that&rsquo;s $6M of extra exit
            value on a $2M-EBITDA agency. The asset compounds. The pricing
            doesn&rsquo;t surprise you.
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/pricing">
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
                Or talk to the founder first &rarr;
              </a>
            </Button>
          </div>
        </RevealOnScroll>
        <RevealOnScroll delay={580} offset={32}>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)]">
            14 days free &middot; No credit card &middot; Brain stays in your Notion &middot; Exportable any time
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
      headline: "We never charge you for tokens.",
      body: "OpenAI tokens, Anthropic tokens, embedding calls — those are our problem, not yours. Whatever your AI workforce consumes inside its tier is included. You pay for outcomes, not the math behind them.",
    },
    {
      headline: "You only pay above cap for actions you clicked Approve.",
      body: "Every billable action shows up in your approval queue. You read it, see what it'll do, click yes — or click no. Reject it, you don't pay. Approve it, $0.05. Three things have to align in the same moment.",
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
            Four tiers. Built around the size of your team.
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

        {(tier.outcomeMeter || tier.notIncluded) && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
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
            Starts today.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Connect Stripe or HubSpot. Open the Hire chat. Describe your first
            AI employee. We do the rest. Two-week trial. No credit card.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/pricing">
                Start free trial
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
            14 days free &middot; No credit card &middot; Brain stays in your Notion
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
