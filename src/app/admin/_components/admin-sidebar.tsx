'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Database, UserPlus } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { AdminThemeToggle } from '<npm>/components/admin/admin-theme-toggle';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type NavSection = { tag: string | null; items: NavItem[] };

const navSections: NavSection[] = [
  {
    tag: 'OPERATOR',
    items: [
      { label: 'Audits',   href: '/admin',                  icon: LayoutDashboard },
      { label: 'Data',     href: '/admin/data',             icon: Database        },
      { label: 'Onboard',  href: '/admin/onboard-customer', icon: UserPlus        },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/admin-auth', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-[220px] min-w-[220px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Logo */}
      <Link
        href="/admin"
        className="flex items-center gap-2 px-5 pt-5 pb-5 text-[var(--color-fg)] no-underline"
      >
        <Image src="/logo.png" alt="OpsRadar" width={18} height={18} className="h-[18px] w-auto rounded-[3px]" />
        <span className="font-serif text-[17px] tracking-[-0.01em] text-[var(--color-fg)]">
          OpsRadar
        </span>
        <span className="ml-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-1.5 py-[1px] text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          admin
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1">
        {navSections.map((section, sectionIdx) => (
          <div key={section.tag ?? sectionIdx} className={sectionIdx === 0 ? 'mt-1' : 'mt-3.5'}>
            {section.tag && (
              <div className="px-3 pt-1 pb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
                {section.tag}
              </div>
            )}
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    'mb-0.5 flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] no-underline',
                    active
                      ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]'
                      : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]',
                  )}
                >
                  <Icon size={16} strokeWidth={active ? 2 : 1.6} />
                  <span className={cn('text-[13.5px]', active ? 'font-semibold' : 'font-normal')}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: theme toggle + sign out */}
      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] px-3.5 py-3">
        <AdminThemeToggle />
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
