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
import SegmentPageAnalytics from '../SegmentPageAnalytics'

export const metadata: Metadata = {
  title: 'AI COO for SEO Agencies',
  description:
    'OpsRadar is the AI COO for SEO agencies. AI Overviews citation tracking across ChatGPT, Perplexity, and Google AIO. Weekly rank digests from Ahrefs + GSC. Technical regressions caught before your clients notice.',
  openGraph: {
    title: 'AI COO for SEO Agencies',
    description:
      'Rank digests, AIO mention tracking, and technical alerts — OPERATE runs the signals, GUARD catches the regressions. Built on your accounts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OpsRadar for SEO Agencies' }],
  },
  twitter: {
    title: 'AI COO for SEO Agencies',
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
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-20 md:pb-24">
          <RevealOnScroll delay={0} offset={32}>
            <p
              className="font-mono uppercase text-[var(--color-primary)]"
              style={{ fontSize: "11px", letterSpacing: "0.18em", fontWeight: 500 }}
            >
              For SEO agencies
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
              Track what matters in 2026.
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
              AI Overviews cut your CTRs. LLM citations replaced position one for branded queries.
              OpsRadar is the AI COO for SEO agencies &mdash; tracks AIO presence per query, flags the
              clients losing traffic to AI in week 2 (not at the QBR), and quotes the
              $3K&ndash;$8K/mo of paid recovery work before the client asks why traffic dropped.
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
              What the AI COO catches on an SEO account.
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
              What your agency looks like after OpsRadar lands.
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
            <p className="text-label text-[var(--color-fg-subtle)]">The state of SEO, 2026</p>
            <blockquote className="mt-8 font-serif text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
              AI Overviews now answer 28%+ of branded queries without a click. Most agencies are still tracking position one in Ahrefs while their clients&rsquo; traffic moves to AI. The AI COO tracks AIO presence per query and flags the clients losing traffic in week 2 — not at the QBR.
            </blockquote>
            <p className="mt-6 font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.05em]">
              Source: Google AI Overviews displacement studies, 2026
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
              See what your SEO AI COO catches.
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
