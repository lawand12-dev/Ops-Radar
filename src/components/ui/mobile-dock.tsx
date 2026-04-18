"use client"

import { LimelightNav } from "<npm>/components/ui/limelight-nav"
import { Home, Zap, Workflow, DollarSign, User, FileText } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export default function MobileDock() {
  const router = useRouter()
  const pathname = usePathname()

  const items = [
    {
      id: "home",
      icon: <Home />,
      label: "Home",
      onClick: () => router.push("/"),
    },
    {
      id: "services",
      icon: <Zap />,
      label: "Services",
      onClick: () => router.push("/services"),
    },
    {
      id: "workflows",
      icon: <Workflow />,
      label: "Workflows",
      onClick: () => router.push("/workflows"),
    },
    {
      id: "audit",
      icon: <FileText />,
      label: "Audit",
      onClick: () => router.push("/audit"),
    },
    {
      id: "pricing",
      icon: <DollarSign />,
      label: "Pricing",
      onClick: () => router.push("/pricing"),
    },
    {
      id: "about",
      icon: <User />,
      label: "About",
      onClick: () => router.push("/about"),
    },
  ]

  // Determine active index based on current pathname
  // Segment landing pages under the "for" prefix (paid-media, seo, full-service) highlight the Services tab
  // since they are specialized service-type pages.
  const activeIndex = items.findIndex((item) => {
    if (item.id === "home") return pathname === "/"
    if (item.id === "services") {
      return pathname.startsWith("/services") || pathname.startsWith("/for/")
    }
    return pathname.startsWith(`/${item.id}`)
  })

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <LimelightNav
        items={items}
        defaultActiveIndex={activeIndex >= 0 ? activeIndex : 0}
        className="bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        limelightClassName="bg-white shadow-[0_50px_15px_rgba(255,255,255,0.5)]"
        iconClassName="text-white"
      />
    </div>
  )
}
