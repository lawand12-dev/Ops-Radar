'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '<npm>/lib/utils';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'site-theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const CHANGE_EVENT = 'site-theme-change';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // localStorage may throw in private browsing
  }
  return 'light';
}

function getServerSnapshot(): Theme {
  return 'light';
}

export function SiteThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function pick(next: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — cookie still gives us SSR persistence
    }
    document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
    >
      <Option
        active={theme === 'light'}
        onClick={() => pick('light')}
        label="Light"
        icon={<Sun size={12} strokeWidth={1.8} />}
      />
      <Option
        active={theme === 'dark'}
        onClick={() => pick('dark')}
        label="Dark"
        icon={<Moon size={12} strokeWidth={1.8} />}
      />
    </div>
  );
}

function Option({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Switch to ${label.toLowerCase()} mode`}
      className={cn(
        'inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[5px] transition-colors',
        active
          ? 'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]'
          : 'text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)]',
      )}
    >
      {icon}
    </button>
  );
}
