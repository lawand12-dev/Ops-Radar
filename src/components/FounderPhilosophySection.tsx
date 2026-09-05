import { Card, CardContent } from '<npm>/components/ui/card'

type Specialty = {
  tag: string
  title: string
  desc: string
  color: string
  icon: React.ReactNode
}

type FounderPhilosophySectionProps = {
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
    title: 'Agency Brain',
    desc: 'We build a living knowledge base of how your agency actually operates — your tools, your clients, your failures, your preferences. Claude reads it before every action. Never reasons from scratch.',
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
    title: 'Workflow Guardian',
    desc: 'Every workflow we deploy is monitored permanently. Every run logged. Every failure caught before your client notices. Rules handle the predictable. Claude explains the unknown.',
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
    title: 'Autonomous Operations',
    desc: 'Your AI COO watches your agency ops 24/7 — without a human burning hours pulling numbers. Margin alerts fire mid-month. Scope creep is caught in week 2. Your team spends time on clients, not spreadsheets.',
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
    title: 'Operational Memory',
    desc: 'Every failure resolved, every decision approved, every pattern learned — stored permanently in your agency brain. The system gets smarter every week. Switching cost grows every month.',
    color: '#fb923c',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 3.5l5.2 2.4v3.7c0 3.5-2 5.8-5.2 6.9-3.2-1.1-5.2-3.4-5.2-6.9V5.9L10 3.5Z" stroke="#fdba74" strokeWidth="1.4" />
        <path d="M7.8 10.1 9.4 11.7 12.5 8.6" stroke="#fdba74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function FounderPhilosophySection({
  summary = 'We spent years inside agencies watching good teams lose margin to broken handoffs, spreadsheet rituals, and automations that looked clever in demos but collapsed in production. OpsRadar is the response: an operator-minded team designing systems that stay useful after launch.',
  principles = DEFAULT_PRINCIPLES,
  specialties = DEFAULT_SPECIALTIES,
}: FounderPhilosophySectionProps) {
  return (
    <section id="founder" className="max-w-6xl mx-auto px-6 py-24">
      <div className="max-w-3xl">
        <span className="uppercase tracking-[0.2em] text-secondary font-bold text-xs">Team & Philosophy</span>
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mt-4 text-on-surface">
          The team behind the systems.
        </h2>
        <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-on-surface-variant">
          OpsRadar is intentionally built like an engineering dossier: accountable operators, clear specialties, and a bias toward systems that survive real operating pressure.
        </p>
      </div>

      <div className="mt-12 space-y-6">
        <div>
          <div className="rounded-[26px]">
            <Card className="overflow-hidden rounded-[26px] border border-outline-variant/10 bg-surface-container-low/80 py-0 ring-0 shadow-none backdrop-blur-xl">
              <div
                className="h-px w-full"
                style={{ background: 'linear-gradient(90deg, rgba(76,215,246,0.65), rgba(173,198,255,0.25), rgba(173,198,255,0))' }}
              />
              <CardContent className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                    Why Us
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
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {specialties.map((specialty) => (
            <div key={specialty.title}>
              <div className="h-full rounded-[22px]">
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
