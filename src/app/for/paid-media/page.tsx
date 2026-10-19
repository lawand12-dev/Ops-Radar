import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '<npm>/components/ui/card'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import { RevealOnScroll } from '<npm>/components/marketing/reveal-on-scroll'

export const metadata: Metadata = {
  title: 'AI COO for Paid-Media Agencies',
  description:
    'OpsRadar is the AI COO for paid-media agencies. Pacing alerts tied to MER catch overserve mid-campaign. Monday digests build themselves. Margin recovered in week 2, not at quarter-end.',
  openGraph: {
    title: 'AI COO for Paid-Media Agencies',
    description:
      'Reports that build themselves. Pacing alerts tied to MER. OPERATE runs the reporting; GUARD catches the API drift. Built on your accounts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Paid-Media Agencies' }],
  },
  twitter: {
    title: 'AI COO for Paid-Media Agencies',
    description:
      'Reports that build themselves. Pacing alerts tied to MER. GUARD catches the API drift. Built on your accounts.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Reporting',
    title: 'Reports that build themselves.',
    body: "OPERATE runs the monthly rollup: Meta, Google Ads, Klaviyo, Triple Whale, and Shopify collapsed into a branded PDF and delivered on the 2nd. You stop spending Sunday night on a spreadsheet no client reads until Tuesday.",
  },
  {
    tag: 'Attribution',
    title: 'Pacing alerts tied to MER.',
    body: "GUARD watches spend in real time and fires a Slack alert the moment MER drops below your threshold — not when Facebook's attribution model decides to report a bad week. No more Valentine's Day budget fires caused by a last-click ROAS that masks a broken funnel.",
  },
  {
    tag: 'Onboarding',
    title: 'BM access to first report, automatically.',
    body: 'Business Manager access, Pixel installation, GA4 configuration, Conversion API setup, MCC link — OPERATE runs the whole onboarding sequence from signed contract. Cuts 10–15 hours of senior time per new client.',
  },
]

const WORKFLOWS = [
  {
    name: 'weekly-pacing-recap',
    desc: 'Pulls MER, ROAS, and CPL from Meta + Google every Monday at 7 a.m. Posts a formatted Slack digest per client — no manual Ads Manager check required.',
    touches: ['Meta API', 'Google Ads API', 'Slack'],
    saved: '~8 h / mo',
  },
  {
    name: 'client-monthly-pdf',
    desc: 'Aggregates spend, conversions, and creative performance from Triple Whale + Klaviyo on the 1st, renders a branded PDF, and emails it to the client on the 2nd.',
    touches: ['Triple Whale', 'Klaviyo', 'Resend'],
    saved: '~14 h / mo',
  },
  {
    name: 'new-client-onboarding',
    desc: 'Triggers on signed contract: creates a BM sub-account, opens an access-request checklist, configures a GA4 property, and schedules a kickoff Loom link.',
    touches: ['HubSpot', 'Meta API', 'GA4', 'Loom'],
    saved: '~12 h / new client',
  },
]

