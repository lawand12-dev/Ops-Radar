"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "<npm>/lib/utils";
import { Button } from "<npm>/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";

export type NavLink = { label: string; href: string };

const FOR_AGENCIES_LINKS: NavLink[] = [
  { label: "Paid media", href: "/for/paid-media" },
  { label: "SEO", href: "/for/seo" },
  { label: "Full-service", href: "/for/full-service" },
];

const DEFAULT_LINKS: NavLink[] = [
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
];

interface SiteNavProps {
  links?: NavLink[];
  activeHref?: string;
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
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-[var(--duration-fast)]",
        scrolled
          ? "border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-[12px]"
          : "border-transparent bg-[var(--color-bg)]",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--color-fg)]"
          aria-label="OpsRadar home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            priority
            className="h-7 w-7 rounded-md object-cover"
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1.0625rem",
              letterSpacing: "-0.01em",
              fontWeight: 500,
            }}
          >
            OpsRadar
          </span>
        </Link>

        {/* Desktop nav */}
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

          {/* For agencies dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius)] text-body-sm transition-colors duration-[var(--duration-fast)]",
                dropdownOpen
                  ? "text-[var(--color-fg)]"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
              )}
            >
              For agencies
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-[var(--duration-fast)]",
                  dropdownOpen && "rotate-180",
                )}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-44 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] py-1">
                {FOR_AGENCIES_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button asChild size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
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
            <p className="px-3 pt-3 pb-1 text-label text-[var(--color-fg-subtle)] uppercase">
              For agencies
            </p>
            {FOR_AGENCIES_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-[var(--radius)] text-body text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)] pl-6"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[var(--color-border)] mt-2">
              <Button asChild className="w-full" onClick={() => setOpen(false)}>
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
