import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'For Recruiting Agencies — OpsRadar',
  description:
    "n8n automation for boutique recruiting and search firms under 25 people. Pipeline rollups across Bullhorn, Eploy, and LinkedIn Recruiter. Submission packets that build themselves. Outreach deliverability monitoring. Time-to-fill and BD revenue surfaced nightly, not in Excel monthly.",
  openGraph: {
    title: 'For Recruiting Agencies — OpsRadar',
    description:
      "n8n automation for recruiting shops under 25 people. Submission packets that build themselves. Pipeline visibility across ATS + LinkedIn + CRM. Time-to-fill reporting that updates nightly.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Recruiting Agencies' }],
  },
  twitter: {
    title: 'For Recruiting Agencies — OpsRadar',
    description:
      "n8n automation for recruiting shops under 25 people. Submission packets that build themselves. Pipeline visibility across ATS + LinkedIn + CRM.",
    images: ['/og-image.png'],
  },
}

const WHAT_I_BUILD_FOR_RECRUITING = [
  {
    title: 'Pipeline rollups across ATS + LinkedIn Recruiter + your BD CRM.',
    desc: 'Bullhorn or Eploy + LinkedIn Recruiter + HubSpot pulled into one Monday-morning view. Every recruiter sees req status, days-since-last-touch, and submit-to-hire ratios — without rebuilding the spreadsheet.',
  },
  {
    title: 'Submission packets that build themselves.',
    desc: 'Resume + screen notes + comp expectations + scorecard pulled from the ATS into a branded PDF, ready the moment a candidate clears screening. Cuts 5+ hours per recruiter per week of packet assembly.',
  },
  {
    title: 'Outreach deliverability monitoring.',
    desc: 'Bounce rates, spam complaints, and reply-rate decay across Apollo, Hunter, and your sequencer — flagged in Slack before Google starts greylisting your domain.',
  },
  {
    title: 'Interview scheduling + scorecard chasing.',
    desc: 'Calendar coordination across candidate, client, and interviewer. Scorecards chased automatically inside 24 hours. Saves 5+ hours/week of coordination drag and stops the "still waiting on feedback" loop.',
  },
  {
    title: 'BD pipeline + fee-revenue dashboards.',
    desc: 'Time-to-fill, submit-to-hire, placement velocity, and fee revenue surfaced nightly from Bullhorn or Eploy + HubSpot — not stitched in Excel at month-end.',
  },
  {
    title: 'Candidate enrichment on submit.',
    desc: 'GitHub, LinkedIn, portfolio links, and comp data auto-pulled into the ATS the moment a candidate is added. Recruiters stop alt-tabbing; researchers stop hand-filling fields.',
  },
]

const YOUR_STACK = [
  'Bullhorn',
  'Eploy',
  'Greenhouse / Lever / Workable',
  'LinkedIn Recruiter',
  'Apollo / Hunter / Lusha',
  'Calendly / GoodTime',
  'HubSpot / Pipedrive / Salesforce',
  'HackerRank / Codility',
  'Slack / Microsoft Teams',
  'Notion / Asana / Airtable',
  'Gmail / Outlook',
  'Hireflix / Spark Hire',
  'Checkr',
  'QuickBooks / Stripe',
]

const FAQS = [
  {
    q: 'Why not just use Bullhorn or Greenhouse automations?',
    a: 'In-platform automations only fire on triggers inside that platform. The hours you’re losing live between LinkedIn Recruiter, the ATS, and your BD CRM. n8n bridges them — that’s where 14+ hours per recruiter per week of search and admin time disappears.',
  },
  {
    q: 'We’re a Bullhorn shop. Will this actually work?',
    a: 'Yes. Bullhorn has REST + SOAP APIs and webhooks. Most boutique recruiting builds I do use Bullhorn or Eploy as system of record. n8n calls into both natively, and Eploy’s 22% UK market dominance means I’ve seen the integration patterns before.',
  },
  {
    q: 'Email deliverability — can you actually fix it?',
    a: 'I monitor it daily and surface the patterns: which sequences are getting filtered, which sender IPs are clean, which days bounce rates spike. The DKIM/DMARC and sender-warm fixes are standard — what’s been missing is the alerting that tells you when it slips. AI-personalized voice/multimodal outreach also lifts response rates ~65% over generic email when wired correctly.',
  },
  {
    q: 'Our process is bespoke — contingency, retained, and MPC outreach. Won’t generic automation break it?',
    a: 'I don’t build generic workflows. I sit with you for an hour, learn how your shop actually runs (contingency vs. retained, MPC outreach, BD cadence, scorecard model), and build to match. AI augments; recruiters keep oversight on every submission.',
  },
]

