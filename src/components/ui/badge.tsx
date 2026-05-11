import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "<npm>/lib/utils";

const badgeVariants = cva(
  [
    "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden",
    "rounded-[var(--radius-sm)] border border-transparent px-2 py-0.5",
    "text-caption font-medium whitespace-nowrap",
    "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
    "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
    "aria-invalid:border-[var(--color-danger)]",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        // Existing variants (retokened)
        default:
          "bg-[var(--color-primary)] text-[var(--color-primary-fg)] [a]:hover:bg-[var(--color-primary-hover)]",
        secondary:
          "bg-[var(--color-surface-sunken)] text-[var(--color-fg)] [a]:hover:bg-[var(--color-border)]",
        destructive:
          "bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] text-[var(--color-danger)] [a]:hover:bg-[color-mix(in_srgb,var(--color-danger)_20%,transparent)]",
        outline:
          "border-[var(--color-border)] text-[var(--color-fg)] [a]:hover:bg-[var(--color-surface-sunken)] [a]:hover:text-[var(--color-fg)]",
        ghost:
          "hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
        // New semantic status variants
        success:
          "bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)]",
        warn:
          "bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] text-[var(--color-warn)]",
        accent:
          "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  /**
   * When true, renders a small leading colored circle that inherits the variant's foreground color.
   * Useful for "running / degraded / failed" status pills.
   */
  dot?: boolean;
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: "currentColor" }}
        />
      )}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
