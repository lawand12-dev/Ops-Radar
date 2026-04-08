"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  CirclePlay,
  DatabaseZap,
  MessagesSquare,
  Workflow,
} from "lucide-react"

import { Badge } from "<npm>/components/ui/badge"
import { Button } from "<npm>/components/ui/button"
import SiteHeader, { type SiteNavLink } from "<npm>/components/ui/site-header"
import { cn } from "<npm>/lib/utils"

interface Partner {
  name: string
  href: string
  icon?: LucideIcon
}

interface ResponsiveHeroBannerProps {
  logoUrl?: string
  backgroundImageUrl?: string
  navLinks?: SiteNavLink[]
  ctaButtonText?: string
  ctaButtonHref?: string
  badgeText?: string
  badgeLabel?: string
  title?: string
  titleLine2?: string
  description?: string
  primaryButtonText?: string
  primaryButtonHref?: string
  secondaryButtonText?: string
  secondaryButtonHref?: string
  partnersTitle?: string
  partners?: Partner[]
  className?: string
  contentClassName?: string
  headerSticky?: boolean
  showBackground?: boolean
}

const DEFAULT_PARTNERS: Partner[] = [
  { name: "CRM Sync", href: "/services", icon: DatabaseZap },
  { name: "AI Routing", href: "/services", icon: Bot },
  { name: "Reporting", href: "/services", icon: ChartNoAxesCombined },
  { name: "Inbox Ops", href: "/services", icon: MessagesSquare },
  { name: "Workflows", href: "/services", icon: Workflow },
]

export default function ResponsiveHeroBanner({
  logoUrl = "/logo.png",
  backgroundImageUrl,
  navLinks,
  ctaButtonText = "Start Free Audit",
  ctaButtonHref = "/audit",
  badgeLabel = "New",
  badgeText = "Done-for-you automation systems for busy agency teams",
  title = "Automation for Agencies",
  titleLine2 = "Without Another Tool to Manage",
  description = "We design, host, and maintain the workflows behind lead routing, onboarding, reporting, and AI handoffs so your team can operate faster without hiring internal ops engineers.",
  primaryButtonText = "Start Your Free Audit",
  primaryButtonHref = "/audit",
  secondaryButtonText = "See How It Works",
  secondaryButtonHref = "#how",
  partnersTitle = "Built around the layers agencies need most under load",
  partners = DEFAULT_PARTNERS,
  className,
  contentClassName,
  headerSticky = false,
  showBackground = false,
}: ResponsiveHeroBannerProps) {
  return (
    <section className={cn("relative isolate overflow-hidden", className)}>
      {showBackground && backgroundImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          aria-hidden
        />
      ) : null}

      <div className="relative z-10">
        <SiteHeader
          logoSrc={logoUrl}
          navLinks={navLinks}
          ctaLabel={ctaButtonText}
          ctaHref={ctaButtonHref}
          sticky={headerSticky}
        />

        <div
          className={cn(
            "mx-auto flex min-h-[calc(100vh-1rem)] max-w-7xl items-center px-6 pb-20 pt-8 sm:pb-24 sm:pt-12 lg:pt-16",
            contentClassName
          )}
        >
          <div className="mx-auto w-full max-w-5xl text-center">
            <Badge
              variant="outline"
              className="animate-fade-slide-in-1 mb-6 inline-flex h-auto items-center gap-3 rounded-full border-white/18 bg-slate-950/55 px-2.5 py-2 text-white shadow-[0_18px_50px_rgba(2,6,23,0.22)] backdrop-blur-xl"
            >
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-950">
                {badgeLabel}
              </span>
              <span className="text-sm font-medium text-white/92">{badgeText}</span>
            </Badge>

            <h1 className="animate-fade-slide-in-2 font-serif text-5xl leading-[0.96] tracking-[-0.045em] text-white drop-shadow-[0_20px_50px_rgba(2,6,23,0.5)] sm:text-6xl md:text-7xl lg:text-[6.2rem]">
              <span className="block text-white">{title}</span>
              <span className="mt-2 block bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                {titleLine2}
              </span>
            </h1>

            <p className="animate-fade-slide-in-3 mx-auto mt-7 max-w-3xl text-base leading-8 text-white/84 sm:text-lg md:text-xl">
              {description}
            </p>

            <div className="animate-fade-slide-in-4 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                asChild
                className="h-auto rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.16)] hover:bg-white/92"
              >
                <Link href={primaryButtonHref}>
                  {primaryButtonText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Link
                href={secondaryButtonHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-slate-950/34 px-6 py-3.5 text-sm font-semibold text-white/92 transition-colors hover:border-white/28 hover:text-white"
              >
                <CirclePlay className="h-4 w-4" />
                {secondaryButtonText}
              </Link>
            </div>

            <div className="mt-16">
              <p className="animate-fade-slide-in-1 text-sm uppercase tracking-[0.2em] text-white/56">
                {partnersTitle}
              </p>

              <div className="animate-fade-slide-in-2 mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                {partners.map((partner) => {
                  const Icon = partner.icon ?? Workflow

                  return (
                    <Link
                      key={partner.name}
                      href={partner.href}
                      className="group flex min-h-24 flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-white/12 bg-slate-950/34 px-4 py-5 text-center shadow-[0_20px_70px_rgba(2,6,23,0.18)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/[0.06]"
                    >
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white transition-colors group-hover:text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-medium text-white/82 transition-colors group-hover:text-white">
                        {partner.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
