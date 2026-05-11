"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "<npm>/lib/utils";

function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-[var(--radius-sm)] px-2 py-1 text-caption",
          "bg-[var(--color-fg)] text-[var(--color-bg)]",
          "ds-anim-fade-in ds-anim-fade-out",
          "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          "data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[var(--color-fg)]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
