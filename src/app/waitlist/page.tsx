import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteNav } from "<npm>/components/marketing/site-nav";
import { SiteFooter } from "<npm>/components/marketing/site-footer";
import { Button } from "<npm>/components/ui/button";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";
import { RevealOnScroll } from "<npm>/components/marketing/reveal-on-scroll";

export const metadata: Metadata = {
  title: "Product status — OpsRadar",
  description: "Current availability and status of the OpsRadar product.",
  openGraph: {
    title: "OpsRadar product status",
    description: "The OpsRadar website is online; product access is currently unavailable.",
    url: "https://www.opsradar.co/waitlist",
    siteName: "OpsRadar",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpsRadar product status",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsRadar product status",
    description: "Product access is currently unavailable.",
    images: ["/og-image.png"],
  },
};

const REALITY: Array<{ label: string; body: string }> = [
  {
    label: "What's online",
    body: "A static informational website hosted on Vercel. No customer accounts, dashboard, integrations, or AI product features are available.",
  },
  {
    label: "Product status",
    body: "The hosted OpsRadar product is unavailable. There is no signup, waitlist form, or published relaunch date.",
  },
  {
    label: "Website content",
    body: "Other pages preserve product concepts and mockups for reference. They do not represent a live service or an offer to purchase.",
  },
];

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/waitlist" />

      <Hero />
      <RealitySection />
      <FinalCTA />

      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-20 md:pb-24">
        <RevealOnScroll delay={0} offset={32}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            <span
              aria-hidden
              className="mr-2 inline-block size-1.5 rounded-full align-middle bg-[var(--color-success)]"
            />
            Current availability
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
            OpsRadar product access is currently unavailable.
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
            This website remains online as a static information site. It does
            not provide accounts, product access, integrations, or a way to
            join a waitlist.
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
                Talk to the founder — 20 min
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/product">See what&rsquo;s built &rarr;</Link>
            </Button>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={580} offset={32}>
          <p className="mt-6 text-caption text-[var(--color-fg-subtle)]">
            No slides &middot; No pitch &middot; If we&rsquo;re not a fit we tell you on the call
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function RealitySection() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            What that means in practice
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
            What&rsquo;s built. What&rsquo;s next. What happens today.
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={120} offset={40}>
          <div className="mt-12 grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {REALITY.map((r) => (
              <div
                key={r.label}
                className="bg-[var(--color-surface)] p-6 md:p-8 flex flex-col gap-3"
              >
                <p className="font-mono text-caption tracking-[0.18em] text-[var(--color-fg-subtle)] uppercase">
                  {r.label}
                </p>
                <p className="text-body leading-[1.65] text-[var(--color-fg-muted)]">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
        <RevealOnScroll delay={0} offset={40}>
          <p className="text-label uppercase text-[var(--color-fg-subtle)]">
            One 20-minute call
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
            Tell us about your agency. If we&rsquo;re a fit, you&rsquo;re in
            the first batch when the front door opens. If we&rsquo;re not,
            we tell you on the call.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a
                href={CALENDLY_STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to the founder — 20 min
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
            Product access unavailable &middot; No waitlist or subscription signup
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
