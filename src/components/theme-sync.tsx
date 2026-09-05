'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const DASH_THEME_KEY = 'dash-theme';
const ADMIN_THEME_KEY = 'admin-theme';

function isDashboard(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function isAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function readStored(key: string): 'light' | 'dark' | null {
  try {
    const v = localStorage.getItem(key);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // localStorage may throw in private browsing
  }
  return null;
}

function computeTheme(pathname: string): 'light' | 'dark' {
  if (isAdmin(pathname)) {
    return readStored(ADMIN_THEME_KEY) ?? 'dark';
  }
  if (isDashboard(pathname)) {
    return readStored(DASH_THEME_KEY) ?? 'dark';
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