export default function ForRecruitingPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky />
      <SegmentPageAnalytics segment="recruiting" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'n8n Automation for Recruiting Agencies',
            provider: {
              '@type': 'Organization',
              name: 'OpsRadar',
              url: 'https://www.opsradar.co',
              founder: { '@type': 'Person', name: 'Lawand Soran' },
            },
            areaServed: ['US', 'CA', 'GB', 'AU', 'IE'],
            audience: {
              '@type': 'BusinessAudience',
              audienceType: 'Recruiting Agencies',
              numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 25 },
            },
            description:
              'Custom AI Operating System (AIOS) builds for boutique recruiting and search firms under 25 people. Pipeline rollups across Bullhorn, Eploy, and LinkedIn Recruiter; submission packets that build themselves; outreach deliverability monitoring; time-to-fill and fee-revenue dashboards.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: 400,
              highPrice: 4500,
              offerCount: 6,
            },
            url: 'https://www.opsradar.co/for/recruiting',
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-28 pt-16 sm:pt-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            For recruiting agencies
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            Your recruiters were hired to close placements.
          </h1>
          <p className="font-headline text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/80 mb-8">
            Not to copy candidate notes between LinkedIn, Bullhorn, and your CRM.
          </p>
          <p className="text-lg md:text-xl text-white/[0.65] max-w-2xl mb-10 leading-relaxed">
            We build the AI Operating System (AIOS) for boutique recruiting and search firms under 25 people.
            Pipeline rollups across Bullhorn, Eploy, and LinkedIn Recruiter. Submission packets
            that build themselves. Outreach deliverability flagged before Google greylists your
            domain. You own every workflow in your n8n account. We build them, we maintain them,
            you get your placement hours back.
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
      <FadeInOnScroll>
        <section className="max-w-5xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What I build for recruiting shops
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-16">
            Six workflows that cut 14+ hours of weekly drag.
          </h2>
          <div className="space-y-0">
            {WHAT_I_BUILD_FOR_RECRUITING.map(({ title, desc }, i) => (
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
      </FadeInOnScroll>

      {/* ── Your stack ────────────────────────────────────────────────── */}
      <FadeInOnScroll>
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
      </FadeInOnScroll>

      {/* ── Cost of NOT automating ────────────────────────────────────── */}
      <FadeInOnScroll>
        <section className="max-w-3xl mx-auto px-6 py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            What it costs to keep doing it manually
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-8">
            The math most founders don&apos;t run.
          </h2>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/[0.7]">
            <p>
              A 10-person recruiting shop typically loses <span className="text-white font-semibold">14+ hours per recruiter per week</span> to candidate search admin alone, plus another <span className="text-white font-semibold">17 hours/week</span> across BD reporting, screening prep, and submission packet assembly.
            </p>
            <p>
              At ~$36/hour blended cost for a senior recruiter, that&apos;s <span className="text-white font-semibold">$46,800–$74,880/year per recruiter</span> of placement-generating time going to drudge work AI-assisted automation cuts by 40–50%.
            </p>
            <p>
              The typical alternative is a <span className="text-white font-semibold">$5,000–$7,000/month ops coordinator</span> who still needs managing — or a Zapier retainer that breaks at recruiting volume (~50K tasks/month at typical scale).
            </p>
            <p>
              OpsRadar retainers run <span className="text-white font-semibold">$750–$3,000/month</span>. Most boutique recruiting shops break even in about six weeks.
            </p>
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
            What recruiting founders ask me first.
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
      </FadeInOnScroll>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            Stop losing reqs in spreadsheets.
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            3-minute audit. Real dollar numbers for your agency. No commitment.
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
