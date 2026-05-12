"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "<npm>/lib/utils";
import { Button } from "<npm>/components/ui/button";
import { Menu, X } from "lucide-react";

export type NavLink = { label: string; href: string };

const DEFAULT_LINKS: NavLink[] = [
  { label: "Product", href: "/aios" },
  { label: "About", href: "/about" },
];

interface SiteNavProps {
  links?: NavLink[];
  activeHref?: string;
  /** Where the primary CTA links to. Defaults to /audit. */
  ctaHref?: string;
  ctaLabel?: string;
}

export function SiteNav({
  links = DEFAULT_LINKS,
  activeHref,
  ctaHref = "/audit",
  ctaLabel = "Start audit",
}: SiteNavProps) {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-[var(--duration-fast)]",
        scrolled
          ? "border-[var(--color-border)] bg-[var(--color-bg)]"
          : "border-transparent bg-[var(--color-bg)]",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--color-fg)]"
          aria-label="OpsRadar home"
        >
          <Image
            src="/logo.svg"
            alt=""
            width={24}
            height={24}
            priority
            className="h-6 w-6"
          />
          <span className="font-serif text-[1.0625rem] tracking-[-0.01em]">OpsRadar</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-1.5 rounded-[var(--radius)] text-body-sm transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "text-[var(--color-fg)]"
                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-nav-mobile-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          id="site-nav-mobile-drawer"
          className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]"
        >
          <nav className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-[var(--radius)] text-body text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
              <Button asChild variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

