import * as React from "react";
import { cn } from "<npm>/lib/utils";

type Status = "running" | "degraded" | "failed" | "idle" | "info";

const COLOR: Record<Status, string> = {
  running: "bg-[var(--color-success)]",
  degraded: "bg-[var(--color-warn)]",
  failed: "bg-[var(--color-danger)]",
  idle: "bg-[var(--color-fg-faint)]",
  info: "bg-[var(--color-primary)]",
};

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status;
}

function StatusDot({ status, className, ...props }: StatusDotProps) {
  return (
    <span
      data-slot="status-dot"
      data-status={status}
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", COLOR[status], className)}
      {...props}
    />
  );
}

export { StatusDot, type Status };
