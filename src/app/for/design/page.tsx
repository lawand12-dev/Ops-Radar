import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import SiteHeader from '<npm>/components/ui/site-header'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'For Design Agencies — OpsRadar',
  description:
    "n8n automation for boutique design and creative studios under 15 people. Project status rollups in one Slack digest. Feedback consolidation across Figma, Frame.io, and Loom. Time tracking that actually surfaces utilization. Scope-creep alerts before invoicing.",
  openGraph: {
    title: 'For Design Agencies — OpsRadar',
    description:
      "n8n automation for design studios under 15 people. Project rollups in one Slack digest. Feedback consolidated across Figma + Frame.io + Loom. Utilization that surfaces weekly, not at quarter-end.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Design Agencies' }],
  },
  twitter: {
    title: 'For Design Agencies — OpsRadar',
    description:
      "n8n automation for design studios under 15 people. Project rollups in one Slack digest. Feedback consolidated across Figma + Frame.io + Loom.",
    images: ['/og-image.png'],
  },
}

const WHAT_I_BUILD_FOR_DESIGN = [
  {
    title: 'Project status rollups in one Slack digest.',
    desc: 'Notion, Asana, ClickUp, or monday.com pulled into a single Monday-morning Slack message — revision status, approval blockers, deadline drift. Kills the daily status meeting.',
  },
  {
    title: 'Feedback consolidation across Figma, Frame.io, and Loom.',
    desc: 'Figma comments + Frame.io notes + Loom replies + email + Slack DMs collapsed into one designer-facing Notion or Asana queue. Designers stop triaging; PMs stop chasing.',
  },
  {
    title: 'Time tracking enforcement and utilization rollups.',
    desc: 'Harvest, Toggl, or Clockify rolled into a weekly Sheets or Looker dashboard showing utilization per designer. Surfaces under-billing within days, not at quarter-end.',
  },
  {
    title: 'Asset and brand-kit delivery, automated.',
    desc: 'Final logos, source files, fonts, and guidelines auto-bundled and delivered to a client portal the moment a project closes. No more "where’s the logo file" emails six months later.',
  },
  {
    title: 'Scope-creep alerts before invoicing.',
    desc: 'When a project’s tracked hours pass the retainer threshold, the PM gets a Slack ping the same week — not at month-end when the over-scope conversation is already awkward.',
  },
  {
    title: 'Client onboarding from brief to kickoff.',
    desc: 'Intake form → Notion project doc + Figma moodboard skeleton + Calendly kickoff invite + brief confirmation email, in one click. Eliminates the manual setup that eats every Monday.',
  },
]

const YOUR_STACK = [
  'Figma / FigJam',
  'Adobe Creative Cloud',
  'Frame.io',
  'Linear / Asana / ClickUp',
  'monday.com / Notion',
  'Harvest / Toggl / Clockify',
  'Slack / Microsoft Teams',
  'Loom',
  'Webflow / Framer',
  'Dropbox / Google Drive',
  'HubSpot / Pipedrive',
  'PandaDoc',
  'QuickBooks / Stripe',
  'GitHub (dev handoff)',
]

const FAQS = [
  {
    q: 'Will Figma plugins do most of this?',
    a: 'Plugins do things inside Figma. The hours you’re losing live between tools — Figma → Notion brief → Linear ticket → client portal. Industry data says 57% of creative-agency time is admin, not design. That’s not a plugin problem; that’s the operations layer between them.',
  },
  {
    q: 'We charge fixed-fee. Why care about utilization?',
    a: 'Fixed-fee is exactly when utilization matters most — it’s the only signal that tells you which retainer is profitable and which one is bleeding margin into scope creep. Design-agency net margins average ~9.5%; the shops that move from $100K to $150K+ revenue per employee all do it on disciplined utilization reporting.',
  },
  {
    q: 'What if AI hallucinates on client work?',
    a: 'I don’t put AI between you and your client. I use it for research, summary, and triage — drafts a human reviews. The actual asset delivery, the actual feedback loop, stays human-in-the-loop. Studios with proper governance see 4 hours saved per designer per week; studios without it see 9× lower ROI from the same tools.',
  },
  {
    q: 'Our design process is too custom for templates.',
    a: 'Mine isn’t a template service. I sit with you for an hour, watch how your shop actually runs (brand sprints vs. deep dives, AOR vs. project work, your handoff to dev), and build to that. Half the studios I talk to say the same thing first — until they see what custom automation actually looks like.',
  },
]

