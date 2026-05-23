'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plug,
  Settings,
  ChevronRight,
  Zap,
  BrainCircuit,
  BarChart2,
  Target,
  FileText,
  Building2,
  Webhook,
  Sparkles,
  Network,
  Inbox,
  Users,
  Database,
  Bot,
  History,
} from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import Image from 'next/image';
import { SignOutButton } from '<npm>/components/dashboard/sign-out-button';
import { ThemeToggle } from '<npm>/components/dashboard/theme-toggle';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type NavSection = { tag: string | null; items: NavItem[] };
type SidebarProps = {
  userInitials: string;
  userName: string;
  userRole: string;
  brandLogoUrl?: string | null;
  brandName?: string | null;
};

const navSections: NavSection[] = [
  {
    tag: null,
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    tag: 'TODAY',
    items: [
      { label: 'Actions',    href: '/dashboard/actions',    icon: Zap   },
      { label: 'Briefings',  href: '/dashboard/briefings',  icon: Inbox },
      { label: 'AI Ops Team', href: '/dashboard/agents',    icon: Bot   },
    ],
  },
  {
    tag: 'CLIENTS',
    items: [
      { label: 'Profitability', href: '/dashboard/profitability', icon: FileText },
      { label: 'Scope',         href: '/dashboard/scope',         icon: Target   },
      { label: 'Retainers',     href: '/dashboard/retainer',      icon: Users    },
    ],
  },
  {
    tag: 'INTELLIGENCE',
    items: [
      { label: 'Ask COO',       href: '/dashboard/coo',         icon: BrainCircuit },
      { label: 'Company Brain', href: '/dashboard/brain',       icon: Sparkles     },
      { label: 'Performance',   href: '/dashboard/performance', icon: BarChart2    },
    ],
  },
  {
    tag: 'OPERATIONS',
    items: [
      { label: 'Runs',        href: '/dashboard/runs',        icon: History  },
      { label: 'Live Data',   href: '/dashboard/business',    icon: Database },
    ],
  },
  {
    tag: 'PARTNER',
    items: [
      { label: 'My Agencies', href: '/dashboard/fo',          icon: Building2 },
      { label: 'Branding',    href: '/dashboard/fo/branding', icon: Settings  },
    ],
  },
  {
    tag: 'WORKSPACE',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations',          icon: Plug      },
      { label: 'Automation',   href: '/dashboard/settings/automation',   icon: Bot       },
      { label: 'MCP',          href: '/dashboard/settings/mcp',          icon: Network   },
      { label: 'Webhooks',     href: '/dashboard/webhooks',              icon: Webhook   },
      { label: 'Team',         href: '/dashboard/settings/team',         icon: Building2 },
      { label: 'Settings',     href: '/dashboard/settings',              icon: Settings  },
    ],
  },
];

export function Sidebar({ userInitials, userName, userRole, brandLogoUrl, brandName }: SidebarProps) {
  const pathname = usePathname();
  const [unreadBriefings, setUnreadBriefings] = useState(0);
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    fetch('/api/dashboard/briefing?unread_only=true')
      .then((r) => r.json())
      .then((d: { count?: number }) => setUnreadBriefings(d.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/actions?status=pending&limit=1')
      .then((r) => r.json())
      .then((d: { pending_count?: number }) => setPendingActions(d.pending_count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-[220px] min-w-[220px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-5 pt-5 pb-5 text-[var(--color-fg)] no-underline"
      >
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoUrl}
            alt={brandName ?? 'Brand'}
            width={24}
            height={24}
            className="h-6 w-6 rounded-md object-contain"
          />
        ) : (
          <Image src="/logo.png" alt="OpsRadar" width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
        )}
        <span className="font-serif text-[17px] tracking-[-0.01em] text-[var(--color-fg)]">
          {brandName ?? 'OpsRadar'}
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
              const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
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
                  {href === '/dashboard/briefings' && unreadBriefings > 0 && (
                    <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-bold text-white">
                      {unreadBriefings}
                    </span>
                  )}
                  {href === '/dashboard/actions' && pendingActions > 0 && (
                    <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-bold text-white">
                      {pendingActions}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] px-3.5 py-3">
        <Link
          href="/dashboard/settings"
          aria-label="Edit profile"
          className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-2.5 py-2 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-[12px] font-bold tracking-[0.5px] text-white">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-body-sm font-semibold text-[var(--color-fg)]">{userName}</div>
            <div className="text-caption text-[var(--color-fg-subtle)]">{userRole}</div>
          </div>
          <ChevronRight size={13} className="text-[var(--color-fg-faint)]" />
        </Link>

        <ThemeToggle />
        <SignOutButton />
      </div>
    </aside>
  );
}
