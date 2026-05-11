import * as React from "react";

import { cn } from "<npm>/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout / typography
        "h-9 w-full min-w-0 rounded-[var(--radius)] px-3 py-1 text-body",
        // Surface + foreground
        "bg-[var(--color-surface)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]",
        // Border
        "border border-[var(--color-border)]",
        // Transitions (only color/border/box-shadow, per motion budget)
        "transition-[color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] outline-none",
        // File input affordance
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-[var(--color-fg)]",
        // Hover
        "hover:border-[var(--color-border-strong)]",
        // Focus ring (consistent with Button)
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state (preserve aria-invalid hooks for forms)
        "aria-invalid:border-[var(--color-danger)] aria-invalid:outline-[var(--color-danger)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
