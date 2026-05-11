import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import { Badge } from "<npm>/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "<npm>/components/ui/accordion";
import { Table, THead, TR, TH, TD } from "<npm>/components/ui/data-table";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

export const metadata: Metadata = {
  title: "Services — OpsRadar",
  description:
    "OpsRadar builds the Agency Brain, workflows, and AI Operating System for paid-media, SEO, and full-service agencies. All on n8n. Maintained by our team.",
  openGraph: {
    title: "Services — OpsRadar",
    description:
      "OpsRadar builds the Agency Brain, workflows, and AI Operating System for paid-media, SEO, and full-service agencies. All on n8n. Maintained by our team.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Services — OpsRadar" }],
  },
  twitter: {
    title: "Services — OpsRadar",
    description:
      "OpsRadar builds the Agency Brain, workflows, and AI Operating System for paid-media, SEO, and full-service agencies. All on n8n. Maintained by our team.",
    images: ["/og-image.png"],
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const WHAT_WE_BUILD = [
  {
    n: "01",
    title: "Automated Reporting",
    desc: "We pull data from Google Ads, Meta, GA4, and your CRM on schedule. Merge it, format it, and deliver branded client reports automatically — every week, with zero manual work.",
  },
  {
    n: "02",
    title: "Lead Qualification & Routing",
    desc: "New leads are scored against your criteria the moment they arrive, then routed to the right rep with context already filled in. Hot leads get a follow-up within 90 seconds — automatically.",
  },
  {
    n: "03",
    title: "Client Onboarding",
    desc: "A single form submission triggers contracts, tool access provisioning, welcome email sequences, Slack notifications, and project setup — all without anyone on your team lifting a finger.",
  },
  {
    n: "04",
    title: "Email & Follow-up Sequences",
    desc: "Context-aware follow-ups that write themselves based on deal stage, time since last contact, and prior interactions. Leads stop going cold because the system never forgets.",
  },
  {
    n: "05",
    title: "Invoice & Payment Processing",
    desc: "Project completion triggers invoice generation, sends it to the client, follows up if unpaid, and notifies your team when it clears — no one has to chase payments manually.",
  },
  {
    n: "06",
    title: "Data Sync Between Tools",
    desc: "We keep your CRM, project management, invoicing, and communication tools in sync automatically. One update propagates everywhere — no duplicate entry, no data drift.",
  },
];

const PROCESS_STEPS = [
  {
    range: "Day 0–2",
    title: "Scope & price",
    desc: "You run the audit, we have a kickoff call, and our team sends a written fixed-price proposal within 48 hours.",
  },
  {
    range: "Day 3–9",
    title: "Build & walk-through",
    desc: "We build in a dev environment, walk you through the live workflow on Day 9, and you approve before it touches production.",
  },
  {
    range: "Day 10+",
    title: "Deploy & maintain",
    desc: "Deploy to your n8n account, documentation delivered, monitoring runs in the background. You go back to your clients.",
  },
];

const WHAT_IS_INCLUDED = [
  { feature: "Custom n8n workflow builds", audit: false, build: true, managed: true },
  { feature: "Fixed-price proposal within 48 h", audit: false, build: true, managed: true },
  { feature: "Video walkthrough before deploy", audit: false, build: true, managed: true },
  { feature: "30-day post-delivery bug fix", audit: false, build: true, managed: true },
  { feature: "24/7 monitoring & proactive fixes", audit: false, build: false, managed: true },
  { feature: "API breakage recovery (Meta, Google)", audit: false, build: false, managed: true },
  { feature: "Monthly retainer (flat fee)", audit: false, build: false, managed: true },
  { feature: "Self-serve operations audit", audit: true, build: false, managed: false },
  { feature: "Dollar-figure ROI estimate", audit: true, build: false, managed: false },
];

const FAQS = [
  {
    q: "What tools can you connect?",
    a: "Any tool with an API or webhook support. That includes HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, Notion, Airtable, Stripe, QuickBooks, Calendly, Mailchimp, ActiveCampaign, and hundreds more via n8n’s native node library.",
  },
  {
    q: "How long does it take to build?",
    a: "Most single-workflow builds take 5–10 business days. More complex multi-workflow systems take 2–4 weeks. We give you a specific timeline in the proposal before you commit.",
  },
  {
    q: "What if something breaks?",
    a: "On the Managed plan, our team monitors every workflow 24/7 and fixes it before you notice. On the One-Time Build plan, we include 30 days of free bug fixes after delivery.",
  },
  {
    q: "Is technical knowledge required?",
    a: "No. You describe your problem in plain English — our team handles all the technical implementation. You’ll review the workflow in a walkthrough session, but you won’t need to touch any code.",
  },
  {
    q: "Can the workflow be reviewed before it goes live?",
    a: "Always. We record a walkthrough video showing exactly how it works. Nothing gets deployed without your explicit sign-off.",
  },
  {
    q: "What happens after cancellation?",
    a: "Cancel anytime with 30 days notice. Your workflows already live in your own n8n account — you never lose access because you always owned them. We just stop maintaining them.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/services" />

      <PageHeader />
      <FlagshipSection />
      <WhatWeBuildSection />
      <ProcessSection />
      <ComparisonSection />
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
        <p className="text-label text-[var(--color-fg-subtle)]">Services</p>
        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4vw+0.5rem,4rem)] leading-[1.05] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          What specifically do we build for{" "}
          <span className="text-[var(--color-primary)]">agencies</span>?
        </h1>
        <p className="mt-6 max-w-2xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          Six types of automation that fix the manual work burning your team: client reporting,
          ad platform handoffs, HubSpot/CRM routing, onboarding, invoicing, and data sync.
          Built for paid-media, SEO, and full-service agencies under 25 people. All on n8n.
          All maintained by our team.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Book a free 20-min call
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/audit">Run the self-serve audit</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Flagship — Automated Reporting                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function FlagshipSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12">
          {/* Sticky sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label text-[var(--color-primary)]">The automation every agency asks about first</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Automated Client Reporting.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              Pull data from Google Ads, Meta, GA4, and your CRM on schedule. Merge it,
              format it, and deliver branded client reports automatically — every week,
              zero manual work.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/audit">
                  See if this fits your agency
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats panel */}
          <div className="space-y-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {[
              {
                label: "Typical impact",
                value: "Designed to replace 20–40 hours/week of manual reporting at 10–20 person agencies",
              },
              {
                label: "Payback",
                value: "At typical blended rates, a 10-person shop running this would break even in roughly 6 weeks",
              },
              {
                label: "Delivery",
                value: "Built in your n8n account in 7–14 days",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[var(--color-surface)] p-8 md:p-10 grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-start"
              >
                <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-1 min-w-[80px]">
                  {item.label}
                </p>
                <p className="text-body leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  What We Build — editorial numbered list                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function WhatWeBuildSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12 items-start">
          {/* Sticky sidebar */}
          <div className="lg:sticky lg:top-24">
            <p className="text-label text-[var(--color-fg-subtle)]">The full menu</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Other things we build.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              Reporting is the most common, but not the only one. Here are the other five.
            </p>
          </div>

          {/* Numbered editorial list */}
          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {WHAT_WE_BUILD.map((item) => (
              <li
                key={item.n}
                className="grid grid-cols-[auto_1fr] gap-8 md:gap-10 py-10 items-start"
              >
                <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-1">
                  — {item.n}
                </p>
                <div>
                  <h3 className="font-serif text-h2 text-[var(--color-fg)] tracking-[-0.02em]">
                    {item.title}.
                  </h3>
                  <p className="mt-3 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-prose">
                    {item.desc}
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
/*  The process                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function ProcessSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-16">
          <p className="text-label text-[var(--color-fg-subtle)]">The process</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            From audit to running workflow in ~10 business days.
          </h2>
        </div>

        <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {PROCESS_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="grid grid-cols-[auto_1fr] gap-8 md:gap-16 py-10 md:py-12 items-start"
            >
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-2 min-w-[80px]">
                — 0{i + 1}
              </p>
              <div>
                <p className="text-label text-[var(--color-primary)] mb-2">{step.range}</p>
                <h3 className="font-serif text-h2 text-[var(--color-fg)] leading-[1.12] tracking-[-0.02em]">
                  {step.title}.
                </h3>
                <p className="mt-4 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)]"
          >
            See the full 6-phase breakdown
            <ArrowRight className="size-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Comparison table                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function ComparisonSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-14">
          <p className="text-label text-[var(--color-fg-subtle)]">What&rsquo;s included</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            Pick the level of support you need.
          </h2>
          <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-lg">
            Every engagement starts with the audit — free, self-serve, 3 minutes. The Build
            and Managed tiers layer on progressively more hands-on support.
          </p>
        </div>

        <Table density="medium">
          <THead>
            <TR>
              <TH>Feature</TH>
              <TH className="text-center">
                <span className="font-mono text-caption text-[var(--color-fg-subtle)]">Audit</span>
              </TH>
              <TH className="text-center">
                <span className="font-mono text-caption text-[var(--color-fg-subtle)]">One-Time Build</span>
              </TH>
              <TH className="text-center">
                <span className="font-mono text-caption text-[var(--color-primary)]">Managed</span>
              </TH>
            </TR>
          </THead>
          <tbody>
            {WHAT_IS_INCLUDED.map((row) => (
              <TR key={row.feature}>
                <TD>{row.feature}</TD>
                <TD className="text-center">
                  {row.audit ? (
                    <Badge variant="success">Included</Badge>
                  ) : (
                    <span className="text-[var(--color-fg-faint)]">—</span>
                  )}
                </TD>
                <TD className="text-center">
                  {row.build ? (
                    <Badge variant="success">Included</Badge>
                  ) : (
                    <span className="text-[var(--color-fg-faint)]">—</span>
                  )}
                </TD>
                <TD className="text-center">
                  {row.managed ? (
                    <Badge variant="success">Included</Badge>
                  ) : (
                    <span className="text-[var(--color-fg-faint)]">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
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
          See what we&apos;d automate for you.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          3-minute audit. Instant results. No commitment.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Book a free 20-min call
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/audit">Or run a self-serve audit</Link>
          </Button>
        </div>

        <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
          No credit card. No sales pitch. Just the shortlist of workflows
          burning the most money in your agency right now.
        </p>
      </div>
    </section>
  );
}
