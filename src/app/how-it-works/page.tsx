import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '<npm>/components/ui/button'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import SiteHeader from '<npm>/components/ui/site-header'
import BeamsBackground from '<npm>/components/ui/beams-background-lazy'
import Footer from '<npm>/components/Footer'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'From first message to first workflow running: 10 business days. Exact timeline, what you do, what we do, what you get at each phase.',
  openGraph: {
    title: 'How it works — OpsRadar',
    description:
      'From first message to first workflow running in 10 business days. Here\'s exactly what that looks like.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How it works — OpsRadar' }],
  },
  twitter: {
    title: 'How it works — OpsRadar',
    description:
      'From first message to first workflow running in 10 business days. Here\'s exactly what that looks like.',
    images: ['/og-image.png'],
  },
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'AIOS', href: '/aios' },
  { label: 'About', href: '/about' },
]

type Phase = {
  dayRange: string
  phaseTitle: string
  headline: string
  yourSide: string[]
  ourSide: string[]
  youGet: string
  timeCost: string
}

const PHASES: Phase[] = [
  {
    dayRange: 'Day 0',
    phaseTitle: 'Audit',
    headline: 'You run the 3-minute audit. Results hit your inbox.',
    yourSide: [
      'Spend 3 minutes answering 13 questions about your ops.',
      'Get a personalized report: annual waste estimate, top 4 workflow opportunities, your automation readiness score.',
    ],
    ourSide: [
      'The AI synthesizes your answers + public website signals into a diagnosis tuned for your segment (paid-media / SEO / full-service / other).',
      'No human in this step yet. Fully automated, fully private.',
    ],
    youGet: 'A results page you can forward to your team. A share link. A concrete number for how much manual ops is costing you annually.',
    timeCost: '3 minutes. No commitment beyond.',
  },
  {
    dayRange: 'Day 1–2',
    phaseTitle: 'Kickoff',
    headline: 'We get on a 30-minute call. You approve a fixed scope.',
    yourSide: [
      'Book a 30-min call using the link in your audit results.',
      'Tell us which workflow is priority #1 and why.',
      'Share tool access (Meta, Google Ads, HubSpot, Klaviyo — whatever\'s involved).',
    ],
    ourSide: [
      'We listen, ask sharp questions, and leave the call with a clear scope.',
      'Within 48 hours we send you a written proposal: exactly what we\'ll build, every tool we\'ll touch, timeline, fixed price.',
      'You review and approve — or we iterate once on scope. Nothing starts until you say go.',
    ],
    youGet: 'A written scope document with fixed price, exact deliverables, and timeline. No hourly billing surprises.',
    timeCost: '30-min call + ~15 min to review the proposal.',
  },
  {
    dayRange: 'Day 3–8',
    phaseTitle: 'Build',
    headline: 'We build in a dev environment. You stay focused on clients.',
    yourSide: [
      'Go back to your actual work. Serve your clients.',
      'Respond to one mid-build check-in (async Slack or email — takes 5 minutes on your end).',
    ],
    ourSide: [
      'We build the workflow in an isolated dev n8n instance. Every node connected to real APIs — no mock data, no "we\'ll figure it out in production."',
      'We test every edge case: what happens when the Meta API times out, when Klaviyo rate-limits, when a field is missing. Error handling is built in from day one.',
      'We send you one mid-build update so you know it\'s on track. No status meetings, no check-in theater.',
    ],
    youGet: 'A tested, production-ready workflow waiting for your review — not a demo.',
    timeCost: '~5 minutes of your time total during the build.',
  },
  {
    dayRange: 'Day 9',
    phaseTitle: 'Walkthrough',
    headline: 'We show you the live workflow. You approve it.',
    yourSide: [
      'Join a 20-minute screen share. We record it so your team can watch later.',
      'Ask anything, request tweaks, or give the green light.',
    ],
    ourSide: [
      'We walk you through every node — what it does, what it\'s connected to, what triggers it.',
      'We show you the output live (a test run in front of you, not a screenshot).',
      'If you want something different, we note it and iterate before going live.',
    ],
    youGet: 'A recorded walkthrough your team can reference forever, plus full confidence in what you\'re about to deploy.',
    timeCost: '20 minutes on a call.',
  },
  {
    dayRange: 'Day 10',
    phaseTitle: 'Deploy',
    headline: 'The workflow goes live in your n8n account. First automated run happens.',
    yourSide: [
      'Confirm deployment is healthy.',
      'Watch the first automated run complete.',
    ],
    ourSide: [
      'We migrate the workflow from dev to your own n8n account (not ours, never ours).',
      'We deploy monitoring and alerts — if something breaks at 3am, our team gets paged, not you.',
      'We send you a documentation doc: what the workflow does, how to pause it, how to change thresholds, who owns what.',
    ],
    youGet: 'The workflow running automatically inside your own n8n account. A written doc. A direct line to me if anything needs attention.',
    timeCost: '15 minutes to confirm deployment.',
  },
  {
    dayRange: 'Day 11 onwards',
    phaseTitle: 'It runs',
    headline: 'You stop thinking about it. That\'s the whole point.',
    yourSide: [
      'Do the strategy work you actually got into this business for.',
      'Tell us when something changes (new tool, new client structure, new goal) — we adapt the workflow.',
    ],
    ourSide: [
      'We monitor 24/7. If an API deprecates, a vendor changes auth, or anything breaks, we fix it before you notice.',
      'Monthly check-in email with performance metrics: hours saved, errors caught, edge cases hit.',
    ],
    youGet: 'Your Sunday nights back. Your strategy hours back. An ops layer that compounds silently instead of breaking loudly.',
    timeCost: 'Near zero, ongoing.',
  },
]

