import type { Metadata } from 'next'
import Link from 'next/link'

import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background'
import OpsRadarPricing from '<npm>/components/ui/pricing-component'

export const metadata: Metadata = {
  title: 'Pricing — OpsRadar',
  description: 'One-time builds from $1,500. Managed plans from $400/mo. Fixed price, fixed scope. No hourly billing.',
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Workflows', href: '/workflows' },
  { label: 'Pricing', href: '/pricing', isActive: true },
  { label: 'About', href: '/about' },
]

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* Hero */}
      <header className="relative px-6 pb-16 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-5">
            Pricing
          </p>
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-[-0.03em] text-white mb-5">
            What does it cost?
          </h1>
          <p className="text-white/40 mx-auto max-w-lg leading-relaxed text-lg">
            Fixed price, fixed scope. One-time builds or monthly managed plans.
            Start with the free audit to know exactly which tier fits.
          </p>
        </div>
      </header>

      <main className="relative z-10">
        <OpsRadarPricing />
      </main>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-bold text-white">OpsRadar</div>
          <p className="text-xs uppercase tracking-widest text-white/20">&copy; 2026 OpsRadar. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors">Home</Link>
            <Link href="/services" className="text-xs uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors">Services</Link>
            <Link href="/about" className="text-xs uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors">About</Link>
            <Link href="/audit" className="text-xs uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
