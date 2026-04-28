import Image from 'next/image'
import { Card, CardContent } from '<npm>/components/ui/card'
import FadeInOnScroll from '<npm>/components/animations/FadeInOnScroll'
import StaggerChildren, { StaggerItem } from '<npm>/components/animations/StaggerChildren'
import GlowCard from '<npm>/components/animations/GlowCard'

type Specialty = {
  tag: string
  title: string
  desc: string
  color: string
  icon: React.ReactNode
}

type FounderPhilosophySectionProps = {
  name: string
  title?: string
  imageSrc?: string | null
  summary?: React.ReactNode
  principles?: string[]
  specialties?: Specialty[]
}

const DEFAULT_PRINCIPLES = [
  'Agency-side realism',
  'Infrastructure ownership',
  'No automation theater',
]

const DEFAULT_SPECIALTIES: Specialty[] = [
  {
    tag: 'Specialty',
    title: 'LLM Operations',
    desc: 'Production-minded prompt systems, tool orchestration, eval-aware workflows, and approval layers that hold up under real client pressure.',
    color: '#34d399',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3.5" y="3.5" width="13" height="13" rx="3" stroke="#6ee7b7" strokeWidth="1.4" />
        <path d="M7 10h6M10 7v6" stroke="#6ee7b7" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="10" cy="10" r="2.1" fill="rgba(110,231,183,0.16)" stroke="#6ee7b7" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    tag: 'Specialty',
    title: 'Enterprise Integrations',
    desc: 'CRM, billing, reporting, Slack, ad platforms, and custom APIs stitched into one controlled operating layer instead of five brittle handoffs.',
    color: '#60a5fa',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3" y="4" width="5" height="5" rx="1.5" stroke="#93c5fd" strokeWidth="1.4" />
        <rect x="12" y="4" width="5" height="5" rx="1.5" stroke="#93c5fd" strokeWidth="1.4" />
        <rect x="7.5" y="11.5" width="5" height="5" rx="1.5" stroke="#93c5fd" strokeWidth="1.4" />
        <path d="M8 6.5h4M10 8.5v3" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M12 6.5h1.5" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'Specialty',
    title: 'Operational Strategy',
    desc: 'I map the real margin leaks first: duplicate entry, handoff failures, reporting debt, and the workflows your team keeps rescuing by hand.',
    color: '#22d3ee',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 15.5L8 11.5l2.8 2.8L16 8.5" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.5 8.5H16V11" stroke="#67e8f9" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3.5" y="3.5" width="13" height="13" rx="3" stroke="rgba(103,232,249,0.35)" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    tag: 'Specialty',
    title: 'Reliability Engineering',
    desc: 'Hosted n8n, alerting, failure recovery, and post-launch stewardship so the system still works after launch day and under volume.',
    color: '#fb923c',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 3.5l5.2 2.4v3.7c0 3.5-2 5.8-5.2 6.9-3.2-1.1-5.2-3.4-5.2-6.9V5.9L10 3.5Z" stroke="#fdba74" strokeWidth="1.4" />
        <path d="M7.8 10.1 9.4 11.7 12.5 8.6" stroke="#fdba74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function FounderPhilosophySection({
  name,
  title = 'Founder & Lead Automation Architect',
  imageSrc,
  summary = 'I spent years inside agencies watching good teams lose margin to broken handoffs, spreadsheet rituals, and automations that looked clever in demos but collapsed in production. OpsRadar is the response: one operator-minded builder designing systems that stay useful after launch.',
  principles = DEFAULT_PRINCIPLES,
  specialties = DEFAULT_SPECIALTIES,
}: FounderPhilosophySectionProps) {
  const initials = initialsFromName(name)
  const profileImageSrc = imageSrc === undefined ? '/founder.jpg' : imageSrc

  return (
    <section id="founder" className="max-w-6xl mx-auto px-6 py-24">
      <FadeInOnScroll className="max-w-3xl">
        <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">Founder & Philosophy</span>
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 text-on-surface">
          The operator behind the systems.
        </h2>
        <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-on-surface-variant">
          OpsRadar is intentionally built like an engineering dossier: one accountable architect, clear specialties, and a bias toward systems that survive real operating pressure.
        </p>
      </FadeInOnScroll>

      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <FadeInOnScroll delay={0.08}>
          <GlowCard glowColor="rgba(173,198,255,0.08)" className="h-full rounded-[26px]">
            <Card className="h-full overflow-hidden rounded-[26px] border border-outline-variant/10 bg-surface-container-low/80 py-0 ring-0 shadow-none backdrop-blur-xl">
              <div
                className="h-px w-full"
                style={{ background: 'linear-gradient(90deg, rgba(173,198,255,0.85), rgba(76,215,246,0.5), rgba(76,215,246,0))' }}
              />
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                    Architect Profile
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-on-surface-variant/70">
                    Solo Operator
                  </span>
                </div>

                <div className="group mt-5 relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/60 aspect-[4/5]">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 20%, rgba(96,165,250,0.2), transparent 30%), radial-gradient(circle at 75% 25%, rgba(34,211,238,0.14), transparent 28%), linear-gradient(180deg, rgba(10,14,24,0.85), rgba(9,13,22,0.98))',
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-70"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(173,198,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.04) 1px, transparent 1px)',
                      backgroundSize: '34px 34px',
                      maskImage: 'radial-gradient(circle at 50% 35%, black 0%, black 45%, transparent 100%)',
                      WebkitMaskImage: 'radial-gradient(circle at 50% 35%, black 0%, black 45%, transparent 100%)',
                    }}
                  />

                  <div
                    className="pointer-events-none absolute inset-0 rounded-[24px] border border-primary/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_36px_rgba(96,165,250,0.12)] transition duration-500 group-hover:border-secondary/20 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_48px_rgba(76,215,246,0.18)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(173,198,255,0.12),transparent_42%),linear-gradient(180deg,rgba(10,14,24,0.02),rgba(10,14,24,0.42))] opacity-80 transition duration-500 group-hover:opacity-100"
                    aria-hidden
                  />

                  {profileImageSrc ? (
                    <div className="absolute inset-[10px] overflow-hidden rounded-[18px]">
                      <Image
                        src={profileImageSrc}
                        alt={`${name} headshot`}
                        fill
                        className="object-cover object-center transition duration-700 ease-out grayscale-[0.24] saturate-[0.85] group-hover:scale-[1.02] group-hover:grayscale-0 group-hover:saturate-100"
                        sizes="(max-width: 768px) calc(100vw - 48px), (max-width: 1200px) 42vw, 380px"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,24,0.02),rgba(10,14,24,0.18)_42%,rgba(10,14,24,0.58))]"
                        aria-hidden
                      />
                    </div>
                  ) : (
                    <>
                      <div className="absolute left-1/2 top-[22%] h-28 w-28 -translate-x-1/2 rounded-full border border-primary/20 bg-primary/10 shadow-[0_0_40px_rgba(173,198,255,0.16)]" />
                      <div className="absolute left-1/2 top-[24%] flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-surface-container-high/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <span className="bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-4xl font-black tracking-[-0.05em] text-transparent">
                          {initials}
                        </span>
                      </div>
                      <div className="absolute inset-x-[16%] bottom-0 h-[58%] rounded-t-[120px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]" />
                    </>
                  )}

                  <div className="absolute inset-x-4 bottom-4 rounded-[20px] border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                      Why This Works
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface">
                      The same person who scopes the logic also builds the system and owns its reliability.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                    {name}
                  </h3>
                  <p className="mt-2 text-sm uppercase tracking-[0.2em] text-on-surface-variant/70">
                    {title}
                  </p>
                </div>
              </CardContent>
            </Card>
          </GlowCard>
        </FadeInOnScroll>

        <div className="space-y-6">
          <FadeInOnScroll delay={0.14}>
            <GlowCard glowColor="rgba(76,215,246,0.08)" className="rounded-[26px]">
              <Card className="overflow-hidden rounded-[26px] border border-outline-variant/10 bg-surface-container-low/80 py-0 ring-0 shadow-none backdrop-blur-xl">
                <div
                  className="h-px w-full"
                  style={{ background: 'linear-gradient(90deg, rgba(76,215,246,0.65), rgba(173,198,255,0.25), rgba(173,198,255,0))' }}
                />
                <CardContent className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                      Why Me
                    </span>
                    <span className="h-px flex-1 bg-white/8 min-w-10" />
                  </div>
                  <div className="mt-5 space-y-5 text-base md:text-lg leading-relaxed text-on-surface">
                    {typeof summary === 'string' ? <p>{summary}</p> : summary}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {principles.map((principle, index) => (
                      <span
                        key={principle}
                        className="rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-on-surface"
                        style={{
                          borderColor: 'rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)',
                          boxShadow:
                            index === 0
                              ? '0 0 18px rgba(96,165,250,0.12)'
                              : index === 1
                                ? '0 0 18px rgba(34,211,238,0.1)'
                                : '0 0 18px rgba(167,139,250,0.08)',
                        }}
                      >
                        {principle}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </GlowCard>
          </FadeInOnScroll>

          <StaggerChildren className="grid gap-4 sm:grid-cols-2">
            {specialties.map((specialty) => (
              <StaggerItem key={specialty.title}>
                <GlowCard glowColor={`${specialty.color}10`} className="h-full rounded-[22px]">
                  <Card className="h-full rounded-[22px] border border-outline-variant/10 bg-surface-container/80 py-0 ring-0 shadow-none backdrop-blur-xl">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-[14px] border"
                          style={{
                            borderColor: `${specialty.color}26`,
                            background: `${specialty.color}10`,
                            boxShadow: `0 0 24px ${specialty.color}12`,
                          }}
                        >
                          {specialty.icon}
                        </div>
                        <span
                          className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
                          style={{
                            color: specialty.color,
                            borderColor: `${specialty.color}26`,
                            background: `${specialty.color}10`,
                            boxShadow: `0 0 18px ${specialty.color}18`,
                          }}
                        >
                          {specialty.tag}
                        </span>
                      </div>

                      <div className="mt-5">
                        <h3 className="font-headline text-[18px] font-bold tracking-tight text-on-surface">
                          {specialty.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                          {specialty.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </GlowCard>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </div>
    </section>
  )
}
