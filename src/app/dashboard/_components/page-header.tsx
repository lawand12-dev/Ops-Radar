import type { ReactNode } from 'react';
import { C } from '<npm>/app/dashboard/_lib/theme';

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
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 22,
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 5, lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13.5, color: C.sub, margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
