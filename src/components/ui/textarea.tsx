import * as React from "react";

import { cn } from "<npm>/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base layout / typography
        "w-full min-h-[80px] rounded-[var(--radius)] px-3 py-2 text-body resize-y",
        // Surface + foreground
        "bg-[var(--color-surface)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]",
        // Border
        "border border-[var(--color-border)]",
        // Transitions
        "transition-[color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] outline-none",
        // Hover
        "hover:border-[var(--color-border-strong)]",
        // Focus ring
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-[var(--color-danger)] aria-invalid:outline-[var(--color-danger)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
