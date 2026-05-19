import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SEGMENTS = [
  {
    tag: "Paid media",
    href: "/for/paid-media",
    headline: "Sunday-night reporting goes away. Pacing alerts find you first.",
    bullets: [
      "Monthly client reports that build themselves",
      "Pacing alerts tied to MER, not last-click ROAS",
      "BM-access-to-first-report from 3 weeks to 5 days",
    ],
  },
  {
    tag: "SEO",
    href: "/for/seo",
    headline: "Track what matters in 2026 — AI Overviews, LLM mentions, rank.",
    bullets: [
      "Weekly rank digests from Ahrefs + GSC + Semrush",
      "AIO presence tracking across ChatGPT, Perplexity, Google AIO",
      "Technical audit alerts before Google notices",
    ],
  },
  {
    tag: "Full-service",
    href: "/for/full-service",
    headline: "Hold your margin as you scale across ad ops, SEO, and content.",
    bullets: [
      "Unified reporting across ad, organic, and content",
      "Utilization alerts before scope creep eats margin",
      "Cross-channel attribution your clients actually believe",
    ],
  },
] as const;

export function SegmentsBento() {
  return (
    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
      {SEGMENTS.map((s) => (
        <Link
          key={s.tag}
          href={s.href}
          className="group flex flex-col gap-5 px-0 py-10 md:px-10 md:py-0 first:md:pl-0 last:md:pr-0"
        >
          <p
            className="font-mono uppercase text-[var(--color-primary)]"
            style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 500 }}
          >
            {s.tag}
          </p>

          <h3
            className="text-[var(--color-fg)] text-balance"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-h3)",
              lineHeight: "var(--text-h3--line-height)",
              letterSpacing: "var(--text-h3--letter-spacing)",
              fontWeight: 500,
            }}
          >
            {s.headline}
          </h3>

          <ul className="flex-1 space-y-2">
            {s.bullets.map((b) => (
              <li
                key={b}
                className="grid grid-cols-[12px_1fr] gap-2"
                style={{
                  fontSize: "var(--text-body-sm)",
                  lineHeight: 1.6,
                  color: "var(--color-fg-muted)",
                }}
              >
                <span className="text-[var(--color-fg-faint)] mt-[3px]">—</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <p className="inline-flex items-center gap-1.5 text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg)] transition-colors duration-[var(--duration-fast)]"
            style={{ fontSize: "var(--text-body-sm)" }}
          >
            See the AI COO for {s.tag.toLowerCase()}
            <ArrowRight className="size-3.5 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5" />
          </p>
        </Link>
      ))}
    </div>
  );
}
