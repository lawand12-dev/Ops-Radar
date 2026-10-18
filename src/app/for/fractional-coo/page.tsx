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
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "OpsRadar for Fractional COOs — multi-tenant workspace",
  description:
    "Run all your client agencies from one workspace. White-label, multi-tenant, 100K actions pooled across clients. $2,999/mo for unlimited clients.",
  openGraph: {
    title: "Run all your client agencies from one workspace.",
    description:
      "Fractional COOs use OpsRadar as the operating system for their entire client portfolio. White-label, multi-tenant, $2,999/mo unlimited clients.",
    url: "https://www.opsradar.co/for/fractional-coo",
    siteName: "OpsRadar",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpsRadar for Fractional COOs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Run all your client agencies from one workspace.",
    description:
      "Multi-tenant, white-label, $2,999/mo for unlimited clients. Built for fractional COOs running 5–10 agency clients.",
    images: ["/og-image.png"],
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const MATH_ROWS: Array<{ today: string; with: string }> = [
  {
    today: "6 client Notion workspaces",
    with: "1 multi-tenant workspace, per-client view",
  },
  {
    today: "6 sets of AI tool subscriptions (~$31K/mo)",
    with: "$2,999/mo flat",
  },
  {
    today: "Manual context-switching across 6 dashboards",
    with: "One aggregate dashboard, client-switcher built in",
  },
  {
    today: "Inconsistent SOPs per client",
    with: "One playbook engine, customized per client brain",
  },
  {
    today: "You're the bottleneck on every approval",
    with: "Earned-autonomy per client: agents graduate based on the client's data",
  },
];

const TIER_BULLETS: string[] = [
  "Unlimited clients in your FO org (no per-client license fee)",
  "White-label branding — your logo, your color, your domain (e.g. clients.yourname.com)",
  "100,000 approved actions/mo pooled across all clients — flexible across portfolio (one busy client doesn't burn another's cap)",
  "Per-client brain in their Notion workspace — each client owns their own brain. You see the aggregate. Client cancellation = client keeps their brain.",
  "Multi-client aggregate dashboard at /dashboard/fo — MRR across portfolio, per-client margin, per-client utilization, scope creep flags ranked across all clients",
  "Client switcher built into every surface — every page in the dashboard has a client dropdown; switching is instant",
  "Per-client audit log + margin reporting — for the quarterly review with each client",
  "All 28 named built-in agents per client — Riley, Cole, Scott, etc. running independently for each agency's data",
  "Custom employee hiring per client — describe a role once, apply across clients with one click",
  "Org-chart delegation (CP-37) — your custom AI employees can have managers + direct reports across clients",
  "Everything in Pro (priority models, webhook outbox, brain provisioning, etc.)",
];

const TRUST_BULLETS: Array<{ title: string; body: string }> = [
  {
    title: "Client data isolation is RLS-enforced",
    body: "Every Postgres row is scoped to the client's user_id. We can't accidentally leak data across clients.",
  },
  {
    title: "Each client's brain is theirs",
    body: "You can fire OpsRadar as the fractional COO and the client keeps every Pattern Card, Decision Log, Risk Register entry in their Notion. The relationship between you and the client is independent of the relationship between you and us.",
  },
  {
    title: "White-label means white-label",
    body: "Your client sees your brand on the dashboard, not OpsRadar's. Customer-facing CHARTER.md per agent reads your brand voice (configurable per FO org).",
  },
];

const OBJECTIONS: Array<{ q: string; a: string }> = [
  {
    q: "What if my client wants to take OpsRadar over directly?",
    a: "Their call. We support clean transitions — they can sign up under their own account, and you transfer ownership of their workspace through your /dashboard/fo settings. We don't charge them a startup fee or hold their data. The brain they built with you stays in their Notion.",
  },
  {
    q: "How do I demo this to a client without revealing your name?",
    a: "White-label is full. The dashboard renders YOUR brand, not OpsRadar's. The customer-facing brain pages in their Notion are authored by your-brand-name agents (e.g. \"Sarah · [Your Agency] Bookkeeper\"). The only OpsRadar reference your clients ever see is in the legal footer (terms of service + privacy policy) — those have to point at us for compliance, but that's the only surface.",
  },
  {
    q: "What if I leave a client mid-engagement?",
    a: "Your client keeps their workspace + their brain + their OAuth connections. They can either downgrade to a self-served Pro tier ($1,499/mo) and run OpsRadar themselves, or you can transfer them to another fractional COO running an FO org. We don't hold anyone's data hostage — same principle as the agency tier.",
  },
  {
    q: "I'm not technical. Is this hard to set up?",
    a: "Onboarding a new client takes about 15 minutes: invite the client to your FO org, get them through OAuth on their tools, choose which of the 28 agents to enable, set autonomy defaults. We have a 5-min Loom walking through it.",
  },
  {
    q: "What about pricing for my clients — do I bake OpsRadar into my retainer or charge separately?",
    a: "Your call. Most FOs running on OpsRadar bake it in — their retainer goes from $8K/mo to $9K/mo per client and they bill the difference as \"tooling + ops infrastructure.\" Some pass it through as a line item. We don't have an opinion on which works better for your sales motion.",
  },
];

const PEER_COMMUNITIES: Array<{ name: string; body: string }> = [
  { name: "Operators Guild", body: "1,000+ remote-first fractional executives. Active community." },
  { name: "Fractionals United", body: "Newer community, faster-moving." },
  { name: "Catalant, Toptal, BTG, Maven", body: "Marketplace platforms where many of you originate clients." },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ForFractionalCooPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/fractional-coo" />

      <Hero />
      <MathSection />
      <TierSection />
      <HowItWorksSection />
      <IcpSection />
      <ObjectionSection />
      <WhyThisMotionSection />
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
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-20 md:pb-24">
        <RevealOnScroll delay={0} offset={32}>
          <p
            className="font-mono uppercase text-[var(--color-primary)]"
            style={{ fontSize: "11px", letterSpacing: "0.18em", fontWeight: 500 }}
          >
            <span
              aria-hidden
              className="mr-2 inline-block size-1.5 rounded-full align-middle bg-[var(--color-success)]"
            />
            For fractional COOs · multi-tenant workspace
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={48}>
          <h1
            className="mt-7 text-[var(--color-fg)] text-balance max-w-[18ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-hero)",
              lineHeight: "var(--text-hero--line-height)",
              letterSpacing: "var(--text-hero--letter-spacing)",
              fontWeight: 500,
            }}
          >
            Run all your client agencies from one workspace.
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
            If you&rsquo;re running 5&ndash;10 agency clients on a $5&ndash;15K/mo
            retainer each, OpsRadar runs as your operating system across all of
            them. White-label your brand. Aggregate dashboard. Per-client brain.
            One workspace, your business.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={460} offset={40}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                See the Fractional Operator workspace — 20 min with the founder
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/waitlist">Coming soon &mdash; join waitlist &rarr;</Link>
            </Button>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={580} offset={32}>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)]">
            White-label &middot; Multi-tenant &middot; Per-client brain stays in their Notion &middot; Private beta
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Math section                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function MathSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            The leverage
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
            Six clients × the same workspace = 6× the work, 1× the cost.
          </h2>
          <p className="mt-6 max-w-3xl text-body leading-[1.65] text-[var(--color-fg-muted)]">
            A fractional COO running 6 agency clients at $8K/mo each is billing
            $48K/mo. Today most of you are doing it across 6 separate Notion
            workspaces + 6 separate dashboards + the same 10 AI tools per
            client ($5,200/mo × 6 = $31,200 in AI spend). OpsRadar at $2,999/mo
            replaces all of it. Your margin: $45K/mo on $48K/mo billed.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
            <div className="grid grid-cols-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <div className="px-6 py-3 text-label text-[var(--color-fg-subtle)] uppercase">
                Today (6 clients, scattered)
              </div>
              <div className="px-6 py-3 text-label text-[var(--color-primary)] uppercase border-l border-[var(--color-border)]">
                With OpsRadar Fractional Operator
              </div>
            </div>
            {MATH_ROWS.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-2 border-b last:border-b-0 border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="px-6 py-4 text-body-sm text-[var(--color-fg-muted)] leading-[1.55]">
                  {row.today}
                </div>
                <div className="px-6 py-4 text-body-sm text-[var(--color-fg)] leading-[1.55] border-l border-[var(--color-border)] bg-[var(--color-bg)]">
                  {row.with}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Tier inclusion section                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function TierSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            What&rsquo;s included
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
            Everything in Pro × N clients. Pooled across the org.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-10">
            <ul className="space-y-3.5">
              {TIER_BULLETS.map((bullet) => {
                const [head, ...rest] = bullet.split(" — ");
                const tail = rest.join(" — ");
                return (
                  <li
                    key={bullet}
                    className="flex gap-3 text-body leading-[1.6] text-[var(--color-fg-muted)]"
                  >
                    <span
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                      aria-hidden
                    />
                    <span>
                      <span className="text-[var(--color-fg)] font-medium">{head}</span>
                      {tail && <> &mdash; {tail}</>}
                    </span>
                  </li>
                );
              })}
            </ul>

            <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 h-fit">
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
                — Fractional Operator
              </p>
              <p
                className="mt-3 font-mono tabular-nums text-[var(--color-fg)] tracking-[-0.02em]"
                style={{ fontSize: "var(--text-h1)", fontWeight: 500 }}
              >
                $2,999<span className="text-body text-[var(--color-fg-muted)] font-normal">/month</span>
              </p>
              <p className="mt-1 text-caption text-[var(--color-fg-subtle)]">
                Billed monthly · Cancel anytime
              </p>

              <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
                <p className="text-label text-[var(--color-fg-subtle)] mb-1">
                  Outcome meter (opt-in)
                </p>
                <p className="text-body-sm leading-[1.5] text-[var(--color-fg)] font-mono tabular-nums">
                  $0.05 per approved action over 100,000/mo pooled.
                </p>
              </div>

              <div className="mt-6">
                <Button asChild className="w-full">
                  <a
                    href={CALENDLY_STRATEGY_CALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Talk to founder
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </aside>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  How it works                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function HowItWorksSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            How it works under the hood
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
            Per-client OAuth. Per-client brain. One operator dashboard above all of them.
          </h2>
          <p className="mt-6 max-w-3xl text-body leading-[1.65] text-[var(--color-fg-muted)]">
            Each client agency you onboard gets their own OAuth connections
            (their Stripe, their HubSpot, their ClickUp). Every credential is
            brokered via OAuth — you never see the API keys. Each client gets their own
            company brain mirrored to their own Notion workspace. The 28
            built-in agents run independently per client. If you add a custom AI
            employee (say, a &ldquo;Bookkeeper named Sarah&rdquo;) you can
            deploy her to one client or to all six &mdash; your call. You see
            everything from /dashboard/fo, but each client only ever sees their
            own data.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden md:grid-cols-3">
            {TRUST_BULLETS.map((t) => (
              <div
                key={t.title}
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
                  {t.title}
                </h3>
                <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">
                  {t.body}
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
/*  ICP section                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function IcpSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12">
          <RevealOnScroll delay={0} offset={40}>
            <div>
              <p className="text-label text-[var(--color-fg-subtle)] uppercase">
                The fractional operator ICP
              </p>
              <h2
                className="mt-4 text-[var(--color-fg)] text-balance"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-h1)",
                  lineHeight: "var(--text-h1--line-height)",
                  letterSpacing: "var(--text-h1--letter-spacing)",
                  fontWeight: 500,
                }}
              >
                You&rsquo;re running 5&ndash;10 agency clients on retainer.
              </h2>
              <p className="mt-6 max-w-2xl text-body leading-[1.65] text-[var(--color-fg-muted)]">
                If you bill 5&ndash;10 agency clients at $5&ndash;15K/mo each on
                a fractional-COO retainer, OpsRadar is built for you. If
                you&rsquo;re managing 1&ndash;2 clients, start with the Pro
                tier ($1,499/mo) and graduate. If you&rsquo;re managing 20+
                clients, talk to the founder &mdash; let&rsquo;s discuss
                enterprise pricing.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120} offset={40}>
            <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-6 md:p-8 h-fit">
              <p className="text-label text-[var(--color-fg-subtle)] uppercase mb-4">
                Where to find your peers
              </p>
              <ul className="space-y-4">
                {PEER_COMMUNITIES.map((p) => (
                  <li key={p.name}>
                    <p className="text-body text-[var(--color-fg)] font-medium">
                      {p.name}
                    </p>
                    <p className="mt-1 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]">
                      {p.body}
                    </p>
                  </li>
                ))}
              </ul>
            </aside>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Objections                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function ObjectionSection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            What I&rsquo;d worry about if I were you
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
            Honest answers to honest questions.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={100} offset={40}>
          <Accordion type="multiple">
            {OBJECTIONS.map((o) => (
              <AccordionItem key={o.q} value={o.q}>
                <AccordionTrigger>{o.q}</AccordionTrigger>
                <AccordionContent>{o.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Why fractional COOs specifically                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function WhyThisMotionSection() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label text-[var(--color-fg-subtle)] uppercase">
            Why this motion
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
            You&rsquo;re already running an OpsRadar-shaped business.
          </h2>
          <p className="mt-6 max-w-3xl text-body leading-[1.65] text-[var(--color-fg-muted)]">
            Fractional COOs are leverage businesses. You sell the same
            operational expertise across 5&ndash;10 clients &mdash; that&rsquo;s
            exactly what OpsRadar is structurally built to be. The
            agency-vertical wedge proves the architecture works on one client.
            The fractional-operator tier proves it scales across many. We
            didn&rsquo;t build this for you as an afterthought &mdash;
            /dashboard/fo shipped before we even named the wedge.
          </p>
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
            Six clients on one workspace
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
            $2,999/mo.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Open the Hire chat. Configure your first client agency. Run a Loom
            demo for them this week. We&rsquo;ll be on the call if you want.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/waitlist">
                Coming soon &mdash; join waitlist
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to the founder — 20 min, no slides
              </a>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
            Private beta &middot; White-label &middot; Per-client brain stays in their Notion
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
