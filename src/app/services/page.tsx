import type { Metadata } from 'next'
import Link from 'next/link'
import FaqAccordion from '../components/FaqAccordion'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background'

export const metadata: Metadata = {
  title: "Services",
  description:
    "Done-for-you automation services for agencies: workflow builds, CRM integrations, reporting automations, and ongoing maintenance.",
  openGraph: {
    title: "Services — OpsRadar",
    description:
      "Done-for-you automation services for agencies: workflow builds, CRM integrations, reporting automations, and ongoing maintenance.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "OpsRadar" }],
  },
  twitter: {
    title: "Services — OpsRadar",
    description:
      "Done-for-you automation services for agencies: workflow builds, CRM integrations, reporting automations, and ongoing maintenance.",
    images: ["/logo.png"],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    n: '01',
    title: 'You Tell Us the Problem',
    desc: 'Start with a free audit or a quick call. Tell us which manual tasks are burning your team\'s time, what tools you use, and where the most friction is. No technical knowledge needed — plain English is fine.',
  },
  {
    n: '02',
    title: 'We Scope & Price It',
    desc: 'Within 48 hours you get a clear proposal: exactly what we\'ll build, how it works, how long it takes, and a fixed price — no hourly billing, no scope creep surprises. You approve before anything starts.',
  },
  {
    n: '03',
    title: 'We Build & Test',
    desc: 'Our team builds the automation in n8n, integrates it with your existing tools, and tests every path — including edge cases and error handling. We don\'t ship anything that hasn\'t been stress-tested against real data.',
  },
  {
    n: '04',
    title: 'You Review & Approve',
    desc: 'We walk you through the live workflow in a recorded session. You see exactly what triggers it, what it does, and how to monitor it. Nothing goes live until you\'ve reviewed it and given the green light.',
  },
  {
    n: '05',
    title: 'It Runs 24/7',
    desc: 'We deploy to our hosted infrastructure, set up monitoring and alerts, and maintain the workflow long-term. If an API changes, a tool updates, or something breaks at 3am — we fix it, not you.',
  },
]

const WHAT_WE_BUILD = [
  {
    title: 'Lead Qualification & Routing',
    desc: 'New leads are scored against your criteria the moment they arrive, then routed to the right rep with context already filled in. Hot leads get a follow-up within 90 seconds — automatically.',
  },
  {
    title: 'Client Onboarding Automation',
    desc: 'A single form submission triggers contracts, tool access provisioning, welcome email sequences, Slack notifications, and project setup — all without anyone on your team lifting a finger.',
  },
  {
    title: 'Automated Reporting & Analytics',
    desc: 'Pull data from Google Ads, Meta, GA4, and your CRM on schedule. Merge it, format it, and deliver branded client reports automatically — every week, with zero manual work.',
  },
  {
    title: 'Email & Follow-up Sequences',
    desc: 'Context-aware follow-ups that write themselves based on deal stage, time since last contact, and prior interactions. Leads stop going cold because the system never forgets to send the next message.',
  },
  {
    title: 'Invoice & Payment Processing',
    desc: 'Project completion triggers invoice generation in your billing tool, sends it to the client, follows up if unpaid, and notifies your team when it clears — no one has to chase payments manually.',
  },
  {
    title: 'Data Sync Between Tools',
    desc: 'Keep your CRM, project management, invoicing, and communication tools in sync automatically. One update propagates everywhere — no duplicate entry, no data drift, no version conflicts.',
  },
]

