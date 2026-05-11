'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  UsersRound,
  Settings,
  ChevronDown,
  Plug,
} from 'lucide-react';
import { C } from '<npm>/app/dashboard/_lib/theme';
import { EcgIcon } from './icons';
import { SignOutButton } from '<npm>/components/dashboard/sign-out-button';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type NavSection = { tag: string | null; items: NavItem[] };

const navSections: NavSection[] = [
  {
    tag: 'BRAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard',         icon: LayoutDashboard },
      { label: 'Reports',   href: '/dashboard/reports', icon: BarChart3       },
    ],
  },
  {
    tag: 'OPERATE',
    items: [
      { label: 'Projects',      href: '/dashboard/projects',      icon: FolderKanban },
      { label: 'Tasks',         href: '/dashboard/tasks',         icon: CheckSquare  },
      { label: 'Time tracking', href: '/dashboard/time-tracking', icon: Clock        },
    ],
  },
  {
    tag: 'OBSERVE',
    items: [
      { label: 'Financials', href: '/dashboard/financials', icon: TrendingUp },
      { label: 'Clients',    href: '/dashboard/clients',    icon: Users      },
    ],
  },
  {
    tag: 'WORKSPACE',
    items: [
      { label: 'Team',         href: '/dashboard/team',                  icon: UsersRound },
      { label: 'Integrations', href: '/dashboard/settings/integrations', icon: Plug       },
      { label: 'Settings',     href: '/dashboard/settings',              icon: Settings   },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          padding: '22px 20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
        }}
      >
        <EcgIcon />
        <span style={{ fontWeight: 600, fontSize: 17, color: C.text, letterSpacing: '-0.3px' }}>
          opsradar
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
        {navSections.map((section, sectionIdx) => (
          <div key={section.tag ?? sectionIdx} style={{ marginTop: sectionIdx === 0 ? 4 : 14 }}>
            {section.tag && (
              <div
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, SF Mono, monospace',
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  color: C.muted,
                  padding: '4px 12px 6px',
                }}
              >
                {section.tag}
              </div>
            )}
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={label}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '9px 12px',
                    borderRadius: 8,
                    marginBottom: 2,
                    background: active ? C.accentMuted : 'transparent',
                    color: active ? C.accent : C.sub,
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2 : 1.6} />
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400 }}>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-accent-400), var(--color-accent-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: '0.5px',
            }}
          >
            AK
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Alex Kim
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>Agency Owner</div>
          </div>
          <ChevronDown size={13} color={C.muted} />
        </div>

        <SignOutButton />
      </div>
    </aside>
  );
}
