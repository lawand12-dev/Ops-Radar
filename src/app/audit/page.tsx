'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EmailCaptureModal, { type LeadInfo } from '../components/EmailCaptureModal'
import { Input } from '<npm>/components/ui/input'
import { Button } from '<npm>/components/ui/button'

// ─── Data ────────────────────────────────────────────────────────────────────

const AGENCY_TYPES = [
  'Marketing', 'Recruiting/Staffing', 'Design/Creative',
  'Development', 'PR/Communications', 'E-commerce', 'Other',
]

const TEAM_SIZES = ['Just me', '2–5', '6–15', '16–30', '31–50', '50+']

const REVENUE_OPTIONS = [
  'Under $10K', '$10K–$25K', '$25K–$50K', '$50K–$100K', '$100K–$250K', '$250K+',
]

const CLIENT_COUNTS = ['1–3', '4–10', '11–25', '26–50', '50+']

const TOOLS_COMMON = [
  'Slack', 'Google Workspace', 'Notion', 'Airtable',
  'Stripe', 'QuickBooks', 'Calendly', 'Zoom', 'Trello',
]

const TOOLS_BY_AGENCY: Record<string, string[]> = {
  'Marketing': [
    'HubSpot', 'GoHighLevel', 'Mailchimp', 'ActiveCampaign',
    'SEMrush', 'Google Ads', 'Meta Ads Manager', 'Google Analytics', 'Hootsuite',
  ],
  'Recruiting/Staffing': [
    'Bullhorn', 'Greenhouse', 'Lever', 'LinkedIn Recruiter',
    'Indeed', 'Workable', 'JazzHR',
  ],
  'Design/Creative': [
    'Figma', 'Adobe Creative Suite', 'Canva', 'Monday', 'Asana', 'ClickUp',
  ],
}

const CRM_OPTIONS = [
  'HubSpot', 'Salesforce', 'GoHighLevel', 'Pipedrive', 'Monday CRM',
  'Airtable', 'Notion', 'Spreadsheet/Manual', 'None', 'Other',
]

const TIME_HEAVY_OPTS: Record<string, string[]> = {
  'Marketing': [
    'Reporting', 'Campaign setup', 'Content scheduling',
    'Lead management', 'Client communication', 'Invoicing',
  ],
  'Recruiting/Staffing': [
    'Sourcing', 'Resume screening', 'Interview scheduling',
    'Client updates', 'Offer management', 'Onboarding paperwork',
  ],
  'Design/Creative': [
    'Client feedback loops', 'File management', 'Project handoffs',
    'Revision tracking', 'Asset delivery', 'Invoicing',
  ],
}

const TIME_HEAVY_Q: Record<string, string> = {
  'Marketing': 'Which of these client deliverables take the most time?',
  'Recruiting/Staffing': 'Which part of the hiring pipeline is most manual?',
  'Design/Creative': 'Where does your team lose the most time?',
}

const LEAD_ENTRY_OPTIONS = [
  'Manual entry', 'Web form', 'Email', 'Phone call',
  'Referral spreadsheet', "They don't — it's chaos", 'Other',
]

const ONBOARDING_OPTIONS = [
  'Manual contract sending', 'Manual tool access setup',
  'Welcome email sent manually', 'Kickoff doc created from scratch',
  'Team notified via Slack/email manually', "Nothing formal — we wing it",
]

const PROGRESS_OPTIONS = [
  'Project management tool', 'Spreadsheet', 'Email threads',
  'Slack messages', "We don't really", 'Other',
]

const LOADING_MESSAGES = [
  'Analyzing your tech stack…',
  'Identifying automation opportunities…',
  'Calculating ROI estimates…',
  'Generating your blueprint…',
]

const TOTAL_STEPS = 12

// ─── Types ───────────────────────────────────────────────────────────────────

