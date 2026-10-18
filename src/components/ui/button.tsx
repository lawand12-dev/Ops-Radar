import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "<npm>/lib/utils"

/**
 * Phase D — pill CTAs site-wide per docs/design-language-opsradar.md §5.1.
 * Mercury/Vercel converge on this exact shape:
 *   border-radius: 9999px, 48px height (lg), weight 500
 *   transition: 300ms cubic-bezier(0,0,0.2,1) on background-color ONLY
 *   hover: shift fill color only — no transform, no shadow, no scale (Mercury rule)
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-300 outline-none select-none focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--color-bg),0_0_0_4px_var(--radar-500)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--color-danger)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--radar-500)] text-white hover:bg-[var(--radar-600)]",
        outline:
          "border-[var(--color-border-strong)] bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]",
        secondary:
          "bg-[var(--radar-50)] text-[var(--radar-500)] hover:bg-[color-mix(in_srgb,var(--radar-500)_14%,transparent)]",
        ghost:
          "bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]",
        destructive:
          "bg-[var(--flare-500)] text-white hover:bg-[color-mix(in_srgb,var(--flare-500)_85%,black)]",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default:
          "h-10 gap-1.5 px-5 text-[14px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 text-[12px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-4 text-[13px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-12 gap-2 px-6 text-[15px] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
