import type { Metadata } from 'next'
import Link from 'next/link'

import BuildTiersSection from '<npm>/components/pricing/BuildTiers'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background'

export const metadata: Metadata = {
  title: 'Pricing — OpsRadar',
  description: 'One-time builds from $1,500. Managed retainers from $300/mo. Fixed price, fixed scope. No hourly billing.',
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing', isActive: true },
  { label: 'About', href: '/about' },
]

// ── Data ──────────────────────────────────────────────────────────────────────

const RETAINER_TIERS = [
  {
    name: 'Starter',
    price: '$300',
    period: '/mo',
    features: [
      'Monitor up to 1 workflow',
      'Fix broken integrations within 72h',
      'Monthly health report',
      'Email support',
    ],
    fit: 'Agencies testing automation for the first time.',
  },
  {
    name: 'Maintenance',
    price: '$800',
    period: '/mo',
    features: [
      'Monitor up to 3 workflows',
      'Fix broken integrations within 48h',
      'Monthly health report',
      'Minor updates included',
    ],
    fit: 'Agencies with existing automations that need upkeep.',
  },
  {
    name: 'Growth',
    price: '$1,800',
    period: '/mo',
    badge: 'Best Value',
    features: [
      'Monitor unlimited workflows',
      'Fix broken integrations within 24h',
      'Weekly performance report',
      '2 new builds per month (up to Quick Win each)',
      'Priority Slack support',
      'Monthly strategy call',
    ],
    fit: 'Agencies actively scaling their automation stack.',
  },
  {
    name: 'Operator',
    price: '$3,500',
    period: '/mo',
    features: [
      'Everything in Growth',
      '1 Core System build per month included',
      'Priority builds and direct founder access',
      'Same-day response SLA',
      'Custom dashboards + reporting',
      'Quarterly ops review',
    ],
    fit: 'Agencies who want automation as a core competitive advantage.',
  },
]

const FAQ = [
  {
    q: 'Do I need an existing n8n setup?',
    a: "No. We set up and host n8n on your behalf. You don't touch any infrastructure.",
  },
  {
    q: 'What if my automation breaks after delivery?',
    a: 'Every build includes a bug-fix window (14\u201360 days depending on tier). After that, a maintenance retainer covers ongoing fixes.',
  },
  {
    q: 'Can you build something not on this list?',
    a: 'Yes. The audit identifies your specific workflows \u2014 pricing above is for the most common complexity levels. Custom scopes are quoted after your strategy call.',
  },
  {
    q: 'How does the free audit work?',
    a: '3-minute questionnaire. AI identifies your top automation opportunities, estimates time savings, and gives you a prioritized roadmap. No commitment.',
  },
  {
    q: 'Do you use Zapier or Make?',
    a: 'We use n8n \u2014 open-source, self-hosted, and no per-task fees. You own your workflows.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative px-6 pb-16 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-5">
            Pricing
          </p>
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-[-0.03em] text-white mb-5">
            What does it cost?
          </h1>
          <p className="text-white/40 mx-auto max-w-lg leading-relaxed text-lg">
            Fixed price, fixed scope. One-time builds or monthly retainers.
            Start with the free audit to know exactly which tier fits.
          </p>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-32 space-y-28">

        {/* ── One-time builds (existing client component) ──────────── */}
        <BuildTiersSection />

        {/* ── Managed retainers ───────────────────────────────────── */}
        <section>
          <div className="mb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              Managed Retainers
            </p>
            <h2 className="font-headline text-3xl font-extrabold tracking-[-0.03em] text-white">
              We run your automation stack.
            </h2>
            <p className="text-white/40 mt-2 max-w-lg">
              Monthly plans covering monitoring, maintenance, new builds, and support.
            </p>
          </div>

          <div className="space-y-0">
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {RETAINER_TIERS.map((tier) => (
              <div key={tier.name}>
                <div className="grid grid-cols-1 md:grid-cols-[200px_120px_1fr] gap-4 md:gap-10 py-8 md:py-10 items-start">
                  <div>
                    <h3 className="text-base font-semibold text-white/90">
                      {tier.name}
                    </h3>
                    {tier.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-headline text-2xl font-extrabold text-white">{tier.price}</span>
                    <span className="text-white/40 text-sm">{tier.period}</span>
                  </div>
                  <div>
                    <ul className="space-y-1.5 mb-3">
                      {tier.features.map(f => (
                        <li key={f} className="text-[14px] text-white/50">{f}</li>
                      ))}
                    </ul>
                    <p className="text-[12px] text-white/25 italic">{tier.fit}</p>
                  </div>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
              target="_blank" rel="noopener noreferrer"
              className="text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors"
            >
              Book a call to discuss retainers &rarr;
            </a>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto">
          <h2 className="font-headline text-2xl font-extrabold tracking-[-0.03em] text-white mb-10 text-center">
            Common questions
          </h2>
          <div className="space-y-0">
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <div className="py-6">
                  <p className="font-semibold text-[14px] text-white/80 mb-2">{q}</p>
                  <p className="text-[13px] text-white/40 leading-[1.7]">{a}</p>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────── */}
        <section className="text-center py-12">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-4">
            Not sure which tier you need?
          </h2>
          <p className="text-white/40 mb-8 mx-auto max-w-md">
            The free audit identifies exactly what to build and how complex it is.
            Takes 3 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-black font-semibold text-[15px]"
            >
              Start Free Audit &rarr;
            </Link>
            <a
              href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-lg font-semibold text-[14px] border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70 transition-all"
            >
              Book a Call Instead
            </a>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
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
