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

export const metadata: Metadata = {
  title: "Questions — OpsRadar",
  description:
    "Common questions about OpsRadar: what we build, what it costs, how long it takes, and how the work stays yours.",
  openGraph: {
    title: "Questions — OpsRadar",
    description:
      "Common questions about OpsRadar: what we build, what it costs, how long it takes, and how the work stays yours.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Questions — OpsRadar",
    description:
      "Common questions about OpsRadar: what we build, what it costs, how long it takes, and how the work stays yours.",
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
        a: "We build the AI Operating System for agencies — n8n workflows, an Agency Brain, and a Claude interface — all running inside your own accounts, not ours. Paid-media shops, SEO agencies, and full-service teams under 25 people. You own everything from day one.",
      },
      {
        q: "Who is this for?",
        a: "Agencies with 5–25 people losing hours to manual reporting, client onboarding, pacing alerts, or cross-tool data stitching. If your team is spending Sunday nights building client reports, this is for you.",
      },
      {
        q: "Who is this NOT for?",
        a: "Solo operators where the math doesn't work yet. Enterprise agencies with 50+ people that need a larger transformation program. Shops that want shrinkwrap software — this is custom-built, not something you install.",
      },
      {
        q: "Why does \"you own it\" matter?",
        a: "Every workflow runs inside your n8n account, on your credentials, on your infrastructure. If OpsRadar ever left, nothing breaks. You keep the code, the logic, and the logs.",
      },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    items: [
      {
        q: "What does it cost?",
        a: "One-time builds range from $3,500 (Starter) to $9,500 (Advanced). Monthly care retainers run $750–$3,000/month. Exact scope and price are confirmed before any build starts — no surprises.",
      },
      {
        q: "How does payment work?",
        a: "50% upfront after we scope the build together, 50% on delivery. Monthly retainers bill at the start of each month. No long-term lock-in — cancel with 30 days notice.",
      },
      {
        q: "Is a retainer required?",
        a: "No. You can do a one-time build and never add ongoing care. Most agencies add the Care retainer ($750/month) because Meta, Shopify, and Google push breaking API changes every quarter — someone has to fix them before Monday morning.",
      },
      {
        q: "How is this cheaper than Zapier?",
        a: "Zapier charges per task. Agency reporting workflows run hundreds of times a day. A typical Zapier retainer: $500–$2,000/month. n8n Cloud: $20/month, unlimited runs. The build pays for itself in roughly 6 weeks at standard agency hourly rates.",
      },
    ],
  },
  {
    id: "process",
    label: "Process",
    items: [
      {
        q: "How long does a build take?",
        a: "Single workflows ship in 3–10 business days when scope is tight and you're responsive. Multi-workflow systems take 2–4 weeks. From first message to first workflow running: roughly 10 business days.",
      },
      {
        q: "What happens after I submit the audit?",
        a: "The audit is a 3-minute form. You get back real dollar numbers on what specific ops work is costing you. If the numbers make sense, we book a 15-minute call to scope the exact build. If not, no pressure — keep the audit.",
      },
      {
        q: "What's required from me during the build?",
        a: "About 5 minutes total. You grant API access to the tools you already use (Meta, Google, Slack, etc.), review one proposal, and test the final workflow before it goes live. No scoping meetings, no spec back-and-forth.",
      },
      {
        q: "What if something breaks?",
        a: "Every build includes a bug-fix window: 14 days on Starter, 30 on Core, 60 on Advanced. After that, the Care retainer catches breakages before they hit production. If Meta's API changes at 3am, we fix it before your Monday report runs.",
      },
    ],
  },
  {
    id: "tech",
    label: "Tech & tools",
    items: [
      {
        q: "What tools do you work with?",
        a: "Anything with an API or webhook. Most common: Meta Ads, Google Ads, GA4, Triple Whale, Klaviyo, HubSpot, Ahrefs, Semrush, Slack, Notion, Google Sheets, Looker Studio. If your tool isn't listed, it likely still works — ask in the audit.",
      },
      {
        q: "Why n8n instead of Zapier, Make, or a SaaS tool?",
        a: "Three reasons: (1) flat $20/month instead of per-task fees that explode at volume. (2) The workflow lives in your account, not behind someone else's paywall. (3) More powerful — custom logic, AI nodes, branching, self-hosted option. For agencies running reporting at scale, n8n is the only math that works.",
      },
      {
        q: "Can n8n be self-hosted?",
        a: "Yes. You can run n8n on their cloud ($20/month) or self-host on your own server. We build in either environment. Self-hosting is free but requires a DevOps person — most agencies just use n8n Cloud.",
      },
      {
        q: "Can you work with my existing automations?",
        a: "Yes. If you already have Zapier zaps, Make scenarios, or hand-rolled scripts, we can migrate them to n8n and extend them. Often the migration itself pays for the build through Zapier cost savings alone.",
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
        <p className="text-label text-[var(--color-fg-subtle)]">Questions</p>
        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4vw+0.5rem,4rem)] leading-[1.05] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          Things we get asked.
        </h1>
        <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          Organized by topic. If you don&apos;t find what you need, the
          link at the bottom reaches our team directly.
        </p>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
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
    </section>
  );
}

function TalkToUsSection() {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-28 text-center">
        <p className="text-label text-[var(--color-fg-subtle)]">Still have questions?</p>
        <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3rem)] leading-[1.08] tracking-[-0.025em] text-balance">
          Talk to us directly.
        </h2>
        <p className="mt-5 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-lg mx-auto">
          Book a free 20-min call. Bring any question — tool stack, workflow
          idea, budget. No prep needed.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
          <Button asChild size="lg">
            <a
              href={CALENDLY_STRATEGY_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a free 20-min call
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
      </div>
    </section>
  );
}
