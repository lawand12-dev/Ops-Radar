'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EmailCaptureModal, { type LeadInfo } from '../components/EmailCaptureModal'
import ThemeToggle from '<npm>/components/theme/ThemeToggle'
import { Input } from '<npm>/components/ui/input'
import { Button } from '<npm>/components/ui/button'
import { getOrCreateAuditSessionId, sendFunnelEvent } from '../../lib/funnel'

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
  'Development': [
    'GitHub', 'GitLab', 'Jira', 'Linear', 'Vercel', 'Sentry', 'PostHog',
  ],
  'PR/Communications': [
    'Muck Rack', 'Cision', 'Meltwater', 'Prowly', 'CoverageBook', 'Asana', 'ClickUp',
  ],
  'E-commerce': [
    'Shopify', 'Klaviyo', 'Gorgias', 'ShipStation', 'Recharge', 'Zendesk', 'Google Merchant Center',
  ],
}

const AGENCY_COPY = {
  default: {
    toolsHint: 'Choose the systems your team touches every week. This helps the diagnosis spot context-switching drag and contradictions inside the stack.',
    automationPlaceholder: 'e.g. Client reporting — when we miss a report, clients question whether we are doing the work',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'Marketing': {
    toolsHint: 'Think ads, CRM, reporting, content, scheduling, and client communication tools.',
    automationPlaceholder: 'e.g. Client reporting — when we miss a report, clients question whether we are doing the work',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'Recruiting/Staffing': {
    toolsHint: 'Think ATS, sourcing, scheduling, submissions, candidate communication, and client update tools.',
    automationPlaceholder: 'e.g. Interview scheduling — when it breaks, candidates ghost and clients assume we are disorganized',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'Design/Creative': {
    toolsHint: 'Think briefs, files, feedback, PM, approvals, asset delivery, and invoicing tools.',
    automationPlaceholder: 'e.g. Feedback and approvals — when they stall, deadlines slip and the team gets buried in follow-up',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'Development': {
    toolsHint: 'Think repos, tickets, QA, docs, deployments, client communication, and monitoring tools.',
    automationPlaceholder: 'e.g. Bug triage and client updates — when they slip, delivery slows down and trust drops fast',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'PR/Communications': {
    toolsHint: 'Think media databases, pitching, approvals, reporting, recaps, and client communication tools.',
    automationPlaceholder: 'e.g. Coverage reporting — when it slips, clients think we are scrambling instead of leading',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'E-commerce': {
    toolsHint: 'Think storefront, support, retention, fulfillment, inventory, finance, and reporting tools.',
    automationPlaceholder: 'e.g. Order exception handling — when it slips, refunds pile up and the team drops into fire-fighting mode',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
} as const

type ToolSignalRule = {
  matchAny: string[]
  suggestions: string[]
}

const TOOL_SIGNAL_RULES: ToolSignalRule[] = [
  {
    matchAny: ['Google Ads', 'Meta Ads Manager', 'Google Analytics', 'SEMrush', 'Hootsuite', 'Mailchimp', 'ActiveCampaign', 'Looker Studio', 'Supermetrics'],
    suggestions: [
      'Reporting is still assembled manually across marketing tools',
      'Performance anomalies need a human to notice first',
      'Campaign or client recap updates still depend on copy-paste',
      'Lead attribution or source matching still needs cleanup',
    ],
  },
  {
    matchAny: ['HubSpot', 'GoHighLevel', 'Salesforce', 'Pipedrive', 'Monday CRM', 'Airtable', 'Notion'],
    suggestions: [
      'Lead routing and assignment still needs manual cleanup',
      'Deal-to-delivery handoff still breaks between tools',
      'Follow-up reminders or no-response chasing still happens manually',
      'Pipeline records only get updated after the fact',
    ],
  },
  {
    matchAny: ['Asana', 'ClickUp', 'Monday', 'Trello', 'Jira', 'Linear'],
    suggestions: [
      'New projects or tasks still get created by hand',
      'Status updates still need to be posted in multiple places',
      'Deadlines and blockers depend on somebody chasing',
      'Sales-to-delivery handoff still gets rebuilt manually',
    ],
  },
  {
    matchAny: ['Bullhorn', 'Greenhouse', 'Lever', 'LinkedIn Recruiter', 'Indeed', 'Workable', 'JazzHR'],
    suggestions: [
      'Candidate stage updates still happen manually',
      'Interview scheduling and reminders still need coordination',
      'Client submission updates are still sent by hand',
      'Offer or onboarding handoff still breaks between tools',
    ],
  },
  {
    matchAny: ['Figma', 'Adobe Creative Suite', 'Canva'],
    suggestions: [
      'Asset or brief collection still happens over chat and email',
      'Review and approval loops still get chased manually',
      'File delivery and versioning still create confusion',
      'Approved work still needs a human to trigger the next step',
    ],
  },
  {
    matchAny: ['GitHub', 'GitLab', 'Jira', 'Linear', 'Vercel', 'Sentry', 'PostHog'],
    suggestions: [
      'New bugs or requests still need manual triage into delivery',
      'Release status updates still depend on a human',
      'QA or issue follow-up still jumps between tools',
      'Incidents are noticed, but not routed automatically',
    ],
  },
  {
    matchAny: ['Muck Rack', 'Cision', 'Meltwater', 'Prowly', 'CoverageBook'],
    suggestions: [
      'Media list building and outreach prep still happens manually',
      'Approvals and follow-ups still live in inboxes',
      'Coverage reporting still needs manual compiling',
      'Client recap decks still get rebuilt from scratch',
    ],
  },
  {
    matchAny: ['Shopify', 'Klaviyo', 'Gorgias', 'ShipStation', 'Recharge', 'Zendesk', 'Google Merchant Center'],
    suggestions: [
      'Order, support, and ops handoffs still break between tools',
      'Returns or exception handling still depends on manual coordination',
      'Post-purchase or retention workflows still need a human push',
      'Launch or inventory updates still get stitched together manually',
    ],
  },
  {
    matchAny: ['Stripe', 'QuickBooks', 'Calendly', 'Zoom', 'PandaDoc'],
    suggestions: [
      'Booked calls or signed deals still need manual internal prep',
      'Invoices, payment status, or finance follow-up still needs chasing',
      'Contracts or approvals do not automatically kick off delivery',
    ],
  },
]

const LOADING_MESSAGES = [
  'Analyzing your tech stack…',
  'Tracing your operational bottlenecks…',
  'Calculating conservative waste estimates…',
  'Generating your diagnosis…',
]

const RESEARCH_MESSAGES = [
  'Fetching your homepage…',
  'Detecting your tech stack…',
  'Scanning for buy signals…',
  'Analyzing positioning…',
]

const TOTAL_STEPS = 13
const REPORT_HANDOFF_KEY = 'opsradar_report_handoff'
const OPERATIONS_STATE_OPTIONS = [
  'Pure chaos — everything is manual and we\'re constantly dropping balls',
  'Patchwork — some things work, most things don\'t',
  'Functional but inefficient — we ship, but we\'re burning hours',
  'Mostly systematized — we just need to optimize the last 20%',
]
const HOURS_LOST_OPTIONS = [
  'Under 10 hours',
  '10-25 hours',
  '25-50 hours',
  '50-100 hours',
  'Over 100 hours (we\'re drowning)',
]
const BREAKAGE_RESPONSE_OPTIONS = [
  'It takes hours to figure out what went wrong',
  'Clients notice before we do',
  'We have no idea how often it breaks',
  'We catch it fast but it still costs us',
  'It rarely breaks — we\'ve built systems',
]
const PROCESS_FREQUENCY_OPTIONS = [
  'Multiple times daily',
  'Daily',
  'Weekly',
  'A few times per month',
  'Monthly or less',
]

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function getToolSignalOptions(selectedTools: string[]): string[] {
  const normalizedTools = selectedTools.map((tool) => normalizeToken(tool))
  const collected: string[] = []

  for (const rule of TOOL_SIGNAL_RULES) {
    const matchesRule = rule.matchAny.some((match) => {
      const normalizedMatch = normalizeToken(match)
      return normalizedTools.some((tool) => tool.includes(normalizedMatch) || normalizedMatch.includes(tool))
    })

    if (!matchesRule) continue

    for (const suggestion of rule.suggestions) {
      if (!collected.includes(suggestion)) {
        collected.push(suggestion)
      }
      if (collected.length >= 8) {
        return collected
      }
    }
  }

  return collected
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Answers = {
  websiteUrl: string
  agencyType: string
  agencyTypeOther: string
  teamSize: string
  revenue: string
  activeClients: string
  tools: string[]
  toolsOther: string
  toolSignals: string[]
  toolSignalsDetail: string
  operationsState: string
  hoursLost: string
  breakageResponse: string
  topPainProcess: string
  processFrequency: string
  sixMonthCost: string
  twoWeekChange: string
}

type ResearchState =
  | { status: 'idle' }
  | { status: 'analyzing'; messageIndex: number }
  | { status: 'done'; url: string; bullets: string[]; ok: boolean }
  | { status: 'skipped' }

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

function InsightNote({ text }: { text: string }) {
  return (
    <div
      className="mb-6 rounded-2xl border px-4 py-3.5"
      style={{ background: 'rgba(173,198,255,0.05)', borderColor: 'rgba(173,198,255,0.12)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
        Why We Ask
      </p>
      <p className="text-[13px] leading-[1.65] text-on-surface-variant">
        {text}
      </p>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AuditPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  // Stable session ID for funnel tracking — generated once on mount
  const sessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    const id = getOrCreateAuditSessionId()
    sessionIdRef.current = id

    sendFunnelEvent({
      event: 'audit_started',
      sessionId: id,
    })
  }, [])
  const [animKey, setAnimKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [loadingError, setLoadingError] = useState('')
  const [answers, setAnswers] = useState<Answers>({
    websiteUrl: '',
    agencyType: '',
    agencyTypeOther: '',
    teamSize: '',
    revenue: '',
    activeClients: '',
    tools: [],
    toolsOther: '',
    toolSignals: [],
    toolSignalsDetail: '',
    operationsState: '',
    hoursLost: '',
    breakageResponse: '',
    topPainProcess: '',
    processFrequency: '',
    sixMonthCost: '',
    twoWeekChange: '',
  })
  const [researchState, setResearchState] = useState<ResearchState>({ status: 'idle' })

  const agencyCat = (): keyof typeof AGENCY_COPY => (
    answers.agencyType in AGENCY_COPY
      ? (answers.agencyType as keyof typeof AGENCY_COPY)
      : 'default'
  )

  const getToolOptions = (): string[] => {
    const cat = agencyCat()
    const specific = cat !== 'default' ? (TOOLS_BY_AGENCY[cat] ?? []) : []
    return [...new Set([...specific, ...TOOLS_COMMON, 'Other'])]
  }

  const agencyCategory = agencyCat()
  const agencyCopy = AGENCY_COPY[agencyCategory]
  const toolOptions = getToolOptions()
  const selectedToolNames = [
    ...answers.tools.filter((tool) => tool !== 'Other'),
    ...(answers.tools.includes('Other') && answers.toolsOther.trim() ? [answers.toolsOther.trim()] : []),
  ]
  const toolSignalOptions = getToolSignalOptions(selectedToolNames)
  const needsAgencyTypeDetail = answers.agencyType === 'Other'
  const needsToolDetail = answers.tools.includes('Other')
  const needsToolSignalFollowup = selectedToolNames.length >= 2 && toolSignalOptions.length > 0

  useEffect(() => {
    const allowedTools = new Set(toolOptions)

    setAnswers((prev) => {
      const filteredTools = prev.tools.filter((tool) => allowedTools.has(tool))
      const filteredToolSignals = prev.toolSignals.filter((signal) => toolSignalOptions.includes(signal))

      const hasToolChange = filteredTools.length !== prev.tools.length
      const hasToolSignalChange =
        filteredToolSignals.length !== prev.toolSignals.length ||
        filteredToolSignals.some((item, index) => item !== prev.toolSignals[index])

      if (!hasToolChange && !hasToolSignalChange) {
        return prev
      }

      return {
        ...prev,
        tools: filteredTools,
        toolSignals: filteredToolSignals,
      }
    })
  }, [agencyCategory, toolOptions, toolSignalOptions])

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        // Website step is optional — user must either finish analyzing, skip, or have nothing to do.
        return researchState.status === 'done' || researchState.status === 'skipped' || answers.websiteUrl.trim() === ''
      case 1:
        return !!answers.agencyType && (!needsAgencyTypeDetail || answers.agencyTypeOther.trim().length >= 3)
      case 2:  return !!answers.teamSize
      case 3:  return !!answers.revenue
      case 4:  return !!answers.activeClients
      case 5:
        return (
          answers.tools.length > 0 &&
          (!needsToolDetail || answers.toolsOther.trim().length >= 3) &&
          (!needsToolSignalFollowup || answers.toolSignals.length > 0 || answers.toolSignalsDetail.trim().length >= 10)
        )
      case 6:  return !!answers.operationsState
      case 7:  return !!answers.hoursLost
      case 8:  return !!answers.breakageResponse
      case 9:  return answers.topPainProcess.trim().length >= 20
      case 10: return !!answers.processFrequency
      case 11: return answers.sixMonthCost.trim().length >= 20
      case 12: return answers.twoWeekChange.trim().length >= 20
      default: return false
    }
  }

  const navigate = (dir: 'forward' | 'backward') => {
    setDirection(dir)
    setAnimKey((k) => k + 1)
  }

  const goNext = () => {
    if (!canProceed()) return
    const nextStep = currentStep + 1
    // Fire-and-forget step beacon for funnel analytics
    if (sessionIdRef.current) {
      navigator.sendBeacon(
        '/api/audit-step',
        JSON.stringify({ sessionId: sessionIdRef.current, step: nextStep }),
      )
    }
    navigate('forward')
    setCurrentStep(nextStep)
  }

  const goBack = () => {
    if (currentStep === 0) { router.push('/'); return }
    navigate('backward')
    setCurrentStep((s) => s - 1)
  }

  const openModal = () => {
    if (!canProceed()) return
    sendFunnelEvent({
      event: 'lead_modal_opened',
      sessionId: sessionIdRef.current,
      step: currentStep + 1,
    })
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
      const toolList = [
        ...answers.tools.filter((t) => t !== 'Other'),
        ...(answers.tools.includes('Other') && answers.toolsOther ? [answers.toolsOther] : []),
      ].join(', ')
      const toolSignalsValue = [
        ...answers.toolSignals,
        ...(answers.toolSignalsDetail.trim() ? [answers.toolSignalsDetail.trim()] : []),
      ].join(' | ')

      const handoffTools = [
        ...toolList.split(',').map((tool) => tool.trim()).filter(Boolean),
      ]
      const uniqueHandoffTools = [...new Set(handoffTools)].filter((tool) => (
        !!tool &&
        !tool.startsWith('Pure chaos') &&
        !tool.startsWith('Patchwork') &&
        !tool.startsWith('Functional but inefficient') &&
        !tool.startsWith('Mostly systematized')
      ))

      const effectiveWebsiteUrl = answers.websiteUrl.trim() || lead.websiteUrl

      const res = await fetch('/api/generate-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          company: lead.company,
          websiteUrl: effectiveWebsiteUrl,
          companyWebsite: lead.companyWebsite,
          startedAt: lead.startedAt,
          agencyType: answers.agencyType === 'Other' && answers.agencyTypeOther
            ? answers.agencyTypeOther
            : answers.agencyType,
          teamSize: answers.teamSize,
          revenue: answers.revenue,
          activeClients: answers.activeClients,
          tools: toolList,
          toolSignals: toolSignalsValue,
          crmTool: answers.operationsState,
          timeHeavy: answers.hoursLost,
          leadEntry: answers.breakageResponse,
          onboarding: answers.sixMonthCost,
          progressTracking: answers.twoWeekChange,
          automationWish: answers.topPainProcess,
          processFrequency: answers.processFrequency,
          processOwner: '',
          failureImpact: answers.sixMonthCost,
          futureVision: answers.twoWeekChange,
        }),
      })

      const data = await res.json()
      if (!res.ok || (!data.id && !data.audit)) throw new Error(data.error ?? 'Something went wrong')

      const secureAuditId = typeof data.id === 'string' ? data.id : null

      sendFunnelEvent({
        event: 'audit_submitted',
        sessionId: sessionIdRef.current,
        auditId: secureAuditId,
        step: TOTAL_STEPS,
        reportStage: data.audit?.report_stage === 'full' ? 'full' : 'preview',
        metadata: {
          websiteProvided: Boolean(effectiveWebsiteUrl?.trim()),
          toolCount: uniqueHandoffTools.length,
        },
      })

      sessionStorage.setItem(REPORT_HANDOFF_KEY, JSON.stringify({
        auditId: secureAuditId,
        company: lead.company,
        agencyType: answers.agencyType === 'Other' && answers.agencyTypeOther
          ? answers.agencyTypeOther
          : answers.agencyType,
        automationWish: answers.topPainProcess,
        futureVision: answers.twoWeekChange,
        processFrequency: answers.processFrequency,
        processOwner: '',
        failureImpact: answers.sixMonthCost,
        toolSignals: [
          ...answers.toolSignals,
          ...(answers.toolSignalsDetail.trim() ? [answers.toolSignalsDetail.trim()] : []),
        ].slice(0, 4),
        websiteUrl: effectiveWebsiteUrl,
        tools: uniqueHandoffTools.slice(0, 6),
        createdAt: Date.now(),
      }))

      if (data.audit) {
        sessionStorage.setItem('opsradar_audit', JSON.stringify(data.audit))
      } else {
        sessionStorage.removeItem('opsradar_audit')
      }

      const dest = secureAuditId
        ? `/results?id=${encodeURIComponent(secureAuditId)}`
        : '/results'
      router.push(dest)
    } catch (err) {
      clearInterval(interval)
      setLoading(false)
      setLoadingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      clearInterval(interval)
    }
  }

  const toggleMulti = (field: 'tools' | 'toolSignals') => (value: string) => {
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
      <div className="relative z-10 px-6 pt-4">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-white/12 bg-slate-950/72 p-2 shadow-[0_24px_90px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-3 py-1">
            <Link href="/" className="flex items-center gap-3 rounded-full px-2 py-1 text-white transition-opacity hover:opacity-90">
              <Image src="/logo.png" alt="OpsRadar" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-400 bg-clip-text font-headline text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                OpsRadar
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold text-white/82">
                {currentStep + 1} / {TOTAL_STEPS}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-4">
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
          {/* Step 1 — Website research */}
          {currentStep === 0 && (
            <>
              <StepHeader
                question="Got a website? Let's analyze it."
                hint="Drop your URL and we'll inspect your site in real-time to deliver a 10x deeper audit. This is what makes OpsRadar's reports impossible to replicate with ChatGPT."
              />

              <div className="mb-6 space-y-2.5">
                {[
                  'Real tech stack detection (we name your actual tools)',
                  'Positioning analysis (we read your homepage like a consultant)',
                  'Buy-signal detection (we find what\'s already broken)',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
                      <path d="M3 8l3.5 3.5L13 5" stroke="#4cd7f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <TextInput
                  value={answers.websiteUrl}
                  onChange={(v) => {
                    setAnswers((p) => ({ ...p, websiteUrl: v }))
                    if (researchState.status !== 'idle') {
                      setResearchState({ status: 'idle' })
                    }
                  }}
                  placeholder="https://youragency.com"
                />
              </div>

              {researchState.status === 'analyzing' && (
                <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                    <p className="text-sm font-medium text-on-surface">
                      {RESEARCH_MESSAGES[researchState.messageIndex]}
                    </p>
                  </div>
                </div>
              )}

              {researchState.status === 'done' && (
                <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/8 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
                    Analysis complete
                  </p>
                  <p className="text-sm text-on-surface mb-3">
                    Here&apos;s what I found:
                  </p>
                  <ul className="space-y-2">
                    {researchState.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-on-surface-variant leading-relaxed">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-secondary flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mb-5 text-xs text-on-surface-variant/50">
                No URL? Skip this step — your audit will still be great, just less specific.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={
                    researchState.status === 'analyzing' ||
                    answers.websiteUrl.trim().length < 4
                  }
                  onClick={async () => {
                    const url = answers.websiteUrl.trim()
                    if (!url) return

                    setResearchState({ status: 'analyzing', messageIndex: 0 })

                    const tick = setInterval(() => {
                      setResearchState((prev) => {
                        if (prev.status !== 'analyzing') return prev
                        return {
                          status: 'analyzing',
                          messageIndex: Math.min(prev.messageIndex + 1, RESEARCH_MESSAGES.length - 1),
                        }
                      })
                    }, 2200)

                    try {
                      const res = await fetch('/api/research-preview', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                      })
                      const data = await res.json().catch(() => null)
                      clearInterval(tick)

                      if (!res.ok || !data) {
                        setResearchState({
                          status: 'done',
                          url,
                          ok: false,
                          bullets: ['We couldn\'t analyze your site, but your audit will still run.'],
                        })
                        return
                      }

                      setResearchState({
                        status: 'done',
                        url: typeof data.url === 'string' ? data.url : url,
                        ok: Boolean(data.ok),
                        bullets: Array.isArray(data.bullets) ? data.bullets.slice(0, 4) : [],
                      })
                    } catch {
                      clearInterval(tick)
                      setResearchState({
                        status: 'done',
                        url,
                        ok: false,
                        bullets: ['We couldn\'t analyze your site, but your audit will still run.'],
                      })
                    }
                  }}
                  className="px-5 py-3 h-auto rounded-full font-semibold text-sm gap-2 btn-spring shadow-[0_0_20px_rgba(173,198,255,0.25)]"
                >
                  {researchState.status === 'analyzing' ? 'Analyzing…' : 'Analyze My Site →'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAnswers((p) => ({ ...p, websiteUrl: '' }))
                    setResearchState({ status: 'skipped' })
                  }}
                  className="text-xs text-on-surface-variant/60 hover:text-on-surface hover:bg-transparent px-3 py-2 h-auto"
                >
                  Skip — I&apos;ll go without
                </Button>
              </div>
            </>
          )}

          {/* Step 2 — Agency type */}
          {currentStep === 1 && (
            <>
              <StepHeader
                question="What kind of business are we looking at?"
                hint="We tailor benchmarks, workflow assumptions, and stack recommendations around your operating model."
              />
              <InsightNote text="A recruiting shop, a creative studio, and an e-commerce team break in totally different places. This is where we stop the audit from feeling generic." />
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
              {needsAgencyTypeDetail && answers.agencyTypeOther.trim().length > 0 && answers.agencyTypeOther.trim().length < 3 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Add a little more detail so we can tailor the audit.</p>
              )}
            </>
          )}

          {/* Step 3 — Team size */}
          {currentStep === 2 && (
            <>
              <StepHeader question="How large is your team?" />
              <SingleSelect
                options={TEAM_SIZES}
                value={answers.teamSize}
                onChange={(v) => setAnswers((p) => ({ ...p, teamSize: v }))}
              />
            </>
          )}

          {/* Step 4 — Revenue */}
          {currentStep === 3 && (
            <>
              <StepHeader question="What's your approximate monthly revenue?" />
              <SingleSelect
                options={REVENUE_OPTIONS}
                value={answers.revenue}
                onChange={(v) => setAnswers((p) => ({ ...p, revenue: v }))}
              />
            </>
          )}

          {/* Step 5 — Active clients */}
          {currentStep === 4 && (
            <>
              <StepHeader question="How many active clients do you manage at a time?" />
              <SingleSelect
                options={CLIENT_COUNTS}
                value={answers.activeClients}
                onChange={(v) => setAnswers((p) => ({ ...p, activeClients: v }))}
              />
            </>
          )}

          {/* Step 6 — Tools (adaptive by agency type) */}
          {currentStep === 5 && (
            <>
              <StepHeader
                question="What tools does your team use daily?"
                hint={agencyCopy.toolsHint}
              />
              <InsightNote text="This tells us where your team is context-switching, what APIs can be connected, and which recommendations are actually realistic for your stack." />
              <MultiSelect
                options={toolOptions}
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
              {needsToolDetail && answers.toolsOther.trim().length > 0 && answers.toolsOther.trim().length < 3 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Name the extra tool so we can factor it into the diagnosis.</p>
              )}
              {needsToolSignalFollowup && (
                <div className="mt-6 rounded-[20px] border border-primary/12 bg-primary/5 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
                    Smart follow-up
                  </p>
                  <p className="font-headline text-[17px] font-bold tracking-[-0.02em] text-on-surface mb-2">
                    Based on your stack, what still gets stitched together by hand?
                  </p>
                  <p className="text-[13px] leading-[1.65] text-on-surface-variant mb-4">
                    Pick the handoffs that feel painfully familiar. This helps the diagnosis catch contradictions between your tool stack and your lived operational reality.
                  </p>
                  <MultiSelect
                    options={toolSignalOptions}
                    values={answers.toolSignals}
                    onChange={toggleMulti('toolSignals')}
                  />
                  <div className="mt-4">
                    <TextInput
                      value={answers.toolSignalsDetail}
                      onChange={(v) => setAnswers((p) => ({ ...p, toolSignalsDetail: v }))}
                      placeholder="Optional: name another tool-to-tool handoff that breaks often..."
                    />
                  </div>
                  {answers.toolSignals.length === 0 && answers.toolSignalsDetail.trim().length > 0 && answers.toolSignalsDetail.trim().length < 10 && (
                    <p className="mt-2 text-xs text-on-surface-variant/50">Add a little more detail so the workflow pain is clear.</p>
                  )}
                </div>
              )}
              {needsToolSignalFollowup && answers.toolSignals.length === 0 && answers.toolSignalsDetail.trim().length === 0 && (
                <p className="mt-3 text-xs text-on-surface-variant/50">Choose at least one stack pain point or write your own before continuing.</p>
              )}
            </>
          )}

          {/* Step 7 — Operations state */}
          {currentStep === 6 && (
            <>
              <StepHeader
                question="Which of these best describes your current operations?"
              />
              <InsightNote text="This gives the diagnosis a baseline. It also helps surface contradictions between how systematized you feel and how fragmented the day-to-day reality sounds." />
              <SingleSelect
                options={OPERATIONS_STATE_OPTIONS}
                value={answers.operationsState}
                onChange={(v) => setAnswers((p) => ({ ...p, operationsState: v }))}
              />
            </>
          )}

          {/* Step 8 — Hours lost */}
          {currentStep === 7 && (
            <>
              <StepHeader
                question="How many hours per week does your team lose to work that feels 'beneath' their pay grade?"
              />
              <InsightNote text="This is the input that turns frustration into a believable waste estimate. The goal is conservative math, not inflated math." />
              <SingleSelect
                options={HOURS_LOST_OPTIONS}
                value={answers.hoursLost}
                onChange={(v) => setAnswers((p) => ({ ...p, hoursLost: v }))}
              />
            </>
          )}

          {/* Step 9 — Breakage response */}
          {currentStep === 8 && (
            <>
              <StepHeader
                question="When something breaks in your operations, what happens?"
              />
              <InsightNote text="This tells the diagnosis how visible the damage is and how quickly small failures turn into client-facing pain." />
              <SingleSelect
                options={BREAKAGE_RESPONSE_OPTIONS}
                value={answers.breakageResponse}
                onChange={(v) => setAnswers((p) => ({ ...p, breakageResponse: v }))}
              />
            </>
          )}

          {/* Step 10 — Top pain process */}
          {currentStep === 9 && (
            <>
              <StepHeader
                question="What's the #1 process that, when it fails, hurts your business the most?"
              />
              <InsightNote text="This is the anchor for the diagnosis. The stronger this answer is, the sharper the urgency and waste ranking becomes." />
              <TextArea
                value={answers.topPainProcess}
                onChange={(v) => setAnswers((p) => ({ ...p, topPainProcess: v }))}
                placeholder={agencyCopy.automationPlaceholder}
              />
              {answers.topPainProcess.trim().length > 0 && answers.topPainProcess.trim().length < 20 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Add a bit more detail to continue</p>
              )}
            </>
          )}

          {/* Step 11 — Frequency */}
          {currentStep === 10 && (
            <>
              <StepHeader
                question="How often does this process happen?"
              />
              <InsightNote text="Frequency changes urgency. A weekly pain and a daily pain may hurt differently even when the same people touch them." />
              <SingleSelect
                options={PROCESS_FREQUENCY_OPTIONS}
                value={answers.processFrequency}
                onChange={(v) => setAnswers((p) => ({ ...p, processFrequency: v }))}
              />
            </>
          )}

          {/* Step 12 — Six-month cost */}
          {currentStep === 11 && (
            <>
              <StepHeader
                question="What's the real cost if this process keeps running manually for another 6 months?"
              />
              <InsightNote text="Think about the real business cost: wasted hours, lost clients, missed growth, team burnout, or the founder staying trapped in low-leverage work." />
              <TextArea
                value={answers.sixMonthCost}
                onChange={(v) => setAnswers((p) => ({ ...p, sixMonthCost: v }))}
                placeholder="Think about: hours wasted, clients lost, team burnout, missed growth"
              />
              {answers.sixMonthCost.trim().length > 0 && answers.sixMonthCost.trim().length < 20 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Add a bit more detail to continue</p>
              )}
            </>
          )}

          {/* Step 13 — Desired change */}
          {currentStep === 12 && (
            <>
              <StepHeader
                question="If we could eliminate your top 3 operational pains in 2 weeks, what would change for your business?"
              />
              <InsightNote text="This gives the diagnosis emotional contrast. We want to know what relief, speed, or growth would actually look like on the other side." />
              <TextArea
                value={answers.twoWeekChange}
                onChange={(v) => setAnswers((p) => ({ ...p, twoWeekChange: v }))}
                placeholder={agencyCopy.futureVisionPlaceholder}
              />
              {answers.twoWeekChange.trim().length > 0 && answers.twoWeekChange.trim().length < 20 && (
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
          initialWebsiteUrl={answers.websiteUrl}
        />
      )}
    </div>
  )
}
