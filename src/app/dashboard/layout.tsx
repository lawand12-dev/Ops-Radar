import type { ReactNode } from 'react';
import { Sidebar } from './_components/sidebar';
import { C } from './_lib/theme';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', fontFamily: 'inherit' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 26px', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
