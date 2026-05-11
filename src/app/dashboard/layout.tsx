import type { ReactNode } from 'react';
import { Sidebar } from './_components/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans">
      <Sidebar />
      <main className="ml-[220px] min-w-0 flex-1 px-6 py-7">
        {children}
      </main>
    </div>
  );
}
