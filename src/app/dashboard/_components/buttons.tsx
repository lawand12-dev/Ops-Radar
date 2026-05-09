import type { ReactNode } from 'react';
import { C } from '<npm>/app/dashboard/_lib/theme';

export function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: C.accent,
        border: 'none',
        borderRadius: 8,
        padding: '7px 14px',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '7px 13px',
        color: C.sub,
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
