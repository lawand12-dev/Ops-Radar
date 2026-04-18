import type { Metadata } from 'next'
import Link from 'next/link'
import FaqAccordion from '../components/FaqAccordion'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'

export const metadata: Metadata = {
  title: "Services",
  description:
    "I build six types of automation for paid-media, SEO, and full-service agencies under 25 people: client reporting, onboarding, lead routing, follow-ups, invoicing, and data sync. All on n8n. All maintained by me.",
  openGraph: {
    title: "Services — OpsRadar",
    description:
      "I build six types of automation for paid-media, SEO, and full-service agencies under 25 people: client reporting, onboarding, lead routing, follow-ups, invoicing, and data sync. All on n8n. All maintained by me.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Services — OpsRadar" }],
  },
  twitter: {
    title: "Services — OpsRadar",
    description:
      "I build six types of automation for paid-media, SEO, and full-service agencies under 25 people: client reporting, onboarding, lead routing, follow-ups, invoicing, and data sync. All on n8n. All maintained by me.",
    images: ["/og-image.png"],
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services', isActive: true },
  { label: 'Workflows', href: '/workflows' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

// ── Data ──────────────────────────────────────────────────────────────────────

const WHAT_I_BUILD = [
  {
    title: 'Automated Reporting',
    desc: 'I pull data from Google Ads, Meta, GA4, and your CRM on schedule. Merge it, format it, and deliver branded client reports automatically — every week, with zero manual work.',
  },
  {
    title: 'Lead Qualification & Routing',
    desc: 'New leads are scored against your criteria the moment they arrive, then routed to the right rep with context already filled in. Hot leads get a follow-up within 90 seconds — automatically.',
  },
  {
    title: 'Client Onboarding',
    desc: 'A single form submission triggers contracts, tool access provisioning, welcome email sequences, Slack notifications, and project setup — all without anyone on your team lifting a finger.',
  },
  {
    title: 'Email & Follow-up Sequences',
    desc: 'Context-aware follow-ups that write themselves based on deal stage, time since last contact, and prior interactions. Leads stop going cold because the system never forgets.',
  },
  {
    title: 'Invoice & Payment Processing',
    desc: 'Project completion triggers invoice generation, sends it to the client, follows up if unpaid, and notifies your team when it clears — no one has to chase payments manually.',
  },
  {
    title: 'Data Sync Between Tools',
    desc: 'I keep your CRM, project management, invoicing, and communication tools in sync automatically. One update propagates everywhere — no duplicate entry, no data drift.',
  },
]

const PROCESS_STEPS = [
  {
    n: '01',
    title: 'You tell me the problem.',
    desc: 'Start with a free audit or a quick call. Tell me which manual tasks are burning your team\u2019s time. No technical knowledge needed — plain English is fine.',
  },
  {
    n: '02',
    title: 'I scope & price it.',
    desc: 'Within 48 hours you get a clear proposal: exactly what I\u2019ll build, how long it takes, and a fixed price. You approve before anything starts.',
  },
  {
    n: '03',
    title: 'I build & test.',
    desc: 'I build the automation in n8n, integrate it with your existing tools, and test every path — including edge cases and error handling.',
  },
  {
    n: '04',
    title: 'You review & approve.',
    desc: 'I walk you through the live workflow in a recorded session. Nothing goes live until you\u2019ve reviewed it and given the green light.',
  },
  {
    n: '05',
    title: 'It runs 24/7.',
    desc: 'I deploy inside your n8n account, set up monitoring, and maintain the workflow long-term. If something breaks at 3am — I fix it, not you.',
  },
]

const FAQS = [
  {
    q: 'What tools can you connect?',
    a: 'Any tool with an API or webhook support. That includes HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, Notion, Airtable, Stripe, QuickBooks, Calendly, Mailchimp, ActiveCampaign, and hundreds more via n8n\u2019s native node library.',
  },
  {
    q: 'How long does it take to build?',
    a: 'Most single-workflow builds take 5\u201310 business days. More complex multi-workflow systems take 2\u20134 weeks. I give you a specific timeline in the proposal before you commit.',
  },
  {
    q: 'What if something breaks?',
    a: 'On the Managed plan, I monitor every workflow 24/7 and fix it before you notice. On the One-Time Build plan, I include 30 days of free bug fixes after delivery.',
  },
  {
    q: 'Do I need technical knowledge?',
    a: 'No. You describe your problem in plain English — I handle all the technical implementation. You\u2019ll review the workflow in a walkthrough session, but you won\u2019t need to touch any code.',
  },
  {
    q: 'Can I see the workflow before it goes live?',
    a: 'Always. I record a walkthrough video showing exactly how it works. Nothing gets deployed without your explicit sign-off.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Cancel anytime with 30 days notice. Your workflows already live in your own n8n account — you never lose access because you always owned them. I just stop maintaining them.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            Services
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.08] mb-6">
            What specifically do I build for marketing agencies?
          </h1>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            Six types of automation that fix the manual work burning your team: client reporting,
            ad platform handoffs, HubSpot/CRM routing, onboarding, invoicing, and data sync. Built
            for paid-media, SEO, and full-service agencies under 25 people. All on n8n. All
            maintained by me.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Flagship: Automated Reporting ─────────────────────────────── */}
      <FadeInOnScroll>
        <section className="relative max-w-5xl mx-auto px-6 pb-20">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-4">
              The #1 automation agencies ask me to build
            </p>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white mb-6 leading-[1.05]">
              Automated Client Reporting
            </h2>
            <p className="text-[15px] md:text-base leading-relaxed text-white/[0.75] mb-6 max-w-3xl">
              I pull data from Google Ads, Meta, GA4, and your CRM on schedule.
              Merge it, format it, and deliver branded client reports automatically
              — every week, zero manual work.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Typical impact</p>
                <p className="text-white/90 text-sm leading-relaxed">Saves 20\u201340 hours/week at 10\u201320 person marketing agencies</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Payback</p>
                <p className="text-white/90 text-sm leading-relaxed">Most agencies break even in about 6 weeks</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Delivery</p>
                <p className="text-white/90 text-sm leading-relaxed">Built in your n8n account in 7–14 days</p>
              </div>
            </div>
            <Button asChild className="px-6 py-3 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">See if this fits your agency &rarr;</Link>
            </Button>
          </div>
        </section>
      </FadeInOnScroll>

      {/* ── What I Build ──────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            The Full Menu
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-4">
            Other things I build.
          </h2>
          <p className="text-white/40 max-w-lg mb-16 leading-relaxed">
            Reporting is the most common, but not the only one. Here are the other five.
          </p>

          <div className="space-y-0">
            {WHAT_I_BUILD.map(({ title, desc }, i) => (
              <div key={title}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-16 py-8 md:py-10">
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
      </FadeInOnScroll>

      {/* ── The Process ──────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            How It Works
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-4">
            Five steps. No mystery.
          </h2>
          <p className="text-white/40 max-w-lg mb-16 leading-relaxed">
            You always know what&apos;s happening, what it costs, and what comes next.
          </p>

          <div className="space-y-0">
            {PROCESS_STEPS.map(({ n, title, desc }, i) => (
              <div key={n}>
                {i === 0 && (
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-[60px_220px_1fr] gap-4 md:gap-8 py-8 md:py-10 items-start">
                  <span className="font-mono text-[13px] font-bold text-white/20">
                    {n}
                  </span>
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
      </FadeInOnScroll>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Questions
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-14">
            Frequently Asked
          </h2>
          <FaqAccordion faqs={FAQS} />
        </section>
      </FadeInOnScroll>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            See what I&apos;d automate for you.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Instant results. No commitment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">Start Free Audit &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
