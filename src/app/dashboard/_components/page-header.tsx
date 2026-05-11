import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-[28px] font-normal leading-[1.15] tracking-[-0.02em] text-[var(--color-fg)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-body-sm text-[var(--color-fg-muted)]">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2.5 pt-1">{actions}</div>
      )}
    </div>
  );
}
