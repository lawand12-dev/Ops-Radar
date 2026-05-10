'use client';

import { LogOut } from 'lucide-react';

const C = {
  border: 'rgba(0,194,255,0.1)',
  text: '#E0F0FF',
  muted: '#4A6280',
};

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post" style={{ width: '100%' }}>
      <button
        type="submit"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: 'transparent',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <LogOut size={14} color={C.muted} />
        <span>Sign out</span>
      </button>
    </form>
  );
}
