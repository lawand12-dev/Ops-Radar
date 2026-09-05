import { Info, X } from 'lucide-react';
import { cn } from '<npm>/lib/utils';

type Trend = 'up' | 'down' | 'neutral';

const TREND_STYLES: Record<Trend, { color: string; bg: string; arrow: string }> = {
  up: {
    color: 'text-[var(--color-success)]',
    bg: 'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]',
    arrow: '▲',
  },
  down: {
    color: 'text-[var(--color-danger)]',
    bg: 'bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)]',
    arrow: '▼',
  },
  neutral: {
    color: 'text-[var(--color-fg-muted)]',
    bg: 'bg-[var(--color-surface-sunken)]',
    arrow: '•',
  },
};

export function StatCard({
  label,
  value,
  delta,
  trend = 'up',
  hint = 'vs last month',
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  hint?: string;
}) {
  const t = TREND_STYLES[trend];

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-caption font-medium text-[var(--color-fg-muted)]">{label}</span>
          <Info size={11} className="text-[var(--color-fg-faint)]" />
        </div>
        <X size={12} className="cursor-pointer text-[var(--color-fg-faint)]" />
      </div>
      <div className="mb-3 font-mono text-[26px] font-medium leading-none tabular-nums text-[var(--color-fg)] tracking-[-0.01em]">
        {value}
      </div>
      {delta && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-[2px] text-[11.5px] font-semibold',
              t.color,
              t.bg,
            )}
          >
            {t.arrow} {delta}
          </span>
          <span className="text-caption text-[var(--color-fg-faint)]">{hint}</span>
        </div>
      )}
    </div>
  );
}
