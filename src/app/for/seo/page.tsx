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
  title: 'AIOS for SEO Agencies — OpsRadar',
  description:
    'OpsRadar is AIOS for SEO agencies under 20 people. Weekly rank digests from Ahrefs + GSC. AIO presence tracking across ChatGPT, Perplexity, and Google AI Overviews. GUARD catches technical regressions before your clients notice.',
  openGraph: {
    title: 'AIOS for SEO Agencies — OpsRadar',
    description:
      'Rank digests, AIO mention tracking, and technical alerts — OPERATE runs the signals, GUARD catches the regressions. Built on your accounts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for SEO Agencies' }],
  },
  twitter: {
    title: 'AIOS for SEO Agencies — OpsRadar',
    description:
      'Rank digests, AIO mention tracking, technical alerts. OPERATE runs the signals; GUARD catches the regressions. Built on your accounts.',
    images: ['/og-image.png'],
  },
}

/* ── Data ───────────────────────────────────────────────────────────────── */

const OUTCOMES = [
  {
    tag: 'Rank tracking',
    title: 'Weekly rank digests, white-labeled.',
    body: "OPERATE merges Ahrefs, GSC, and Semrush data into one branded digest — delivered to Slack or the client's inbox every Monday. Keyword positions stop living in a spreadsheet you paste manually.",
  },
  {
    tag: 'AIO visibility',
    title: 'Track what 2026 SEO actually measures.',
    body: 'OBSERVE shows brand visibility across ChatGPT, Perplexity, and Google AI Overviews — tracked per query, per competitor. The category your incumbent reporting tools ignore is now the line item clients ask about most.',
  },
  {
    tag: 'Technical',
    title: 'Technical alerts before Google notices.',
    body: 'GUARD runs daily Screaming Frog diffs. Core Web Vitals regressions from CrUX. Schema markup breakage. Status code spikes. Every flag lands in Slack before the client emails you — or before a crawl buries the issue.',
  },
]

const WORKFLOWS = [
  {
    name: 'aio-rank-digest',
    desc: 'Queries Ahrefs + GSC every Monday for keyword movements, then checks Profound for AIO presence changes. Posts a ranked diff to Slack with winner/loser callouts.',
    touches: ['Ahrefs API', 'GSC', 'Profound'],
    saved: '~10 h / mo',
  },
  {
    name: 'technical-audit-alert',
    desc: 'Runs a daily diff of Screaming Frog exports. Flags broken links, new 4xx pages, and Core Web Vitals regressions in a Slack thread before any human checks.',
    touches: ['Screaming Frog', 'CrUX API', 'Slack'],
    saved: '~12 h / mo',
  },
  {
    name: 'content-brief-pipeline',
    desc: 'On new keyword target in Notion: pulls SurferSEO brief, creates a Google Doc from your agency template, assigns the writer, and logs the due date.',
    touches: ['SurferSEO', 'Google Docs', 'Notion'],
    saved: '~6 h / mo per writer',
  },
]

const BEFORE_AFTER = [
  {
    before: 'Keyword positions pasted into Google Doc every Monday morning',
    after: 'Ahrefs + GSC digest auto-delivered to Slack with movement flags',
  },
  {
    before: 'AIO / LLM brand presence checked manually, if at all',
    after: 'Weekly AIO snapshot across ChatGPT, Perplexity, and Google AIO',
  },
  {
    before: 'Technical regressions found when clients email about traffic drops',
    after: 'Daily Screaming Frog diff flags issues the morning they appear',
  },
  {
    before: 'Content brief setup takes 25–30 min per article',
    after: 'Brief pipeline creates Doc, assigns writer, logs deadline in 60 sec',
  },
  {
    before: 'Backlink audit is a monthly spreadsheet exercise',
    after: 'New toxic links flagged and disavow file pre-built, weekly',
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ForSeoPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <SiteNav activeHref="/for/seo" />
      <SegmentPageAnalytics segment="seo" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-label text-[var(--color-primary)] uppercase tracking-[0.12em]">
          AIOS for SEO agencies
        </p>

        <h1 className="mt-5 font-serif text-[clamp(2.5rem,4.2vw+0.5rem,4.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--color-fg)] text-balance max-w-3xl">
          Track what matters in 2026.
        </h1>

        <p className="mt-5 max-w-xl text-body-lg leading-[1.55] text-[var(--color-fg-muted)]">
          AI Overviews cut your CTRs. LLM citations replaced position one for branded queries.
          Manual rank-tracking still takes 30 hours a week. OpsRadar is AIOS — the system that
          automates the signals that matter now, runs on your accounts, and gets sharper
          every week it operates.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
              Book a call with founders
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/audit">
              Or try the 3-minute audit
            </Link>
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
            What a typical SEO AIOS looks like.
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
            What your agency looks like after OpsRadar lands.
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
            — SEO agency founder · 9-person agency · AIO tracking live in week two
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <p className="text-label text-[var(--color-fg-subtle)]">Ready when you are</p>
          <h2 className="mt-5 font-serif text-[clamp(2rem,3.2vw+0.5rem,3.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
            See what your SEO AIOS looks like.
          </h2>
          <p className="mt-6 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-md mx-auto">
            A 30-minute call. We listen to how your agency runs, ask the questions
            only operators would ask, and tell you on the call whether AIOS belongs.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Button asChild size="lg">
              <a href={CALENDLY_STRATEGY_CALL_URL} target="_blank" rel="noopener noreferrer">
                Book a call with founders
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
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
