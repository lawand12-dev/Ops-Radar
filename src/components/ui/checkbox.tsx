"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";

import { cn } from "<npm>/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[var(--radius-sm)]",
        "border border-[var(--color-border-strong)]",
        "bg-[var(--color-surface)] text-[var(--color-primary-fg)]",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:border-[var(--color-primary)]",
        "data-[state=indeterminate]:bg-[var(--color-primary)] data-[state=indeterminate]:border-[var(--color-primary)]",
        "aria-invalid:border-[var(--color-danger)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
