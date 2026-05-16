'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const DASH_THEME_KEY = 'dash-theme';

function isDashboard(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function isAlwaysDark(pathname: string): boolean {
  const prefixes = ['/admin', '/aios'];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function computeTheme(pathname: string): 'light' | 'dark' {
  if (isAlwaysDark(pathname)) return 'dark';
  if (isDashboard(pathname)) {
    try {
      const pref = localStorage.getItem(DASH_THEME_KEY);
      if (pref === 'light' || pref === 'dark') return pref;
    } catch {
      // localStorage may throw in private browsing — fall through to default
    }
    return 'dark';
  }
  return 'light';
}

/**
 * Keeps <html data-theme> in sync with the current pathname.
 *
 * The root layout sets data-theme from a request header on first render, but
 * the <html> element is the document root — client-side navigation between
 * route segments never replaces it. Without this component, navigating from a
 * dark section (/admin, /dashboard) to a light section (marketing) leaves the
 * page stuck in the previous theme until a hard reload.
 */
export function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = computeTheme(pathname);
  }, [pathname]);
  return null;
}
