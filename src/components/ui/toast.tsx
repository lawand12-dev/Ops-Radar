"use client";

import * as React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="top-right"
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] shadow-[var(--shadow-md)]",
          title: "text-body font-medium",
          description: "text-body-sm text-[var(--color-fg-muted)]",
          actionButton:
            "bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-[var(--radius-sm)] px-2 py-1 text-caption font-medium",
          cancelButton:
            "bg-transparent text-[var(--color-fg-muted)] rounded-[var(--radius-sm)] px-2 py-1 text-caption",
          success:
            "border-[var(--color-success)] [&_[data-icon]]:text-[var(--color-success)]",
          error:
            "border-[var(--color-danger)] [&_[data-icon]]:text-[var(--color-danger)]",
          warning:
            "border-[var(--color-warn)] [&_[data-icon]]:text-[var(--color-warn)]",
          info:
            "border-[var(--color-primary)] [&_[data-icon]]:text-[var(--color-primary)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
