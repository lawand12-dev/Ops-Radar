import type { ReactNode } from 'react';
import { C } from '<npm>/app/dashboard/_lib/theme';

type Pillar = 'OPERATE' | 'OBSERVE' | 'BRAIN' | 'GUARD';

/**
 * Small monospace caps label that marks a dashboard section as one of the
 * four AIOS pillars. Matches the eyebrow style used across marketing.
 */
export function PillarTag({
  name,
  subtitle,
  style,
}: {
  name: Pillar;
  subtitle?: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, ...style }}>
      <span
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, SF Mono, monospace',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.16em',
          color: C.accent,
        }}
      >
        {name}
      </span>
      {subtitle && (
        <span style={{ fontSize: 12, color: C.sub }}>{subtitle}</span>
      )}
    </div>
  );
}
