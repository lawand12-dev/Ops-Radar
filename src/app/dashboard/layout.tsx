import type { ReactNode } from 'react';
import { Sidebar } from './_components/sidebar';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getSessionSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const email = user?.email ?? '';
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullName = meta.full_name;
  const role = meta.role;

  const displayName = fullName || email.split('@')[0] || 'Customer';
  const initials = (
    fullName
      ? fullName.split(' ').slice(0, 2).map((s: string) => s[0]).join('')
      : email.slice(0, 2)
  ).toUpperCase() || '·';
  const displayRole = role || 'Customer';

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans">
      <Sidebar userInitials={initials} userName={displayName} userRole={displayRole} />
      <main className="ml-[220px] min-w-0 flex-1 px-6 py-7">
        {children}
      </main>
    </div>
  );
}
