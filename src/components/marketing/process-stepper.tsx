import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants";

const STEPS = [
  {
    n: "01",
    tag: "Call",
    title: "We talk. No pitch.",
    body: "A 30-minute conversation. You explain how your agency runs. We listen and ask the questions only operators would ask. By the end of the call, both sides know if the AI COO belongs at your agency.",
    output: "What you walk away with: a clear yes-or-no on fit. If we're not the right system for you, we say so on the call.",
    cta: { label: "Book the call", href: CALENDLY_STRATEGY_CALL_URL, external: true },
  },
  {
    n: "02",
    tag: "Discovery",
    title: "We go deep on the business.",
    body: "If the call confirms a fit, we move into discovery — your tools, your clients, your team, your patterns, the workflows that live in someone's head. This is the part we will not skip. We do not build AI COO for agencies we do not understand.",
    output: "Format: structured forms, working sessions, and access to the tools you already pay for. About a week of evaluation on our side.",
    cta: null,
  },
  {
    n: "03",
    tag: "Blueprint",
    title: "A written plan for your AI COO.",
    body: "You receive a PDF that names what is actually happening to your operations today, why this matters now, what the system will do about it, what gets built first, and what the build will cost.",
    output: "What you walk away with: a buy-or-don't decision with full visibility. No surprises, no nine-page MSAs.",
    cta: null,
  },
  {
    n: "04",
    tag: "Build",
    title: "Your AI COO goes live.",
    body: "OPERATE runs the manual work in the background. OBSERVE surfaces every tool in one dashboard. BRAIN learns your business. GUARD watches it overnight. We can run the platform for you, or hand it to your team.",
    output: "What stays with you: every workflow, every credential, every log — in your accounts, under your control, from day one.",
    cta: { label: "See the audit", href: "/audit", external: false },
  },
] as const;

export function ProcessStepper() {
  return (
    <ol className="divide-y divide-[var(--color-border)]">
      {STEPS.map((s) => (
        <li
          key={s.n}
          className="grid md:grid-cols-12 gap-6 md:gap-10 py-12 md:py-16 first:pt-0"
        >
          {/* Left — number + tag */}
          <div className="md:col-span-3 flex md:flex-col items-baseline gap-4 md:gap-2">
            <span
              className="font-mono tabular-nums text-[var(--color-fg-subtle)]"
              style={{ fontSize: "13px", letterSpacing: "0.06em" }}
            >
              {s.n}
            </span>
            <span
              className="font-mono uppercase text-[var(--color-primary)]"
              style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 500 }}
            >
              {s.tag}
            </span>
          </div>

          {/* Right — content */}
          <div className="md:col-span-9">
            <h3
              className="text-[var(--color-fg)] text-balance"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-h2)",
                lineHeight: "var(--text-h2--line-height)",
                letterSpacing: "var(--text-h2--letter-spacing)",
                fontWeight: 500,
              }}
            >
              {s.title}
            </h3>

            <p
              className="mt-5 text-[var(--color-fg-muted)] max-w-[60ch]"
              style={{
                fontSize: "var(--text-body-lg)",
                lineHeight: "var(--text-body-lg--line-height)",
              }}
            >
              {s.body}
            </p>

            {/* Output — left accent rule, no card */}
            <p
              className="mt-6 pl-4 border-l-2 border-[var(--color-border-strong)] text-[var(--color-fg-subtle)]"
              style={{
                fontSize: "var(--text-body-sm)",
                lineHeight: 1.65,
              }}
            >
              {s.output}
            </p>

            {s.cta && (
              <div className="mt-7">
                {s.cta.external ? (
                  <a
                    href={s.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--color-primary)] font-mono text-[13px] tracking-[0.02em] hover:underline underline-offset-4"
                  >
                    {s.cta.label}
                    <ArrowRight className="size-3.5" />
                  </a>
                ) : (
                  <Link
                    href={s.cta.href}
                    className="inline-flex items-center gap-1.5 text-[var(--color-primary)] font-mono text-[13px] tracking-[0.02em] hover:underline underline-offset-4"
                  >
                    {s.cta.label}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