const BEFORE_AFTER = [
  {
    before: 'Sunday night report assembly across Meta, Google, Klaviyo, Shopify',
    after: 'Automated PDF lands in client inbox on the 2nd — no human touch',
  },
  {
    before: 'Pacing check is manual — someone opens Ads Manager mid-week',
    after: 'Slack alert fires the moment MER crosses your floor',
  },
  {
    before: 'New client onboarding takes 2–3 weeks of back-and-forth',
    after: 'BM access to first report in 5 days via structured workflow',
  },
  {
    before: 'Creative performance lives in Motion — nobody checks it before the call',
    after: 'Weekly cross-platform creative rollup auto-tagged and posted to Notion',
  },
  {
    before: 'Disapproved ads discovered when the client emails you',
    after: 'Daily audit workflow flags them in Slack before the client sees them',
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ForPaidMediaPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/paid-media" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-20 md:pb-24">
          <RevealOnScroll delay={0} offset={32}>
            <p
              className="font-mono uppercase text-[var(--color-primary)]"
              style={{ fontSize: "11px", letterSpacing: "0.18em", fontWeight: 500 }}
            >
              For paid-media agencies
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={120} offset={48}>
            <h1
              className="mt-7 text-[var(--color-fg)] text-balance max-w-[15ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-hero)",
                lineHeight: "var(--text-hero--line-height)",
                letterSpacing: "var(--text-hero--letter-spacing)",
                fontWeight: 500,
              }}
            >
              Sunday nights are for your family.
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay={280} offset={48}>
            <p
              className="mt-8 max-w-[42rem] text-[var(--color-fg-muted)]"
              style={{
                fontSize: "var(--text-lead)",
                lineHeight: "var(--text-lead--line-height)",
                fontWeight: 400,
              }}
            >
              Reports eat your Sundays. Pacing alerts come too late. The $20K overserve
              shows up at quarter-end. OpsRadar is the AI COO for paid-media agencies &mdash;
              watches MER, creative fatigue, and per-client margin 24/7, and catches the
              leak in week 2 instead of day 90.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={460} offset={40}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                  Book a 30-min call
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/audit">Or try the 3-minute audit &rarr;</Link>
              </Button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Three outcomes ────────────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">What changes</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
              Three outcomes. One system.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="mt-14 grid md:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
              {OUTCOMES.map((o) => (
                <div
                  key={o.tag}
                  className="bg-[var(--color-surface)] p-8 md:p-10 flex flex-col gap-4"
                >
                  <Badge variant="accent">{o.tag}</Badge>
                  <h3 className="font-serif text-h3 leading-[1.2] tracking-[-0.015em] text-[var(--color-fg)]">
                    {o.title}
                  </h3>
                  <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">{o.body}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Workflow cards ────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">Live examples</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
              What the AI COO catches on a paid-media account.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="mt-14 grid md:grid-cols-3 gap-6">
              {WORKFLOWS.map((wf) => (
                <Card key={wf.name}>
                  <CardHeader className="border-b border-[var(--color-border)]">
                    <CardTitle>
                      <span className="font-mono text-body-sm tracking-[-0.01em]">{wf.name}</span>
                    </CardTitle>
                    <CardDescription>{wf.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {wf.touches.map((t) => (
                        <Badge key={t} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                    <p className="text-caption text-[var(--color-fg-subtle)] font-mono">{wf.saved} saved</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Before / After table ──────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">Before vs. after</p>
            <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
              What changes after the AI COO goes live.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100} offset={40}>
            <div className="mt-12 rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
              <div className="grid grid-cols-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border)]">
                <div className="px-6 py-3 text-label text-[var(--color-fg-subtle)]">Before</div>
                <div className="px-6 py-3 text-label text-[var(--color-primary)] border-l border-[var(--color-border)]">
                  After OpsRadar
                </div>
              </div>
              {BEFORE_AFTER.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 border-b last:border-b-0 border-[var(--color-border)]"
                >
                  <div className="px-6 py-4 text-body-sm text-[var(--color-fg-muted)] leading-[1.55]">
                    {row.before}
                  </div>
                  <div className="px-6 py-4 text-body-sm text-[var(--color-fg)] leading-[1.55] border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                    {row.after}
                  </div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Proof panel ───────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">The state of paid-media ops, 2026</p>
            <blockquote className="mt-8 font-serif text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              87% of paid-media agencies still pace budgets manually in 2026. The 13% that don&rsquo;t use an AI COO to watch MER and creative fatigue 24/7 — and catch overserve mid-campaign, not at quarter close.
            </blockquote>
            <p className="mt-6 font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.05em]">
              Source: Fluency 2026 — Paid-Media Operations Benchmark Report
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <RevealOnScroll delay={0} offset={40}>
            <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
            <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
              See what your paid-media AI COO catches.
            </h2>
            <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
              A 30-minute call. We listen to how your agency runs, ask the questions
              only operators would ask, and tell you on the call whether the AI COO belongs.
            </p>

            <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
              <Button asChild size="lg">
                <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                  Book a 30-min call
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/audit">
                  Or try the 3-minute audit
                </Link>
              </Button>
            </div>

            <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
              30 minutes · No pitch · We tell you if it&apos;s not a fit.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
