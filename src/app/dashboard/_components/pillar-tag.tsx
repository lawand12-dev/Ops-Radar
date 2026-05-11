import type { CSSProperties, ReactNode } from 'react';
import { cn } from '<npm>/lib/utils';

type Pillar = 'OPERATE' | 'OBSERVE' | 'BRAIN' | 'GUARD';

/**
 * Small monospace caps label that marks a dashboard section as one of
 * the four AIOS pillars. Matches the eyebrow style used across marketing.
 */
export function PillarTag({
  name,
  subtitle,
  className,
  style,
}: {
  name: Pillar;
  subtitle?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn('mb-2.5 flex items-baseline gap-2.5', className)} style={style}>
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
        {name}
      </span>
      {subtitle && (
        <span className="text-caption text-[var(--color-fg-muted)]">{subtitle}</span>
      )}
    </div>
  );
}
