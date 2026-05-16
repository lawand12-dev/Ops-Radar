"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants"
import { cn } from "<npm>/lib/utils"
import { SiteThemeToggle } from "<npm>/components/marketing/site-theme-toggle"

export interface SiteNavLink {
  label: string
  href: string
  isActive?: boolean
}

interface SiteHeaderProps {
  logoSrc?: string
  logoAlt?: string
  logoHref?: string
  navLinks?: SiteNavLink[]
  ctaLabel?: string
  ctaHref?: string
  sticky?: boolean
  className?: string
}

const DEFAULT_NAV_LINKS: SiteNavLink[] = [
  { label: "Home", href: "/" },
  { label: "AIOS", href: "/aios" },
  { label: "About", href: "/about" },
]

export default function SiteHeader({
  logoSrc = "/logo.png",
  logoAlt = "OpsRadar",
  logoHref = "/",
  navLinks = DEFAULT_NAV_LINKS,
  ctaLabel = "Book a Call",
  ctaHref = CALENDLY_STRATEGY_CALL_URL,
  sticky = true,
  className,
}: SiteHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const ctaIsExternal = /^https?:\/\//i.test(ctaHref)

  const isActiveLink = (link: SiteNavLink) => {
    if (typeof link.isActive === "boolean") {
      return link.isActive
    }
    if (link.href === "/") {
      return pathname === "/"
    }
    if (link.href.startsWith("/#")) {
      return pathname === "/"
    }
    return pathname === link.href || pathname.startsWith(link.href + "/")
  }

  return (
    <header
      className={cn(
        "z-50 w-full border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_95%,transparent)] backdrop-blur-md",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Desktop: 3-column grid (logo | nav | ctas), Mobile: flex with hamburger */}
        <div className="flex h-16 items-center justify-between gap-6 lg:grid lg:grid-cols-[auto_1fr_auto]">
          {/* Logo — left column */}
          <Link
            href={logoHref}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-cover"
            />
            <span className="font-headline text-base font-bold tracking-tight text-[var(--color-fg)]">
              OpsRadar
            </span>
          </Link>

          {/* Centered nav — middle column (only desktop) */}
          <nav className="hidden lg:flex items-center justify-center gap-1">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "text-[var(--color-fg)]"
                      : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-px bg-[var(--color-fg)]" aria-hidden="true" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right CTAs — right column (only desktop) */}
          <div className="hidden lg:flex items-center justify-end gap-2">
            <SiteThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
            >
              Sign in
            </Link>
            <Link
              href="/audit"
              className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
            >
              Run Free Audit
            </Link>
            <Link
              href={ctaHref}
              target={ctaIsExternal ? "_blank" : undefined}
              rel={ctaIsExternal ? "noopener noreferrer" : undefined}
              className="inline-flex items-center rounded-md bg-[var(--color-primary)] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:opacity-90"
            >
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile panel */}
        {mobileMenuOpen ? (
          <div className="lg:hidden border-t border-[var(--color-border)] py-3">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = isActiveLink(link)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--color-surface-sunken)] text-[var(--color-fg)]"
                        : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
                <div className="px-3 py-1">
                  <SiteThemeToggle />
                </div>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/audit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
                >
                  Run Free Audit
                </Link>
                <Link
                  href={ctaHref}
                  target={ctaIsExternal ? "_blank" : undefined}
                  rel={ctaIsExternal ? "noopener noreferrer" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md bg-[var(--color-primary)] px-3 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  {ctaLabel}
                </Link>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
