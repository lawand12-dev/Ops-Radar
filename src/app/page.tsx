import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { DashboardPreview } from "<npm>/components/marketing/dashboard-preview";
import { Button } from "<npm>/components/ui/button";
import { Badge } from "<npm>/components/ui/badge";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

export const metadata: Metadata = {
  title: "OpsRadar — The operating system for agency operations",
  description:
    "OpsRadar audits every workflow you already run, then builds and monitors the automations that replace them. One pane of glass for tools, runs, and ROI.",
  openGraph: {
    title: "OpsRadar — The operating system for agency operations",
    description:
      "OpsRadar audits every workflow you already run, then builds and monitors the automations that replace them.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpsRadar" }],
  },
  twitter: {
    title: "OpsRadar — The operating system for agency operations",
    description:
      "OpsRadar audits every workflow you already run, then builds and monitors the automations that replace them.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/" />

      <Hero />
      <MetricStrip />
      <SystemSection />
      <DashboardSection />
      <SegmentSection />
      <RulesSection />
      <WhySection />
      <FounderNote />
      <VisionSection />
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
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pt-12 md:pt-20 pb-20 md:pb-28">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-label text-[var(--color-fg-subtle)]">
              Operations infrastructure
            </p>
            <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.5rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance">
              The operating system for{" "}
              <span className="text-[var(--color-primary)]">agency operations</span>.
            </h1>
            <p className="mt-6 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
              OpsRadar audits every workflow you already run, then builds and
              monitors the automations that replace them. One pane of glass for
              tools, runs, and ROI.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/audit">
                  Start your audit
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                  Talk to founders
                </a>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-[var(--color-fg-subtle)]">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />3-minute self-serve audit
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />Real dollar figures, not vibes
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-success)]" />No credit card, no sales pitch
              </li>
            </ul>
          </div>

          <div className="relative">
            <DashboardPreview />
            <p className="mt-4 text-caption text-[var(--color-fg-subtle)] font-mono">
              ↑ How your /dashboard will look once OpsRadar is running.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Metric strip                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function MetricStrip() {
  const metrics = [
    { label: "Avg hours reclaimed", value: "31 hr / mo", note: "per operator" },
    { label: "Time to first workflow", value: "5 days", note: "from audit complete" },
    { label: "Workflows live", value: "1,200+", note: "across customers" },
    { label: "Pricing model", value: "Flat retainer", note: "no per-run fees" },
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
/*  System (Audit. Build. Monitor.)                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function SystemSection() {
  const cols = [
    {
      step: "01",
      title: "Audit",
      copy: "A 3-minute audit maps every tool, workflow, and report your agency runs — then quantifies what each one is actually costing in hours and dollars.",
    },
    {
      step: "02",
      title: "Build",
      copy: "Custom n8n workflows, in your n8n account, delivered in 5 to 14 days. Real code, real logs, real ownership. Day one.",
    },
    {
      step: "03",
      title: "Monitor",
      copy: "Meta breaks something on Tuesday. Triple Whale ships a breaking update on Friday. Our team fixes it before your Monday recap runs.",
    },
  ];

  return (
    <section id="system" className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label text-[var(--color-fg-subtle)]">The system</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              Three things we operate. Nothing else.
            </h2>
            <p className="mt-5 text-body text-[var(--color-fg-muted)] max-w-md">
              Not hourly consulting. Not training. Not dashboards you have to
              maintain. Just these three, end to end.
            </p>
          </div>

          <div className="space-y-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {cols.map((c) => (
              <article
                key={c.title}
                className="bg-[var(--color-surface)] p-8 md:p-10 grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-start"
              >
                <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-2">
                  {c.step}
                </p>
                <div>
                  <h3 className="font-serif text-h2 text-[var(--color-fg)] tracking-[-0.02em]">
                    {c.title}.
                  </h3>
                  <p className="mt-3 text-body leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
                    {c.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
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
      className="bg-[var(--color-bg)] text-[var(--color-fg)] border-b border-[var(--color-border)]"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-label text-[var(--color-fg-subtle)]">Dashboard</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            One pane of glass. Live, by default.
          </h2>
          <p className="mt-5 text-body-lg text-[var(--color-fg-muted)]">
            Every workflow you run, every credential connected, every dollar
            reclaimed — visible the moment it changes. No nightly batches. No
            client data stored in our DB.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-[1.6fr_1fr] gap-10 items-start">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <span className="text-label text-[var(--color-fg-subtle)]">opsradar.co / dashboard</span>
              </div>
              <span className="font-mono text-caption text-[var(--color-fg-subtle)]">last sync · 14s ago</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
              {[
                { label: "Hours reclaimed", value: "2,431", trend: "+18%", up: true },
                { label: "Active workflows", value: "87", trend: "+6", up: true },
                { label: "Runs / 24h", value: "12.4k", trend: "+2.1k", up: true },
                { label: "Avg run cost", value: "$0.018", trend: "−12%", up: true },
              ].map((m) => (
                <div key={m.label} className="bg-[var(--color-surface)] px-5 py-4">
                  <p className="text-label text-[var(--color-fg-subtle)]">{m.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="font-mono text-h3 font-medium tabular-nums">{m.value}</p>
                    <p className={m.up ? "text-caption text-[var(--color-success)]" : "text-caption text-[var(--color-danger)]"}>
                      {m.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
              <p className="text-label text-[var(--color-fg-subtle)]">Workflows</p>
              <p className="text-caption font-mono text-[var(--color-fg-subtle)]">12 running · 1 degraded</p>
            </div>

            <ul className="divide-y divide-[var(--color-border)]">
              {[
                { name: "invoice-reminders", runs: "412", status: "Running", last: "2 min ago", flag: "success" },
                { name: "lead-router-v2", runs: "87", status: "Running", last: "14 min ago", flag: "success" },
                { name: "client-monthly-recap", runs: "12", status: "Running", last: "1 hr ago", flag: "success" },
                { name: "slack-recap-daily", runs: "3", status: "Degraded", last: "1 hr ago", flag: "warn" },
                { name: "onboarding-emails", runs: "54", status: "Running", last: "4 min ago", flag: "success" },
                { name: "rank-digest-weekly", runs: "1", status: "Running", last: "11 hr ago", flag: "success" },
              ].map((r) => (
                <li
                  key={r.name}
                  className="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr] gap-4 px-6 py-3 items-center"
                >
                  <p className="text-body-sm font-medium">{r.name}</p>
                  <p className="font-mono text-body-sm text-[var(--color-fg-muted)] tabular-nums">{r.runs}</p>
                  <Badge variant={r.flag === "warn" ? "warn" : "success"} dot>{r.status}</Badge>
                  <p className="font-mono text-caption text-[var(--color-fg-subtle)]">{r.last}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-6">
            <Card title="Live, not nightly" body="Workflow status comes straight from your n8n. Nothing is ever cached longer than 60 seconds. You see the same world your team sees." />
            <Card title="Your data, your DB" body="OpsRadar does not store client data. Workflows run inside your n8n; credentials live in your vault; logs stay on your infrastructure." />
            <Card title="ROI, not dashboards" body="Every workflow ships with a baseline cost-to-run and a hours-saved target. The dashboard tells you whether you're still ahead." />
          </aside>
        </div>
      </div>
    </section>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <p className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">{title}</p>
      <p className="mt-2 text-body-sm text-[var(--color-fg-muted)] leading-[1.6]">{body}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Segment picker                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function SegmentSection() {
  const segments = [
    {
      href: "/for/paid-media",
      tag: "Paid media",
      headline: "Sunday nights are for your family, not Meta + Google + Klaviyo reports.",
      bullets: [
        "Monthly client reports that build themselves",
        "Pacing alerts tied to MER, not last-click ROAS",
        "BM-access-to-first-report from 3 weeks to 5 days",
      ],
    },
    {
      href: "/for/seo",
      tag: "SEO",
      headline: "Track what matters in 2026 — AI Overviews, LLM mentions, and rank.",
      bullets: [
        "Weekly rank digests from Ahrefs + GSC + Semrush",
        "AIO presence tracking across ChatGPT, Perplexity, Google AIO",
        "Technical audit alerts before Google notices",
      ],
    },
    {
      href: "/for/full-service",
      tag: "Full-service",
      headline: "Defend your delivery margin while scaling across ad ops, SEO, and content.",
      bullets: [
        "Unified reporting across ad + organic + content",
        "Utilization alerts before scope creep eats margin",
        "Cross-channel attribution your clients actually believe",
      ],
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-14">
          <p className="text-label text-[var(--color-fg-subtle)]">Built for three kinds of shop</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            Which one are you running?
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          {segments.map((seg) => (
            <Link
              key={seg.href}
              href={seg.href}
              className="group flex flex-col bg-[var(--color-surface)] p-8 md:p-10 hover:bg-[var(--color-surface-sunken)] transition-colors duration-[var(--duration-fast)]"
            >
              <p className="text-label text-[var(--color-primary)]">{seg.tag}</p>
              <h3 className="mt-5 font-serif text-h3 text-[var(--color-fg)] leading-[1.2] tracking-[-0.015em] text-balance">
                {seg.headline}
              </h3>
              <ul className="mt-6 space-y-2.5 flex-1">
                {seg.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex gap-2.5 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]"
                  >
                    <span className="text-[var(--color-fg-faint)] mt-1 shrink-0">—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] transition-colors">
                See the {seg.tag.toLowerCase()} page
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Four rules                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function RulesSection() {
  const rules = [
    {
      n: "01",
      title: "Our team builds it directly.",
      copy: "No freelancers. No handoffs. The system that scopes your AIOS is the system that runs it.",
    },
    {
      n: "02",
      title: "We diagnose before we pitch.",
      copy: "Every call starts with a real diagnosis of what your agency is actually losing. We do not take meetings to talk about what we might do for you.",
    },
    {
      n: "03",
      title: "We price systems, not task volume.",
      copy: "Flat monthly retainers. No surprise bills. Zapier punishes you for scaling — we do not.",
    },
    {
      n: "04",
      title: "We stay for year two.",
      copy: "Your AI Operating System is designed to keep running after launch. Our team is still here when you add client #15 and Triple Whale breaks its API.",
    },
  ];

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-16">
          <p className="text-label text-[var(--color-fg-subtle)]">Who we are</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance">
            Four rules we won&apos;t break.
          </h2>
        </div>

        <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {rules.map((r) => (
            <li key={r.n} className="grid grid-cols-[auto_1fr] gap-8 md:gap-16 py-10 md:py-12 items-start">
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em] pt-2">
                — {r.n}
              </p>
              <div>
                <h3 className="font-serif text-h2 text-[var(--color-fg)] leading-[1.12] tracking-[-0.02em] text-balance">
                  {r.title}
                </h3>
                <p className="mt-4 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                  {r.copy}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Why — three editorial pull-quotes                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function WhySection() {
  const quotes = [
    {
      kind: "On ownership",
      quote: "You own it. All of it.",
      body: "Every workflow we build lives in your n8n account, on your Google Drive, running on your credentials. If OpsRadar ever left, nothing breaks. You keep the code, the logic, and the logs — day one.",
    },
    {
      kind: "On reliability",
      quote: "Meta breaks something. Guardian knows before you do.",
      body: "Ad platforms push breaking API changes every quarter. Guardian catches them before your Monday morning report fails. You see the fix, not the error.",
    },
    {
      kind: "On AI",
      quote: "AI builds fast. We verify every line.",
      body: "AI accelerates the build. Our team reviews every workflow before it touches your HubSpot, reports MER to your clients, or sends a branded PDF on the 2nd of the month.",
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
/*  Founder note                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function FounderNote() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-28">
        <div className="flex items-center gap-3 mb-8">
          <span className="size-9 rounded-full bg-[var(--color-accent-100)] flex items-center justify-center text-[var(--color-primary)] font-serif text-body-lg">
            L
          </span>
          <div>
            <p className="text-body-sm font-medium text-[var(--color-fg)]">Lawand · Founder</p>
            <p className="text-caption text-[var(--color-fg-subtle)]">A short note before you keep scrolling.</p>
          </div>
        </div>

        <div className="space-y-5 text-body-lg leading-[1.65] text-[var(--color-fg-muted)]">
          <p>
            OpsRadar is built by a team that spent years studying how agencies
            actually operate — not how they look on LinkedIn, but where the
            work leaks, why tools do not talk to each other, and why agencies
            keep hiring for problems that should be automated.
          </p>
          <p>
            We exist because the gap between AI capability and operational
            reality is still enormous. Most agencies have the tools. Almost
            none have the system connecting them. We are building that system.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Vision                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function VisionSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-28">
        <div className="border-l-2 border-[var(--color-primary)] pl-8 md:pl-10">
          <p className="text-label text-[var(--color-primary)]">The vision</p>
          <div className="mt-6 space-y-6 text-body-lg leading-[1.65] text-[var(--color-fg-muted)] max-w-3xl">
            <p>
              Every agency that runs on OpsRadar gets their own AI Operating System —
              built from their real operations, their tools, their data, their history.
            </p>
            <p>
              Their team queries it through Claude. Their workflows run on it through
              n8n. Their brain gets richer every week.
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
        <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
        <h2 className="mt-5 font-serif text-[clamp(2.25rem,3.6vw+0.5rem,3.75rem)] leading-[1.05] tracking-[-0.025em] text-balance">
          See what your radar looks like.
        </h2>
        <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
          A 20-minute call. Real numbers on what your agency is losing. The
          shortlist of workflows worth automating first.
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