type Concern = {
  question: string
  answer: string
}

const CONCERNS: Concern[] = [
  {
    question: 'What if our team is slammed with client work mid-build?',
    answer: 'You won\'t derail the timeline. The build is self-contained — we need about 5 minutes of your time total during Day 3–8 for one async check-in. If you\'re heads-down, just reply when you can. We build, you serve your clients.',
  },
  {
    question: 'What if the workflow you build misses something important?',
    answer: 'Day 9 exists for exactly this. You see the live workflow before it touches production. If something\'s off, we adjust it before deploy. If we misunderstood something in scope, we fix it on our time, not yours.',
  },
  {
    question: 'What if we want to stop after Day 0?',
    answer: 'You stop. The audit is free. There\'s no follow-up pressure, no "but wait." You keep the results. If you want to use them to hire someone else or DIY, that\'s fine — the report is yours.',
  },
  {
    question: 'What if we want to stop after deploy?',
    answer: 'You keep everything. The workflow is already in your n8n account (not ours). The documentation is already yours. You just stop the monthly retainer. The workflow keeps running — you or anyone else can maintain it from that point.',
  },
  {
    question: 'Can this move faster than 10 days?',
    answer: 'Yes, for simpler workflows or when you need it fast for a client deadline. Single workflows can ship in 3–4 days when the scope is tight and you\'re responsive on tool access. We won\'t promise faster than 10 in the proposal unless we\'ve actually sized it and we\'re confident.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-body overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none">
        <BeamsBackground intensity="subtle" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]" />
      </div>
      <SiteHeader sticky navLinks={NAV_LINKS} />

      {/* Hero */}
      <section className="relative px-6 pb-20 pt-16 sm:pt-24">
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
            How it works
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white leading-[1.04] mb-6">
            From first message to first workflow running: 10 business days.
          </h1>
          <p className="font-headline text-2xl md:text-3xl font-semibold tracking-[-0.03em] text-white/70 mb-10">
            Here&apos;s exactly what that looks like on your side.
          </p>
          <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
            No mystery, no &ldquo;we&apos;ll figure it out as we go.&rdquo; Every phase is concrete — what you do, what we do, what you get at the end, and how much of your time it actually costs.
          </p>
        </div>
      </section>

      {/* Phases */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="space-y-0">
          {PHASES.map((phase, i) => (
            <FadeInOnScroll key={phase.dayRange}>
              <div className="border-t border-white/[0.08] py-14 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-14">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400/80 mb-2">
                      {phase.dayRange}
                    </p>
                    <p className="text-white/40 text-sm font-medium uppercase tracking-wide">
                      {phase.phaseTitle}
                    </p>
                  </div>

                  <div>
                    <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-white leading-[1.2] mb-8">
                      {phase.headline}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3">
                          Your side
                        </p>
                        <ul className="space-y-2.5">
                          {phase.yourSide.map((item, idx) => (
                            <li key={idx} className="text-[15px] leading-relaxed text-white/75 flex gap-3">
                              <span className="text-cyan-400/60 mt-1.5 shrink-0">—</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3">
                          Our side
                        </p>
                        <ul className="space-y-2.5">
                          {phase.ourSide.map((item, idx) => (
                            <li key={idx} className="text-[15px] leading-relaxed text-white/75 flex gap-3">
                              <span className="text-white/30 mt-1.5 shrink-0">—</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2">
                        What you get
                      </p>
                      <p className="text-white/85 text-[15px] leading-relaxed">
                        {phase.youGet}
                      </p>
                    </div>

                    <p className="text-[13px] text-white/45">
                      <span className="font-semibold text-white/60">Your time cost:</span> {phase.timeCost}
                    </p>
                  </div>
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </section>

      {/* Realistic concerns */}
      <section className="max-w-3xl mx-auto px-6 py-24 border-t border-white/[0.06]">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
          Realistic concerns
        </p>
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-12">
          What actually worries agency founders before they start.
        </h2>
        <div className="space-y-0">
          {CONCERNS.map((c, i) => (
            <div key={i}>
              <div className="py-7">
                <p className="font-headline text-lg md:text-xl font-bold text-white mb-3 tracking-[-0.01em]">
                  {c.question}
                </p>
                <p className="text-[15px] leading-[1.7] text-white/65">
                  {c.answer}
                </p>
              </div>
              {i < CONCERNS.length - 1 && (
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Ownership panel — the moat */}
      <section className="max-w-4xl mx-auto px-6 pt-8 pb-20">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.04] to-transparent p-8 md:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400/80 mb-4">
            The part most automation agencies won&apos;t tell you
          </p>
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-white leading-[1.2] mb-5">
            Every workflow lives in your n8n account. Not ours.
          </h2>
          <p className="text-[15px] md:text-base leading-relaxed text-white/70 mb-4">
            When we build for you, it goes into a n8n instance you own, with credentials you control, on infrastructure you pay for (or self-host). If you ever want to stop working with OpsRadar, you keep everything. The workflows. The documentation. The entire system. We just stop maintaining it.
          </p>
          <p className="text-[15px] md:text-base leading-relaxed text-white/70">
            No vendor lock-in. No &ldquo;your data is hostage.&rdquo; No per-task pricing that scales against you. That&apos;s the single biggest reason we built OpsRadar this way instead of running a Zapier-retainer model or a locked automation subscription.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-5 text-white">
            Start with the audit.
          </h2>
          <p className="text-white/45 mb-10 leading-relaxed">
            3 minutes. Free. You&apos;ll know by the end whether this is worth a kickoff call.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="px-8 py-4 h-auto rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-none border-0 btn-press"
            >
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a free 20-min call →
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
