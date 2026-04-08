import type { Metadata } from 'next'
import Link from 'next/link'

import BuildTiersSection from '<npm>/components/pricing/BuildTiers'
import SiteHeader from '<npm>/components/ui/site-header'

export const metadata: Metadata = {
  title: 'Pricing — OpsRadar',
  description: 'Transparent pricing for done-for-you agency automation. One-time builds from $1,500. Managed retainers from $300/mo.',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const RETAINER_TIERS = [
  {
    name: 'Starter',
    price: '$300',
    period: '/mo',
    color: '#10b981',
    border: 'rgba(16,185,129,0.2)',
    bg: 'rgba(16,185,129,0.05)',
    features: [
      'Monitor up to 1 workflow',
      'Fix broken integrations within 72h',
      'Monthly health report',
      'Email support',
    ],
    cta: 'Best for: agencies testing automation for the first time.',
  },
  {
    name: 'Maintenance',
    price: '$800',
    period: '/mo',
    color: '#06b6d4',
    border: 'rgba(6,182,212,0.2)',
    bg: 'rgba(6,182,212,0.05)',
    features: [
      'Monitor up to 3 workflows',
      'Fix broken integrations within 48h',
      'Monthly health report',
      'Minor updates included',
    ],
    cta: 'Best for: agencies with existing automations that need upkeep.',
  },
  {
    name: 'Growth',
    price: '$1,800',
    period: '/mo',
    color: '#3b82f6',
    border: 'rgba(59,130,246,0.3)',
    bg: 'rgba(59,130,246,0.07)',
    badge: 'Best Value',
    features: [
      'Monitor unlimited workflows',
      'Fix broken integrations within 24h',
      'Weekly performance report',
      '2 new builds per month (up to Quick Win each)',
      'Priority Slack support',
      'Monthly strategy call',
    ],
    cta: 'Best for: agencies actively scaling their automation stack.',
  },
  {
    name: 'Operator',
    price: '$3,500',
    period: '/mo',
    color: '#8b5cf6',
    border: 'rgba(139,92,246,0.2)',
    bg: 'rgba(139,92,246,0.05)',
    features: [
      'Everything in Growth',
      '1 Core System build per month included',
      'Priority builds and direct founder access',
      'Same-day response SLA',
      'Custom dashboards + reporting',
      'Quarterly ops review',
    ],
    cta: 'Best for: agencies who want automation as a core competitive advantage.',
  },
]

const FAQ = [
  {
    q: 'Do I need an existing n8n setup?',
    a: "No. We set up and host n8n on your behalf (or your own server if you prefer). You don't need to touch any infrastructure.",
  },
  {
    q: 'What if my automation breaks after delivery?',
    a: 'Every build includes a bug-fix window (14–60 days depending on tier). After that, a maintenance retainer covers ongoing fixes.',
  },
  {
    q: 'Can you build something not on this list?',
    a: "Yes. The audit identifies your specific workflows — pricing above is for the most common complexity levels. Custom scopes are quoted after your strategy call.",
  },
  {
    q: 'How does the free audit work?',
    a: 'The 3-minute questionnaire feeds an AI that identifies your top automation opportunities, estimates time savings, and gives you a prioritized roadmap. No commitment required.',
  },
  {
    q: 'Do you use Zapier or Make?',
    a: "We use n8n — open-source, self-hosted, and no per-task fees. You own your workflows. For clients with existing Zapier/Make setups we can integrate or migrate.",
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body">
      <SiteHeader
        sticky
        navLinks={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: 'Pricing', href: '/pricing', isActive: true },
          { label: 'About', href: '/about' },
          { label: 'Problems', href: '/#pain' },
          { label: 'How It Works', href: '/#how' },
          { label: 'Systems', href: '/#showcase' },
        ]}
      />

      {/* Hero */}
      <header className="relative overflow-hidden px-6 pb-16 pt-16 text-center sm:pt-20">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="section-tag justify-center mb-5">Pricing</span>
          <h1 className="section-title mb-5 text-4xl md:text-6xl">
            Transparent pricing.<br />
            <span className="text-gradient-animated">No surprises.</span>
          </h1>
          <p className="section-copy mx-auto">
            One-time builds with fixed scope. Monthly retainers with real SLAs.
            Start with the free audit to know exactly which tier fits your needs.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-32 space-y-24">

        {/* One-time builds */}
        <BuildTiersSection />

        {/* Managed retainers */}
        <section>
          <div className="mb-10">
            <span className="section-tag">Managed Retainers</span>
            <h2 className="section-title mt-2 text-3xl">We run your automation stack.</h2>
            <p className="section-copy mt-2">Monthly plans that cover monitoring, maintenance, new builds, and ongoing support.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {RETAINER_TIERS.map((tier) => (
              <div
                key={tier.name}
                className="surface-card relative flex flex-col overflow-hidden rounded-[24px]"
                style={{
                  borderColor: tier.border,
                  background: `linear-gradient(180deg, ${tier.bg} 0%, rgba(8,12,19,0.98) 100%)`,
                  boxShadow: `0 22px 70px ${tier.color}10`,
                }}
              >
                {tier.badge && (
                  <div
                    className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}40`, color: tier.color }}
                  >
                    {tier.badge}
                  </div>
                )}
                <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${tier.color}, ${tier.color}00)` }} />
                <div className="p-7 flex flex-col flex-1 gap-6">
                  <div>
                    <h3 className="font-headline text-[22px] font-bold text-on-surface">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="font-headline text-[36px] font-extrabold leading-none" style={{ color: tier.color }}>{tier.price}</span>
                      <span className="text-on-surface-variant text-[14px]">{tier.period}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant/40 mt-1">Cancel anytime. No contracts.</p>
                  </div>
                  <ul className="flex-1 space-y-2.5">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-on-surface-variant">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-[2px] shrink-0" style={{ color: tier.color }}>
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.12"/>
                          <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-on-surface-variant/40 italic leading-[1.6]">{tier.cta}</p>
                  <a
                    href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
                    target="_blank" rel="noopener noreferrer"
                    className="block text-center py-3 rounded-[12px] text-[13px] font-bold transition-all"
                    style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}35`, color: tier.color }}
                  >
                    Get Started →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto">
          <h2 className="section-title mb-8 text-center text-2xl">Common questions</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div
                key={q}
                className="surface-card rounded-[18px] p-5"
              >
                <p className="font-semibold text-[14px] text-on-surface mb-2">{q}</p>
                <p className="text-[13px] text-on-surface-variant leading-[1.7]">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="surface-panel relative overflow-hidden rounded-[28px] border border-primary/20 p-12 text-center">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }} />
          <div className="relative z-10">
            <h2 className="section-title mb-4 text-3xl md:text-4xl">
              Not sure which tier you need?
            </h2>
            <p className="section-copy mb-8 mx-auto max-w-md">
              The free audit identifies exactly what to build and how complex it is.
              Takes 3 minutes. Instant results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/audit"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-[13px] bg-primary text-on-primary font-bold text-[15px] shadow-[0_0_30px_rgba(173,198,255,0.25)]"
              >
                Start Free Audit →
              </Link>
              <a
                href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-[13px] font-semibold text-[14px] border border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface transition-all"
              >
                Book a Call Instead
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer-shell py-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-bold text-on-surface">OpsRadar</div>
          <p className="text-xs uppercase tracking-widest text-on-surface-variant/70">© 2026 OpsRadar. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/services" className="text-xs uppercase tracking-widest text-on-surface-variant/70 hover:text-on-surface transition-colors">Services</Link>
            <Link href="/audit"    className="text-xs uppercase tracking-widest text-on-surface-variant/70 hover:text-on-surface transition-colors">Free Audit</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
