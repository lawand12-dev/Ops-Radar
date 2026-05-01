"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Menu, X } from "lucide-react"

import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants"
import { cn } from "<npm>/lib/utils"

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
  { label: "AIOS", href: "/#architecture" },
  { label: "About", href: "/about" },
]

function withArchitectureLink(navLinks: SiteNavLink[], pathname: string): SiteNavLink[] {
  const hasArchitectureLink = navLinks.some(
    (link) => link.label === "AIOS" || link.href === "#architecture" || link.href === "/#architecture"
  )

  if (hasArchitectureLink) {
    return navLinks
  }

  const architectureLink: SiteNavLink = {
    label: "AIOS",
    href: pathname === "/" ? "#architecture" : "/#architecture",
  }
  const homeIndex = navLinks.findIndex((link) => link.href === "/")

  if (homeIndex !== -1) {
    return [
      ...navLinks.slice(0, homeIndex + 1),
      architectureLink,
      ...navLinks.slice(homeIndex + 1),
    ]
  }

  return [...navLinks, architectureLink]
}

export default function SiteHeader({
  logoSrc = "/logo.png",
  logoAlt = "OpsRadar",
  logoHref = "/",
  navLinks = DEFAULT_NAV_LINKS,
  ctaLabel = "Book a free 20-min call",
  ctaHref = CALENDLY_STRATEGY_CALL_URL,
  sticky = false,
  className,
}: SiteHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const ctaIsExternal = /^https?:\/\//i.test(ctaHref)
  const renderedNavLinks = withArchitectureLink(navLinks, pathname)

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

    return pathname === link.href
  }

  return (
    <header
      className={cn(
        "z-50 px-4 pt-3 sm:px-6",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="header-shell rounded-[28px] p-2 shadow-[0_24px_90px_rgba(2,6,23,0.16)]">
          <div className="flex items-center justify-between gap-4 px-2 py-1 sm:px-3">
            <Link
              href={logoHref}
              className="flex items-center gap-3 rounded-full px-2 py-1 text-on-surface transition-opacity hover:opacity-90"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Image
                src={logoSrc}
                alt={logoAlt}
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl object-cover"
              />
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-400 bg-clip-text font-headline text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                OpsRadar
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-2">
              <div className="header-nav-pill flex items-center gap-1 rounded-full px-1 py-1">
                {renderedNavLinks.map((link) => {
                  const isActive = isActiveLink(link)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "header-link rounded-full px-3 py-2 text-sm font-medium tracking-[0.01em] transition-colors",
                        isActive
                          ? "header-link-active"
                          : ""
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}

                <Link
                  href={ctaHref}
                  target={ctaIsExternal ? "_blank" : undefined}
                  rel={ctaIsExternal ? "noopener noreferrer" : undefined}
                  className="header-cta ml-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {ctaLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </nav>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="header-menu-button inline-flex h-11 w-11 items-center justify-center rounded-full"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen ? (
            <div className="header-mobile-panel px-3 pb-3 pt-3 lg:hidden">
              <nav className="flex flex-col gap-2">
                {renderedNavLinks.map((link) => {
                  const isActive = isActiveLink(link)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "header-mobile-link rounded-2xl px-4 py-3 text-sm font-medium tracking-[0.01em] transition-colors",
                        isActive
                          ? "header-mobile-link-active"
                          : ""
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}

                <Link
                  href={ctaHref}
                  target={ctaIsExternal ? "_blank" : undefined}
                  rel={ctaIsExternal ? "noopener noreferrer" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className="header-cta mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
                >
                  {ctaLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </nav>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
