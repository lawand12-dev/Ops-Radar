"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Menu, X } from "lucide-react"

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
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
]

export default function SiteHeader({
  logoSrc = "/logo.png",
  logoAlt = "OpsRadar",
  logoHref = "/",
  navLinks = DEFAULT_NAV_LINKS,
  ctaLabel = "Start Free Audit",
  ctaHref = "/audit",
  sticky = false,
  className,
}: SiteHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        "z-50 px-6 pt-4",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[30px] border border-white/12 bg-slate-950/72 p-2 shadow-[0_24px_90px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-2 py-1 sm:px-3">
            <Link
              href={logoHref}
              className="flex items-center gap-3 rounded-full px-2 py-1 text-white transition-opacity hover:opacity-90"
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
              <div className="flex items-center gap-1 rounded-full bg-white/6 px-1 py-1 ring-1 ring-white/12">
                {navLinks.map((link) => {
                  const isActive = isActiveLink(link)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white/12 text-white"
                          : "text-white/82 hover:text-white"
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}

                <Link
                  href={ctaHref}
                  className="ml-1 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-white/92"
                >
                  {ctaLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white lg:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen ? (
            <div className="border-t border-white/10 px-3 pb-3 pt-3 lg:hidden">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const isActive = isActiveLink(link)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white/12 text-white"
                          : "bg-white/[0.04] text-white/82 hover:text-white"
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}

                <Link
                  href={ctaHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-white/90"
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