const FAQS = [
  {
    q: 'What tools can you connect?',
    a: 'Any tool with an API or webhook support — which covers most modern SaaS products. That includes HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, Notion, Airtable, Stripe, QuickBooks, Calendly, Mailchimp, ActiveCampaign, and hundreds more via n8n\'s native node library. If your tool isn\'t natively supported, we can connect it via HTTP request.',
  },
  {
    q: 'How long does it take to build?',
    a: 'Most single-workflow builds take 5–10 business days from approval to deployment. More complex systems involving multiple workflows, custom logic, or integrations with uncommon tools can take 2–4 weeks. We give you a specific timeline in the proposal before you commit.',
  },
  {
    q: 'What if something breaks?',
    a: 'On the Managed Automation plan, we monitor every workflow 24/7 and get alerted the moment something fails. We fix it, usually before you even notice. On the One-Time Build plan, we provide 30 days of free bug fixes after delivery, then ongoing support is available as a paid add-on.',
  },
  {
    q: 'Do we need technical knowledge?',
    a: 'No. You describe your problem in plain English — we handle all the technical implementation. You\'ll review the workflow in a walkthrough session, but you won\'t need to touch any code or config. That\'s the point.',
  },
  {
    q: 'Can we see the workflow before it goes live?',
    a: 'Yes — always. We record a walkthrough video showing exactly how it works, what it does at each step, and how to monitor it. Nothing gets deployed to production without your explicit sign-off. You own the review process.',
  },
  {
    q: 'What happens if we cancel?',
    a: 'On the Managed plan, you can cancel anytime with 30 days notice. We\'ll export your workflows and document them fully so you can self-host or hand them to your team. You never lose access to the automations we built for you.',
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
      <SiteHeader
        sticky
        navLinks={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services', isActive: true },
          { label: 'Pricing', href: '/pricing' },
          { label: 'About', href: '/about' },
          { label: 'Problems', href: '/#pain' },
          { label: 'How It Works', href: '/#how' },
          { label: 'Systems', href: '/#showcase' },
        ]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            Done-For-You Service
          </p>

          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.08] mb-6">
            Automation That Runs Itself.{' '}
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Built By Us.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-10 leading-relaxed">
            From scoping to deployment to ongoing monitoring — we handle your entire automation
            infrastructure so you don&apos;t have to.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">
                Start Free Audit &rarr;
              </Link>
            </Button>
            <Button asChild variant="outline" className="px-8 py-4 h-auto rounded-lg font-semibold text-white/70 border-white/10 hover:bg-white/5 hover:border-white/20 bg-transparent">
              <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" target="_blank" rel="noopener noreferrer">
                Book a Strategy Call
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── The Process ──────────────────────────────────────────────── */}
      <section id="process" className="max-w-5xl mx-auto px-6 py-28">
        <FadeInOnScroll>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            How We Work
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-4">
            The Process
          </h2>
          <p className="text-white/40 max-w-lg mb-16 leading-relaxed">
            Transparent from day one. You always know what&apos;s happening, what it costs, and what comes next.
          </p>
        </FadeInOnScroll>

        <div className="space-y-0">
          {PROCESS_STEPS.map(({ n, title, desc }, i) => (
            <div key={n}>
              {i === 0 && (
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-[60px_200px_1fr] gap-4 md:gap-8 py-8 md:py-10 items-start">
                <span className="font-mono text-[13px] font-bold text-white/20">
                  {n}
                </span>
                <h3 className="text-base font-semibold text-white/90 tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/50">
                  {desc}
                </p>
              </div>
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── What We Build ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28">
        <FadeInOnScroll>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Service Catalogue
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-4">
            What We Build
          </h2>
          <p className="text-white/40 max-w-lg mb-16 leading-relaxed">
            Production-ready workflows, custom-fit to your stack. These are the systems agencies use most — and the ones that pay back the fastest.
          </p>
        </FadeInOnScroll>

        <div className="space-y-0">
          {WHAT_WE_BUILD.map(({ title, desc }, i) => (
            <div key={title}>
              {i === 0 && (
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-16 py-8 md:py-10">
                <h3 className="text-base font-semibold text-white/90 tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/50">
                  {desc}
                </p>
              </div>
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      </section>

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
            Ready to Automate?
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            Start with a free audit — takes 3 minutes and shows you exactly what to automate and what it&apos;s worth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0">
              <Link href="/audit">
                Start Free Audit &rarr;
              </Link>
            </Button>
            <Button asChild variant="outline" className="px-8 py-4 h-auto rounded-lg font-semibold text-white/70 border-white/10 hover:bg-white/5 hover:border-white/20 bg-transparent">
              <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" target="_blank" rel="noopener noreferrer">
                Book a Strategy Call
              </a>
            </Button>
          </div>
          <p className="mt-5 text-xs text-white/20">
            No commitment &middot; Fixed pricing &middot; We handle everything
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/20">&copy; 2026 OpsRadar</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-white/20 hover:text-white/50 transition-colors">Home</Link>
            <Link href="/services" className="text-xs text-white/50 transition-colors font-semibold">Services</Link>
            <Link href="/about" className="text-xs text-white/20 hover:text-white/50 transition-colors">About</Link>
            <Link href="/audit" className="text-xs text-white/20 hover:text-white/50 transition-colors">Free Audit &rarr;</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
