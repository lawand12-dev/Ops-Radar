import Link from "next/link"
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#000000] px-6 pt-20 pb-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 md:gap-14 mb-16">

          {/* Brand column */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Image src="/logo.png" alt="OpsRadar" width={36} height={36} className="h-9 w-9 rounded-xl" />
              <span className="font-headline text-xl font-bold tracking-tight bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                OpsRadar
              </span>
            </div>
            <p className="text-[14px] text-white/55 leading-relaxed max-w-xs mb-6">
              n8n automation for paid-media, SEO, and full-service marketing agencies. You own the workflows. I build and maintain them.
            </p>
            <div className="text-[12px] text-white/40 leading-[1.8]">
              <p className="text-white/55">Built by Lawand Soran</p>
              <p>Sulaymaniyah, Kurdistan</p>
              <p className="text-white/35">8 hours ahead of your team</p>
            </div>
          </div>

          {/* For Agencies */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-5">
              For Agencies
            </p>
            <ul className="space-y-3">
              <li><Link href="/for/paid-media" className="text-[14px] text-white/65 hover:text-white transition-colors">Paid-Media</Link></li>
              <li><Link href="/for/seo" className="text-[14px] text-white/65 hover:text-white transition-colors">SEO</Link></li>
              <li><Link href="/for/full-service" className="text-[14px] text-white/65 hover:text-white transition-colors">Full-Service</Link></li>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-5">
              Explore
            </p>
            <ul className="space-y-3">
              <li><Link href="/services" className="text-[14px] text-white/65 hover:text-white transition-colors">Services</Link></li>
              <li><Link href="/pricing" className="text-[14px] text-white/65 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/how-it-works" className="text-[14px] text-white/65 hover:text-white transition-colors">Process</Link></li>
              <li><Link href="/workflows" className="text-[14px] text-white/65 hover:text-white transition-colors">Workflows</Link></li>
              <li><Link href="/about" className="text-[14px] text-white/65 hover:text-white transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Start */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400/60 mb-5">
              Start
            </p>
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 hover:border-white/40 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-white/[0.03] transition-all mb-4"
            >
              Free Audit
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <div>
              <a
                href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-white/55 hover:text-white transition-colors"
              >
                Book a 15-min call
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed mt-5 max-w-[180px]">
              3 minutes. Real dollar numbers. No credit card.
            </p>
          </div>
        </div>

        {/* Bottom bar with subtle radar-echo pulse dot on the divider */}
        <div className="relative pt-8 border-t border-white/[0.06]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.6),0_0_20px_rgba(34,211,238,0.3)]"
            aria-hidden="true"
          />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs uppercase tracking-widest text-white/30">
              &copy; 2026 OpsRadar. Built by Lawand.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms</Link>
              <Link
                href="https://www.linkedin.com/in/lawand-soran-opsradar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-white/30 hover:text-white/60 transition-opacity hover:opacity-80"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.602 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Link>
              <Link
                href="https://x.com/ops_radar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-white/30 hover:text-white/60 transition-opacity hover:opacity-80"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link
                href="https://www.instagram.com/ops.radar/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-white/30 hover:text-white/60 transition-opacity hover:opacity-80"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.849.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.265.058-1.645.07-4.849.07-3.205 0-3.584-.012-4.849-.07-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.849c.062-1.366.336-2.633 1.311-3.608C4.519 2.568 5.786 2.294 7.152 2.233 8.417 2.175 8.796 2.163 12 2.163zm0 1.838c-3.149 0-3.504.012-4.742.068-.915.042-1.413.194-1.744.323-.438.17-.75.374-1.079.703-.329.329-.533.641-.703 1.079-.129.331-.281.829-.323 1.744-.056 1.238-.068 1.593-.068 4.742 0 3.15.012 3.504.068 4.742.042.915.194 1.413.323 1.744.17.438.374.75.703 1.079.329.329.641.533 1.079.703.331.129.829.281 1.744.323 1.238.056 1.593.068 4.742.068 3.15 0 3.504-.012 4.742-.068.915-.042 1.413-.194 1.744-.323.438-.17.75-.374 1.079-.703.329-.329.533-.641.703-1.079.129-.331.281-.829.323-1.744.056-1.238.068-1.593.068-4.742 0-3.15-.012-3.504-.068-4.742-.042-.915-.194-1.413-.323-1.744-.17-.438-.374-.75-.703-1.079-.329-.329-.641-.533-1.079-.703-.331-.129-.829-.281-1.744-.323C15.504 4.013 15.149 4.001 12 4.001zm0 3.135a4.864 4.864 0 110 9.728 4.864 4.864 0 010-9.728zm0 8.023a3.159 3.159 0 100-6.318 3.159 3.159 0 000 6.318zm6.406-8.222a1.137 1.137 0 11-2.274 0 1.137 1.137 0 012.274 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
