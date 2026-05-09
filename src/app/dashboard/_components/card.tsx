import type { CSSProperties, ReactNode } from 'react';
import { Info } from 'lucide-react';
import { C } from '<npm>/app/dashboard/_lib/theme';

export function Card({
  title,
  action,
  children,
  style,
  bodyStyle,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '18px 20px 16px',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
            <Info size={13} color={C.muted} />
          </div>
          {action}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
