import * as React from "react";
import { cn } from "<npm>/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
