import type { Metadata } from 'next'

import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import OpsRadarPricing from '<npm>/components/ui/pricing-component'
import Footer from '<npm>/components/Footer'
import BookCallButton from '../components/BookCallButton'

export const metadata: Metadata = {
  title: 'Pricing — OpsRadar',
  description:
    'Transparent pricing for done-for-you n8n automation builds. Starting at $1,500. Custom workflows, built in your n8n account and maintained by me.',
  openGraph: {
    title: 'Pricing — OpsRadar',
    description:
      'Transparent pricing for done-for-you n8n automation builds. Starting at $1,500.',
    url: 'https://www.opsradar.co/pricing',
    siteName: 'OpsRadar',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpsRadar — Pricing',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — OpsRadar',
    description:
      'Transparent pricing for done-for-you n8n automation builds. Starting at $1,500.',
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Paid-Media', href: '/for/paid-media' },
  { label: 'SEO', href: '/for/seo' },
  { label: 'Full-Service', href: '/for/full-service' },
  { label: 'Services', href: '/services' },
  { label: 'Process', href: '/how-it-works' },
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

      {/* Still deciding? Book a call ────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-4">
          Not sure which tier fits?
        </h2>
        <p className="text-white/60 mb-10 leading-relaxed max-w-xl mx-auto">
          Book a 15-minute intro call and we&apos;ll talk through your operation. I&apos;ll recommend the tier that makes sense — or tell you honestly if OpsRadar isn&apos;t the right fit yet.
        </p>
        <BookCallButton />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
