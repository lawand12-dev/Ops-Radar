import type { CSSProperties, ReactNode } from 'react';
import { Sidebar } from './_components/sidebar';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getFoBranding } from '<npm>/lib/fo-branding';
import { getUserPlan } from '<npm>/lib/tier';

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

  // Pull FO branding only when the user is on the FO plan — gates the white-label
  // experience to paying FO operators.
  const plan = getUserPlan((user?.user_metadata ?? null) as Record<string, unknown> | null);
  const branding = user && plan === 'fo' ? await getFoBranding(user.id) : null;
  const isOwner = role === 'owner';

  const rootStyle: CSSProperties | undefined = branding?.accent_color
    ? ({ ['--brand-accent' as string]: branding.accent_color } as CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans" style={rootStyle}>
      <Sidebar
        userInitials={initials}
        userName={displayName}
        userRole={displayRole}
        isOwner={isOwner}
        brandLogoUrl={branding?.logo_url ?? null}
        brandName={branding?.brand_name ?? null}
      />
      <main className="ml-[220px] min-w-0 flex-1 px-6 py-7">
        {children}
      </main>
    </div>
  );
}