export default function ForDesignPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky />
      <SegmentPageAnalytics segment="design" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'n8n Automation for Design Agencies',
            provider: {
              '@type': 'Organization',
              name: 'OpsRadar',
              url: 'https://www.opsradar.co',
              founder: { '@type': 'Person', name: 'Lawand Soran' },
            },
            areaServed: ['US', 'CA', 'GB', 'AU', 'IE'],
            audience: {
              '@type': 'BusinessAudience',
              audienceType: 'Design Agencies',
              numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 15 },
            },
            description:
              'Custom AI Operating System (AIOS) builds for boutique design and creative studios under 15 people. Project status rollups, feedback consolidation across Figma + Frame.io + Loom, utilization reporting, scope-creep alerts, asset delivery, and onboarding workflows.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: 400,
              highPrice: 4500,
              offerCount: 6,
            },
            url: 'https://www.opsradar.co/for/design',
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            For design agencies
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            Your designers were hired to design.
          </h1>
          <p className="font-headline text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/80 mb-8">
            Not to chase Frame.io comments back into Figma.
          </p>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            We build the AI Operating System (AIOS) for boutique design and creative studios under 15 people.
            Project status rollups in one Slack digest. Feedback consolidation across Figma,
            Frame.io, and Loom. Time tracking that actually surfaces utilization. Scope-creep
            alerts before invoicing. You own every workflow in your n8n account. We build them,
            we maintain them, you get your billable hours back.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call &rarr;
              </a>
            </Button>
            <Link
              href="/audit"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-sm text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition-colors"
            >
              Run a 3-minute self-serve audit →
            </Link>
          </div>
        </div>
      </section>

      {/* ── What I build ──────────────────────────────────────────────── */}
      <div>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What I build for design studios
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Six workflows that turn admin hours back into design hours.
          </h2>
          <div className="space-y-0">
            {WHAT_I_BUILD_FOR_DESIGN.map(({ title, desc }, i) => (
              <div key={title}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4 md:gap-12 py-8 md:py-10">
                  <h3 className="text-base font-semibold text-white/90 tracking-[-0.01em]">
                    {title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-white/[0.65]">
                    {desc}
                  </p>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Your stack ────────────────────────────────────────────────── */}
      <div>
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Your stack, my workflows
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-10">
            I work inside the tools you already pay for.
          </h2>
          <div className="flex flex-wrap gap-2">
            {YOUR_STACK.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-[13px] text-white/70"
              >
                {tool}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/40 mt-6 max-w-2xl leading-relaxed">
            If your tool isn&apos;t here, it probably still works — n8n connects to anything with an API or webhook. Ask me in the audit.
          </p>
        </section>
      </div>

      {/* ── Cost of NOT automating ────────────────────────────────────── */}
      <div>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What it costs to keep doing it manually
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-8">
            The math most founders don&apos;t run.
          </h2>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/[0.7]">
            <p>
              A 10-person design shop typically spends <span className="text-white font-semibold">22–28 hours/week</span> on PM admin, feedback triage, time tracking, and asset prep — work that workflows do nightly. Industry surveys put admin at <span className="text-white font-semibold">57% of creative-agency time</span>, not design.
            </p>
            <p>
              At $80–$120/hour fully loaded for a designer or PM, that&apos;s <span className="text-white font-semibold">$91,000–$175,000/year</span> of billable time going to non-billable admin.
            </p>
            <p>
              Design-agency net margins average <span className="text-white font-semibold">~9.5%</span> — operating costs eat 90.5 cents of every dollar. The single biggest lever is turning admin hours back into billable hours; shops with disciplined utilization reporting move from $100K to $150K+ revenue per employee.
            </p>
            <p>
              OpsRadar retainers run <span className="text-white font-semibold">$750–$3,000/month</span>. Most boutique design shops break even in five to nine weeks.
            </p>
          </div>
        </section>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <div>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Questions
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-14">
            What design founders ask me first.
          </h2>
          <div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <div className="py-6">
                  <p className="font-semibold text-[14px] text-white/80 mb-2">{q}</p>
                  <p className="text-[13px] text-[rgba(255,255,255,0.65)] leading-[1.7]">{a}</p>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            Get your designers back to designing.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Real dollar numbers for your studio. No commitment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call &rarr;
              </a>
            </Button>
          </div>
          <Link
            href="/audit"
            className="inline-block mt-4 text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
          >
            Or run a 3-minute self-serve audit
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
