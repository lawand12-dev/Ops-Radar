import { Badge } from '<npm>/components/ui/badge'
import { Card, CardContent } from '<npm>/components/ui/card'
import GlowCard from '<npm>/components/animations/GlowCard'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'

type StoryState = {
  kicker: string
  title: string
  points: string[]
}

type StoryQuote = {
  text: string
  author: string
  role: string
}

export type SuccessStory = {
  client: string
  segment: string
  before: StoryState
  after: StoryState
  impactMetric: string
  impactLabel: string
  impactDetail: string
  quote: StoryQuote
}

const DEFAULT_STORY: SuccessStory = {
  client: 'Northstar Growth',
  segment: 'Paid media agency',
  before: {
    kicker: 'Chaos',
    title: 'Account managers were juggling reporting, follow-ups, and handoffs by hand.',
    points: [
      'Weekly reporting lived across spreadsheets, ad platforms, and Slack threads.',
      'Sales notes died in inboxes before the delivery team ever saw them.',
      'Lead follow-ups stalled whenever the team hit a busy client week.',
    ],
  },
  after: {
    kicker: 'Clockwork',
    title: 'Every client touchpoint now moves through one operating system.',
    points: [
      'Reporting packets compile automatically and ship on schedule without manual QA.',
      'CRM updates trigger onboarding, internal handoffs, and client-facing comms instantly.',
      'Follow-up sequences pause the moment a call is booked or a payment lands.',
    ],
  },
  impactMetric: '20hrs/week',
  impactLabel: 'saved across reporting, handoffs, and lead ops',
  impactDetail: 'The team replaced 11 recurring manual steps with a single automated workflow layer.',
  quote: {
    text: 'OpsRadar turned a messy patchwork of tools into a system our team can actually trust.',
    author: 'Maya Chen',
    role: 'Operations Director, Northstar Growth',
  },
}

type SuccessStoriesProps = {
  story?: SuccessStory
}

function ComparisonCard({
  label,
  title,
  points,
  tone,
}: StoryState & {
  label: string
  tone: 'before' | 'after'
}) {
  const accentClass =
    tone === 'before'
      ? 'border-white/6'
      : 'border-primary/15'

  const glow =
    tone === 'before'
      ? 'radial-gradient(circle at top left, rgba(239,68,68,0.14), transparent 42%)'
      : 'radial-gradient(circle at top left, rgba(76,215,246,0.16), transparent 48%)'

  const labelClass =
    tone === 'before'
      ? 'bg-error/10 text-error border-error/20'
      : 'bg-primary/10 text-primary border-primary/20'

  const railClass =
    tone === 'before'
      ? 'from-error/0 via-error/70 to-tertiary/0'
      : 'from-primary/0 via-primary/80 to-secondary/0'

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${accentClass} bg-surface-container px-5 py-6 sm:px-6`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: glow }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-y-4 left-0 w-px bg-gradient-to-b ${railClass}`}
        aria-hidden
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <Badge variant="outline" className={`h-auto rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${labelClass}`}>
            {label}
          </Badge>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/70">
            {kicker}
          </span>
        </div>
        <p className="text-base font-semibold leading-7 tracking-tight text-on-surface sm:text-lg">
          {title}
        </p>
        <ul className="mt-5 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm leading-6 text-on-surface-variant sm:text-[15px]">
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                  tone === 'before' ? 'bg-error/80' : 'bg-secondary'
                }`}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function SuccessStories({
  story = DEFAULT_STORY,
}: SuccessStoriesProps) {
  return (
    <section id="stories" className="relative py-32 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 45%, rgba(76,215,246,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(173,198,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 45%, black 28%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 45%, black 28%, transparent 95%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <FadeInOnScroll className="mb-16 max-w-3xl">
          <span className="text-primary font-bold text-xs uppercase tracking-widest">Success Stories</span>
          <h2 className="mt-4 font-headline text-3xl tracking-tight text-on-surface md:text-5xl">
            Proof that operational chaos can become clockwork.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">
            A representative agency case study that shows the exact shift from fragile manual work to a system that runs on rails.
          </p>
        </FadeInOnScroll>

        <FadeInOnScroll delay={0.1}>
          <GlowCard glowColor="rgba(76,215,246,0.14)" className="rounded-[28px]">
            <Card className="relative overflow-hidden rounded-[28px] border border-outline-variant/10 bg-surface-container-low/90 py-0 shadow-none ring-0 backdrop-blur-xl">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background: 'linear-gradient(90deg, rgba(249,115,22,0), rgba(249,115,22,0.8), rgba(96,165,250,0.9), rgba(34,211,238,0))',
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute right-[-10%] top-[12%] h-56 w-56 rounded-full blur-[120px]"
                style={{ background: 'rgba(96,165,250,0.14)' }}
                aria-hidden
              />

              <CardContent className="p-0">
                <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="mb-8 flex flex-wrap items-center gap-3">
                      <Badge
                        variant="outline"
                        className="h-auto rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
                      >
                        Case Study
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant/75">
                        {story.client} / {story.segment}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ComparisonCard
                        label="Before"
                        title={story.before.title}
                        kicker={story.before.kicker}
                        points={story.before.points}
                        tone="before"
                      />
                      <ComparisonCard
                        label="After"
                        title={story.after.title}
                        kicker={story.after.kicker}
                        points={story.after.points}
                        tone="after"
                      />
                    </div>
                  </div>

                  <div className="border-t border-outline-variant/10 lg:border-t-0 lg:border-l">
                    <div className="flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">
                          Impact Metric
                        </span>
                        <div className="mt-4">
                          <p className="bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-5xl font-black tracking-[-0.06em] text-transparent sm:text-6xl">
                            {story.impactMetric}
                          </p>
                          <p className="mt-3 max-w-xs text-base leading-7 text-on-surface sm:text-lg">
                            {story.impactLabel}
                          </p>
                          <p className="mt-4 max-w-sm text-sm leading-6 text-on-surface-variant">
                            {story.impactDetail}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 rounded-2xl border border-outline-variant/10 bg-surface-container px-5 py-6 sm:px-6">
                        <p className="text-lg leading-8 tracking-tight text-on-surface">
                          <span className="mr-1 text-2xl text-primary">“</span>
                          {story.quote.text}
                          <span className="ml-1 text-2xl text-primary">”</span>
                        </p>
                        <div className="mt-5 border-t border-outline-variant/10 pt-4">
                          <p className="text-sm font-semibold text-on-surface">{story.quote.author}</p>
                          <p className="mt-1 text-sm text-on-surface-variant">{story.quote.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </GlowCard>
        </FadeInOnScroll>
      </div>
    </section>
  )
}
