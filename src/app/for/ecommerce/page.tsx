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
  title: 'AIOS for E-commerce Agencies — OpsRadar',
  description:
    'OpsRadar is AIOS for e-commerce and Shopify Plus partner agencies under 25 people. OPERATE syncs product feeds across Shopify + Meta + Google Merchant. OBSERVE delivers the daily revenue roll-up. GUARD fires low-stock alerts before customers notice.',
  openGraph: {
    title: 'AIOS for E-commerce Agencies — OpsRadar',
    description:
      'Product feed sync, daily revenue roll-up, and low-stock alerts — OPERATE runs the feeds, GUARD watches the inventory. Built inside your n8n account.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for E-commerce Agencies' }],
  },
  twitter: {
    title: 'AIOS for E-commerce Agencies — OpsRadar',
    description:
      'Product feed sync, daily revenue roll-up, low-stock alerts. OPERATE runs the feeds; GUARD watches inventory.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Feed sync',
    title: 'Product data stays in sync automatically.',
    body: 'OPERATE pushes Shopify catalogue changes — price updates, variant adds, inventory edits — to Meta and Google Merchant Center within the hour. No more ad rejections from stale feeds or out-of-stock products burning spend overnight.',
  },
  {
    tag: 'Reporting',
    title: 'Daily revenue roll-up in Slack by 8 a.m.',
    body: 'OBSERVE combines Shopify gross, Klaviyo email revenue, and GA4 sessions into one Slack message every morning. 12–15 hours of senior strategist time per week stop going to spreadsheet assembly.',
  },
  {
    tag: 'Inventory',
    title: 'Low-stock alerts before customers see 404s.',
    body: 'GUARD monitors Shopify inventory hourly per variant and fires a Slack alert when any SKU crosses your threshold — before the product page goes unavailable and before ad spend continues driving to zero-inventory URLs.',
  },
]

const WORKFLOWS = [
  {
    name: 'product-feed-monitor',
    desc: 'Watches Shopify for product changes and inventory deltas every 30 minutes. Pushes diff to Meta Catalog and Google Merchant Center. Posts a Slack summary if any rejected items need review.',
    touches: ['Shopify', 'Meta Catalog', 'Google Merchant'],
    saved: '~8 h / mo',
  },
  {
    name: 'daily-revenue-roll-up',
    desc: 'At 7:45 a.m.: pulls yesterday\'s Shopify revenue, Klaviyo flow and campaign attribution, and GA4 sessions. Posts a formatted daily card to Slack per store — no Ads Manager login required.',
    touches: ['Shopify', 'Klaviyo', 'GA4', 'Slack'],
    saved: '~14 h / mo',
  },
  {
    name: 'inventory-low-stock-alert',
    desc: 'Hourly Shopify inventory check per SKU. Fires a Slack alert with reorder quantity suggestion when any variant drops below your floor. Optionally pauses Meta ad sets pointing to low-stock products.',
    touches: ['Shopify', 'Slack', 'Meta API'],
    saved: '~6 h / mo + ad waste',
  },
]

const BEFORE_AFTER = [
  {
    before: 'Product feed updated manually when someone remembers to export',
    after: 'Feed synced to Meta + Google Merchant within the hour of any Shopify change',
  },
  {
    before: 'Revenue numbers pulled from three tabs each morning before standup',
    after: 'Daily Slack card lands at 8 a.m. — Shopify + Klaviyo + GA4 in one read',
  },
  {
    before: 'Out-of-stock products discovered when the client asks about ad waste',
    after: 'Low-stock alert fires and ad set optionally paused before customers see 404s',
  },
  {
    before: 'Klaviyo flow health checked manually, if at all, once a month',
    after: 'Monthly flow audit flags bounce spikes and dormant segments automatically',
  },
  {
    before: 'New client credential chase takes 5–7 days to collect all tool access',
    after: 'Single intake flow gates all credentials — Shopify, Meta, GA4, Klaviyo',
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ForEcommercePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/ecommerce" />
      <SegmentPageAnalytics segment="ecommerce" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-label text-[var(--color-primary)] uppercase tracking-[0.12em]">
          AIOS for e-commerce agencies
        </p>

        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          Shopify data reaches Meta before the day starts.
        </h1>

        <p className="mt-5 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          Product feed drift burns ad spend. Revenue numbers live across Shopify, Klaviyo,
          and GA4. Out-of-stock SKUs keep running traffic until someone checks. OpsRadar
          is AIOS — the system that closes all three, runs inside your n8n account, and
          watches your inventory while you sleep.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/audit">
              Start the audit
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
            Three outcomes. One system.
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
            What a typical e-commerce AIOS looks like.
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
            — E-commerce agency founder · 14-person shop · feed sync live in week one
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            See what your e-commerce AIOS looks like.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
            13 questions. Three minutes. An AI-generated report on the hours your agency
            loses to feed drift, manual reporting, and inventory blind spots — and which
            workflows are worth automating first.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <Link href="/audit">
                Start the audit
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Talk to founders
              </a>
            </Button>
          </div>

          <p className="mt-10 text-caption text-[var(--color-fg-subtle)] max-w-md mx-auto">
            13 questions · Free · No card, no pitch · 3 minutes to the report.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
