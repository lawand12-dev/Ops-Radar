import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'
import { Button } from '<npm>/components/ui/button'
import { Badge } from '<npm>/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '<npm>/components/ui/card'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'For Paid-Media Agencies — OpsRadar',
  description:
    'OpsRadar builds the automation layer for paid-media shops under 20 people. Meta + Google + Klaviyo reports that build themselves. Pacing alerts tied to MER, not last-click ROAS. BM access to first report in 5 days.',
  openGraph: {
    title: 'For Paid-Media Agencies — OpsRadar',
    description:
      'Reports that build themselves. Pacing alerts tied to MER. Onboarding in 5 days. Built inside your n8n account.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for Paid-Media Agencies' }],
  },
  twitter: {
    title: 'For Paid-Media Agencies — OpsRadar',
    description:
      'Reports that build themselves. Pacing alerts tied to MER. Onboarding in 5 days.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Reporting',
    title: 'Reports that build themselves.',
    body: "Meta, Google Ads, Klaviyo, Triple Whale, and Shopify rolled into a branded PDF or Looker board — delivered on the 2nd of every month. You stop spending Sunday night on a spreadsheet no client reads until Tuesday.",
  },
  {
    tag: 'Attribution',
    title: 'Pacing alerts tied to MER.',
    body: "Daily Slack alerts that fire when MER drops below your threshold — not when Facebook's attribution model decides to report a bad week. No more Valentine's Day budget fires caused by a last-click ROAS that masks a broken funnel.",
  },
  {
    tag: 'Onboarding',
    title: 'BM access to first report in 5 days.',
    body: 'Business Manager access, Pixel installation, GA4 configuration, Conversion API setup, MCC link — a single n8n workflow handles the whole sequence. Cuts 10–15 hours of senior time per new client.',
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
      <SegmentPageAnalytics segment="paid-media" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-label text-[var(--color-primary)] uppercase tracking-[0.12em]">
          For paid-media agencies
        </p>

        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          Sunday nights are for your family.
        </h1>

        <p className="mt-5 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          Reports eat your Sundays. Pacing alerts come too late. BM access takes 3 weeks.
          OpsRadar builds the automation layer that fixes all three — inside your n8n account,
          in 5 to 14 days.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/audit">
              Start your audit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Talk to founders
            </a>
          </Button>
        </div>
      </section>

      {/* ── Three outcomes ────────────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">What changes</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            Three outcomes, delivered in weeks.
          </h2>

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
        </div>
      </section>

      {/* ── Workflow cards ────────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">Live examples</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            What a typical paid-media AIOS looks like.
          </h2>

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
        </div>
      </section>

      {/* ── Before / After table ──────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">Before vs. after</p>
          <h2 className="mt-4 font-serif text-h1 leading-[1.06] tracking-[-0.02em] text-balance max-w-xl">
            What your shop looks like after OpsRadar lands.
          </h2>

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
        </div>
      </section>

      {/* ── Testimonial slot ──────────────────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-label text-[var(--color-fg-subtle)]">From the field</p>
          <blockquote className="mt-8 font-serif text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            &ldquo;[Operator quote — to be replaced with real customer]&rdquo;
          </blockquote>
          <p className="mt-6 font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.05em]">
            — Paid-media agency founder · 12-person shop · replaced Zapier + VA
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            Run a paid-media audit.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
            3 minutes. Real dollar figures on what your shop is losing to manual reporting
            and late alerts. No pitch, no card.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/audit">
                Start your audit
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Talk to founders
              </a>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
