import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "<npm>/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "<npm>/components/ui/tabs";
import { CALENDLY_STRATEGY_CALL_URL, CONTACT_EMAIL } from "<npm>/lib/constants";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";

export const metadata: Metadata = {
  title: "Questions agency owners ask before booking",
  description:
    "Direct answers on price, process, integrations, and how an AI COO is different from a fractional COO. Written by the founder.",
  openGraph: {
    title: "Questions agency owners ask before booking — OpsRadar",
    description:
      "Direct answers on price, process, integrations, and how an AI COO is different from a fractional COO. Written by the founder.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Questions agency owners ask before booking — OpsRadar",
    description:
      "Direct answers on price, process, integrations, and how an AI COO is different from a fractional COO. Written by the founder.",
    images: ["/og-image.png"],
  },
};

// ── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "basics",
    label: "The basics",
    items: [
      {
        q: "What is OpsRadar?",
        a: "OpsRadar is the AI COO for marketing agencies. Four parts: OPERATE runs the operational work that lives in your team's heads, OBSERVE shows every tool in one view, BRAIN answers questions about your business with live data, GUARD watches the system overnight. From $750/month — one-tenth the cost of a fractional COO.",
      },
      {
        q: "Who is this for?",
        a: "Marketing agencies between $1M and $5M in revenue, 10 to 50 people, where the founder still runs ops directly. Paid media, SEO, social, and full-service digital. If you're losing money on clients you don't catch until quarter-end, this is for you.",
      },
      {
        q: "Who is this NOT for?",
        a: "Solo operators or sub-$1M agencies where the margin pain hasn't hit yet. Agencies over $20M with a real COO and analytics team already on staff. Production studios, dev shops, and promotional-products companies — different ops shape entirely.",
      },
      {
        q: "Why does \"you own it\" matter?",
        a: "Your data was never trapped in OpsRadar — it lives in HubSpot, ClickUp, Harvest, Stripe, and the rest. We were only reading from them. If OpsRadar ever disappeared, every tool you already pay for keeps working unchanged.",
      },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    items: [
      {
        q: "What does it cost?",
        a: "Four tiers, flat per agency: Starter $750/mo, Growth $1,500/mo (most popular), Pro $3,000/mo, and a Fractional Operator tier at $1,200/mo + $300/agency for partners managing multiple clients. Annual prepay saves 17% (two months free). See the full breakdown on /pricing.",
      },
      {
        q: "How does payment work?",
        a: "Month-to-month by default. Annual prepay is 17% off. No long-term lock-in. 30-day money-back on Starter and Growth, 60-day on Pro. Cancel any time at the end of the billing cycle.",
      },
      {
        q: "$1,500/mo seems steep for our size — how do you justify it?",
        a: "Compare it to a fractional COO ($7–15K/mo), a full-time COO ($25K/mo), or the unprofitable client you'll only catch at quarter-end. If OpsRadar finds you a single $5K overserve in the first month, Growth has paid for itself 3x over. If the math doesn't work in your first month, we send the money back.",
      },
      {
        q: "Why isn't there a free tier?",
        a: "A free tier turns the founder into a free-tier support engineer, and we need to ride the first 100 customers to capture what's working. The free surface is the 3-minute audit — you get a real dollar number on what you're leaking, no credit card. Then a 30-minute call. Then paid.",
      },
    ],
  },
  {
    id: "process",
    label: "Process",
    items: [
      {
        q: "How long until my AI COO is live?",
        a: "Week one. The 30-minute call confirms fit. Discovery and Blueprint take about a week. By the second week the AI COO is reading from your stack and surfacing the first alerts. Most agencies see their first $ recovered in the first month.",
      },
      {
        q: "What happens after I submit the audit?",
        a: "Your custom report — including estimated annual leakage in dollars — lands in your inbox within minutes. If the numbers add up, the booking link for the 30-minute call is on your results page. The team will have read your report before the call.",
      },
      {
        q: "What's required from me during onboarding?",
        a: "Mostly access. You connect the tools you already use — HubSpot, ClickUp, Harvest, Stripe — review the first weekly health score, and tell us which alerts you want first. The AI COO does the heavy lifting; you verify it fits your agency.",
      },
      {
        q: "What if something breaks after the AI COO is live?",
        a: "GUARD monitors every read from every integrated tool. If an API drifts or a connection breaks, it fires before your Monday digest is generated — not after. We fix it. That's the point of an always-on COO, not just a one-time audit.",
      },
    ],
  },
  {
    id: "tech",
    label: "Tech & tools",
    items: [
      {
        q: "What tools does the AI COO connect to?",
        a: "Ten integrations live today: HubSpot, Pipedrive, ClickUp, Asana, Monday, Harvest, Toggl, Stripe, Calendly, Apollo. Anything else with an API can be added — note it in the audit and we'll prioritize it.",
      },
      {
        q: "How is this different from Productive, Scoro, or other PSAs?",
        a: "PSAs are systems of record — they store what happened. The AI COO is the intelligence layer that sits on top and tells you what to do about it. Productive shows you Acme's margin dropped to 14% three weeks after the month closed. OpsRadar tells you Acme is about to drop below 20% this week, and hands you the three unbilled deliverables to invoice for.",
      },
      {
        q: "Is my data secure?",
        a: "Your data stays in HubSpot, ClickUp, Harvest, Stripe, and the rest. OpsRadar never writes your client business data to its own database. We read live through OAuth and encrypted API keys you control. Revoke access in one click any time.",
      },
      {
        q: "Will my data train your models?",
        a: "No. Your business data is never used to train any AI model — ours or anyone else's. The AI COO reasons over your data in real time to answer your questions and surface alerts. Nothing is retained for training.",
      },
    ],
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/faq" />

      <PageHeader />
      <FAQSection />
      <TalkToUsSection />

      <SiteFooter />
    </div>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-4xl px-6 pt-14 md:pt-20 pb-16 md:pb-20">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label text-[var(--color-fg-subtle)]">Questions</p>
        </RevealOnScroll>
        <RevealOnScroll delay={120} offset={48}>
          <h1 className="mt-5 font-serif text-[clamp(2.5rem,4vw+0.5rem,4rem)] leading-[1.05] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
            The questions we get on every call.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={280} offset={40}>
          <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
            If you&apos;re considering OpsRadar, you&apos;re probably about to
            ask one of these. Answers are written by Lawand &mdash; same tone
            you&apos;d get on the call.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
      <RevealOnScroll delay={0} offset={40}>
      <Tabs defaultValue="basics">
        <TabsList className="mb-12 w-full flex-wrap gap-y-2 h-auto border-b border-[var(--color-border)]">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id}>
            <p className="text-label text-[var(--color-primary)] mb-8">
              {cat.label}
            </p>
            <Accordion type="multiple">
              {cat.items.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="font-serif text-h4 tracking-[-0.01em]">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        ))}
      </Tabs>
      </RevealOnScroll>
    </section>
  );
}

function TalkToUsSection() {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-28 text-center">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)]">Still have questions?</p>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3rem)] leading-[1.08] tracking-[-0.025em] text-balance">
            Talk to us directly.
          </h2>
          <p className="mt-5 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-lg mx-auto">
            Book a free 30-min call. Bring any question — tool stack, workflow
            idea, budget. No prep needed.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a free 30-min call
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`mailto:${CONTACT_EMAIL}`}>
                Email us instead
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-caption text-[var(--color-fg-subtle)]">
            Or run the{" "}
            <Link
              href="/audit"
              className="underline underline-offset-2 hover:text-[var(--color-fg)] transition-colors"
            >
              3-minute self-serve audit
            </Link>{" "}
            and get dollar figures back immediately.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
