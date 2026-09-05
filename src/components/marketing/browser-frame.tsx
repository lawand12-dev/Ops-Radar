import * as React from "react";
import { cn } from "<npm>/lib/utils";

interface BrowserFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** URL shown in the address pill. */
  url?: string;
  /** Theme of the chrome — matches what's inside. */
  theme?: "light" | "dark";
}

/**
 * macOS-style browser chrome wrapping a product preview.
 * Three traffic-light dots + URL pill, then children below.
 *
 * Used to give the dashboard preview a "real product" frame
 * on the marketing hero.
 */
export function BrowserFrame({
  url = "opsradar.co/dashboard",
  theme = "dark",
  className,
  children,
  ...rest
}: BrowserFrameProps) {
  return (
    <div
      data-theme={theme}
      className={cn(
        "relative rounded-[14px] overflow-hidden",
        "border border-[var(--color-border)]",
        "bg-[var(--color-surface)]",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_30px_60px_-20px_rgba(15,23,42,0.35),0_8px_16px_-8px_rgba(15,23,42,0.20)]",
        className,
      )}
      {...rest}
    >
      {/* Chrome bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--color-bg)]/40 border border-[var(--color-border)]">
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="text-[var(--color-fg-subtle)]"
            >
              <path
                d="M5 7V5a3 3 0 0 1 6 0v2m-7 0h8v6H4V7Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[11px] font-mono text-[var(--color-fg-subtle)] tracking-tight">
              {url}
            </span>
          </div>
        </div>
        {/* Spacer to balance traffic lights */}
        <div className="w-[46px]" />
      </div>

      {children}
    </div>
  );
}
