import type { ReactNode } from 'react';
import { AdminSidebar } from '../_components/admin-sidebar';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans">
      <AdminSidebar />
      <main className="ml-[220px] min-w-0 flex-1 px-6 py-7">
        {children}
      </main>
    </div>
  );
}