type Answers = {
  agencyType: string
  agencyTypeOther: string
  teamSize: string
  revenue: string
  activeClients: string
  tools: string[]
  toolsOther: string
  crmTool: string
  timeHeavyMulti: string[]
  timeHeavyText: string
  leadEntry: string
  onboarding: string[]
  progressTracking: string
  automationWish: string
  futureVision: string
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepHeader({ question, hint }: { question: string; hint?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight leading-snug mb-2 text-on-surface">
        {question}
      </h2>
      {hint && <p className="text-sm text-on-surface-variant">{hint}</p>}
    </div>
  )
}

function SingleSelect({
  options, value, onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((opt, i) => {
        const selected = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{ animationDelay: `${i * 35}ms` }}
            className={`step-forward px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-150 ${
              selected
                ? 'border-primary/60 bg-primary/10 text-on-surface option-selected'
                : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-outline-variant/40 hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {selected && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary mr-2 align-middle" />
            )}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function MultiSelect({
  options, values, onChange,
}: {
  options: string[]
  values: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt, i) => {
        const selected = values.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{ animationDelay: `${i * 30}ms` }}
            className={`step-forward px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 active:scale-95 ${
              selected
                ? 'border-primary/60 bg-primary/10 text-secondary option-selected'
                : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-outline-variant/40 hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {selected && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary mr-2 align-middle" />
            )}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function TextArea({
  value, onChange, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={5}
      className="w-full px-4 py-3.5 rounded-xl border border-outline-variant/20 bg-surface-container text-on-surface text-sm leading-relaxed placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-surface-container-high resize-none transition-all duration-200"
    />
  )
}

function TextInput({
  value, onChange, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-4 py-3 h-auto rounded-xl border-outline-variant/20 bg-surface-container text-on-surface text-sm placeholder:text-on-surface-variant/40 focus-visible:border-primary/40 focus-visible:ring-primary/20 focus-visible:bg-surface-container-high"
    />
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AuditPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [animKey, setAnimKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [loadingError, setLoadingError] = useState('')
  const [answers, setAnswers] = useState<Answers>({
    agencyType: '',
    agencyTypeOther: '',
    teamSize: '',
    revenue: '',
    activeClients: '',
    tools: [],
    toolsOther: '',
    crmTool: '',
    timeHeavyMulti: [],
    timeHeavyText: '',
    leadEntry: '',
    onboarding: [],
    progressTracking: '',
    automationWish: '',
    futureVision: '',
  })

  const agencyCat = (): 'Marketing' | 'Recruiting/Staffing' | 'Design/Creative' | 'default' => {
    if (answers.agencyType === 'Marketing') return 'Marketing'
    if (answers.agencyType === 'Recruiting/Staffing') return 'Recruiting/Staffing'
    if (answers.agencyType === 'Design/Creative') return 'Design/Creative'
    return 'default'
  }

  const getToolOptions = (): string[] => {
    const cat = agencyCat()
    const specific = cat !== 'default' ? (TOOLS_BY_AGENCY[cat] ?? []) : []
    return [...specific, ...TOOLS_COMMON, 'Other']
  }

  const canProceed = (): boolean => {
    const cat = agencyCat()
    switch (currentStep) {
      case 0:  return !!answers.agencyType
      case 1:  return !!answers.teamSize
      case 2:  return !!answers.revenue
      case 3:  return !!answers.activeClients
      case 4:  return answers.tools.length > 0
      case 5:  return !!answers.crmTool
      case 6:
        return cat === 'default'
          ? answers.timeHeavyText.trim().length >= 10
          : answers.timeHeavyMulti.length > 0
      case 7:  return !!answers.leadEntry
      case 8:  return answers.onboarding.length > 0
      case 9:  return !!answers.progressTracking
      case 10: return answers.automationWish.trim().length >= 20
      case 11: return answers.futureVision.trim().length >= 20
      default: return false
    }
  }

  const navigate = (dir: 'forward' | 'backward') => {
    setDirection(dir)
    setAnimKey((k) => k + 1)
  }

  const goNext = () => {
    if (!canProceed()) return
    navigate('forward')
    setCurrentStep((s) => s + 1)
  }

  const goBack = () => {
    if (currentStep === 0) { router.push('/'); return }
    navigate('backward')
    setCurrentStep((s) => s - 1)
  }

  const openModal = () => {
    if (!canProceed()) return
    setShowModal(true)
  }

  const handleSubmit = async (lead: LeadInfo) => {
    setShowModal(false)
    setLoading(true)
    setLoadingError('')
    setLoadingMsgIndex(0)

    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1))
    }, 2200)

    try {
      const cat = agencyCat()
      const timeHeavy = cat === 'default'
        ? answers.timeHeavyText
        : answers.timeHeavyMulti.join(', ')

      const toolList = [
        ...answers.tools.filter((t) => t !== 'Other'),
        ...(answers.tools.includes('Other') && answers.toolsOther ? [answers.toolsOther] : []),
      ].join(', ')

      const res = await fetch('/api/generate-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          company: lead.company,
          agencyType: answers.agencyType === 'Other' && answers.agencyTypeOther
            ? answers.agencyTypeOther
            : answers.agencyType,
          teamSize: answers.teamSize,
          revenue: answers.revenue,
          activeClients: answers.activeClients,
          tools: toolList,
          crmTool: answers.crmTool,
          timeHeavy,
          leadEntry: answers.leadEntry,
          onboarding: answers.onboarding.join(', '),
          progressTracking: answers.progressTracking,
          automationWish: answers.automationWish,
          futureVision: answers.futureVision,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.audit) throw new Error(data.error ?? 'Something went wrong')

      sessionStorage.setItem('opsradar_audit', JSON.stringify(data.audit))
      const dest = data.id ? `/results?id=${data.id}` : '/results'
      router.push(dest)
    } catch (err) {
      clearInterval(interval)
      setLoading(false)
      setLoadingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      clearInterval(interval)
    }
  }

  const toggleMulti = (field: 'tools' | 'timeHeavyMulti' | 'onboarding') => (value: string) => {
    setAnswers((prev) => {
      const current = prev[field] as string[]
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      }
    })
  }

  const progressPct = ((currentStep + 1) / TOTAL_STEPS) * 100

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col items-center justify-center px-6 gap-10 page-enter">
        <div className="fixed inset-0 grid-texture pointer-events-none" />

        <div className="relative z-10 w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-primary/20" />
          <div
            className="absolute w-24 h-24 rounded-full border border-primary/40 animate-spin"
            style={{ animationDuration: '3s' }}
          />
          <div
            className="absolute w-20 h-20 rounded-full border border-secondary/20 animate-spin"
            style={{ animationDuration: '5s', animationDirection: 'reverse' }}
          />
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary opacity-90" style={{ boxShadow: '0 0 30px rgba(173,198,255,0.4)' }} />
          <span className="orbit-dot" />
          <span className="orbit-dot-outer" style={{ animationDelay: '-2s' }} />
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: '0 0 80px 15px rgba(173,198,255,0.12)' }} />
        </div>

        <div className="relative z-10 w-32 h-8 pointer-events-none">
          {[
            { left: '10%', animationDelay: '0s',    animationDuration: '2.8s' },
            { left: '30%', animationDelay: '-1s',   animationDuration: '3.2s' },
            { left: '55%', animationDelay: '-0.5s', animationDuration: '2.5s' },
            { left: '80%', animationDelay: '-1.8s', animationDuration: '3.5s' },
          ].map((style, i) => (
            <span key={i} className="float-dot" style={{ top: '50%', ...style }} />
          ))}
        </div>

        <div className="relative z-10 text-center -mt-4">
          <p key={loadingMsgIndex} className="text-lg font-medium text-on-surface step-forward">
            {LOADING_MESSAGES[loadingMsgIndex]}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant/40">This takes about 20–30 seconds</p>
        </div>

        <div className="relative z-10 flex gap-2.5">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= loadingMsgIndex ? 'w-8 bg-primary' : 'w-2 bg-surface-container-high'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface overflow-x-hidden page-enter">
      <div className="fixed inset-0 grid-texture pointer-events-none opacity-60" />
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {[
          { left: '8%',  top: '20%', delay: '0s',    dur: '3.1s' },
          { left: '20%', top: '60%', delay: '-1.2s', dur: '2.8s' },
          { left: '35%', top: '35%', delay: '-0.5s', dur: '3.5s' },
          { left: '55%', top: '70%', delay: '-2s',   dur: '2.6s' },
          { left: '70%', top: '25%', delay: '-0.8s', dur: '3.2s' },
          { left: '85%', top: '55%', delay: '-1.6s', dur: '2.9s' },
          { left: '92%', top: '80%', delay: '-0.3s', dur: '3.4s' },
        ].map((p, i) => (
          <span
            key={i}
            className="float-dot"
            style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="OpsRadar" width={32} height={32} className="h-8 w-auto rounded-[6px]" />
          <span className="font-semibold text-[15px] tracking-tight">OpsRadar</span>
        </Link>
        <span className="text-xs font-medium text-on-surface-variant tabular-nums">
          {currentStep + 1} / {TOTAL_STEPS}
        </span>
      </nav>

      {/* Progress bar */}
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <div className="relative h-1 bg-surface-container-high/80 rounded-full">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #adc6ff, #4cd7f6, rgba(255,255,255,0.4) 95%, transparent 100%)',
              boxShadow: '0 0 8px 2px rgba(173,198,255,0.45), 0 0 2px rgba(76,215,246,0.6)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 px-0.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-primary' : 'bg-outline-variant'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-12 pb-8">
        <div
          key={animKey}
          className={direction === 'forward' ? 'step-forward' : 'step-backward'}
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Step 1 — Agency type */}
          {currentStep === 0 && (
            <>
              <StepHeader question="What type of agency are you?" />
              <SingleSelect
                options={AGENCY_TYPES}
                value={answers.agencyType}
                onChange={(v) => setAnswers((p) => ({ ...p, agencyType: v }))}
              />
              {answers.agencyType === 'Other' && (
                <div className="mt-4">
                  <TextInput
                    value={answers.agencyTypeOther}
                    onChange={(v) => setAnswers((p) => ({ ...p, agencyTypeOther: v }))}
                    placeholder="Describe your agency type..."
                  />
                </div>
              )}
            </>
          )}

          {/* Step 2 — Team size */}
          {currentStep === 1 && (
            <>
              <StepHeader question="How large is your team?" />
              <SingleSelect
                options={TEAM_SIZES}
                value={answers.teamSize}
                onChange={(v) => setAnswers((p) => ({ ...p, teamSize: v }))}
              />
            </>
          )}

          {/* Step 3 — Revenue */}
          {currentStep === 2 && (
            <>
              <StepHeader question="What's your approximate monthly revenue?" />
              <SingleSelect
                options={REVENUE_OPTIONS}
                value={answers.revenue}
                onChange={(v) => setAnswers((p) => ({ ...p, revenue: v }))}
              />
            </>
          )}

          {/* Step 4 — Active clients */}
          {currentStep === 3 && (
            <>
              <StepHeader question="How many active clients do you manage at a time?" />
              <SingleSelect
                options={CLIENT_COUNTS}
                value={answers.activeClients}
                onChange={(v) => setAnswers((p) => ({ ...p, activeClients: v }))}
              />
            </>
          )}

          {/* Step 5 — Tools (adaptive by agency type) */}
          {currentStep === 4 && (
            <>
              <StepHeader
                question="What tools does your team use daily?"
                hint="Select all that apply"
              />
              <MultiSelect
                options={getToolOptions()}
                values={answers.tools}
                onChange={toggleMulti('tools')}
              />
              {answers.tools.includes('Other') && (
                <div className="mt-4">
                  <TextInput
                    value={answers.toolsOther}
                    onChange={(v) => setAnswers((p) => ({ ...p, toolsOther: v }))}
                    placeholder="List any other tools your team uses..."
                  />
                </div>
              )}
            </>
          )}

          {/* Step 6 — CRM */}
          {currentStep === 5 && (
            <>
              <StepHeader question="What CRM do you use?" />
              <SingleSelect
                options={CRM_OPTIONS}
                value={answers.crmTool}
                onChange={(v) => setAnswers((p) => ({ ...p, crmTool: v }))}
              />
            </>
          )}

          {/* Step 7 — Adaptive time-heavy question */}
          {currentStep === 6 && (() => {
            const cat = agencyCat()
            if (cat === 'default') {
              return (
                <>
                  <StepHeader
                    question="What are the top 3 tasks eating your team's time?"
                    hint="Think repetitive, manual, or copy-paste heavy work."
                  />
                  <TextArea
                    value={answers.timeHeavyText}
                    onChange={(v) => setAnswers((p) => ({ ...p, timeHeavyText: v }))}
                    placeholder={`e.g. 1. Manually pulling reports for clients\n2. Back-and-forth emails during onboarding\n3. Moving data between tools...`}
                  />
                </>
              )
            }
            return (
              <>
                <StepHeader
                  question={TIME_HEAVY_Q[cat]}
                  hint="Select all that apply"
                />
                <MultiSelect
                  options={TIME_HEAVY_OPTS[cat]}
                  values={answers.timeHeavyMulti}
                  onChange={toggleMulti('timeHeavyMulti')}
                />
              </>
            )
          })()}

          {/* Step 8 — Lead entry */}
          {currentStep === 7 && (
            <>
              <StepHeader question="How do new leads/clients currently enter your system?" />
              <SingleSelect
                options={LEAD_ENTRY_OPTIONS}
                value={answers.leadEntry}
                onChange={(v) => setAnswers((p) => ({ ...p, leadEntry: v }))}
              />
            </>
          )}

          {/* Step 9 — Post-close onboarding */}
          {currentStep === 8 && (
            <>
              <StepHeader
                question="What happens after you close a new client?"
                hint="Select all that apply"
              />
              <MultiSelect
                options={ONBOARDING_OPTIONS}
                values={answers.onboarding}
                onChange={toggleMulti('onboarding')}
              />
            </>
          )}

          {/* Step 10 — Progress tracking */}
          {currentStep === 9 && (
            <>
              <StepHeader question="How do you currently track project progress and deadlines?" />
              <SingleSelect
                options={PROGRESS_OPTIONS}
                value={answers.progressTracking}
                onChange={(v) => setAnswers((p) => ({ ...p, progressTracking: v }))}
              />
            </>
          )}

          {/* Step 11 — Automation wish */}
          {currentStep === 10 && (
            <>
              <StepHeader
                question="What's the ONE process that, if automated, would save you the most time this month?"
                hint="Be specific — the more detail, the better your audit."
              />
              <TextArea
                value={answers.automationWish}
                onChange={(v) => setAnswers((p) => ({ ...p, automationWish: v }))}
                placeholder={`e.g. Pulling together weekly client reports from Google Ads, GA4, and our project tracker into a single PDF takes 3–4 hours every Friday...`}
              />
              {answers.automationWish.trim().length > 0 && answers.automationWish.trim().length < 20 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Add a bit more detail to continue</p>
              )}
            </>
          )}

          {/* Step 12 — Future vision */}
          {currentStep === 11 && (
            <>
              <StepHeader
                question="If you could wave a magic wand, what would your operations look like in 6 months?"
                hint="Dream big — this helps us tailor your audit roadmap."
              />
              <TextArea
                value={answers.futureVision}
                onChange={(v) => setAnswers((p) => ({ ...p, futureVision: v }))}
                placeholder={`e.g. Clients get onboarded automatically the day they sign. Reports go out without anyone touching them. My team only deals with creative work, not admin...`}
              />
              {answers.futureVision.trim().length > 0 && answers.futureVision.trim().length < 20 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Add a bit more detail to continue</p>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface hover:bg-transparent px-0 py-2 h-auto"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {currentStep === 0 ? 'Back to home' : 'Back'}
          </Button>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-3 h-auto rounded-full font-semibold text-sm gap-2 btn-spring shadow-[0_0_20px_rgba(173,198,255,0.25)]"
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={openModal}
              disabled={!canProceed()}
              className="px-7 py-3 h-auto rounded-full font-semibold text-sm gap-2 btn-spring cta-pulse shadow-[0_0_30px_rgba(173,198,255,0.3)]"
            >
              Generate My Audit
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          )}
        </div>

        {/* Error */}
        {loadingError && (
          <div className="mt-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-400 text-center">
            {loadingError}
          </div>
        )}
      </main>

      {/* Bottom hint */}
      <div className="relative z-10 text-center pb-10">
        <p className="text-xs text-on-surface-variant/30">
          Free · No credit card · Results in under 60 seconds
        </p>
      </div>

      {showModal && (
        <EmailCaptureModal
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
