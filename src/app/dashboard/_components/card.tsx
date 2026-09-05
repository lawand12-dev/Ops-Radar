import type { CSSProperties, ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '<npm>/lib/utils';

/**
 * Dashboard-local Card primitive — kept as a wrapper around the same
 * API surface previous callers expect (title / action / children).
 * Uses Phase 0 tokens via Tailwind utilities. `style` + `bodyStyle`
 * escape hatches preserved for callers that need flex / width
 * overrides.
 */
export function Card({
  title,
  action,
  children,
  style,
  bodyStyle,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 pt-4 pb-4',
        className,
      )}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-body-sm font-semibold text-[var(--color-fg)]">{title}</span>
            <Info size={13} className="text-[var(--color-fg-faint)]" />
          </div>
          {action}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
