import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '<npm>/lib/utils';

/**
 * Dashboard-local button wrappers — kept thin so existing callers
 * (`<PrimaryButton>Add foo</PrimaryButton>`) keep working without
 * a sweep through every page. Internally now backed by Phase 0
 * tokens via Tailwind.
 *
 * For new code: prefer importing `Button` from
 * `<npm>/components/ui/button` directly with the appropriate variant.
 */

export function PrimaryButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] bg-[var(--color-primary)] px-3.5 py-1.5',
        'text-body-sm font-semibold text-[var(--color-primary-fg)]',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'hover:bg-[var(--color-primary-hover)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5',
        'text-body-sm text-[var(--color-fg-muted)]',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}
