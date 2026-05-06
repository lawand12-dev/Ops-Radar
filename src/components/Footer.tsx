import Link from "next/link"
import Image from "next/image"
import { CALENDLY_STRATEGY_CALL_URL } from "<npm>/lib/constants"

interface FooterColumn {
  heading: string
  links: { label: string; href: string; external?: boolean }[]
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "For Agencies",
    links: [
      { label: "Paid Media agencies", href: "/for/paid-media" },
      { label: "SEO agencies", href: "/for/seo" },
      { label: "Full-service agencies", href: "/for/full-service" },
      { label: "Recruiting agencies", href: "/for/recruiting" },
      { label: "Design agencies", href: "/for/design" },
      { label: "E-commerce agencies", href: "/for/ecommerce" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Free Audit", href: "/audit" },
      { label: "How it works", href: "/how-it-works" },
      { label: "About us", href: "/about" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Legal & Contact",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Book a call", href: CALENDLY_STRATEGY_CALL_URL, external: true },
      { label: "lawand@opsradar.co", href: "mailto:lawand@opsradar.co", external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#000000] px-6 pt-20 pb-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-16">

          {/* Column 1 — OpsRadar */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Image src="/logo.png" alt="OpsRadar" width={36} height={36} className="h-9 w-9 rounded-xl" />
              <span className="font-headline text-xl font-bold tracking-tight bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                OpsRadar
              </span>
            </div>
            <p className="text-[14px] text-white/55 leading-relaxed max-w-xs mb-6">
              The AI Operating System for agencies. Your brain, your workflows, your Claude interface.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="https://x.com/ops_radar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link
                href="https://www.linkedin.com/company/opsradar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Link>
              <Link
                href="https://www.instagram.com/ops.radar/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.849.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.265.058-1.645.07-4.849.07-3.205 0-3.584-.012-4.849-.07-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.849c.062-1.366.336-2.633 1.311-3.608C4.519 2.568 5.786 2.294 7.152 2.233 8.417 2.175 8.796 2.163 12 2.163zm0 1.838c-3.149 0-3.504.012-4.742.068-.915.042-1.413.194-1.744.323-.438.17-.75.374-1.079.703-.329.329-.533.641-.703 1.079-.129.331-.281.829-.323 1.744-.056 1.238-.068 1.593-.068 4.742 0 3.15.012 3.504.068 4.742.042.915.194 1.413.323 1.744.17.438.374.75.703 1.079.329.329.641.533 1.079.703.331.129.829.281 1.744.323 1.238.056 1.593.068 4.742.068 3.15 0 3.504-.012 4.742-.068.915-.042 1.413-.194 1.744-.323.438-.17.75-.374 1.079-.703.329-.329.533-.641.703-1.079.129-.331.281-.829.323-1.744.056-1.238.068-1.593.068-4.742 0-3.15-.012-3.504-.068-4.742-.042-.915-.194-1.413-.323-1.744-.17-.438-.374-.75-.703-1.079-.329-.329-.641-.533-1.079-.703-.331-.129-.829-.281-1.744-.323C15.504 4.013 15.149 4.001 12 4.001zm0 3.135a4.864 4.864 0 110 9.728 4.864 4.864 0 010-9.728zm0 8.023a3.159 3.159 0 100-6.318 3.159 3.159 0 000 6.318zm6.406-8.222a1.137 1.137 0 11-2.274 0 1.137 1.137 0 012.274 0z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Columns 2-5 */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-5">
                {column.heading}
              </p>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-[14px] text-white/65 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="relative pt-8 border-t border-white/[0.06]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.6),0_0_20px_rgba(34,211,238,0.3)]"
            aria-hidden="true"
          />

          <p className="text-xs text-center text-white/40 leading-relaxed">
            © 2026 OpsRadar. Built in Kurdistan. For agencies everywhere.
          </p>
        </div>
      </div>
    </footer>
  )
}
