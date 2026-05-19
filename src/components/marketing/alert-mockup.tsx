"use client";

import { ArrowRight } from "lucide-react";

/**
 * OpsRadar Alert Mockup — Pattern 3 from `docs/design-language-opsradar.md`.
 *
 * The signature brand asset. A dark card mimicking a real product alert from
 * the AI COO. Appears on every marketing page with page-specific content.
 *
 * Spec:
 *   - Background: --ink-card (#13141A)
 *   - Radius: 12px
 *   - Hairline: 1px solid rgba(255,255,255,0.08)
 *   - Left edge: 4px solid {flare|smoke|clear} based on severity
 *   - Padding: 20px 24px
 *   - The numbers inside the body inline-color in --radar-500
 */

export type AlertSeverity = "critical" | "warning" | "positive";

export interface AlertMockupProps {
  severity?: AlertSeverity;
  source?: string;
  timestamp?: string;
  /** The bold one-line headline. */
  headline: string;
  /** Body with `{key}` placeholders highlighted in radar blue. */
  body: React.ReactNode;
  primaryAction?: string;
  secondaryAction?: string;
  footnote?: string;
  className?: string;
}

const EDGE: Record<AlertSeverity, string> = {
  critical: "var(--flare-500)",
  warning: "var(--smoke-500)",
  positive: "var(--clear-500)",
};

const STATUS_DOT: Record<AlertSeverity, string> = {
  critical: "var(--flare-500)",
  warning: "var(--smoke-500)",
  positive: "var(--clear-500)",
};

export function AlertMockup({
  severity = "warning",
  source = "OpsRadar",
  timestamp = "this morning",
  headline,
  body,
  primaryAction,
  secondaryAction,
  footnote,
  className = "",
}: AlertMockupProps) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-[12px] " +
        "shadow-[0_1px_3px_rgba(0,0,0,0.02),0_3px_7px_rgba(0,0,0,0.04),0_7px_15px_rgba(0,0,0,0.04),0_14px_28px_rgba(0,0,0,0.06),0_23px_52px_rgba(0,0,0,0.08)] " +
        className
      }
      style={{
        background: "var(--ink-card)",
        border: "1px solid var(--ink-line)",
      }}
    >
      {/* Severity edge */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: EDGE[severity] }}
      />

      <div className="pl-6 pr-6 py-5">
        {/* Header row — avatar + source + timestamp + live dot */}
        {/* Header row — avatar + source + timestamp + live dot.
            All text colors are HARDCODED light because this card is always
            a dark island regardless of page theme. */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
            style={{
              background: "var(--radar-500)",
              color: "#FFFFFF",
            }}
          >
            R
          </span>
          <span
            className="text-[13px] font-medium"
            style={{ color: "#F2F4F8" }}
          >
            {source}
          </span>
          <span style={{ color: "#8A8F98" }}>·</span>
          <span
            className="text-[12px]"
            style={{ color: "#8A8F98" }}
          >
            {timestamp}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: STATUS_DOT[severity] }}
            />
            <span
              className="text-[10px] uppercase tracking-[0.12em] font-medium"
              style={{ color: "#8A8F98" }}
            >
              {severity === "critical"
                ? "Critical"
                : severity === "warning"
                  ? "Alert"
                  : "Recovered"}
            </span>
          </span>
        </div>

        {/* Headline */}
        <p
          className="mt-4 text-[15px] font-semibold leading-[1.4]"
          style={{ color: "#F2F4F8" }}
        >
          {headline}
        </p>

        {/* Body */}
        <div
          className="mt-2.5 text-[13px] leading-[1.6]"
          style={{ color: "#C8CDD8" }}
        >
          {body}
        </div>

        {/* Action row */}
        {(primaryAction || secondaryAction) && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {primaryAction && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors duration-[150ms] hover:opacity-90"
                style={{
                  background: "var(--radar-500)",
                  color: "#FFFFFF",
                }}
              >
                {primaryAction}
                <ArrowRight className="size-3" aria-hidden />
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors duration-[150ms] hover:bg-[rgba(255,255,255,0.04)]"
                style={{
                  background: "transparent",
                  color: "#C8CDD8",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {secondaryAction}
              </button>
            )}
          </div>
        )}

        {/* Footnote */}
        {footnote && (
          <p
            className="mt-4 pt-3 text-[11px] italic"
            style={{
              color: "#8A8F98",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline highlighted number — use inside <AlertMockup body> to flag
 * dollar amounts and percentages in radar blue.
 *
 * Example:
 *   <AlertMockup body={<>Acme is over scope by <Num>$8,400</Num> this month.</>} />
 */
export function Num({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-medium"
      style={{ color: "var(--radar-500)" }}
    >
      {children}
    </span>
  );
}
