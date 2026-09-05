import * as React from "react";
import { cn } from "<npm>/lib/utils";

type Trend = "up" | "down" | "flat";

interface MetricProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; trend: Trend };
}

const TREND_COLOR: Record<Trend, string> = {
  up: "text-[var(--color-success)]",
  down: "text-[var(--color-danger)]",
  flat: "text-[var(--color-fg-subtle)]",
};

function Metric({ label, value, delta, className, ...props }: MetricProps) {
  return (
    <div
      data-slot="metric"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <span className="text-label text-[var(--color-fg-subtle)]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-h3 font-medium tabular-nums text-[var(--color-fg)]">{value}</span>
        {delta && (
          <span className={cn("text-caption", TREND_COLOR[delta.trend])}>{delta.value}</span>
        )}
      </div>
    </div>
  );
}

export { Metric, type MetricProps, type Trend };
