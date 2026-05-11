'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LeadInfo } from '../components/EmailCaptureModal'
import HoneypotField from '../components/HoneypotField'
import { getAbuseProtectionPayload } from '../../lib/abuse-protection'
import { Input } from '<npm>/components/ui/input'
import { Button } from '<npm>/components/ui/button'
import { Label } from '<npm>/components/ui/label'
import { Textarea } from '<npm>/components/ui/textarea'
import { Progress } from '<npm>/components/ui/progress'
import { getOrCreateAuditSessionId, sendFunnelEvent } from '../../lib/funnel'
import { track } from '@vercel/analytics'

// ─── Data ────────────────────────────────────────────────────────────────────

const AGENCY_TYPES = [
  'Marketing — Paid Media',
  'Marketing — SEO',
  'Marketing — Full-Service Digital',
  'Recruiting/Staffing',
  'Design/Creative',
  'Development',
  'PR/Communications',
  'E-commerce',
  'Other',
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
  'Marketing — Paid Media': [
    'Meta Ads Manager', 'Google Ads', 'TikTok Ads',
    'Google Analytics', 'Triple Whale', 'Northbeam',
    'Motion', 'Supermetrics', 'Klaviyo', 'Shopify', 'AgencyAnalytics',
  ],
  'Marketing — SEO': [
    'Ahrefs', 'SEMrush', 'Screaming Frog', 'Sitebulb',
    'Google Search Console', 'Google Analytics',
    'SurferSEO', 'Clearscope', 'Frase', 'Profound', 'AgencyAnalytics',
  ],
  'Marketing — Full-Service Digital': [
    'HubSpot', 'Google Ads', 'Meta Ads Manager',
    'Google Analytics', 'Mailchimp', 'Figma',
    'Asana', 'ClickUp', 'Harvest', 'AgencyAnalytics',
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
  'Marketing — Paid Media': {
    toolsHint: 'Think ad platforms, attribution, creative analytics, and client reporting tools.',
    automationPlaceholder: 'e.g. Monthly client reports — 8 hours every Sunday stitching Meta + Google + Klaviyo',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'Marketing — SEO': {
    toolsHint: 'Think rank tracking, technical SEO, content briefs, and AI Overview monitoring tools.',
    automationPlaceholder: 'e.g. Weekly rank rollups — I paste from Ahrefs into Google Docs every Monday',
    futureVisionPlaceholder: 'Describe what would actually be different',
  },
  'Marketing — Full-Service Digital': {
    toolsHint: 'Think CRM, project management, time tracking, and multi-channel reporting tools.',
    automationPlaceholder: 'e.g. Status updates — PMs rewrite the same info across 3 tools for every client',
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
    matchAny: ['Triple Whale', 'Northbeam', 'Motion', 'Klaviyo', 'Shopify', 'TikTok Ads'],
    suggestions: [
      'Cross-platform creative rollups still rebuilt by hand per week',
      'MER vs last-click attribution debates still happen in Slack threads',
      'Client reports still stitched together late Sunday night',
      'Pacing alerts still depend on a human watching the dashboard',
    ],
  },
  {
    matchAny: ['Ahrefs', 'Screaming Frog', 'Sitebulb', 'Google Search Console', 'SurferSEO', 'Clearscope', 'Frase', 'Profound'],
    suggestions: [
      'Weekly rank rollups still copied from Ahrefs into Google Docs',
      'Technical audit diffs still caught manually instead of alerted',
      'AI Overview and LLM mention tracking still depends on manual SERP checks',
      'Content briefs still assembled by hand before handing off to writers',
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

// ─── Step eyebrow labels ──────────────────────────────────────────────────────

const STEP_EYEBROWS: Record<number, string> = {
  0:  'Agency profile',
  1:  'Team size',
  2:  'Revenue',
  3:  'Client load',
  4:  'Tech stack',
  5:  'Operations',
  6:  'Your details',
  7:  'Time lost',
  8:  'Failure modes',
  9:  'Top pain',
  10: 'Frequency',
  11: 'Cost of inaction',
  12: 'Desired outcome',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepEyebrow({ label }: { label: string }) {
  return (
    <p className="text-label uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] mb-3">
      {label}
    </p>
  )
}

function StepHeader({ question, hint }: { question: string; hint?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-h2 font-serif font-normal tracking-tight leading-snug text-[var(--color-fg)] mb-3">
        {question}
      </h2>
      {hint && (
        <p className="text-body text-[var(--color-fg-muted)]">
          {hint}
        </p>
      )}
    </div>
  )
}

function InsightNote({ text }: { text: string }) {
  return (
    <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
      <p className="text-label uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] mb-1.5">
        Why this matters
      </p>
      <p className="text-body-sm leading-relaxed text-[var(--color-fg-muted)]">
        {text}
      </p>
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
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              'w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-left text-body transition-colors duration-[var(--duration-fast)]',
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-fg)] option-selected'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            <span
              className={[
                'flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors duration-[var(--duration-fast)]',
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-[var(--color-border-strong)] bg-transparent',
              ].join(' ')}
            />
            <span>{opt}</span>
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
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-full)] border text-body-sm font-medium transition-colors duration-[var(--duration-fast)] active:scale-95',
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-fg)] option-selected'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            {selected && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
            )}
            {opt}
          </button>
        )
      })}
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
  useEffect(() => {
    if (currentStep === 6 && !emailGateShownRef.current) {
      emailGateShownRef.current = true
      sendFunnelEvent({
        event: 'email_gate_shown',
        sessionId: sessionIdRef.current,
        step: 6,
      })
    }
  }, [currentStep])
  const [animKey, setAnimKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [loadingError, setLoadingError] = useState('')
  const emailGateShownRef = useRef(false)
  // Lead capture fields (collected at Step 6)
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadCompany, setLeadCompany] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [startedAt] = useState(() => Date.now())
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

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!answers.agencyType && (!needsAgencyTypeDetail || answers.agencyTypeOther.trim().length >= 3)
      case 1:  return !!answers.teamSize
      case 2:  return !!answers.revenue
      case 3:  return !!answers.activeClients
      case 4:
        return (
          answers.tools.length > 0 &&
          (!needsToolDetail || answers.toolsOther.trim().length >= 3) &&
          (!needsToolSignalFollowup || answers.toolSignals.length > 0 || answers.toolSignalsDetail.trim().length >= 10)
        )
      case 5:  return !!answers.operationsState
      case 6:
        return leadName.trim().length > 0 && isValidEmail && leadCompany.trim().length > 0 && companyWebsite.trim().length === 0
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
    // Fire email gate passed when advancing from Step 6 (lead capture)
    if (currentStep === 6 && sessionIdRef.current) {
      sendFunnelEvent({
        event: 'email_gate_passed',
        sessionId: sessionIdRef.current,
        step: 6,
      })
    }
    navigate('forward')
    setCurrentStep(nextStep)
  }

  const goBack = () => {
    if (currentStep === 0) { router.push('/'); return }
    navigate('backward')
    setCurrentStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    if (!canProceed()) return
    const lead: LeadInfo = {
      name: leadName.trim(),
      email: leadEmail.trim(),
      company: leadCompany.trim(),
      websiteUrl: answers.websiteUrl.trim(),
      ...getAbuseProtectionPayload(startedAt, companyWebsite),
    }
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
      const secureAccessToken = typeof data.accessToken === 'string' ? data.accessToken : null

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
      track('audit_form_submitted')

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
        sessionStorage.setItem('opsradar_audit_cache', JSON.stringify({
          auditId: secureAuditId,
          audit: data.audit,
          token: secureAccessToken,
          timestamp: Date.now(),
        }))
      } else {
        sessionStorage.removeItem('opsradar_audit_cache')
      }

      const dest = secureAuditId && secureAccessToken
        ? `/results?id=${encodeURIComponent(secureAuditId)}&token=${encodeURIComponent(secureAccessToken)}`
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
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex flex-col items-center justify-center px-6 gap-10">
        {/* Wordmark */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-6">
          <Link href="/" className="flex items-center gap-2.5 text-[var(--color-fg)] opacity-60 hover:opacity-100 transition-opacity">
            <Image src="/logo.png" alt="OpsRadar" width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
            <span className="font-serif font-normal text-lg tracking-tight">OpsRadar</span>
          </Link>
        </div>

        {/* Spinner — minimal ring */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin"
            style={{ animationDuration: '0.8s' }}
          />
        </div>

        <div className="text-center max-w-xs">
          <p key={loadingMsgIndex} className="text-body font-medium text-[var(--color-fg)]">
            {LOADING_MESSAGES[loadingMsgIndex]}
          </p>
          <p className="mt-1.5 text-body-sm text-[var(--color-fg-subtle)]">This takes about 20–30 seconds</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={[
                'h-1 rounded-full transition-all duration-500',
                i <= loadingMsgIndex
                  ? 'w-6 bg-[var(--color-primary)]'
                  : 'w-1.5 bg-[var(--color-border-strong)]',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">

      {/* ── Thin wordmark nav ─────────────────────────────────────────────── */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-[var(--color-fg)] hover:text-[var(--color-fg-muted)] transition-colors">
            <Image src="/logo.png" alt="OpsRadar" width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
            <span className="font-serif font-normal text-lg tracking-tight">OpsRadar</span>
          </Link>
          <span className="text-mono text-[var(--color-fg-subtle)] tabular-nums">
            {currentStep + 1} / {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--color-border)]">
        <Progress
          value={progressPct}
          className="rounded-none h-0.5 bg-[var(--color-border)]"
        />
      </div>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <div
          key={animKey}
          className={direction === 'forward' ? 'step-forward' : 'step-backward'}
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Step 0 — Agency type */}
          {currentStep === 0 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[0]} />
              <StepHeader
                question="What kind of business are you running?"
                hint="I tailor benchmarks, workflow assumptions, and stack recommendations around your operating model."
              />
              <InsightNote text="A recruiting agency, a creative studio, and an e-commerce team break in completely different places. This is what stops the diagnosis from feeling generic." />
              <SingleSelect
                options={AGENCY_TYPES}
                value={answers.agencyType}
                onChange={(v) => setAnswers((p) => ({ ...p, agencyType: v }))}
              />
              {answers.agencyType === 'Other' && (
                <div className="mt-4">
                  <Label htmlFor="agencyTypeOther" className="mb-1.5 text-[var(--color-fg-muted)]">
                    Describe your agency type
                  </Label>
                  <Input
                    id="agencyTypeOther"
                    type="text"
                    value={answers.agencyTypeOther}
                    onChange={(e) => setAnswers((p) => ({ ...p, agencyTypeOther: e.target.value }))}
                    placeholder="e.g. Legal ops consultancy"
                    className="mt-1"
                  />
                </div>
              )}
              {needsAgencyTypeDetail && answers.agencyTypeOther.trim().length > 0 && answers.agencyTypeOther.trim().length < 3 && (
                <p className="mt-2 text-body-sm text-[var(--color-danger)]">Add a little more detail so OpsRadar can tailor the diagnosis.</p>
              )}
            </>
          )}

          {/* Step 1 — Team size */}
          {currentStep === 1 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[1]} />
              <StepHeader question="How large is your team?" />
              <SingleSelect
                options={TEAM_SIZES}
                value={answers.teamSize}
                onChange={(v) => setAnswers((p) => ({ ...p, teamSize: v }))}
              />
            </>
          )}

          {/* Step 2 — Revenue */}
          {currentStep === 2 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[2]} />
              <StepHeader question="What's your approximate monthly revenue?" />
              <SingleSelect
                options={REVENUE_OPTIONS}
                value={answers.revenue}
                onChange={(v) => setAnswers((p) => ({ ...p, revenue: v }))}
              />
            </>
          )}

          {/* Step 3 — Active clients */}
          {currentStep === 3 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[3]} />
              <StepHeader question="How many active clients do you manage at a time?" />
              <SingleSelect
                options={CLIENT_COUNTS}
                value={answers.activeClients}
                onChange={(v) => setAnswers((p) => ({ ...p, activeClients: v }))}
              />
            </>
          )}

          {/* Step 4 — Tools (adaptive by agency type) */}
          {currentStep === 4 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[4]} />
              <StepHeader
                question="What tools does your team use daily?"
                hint={agencyCopy.toolsHint}
              />
              <InsightNote text="This tells OpsRadar where your team is context-switching, which integrations are already possible, and which findings are actually grounded in your stack." />
              <MultiSelect
                options={toolOptions}
                values={answers.tools}
                onChange={toggleMulti('tools')}
              />
              {answers.tools.includes('Other') && (
                <div className="mt-4">
                  <Label htmlFor="toolsOther" className="mb-1.5 text-[var(--color-fg-muted)]">
                    Other tools
                  </Label>
                  <Input
                    id="toolsOther"
                    type="text"
                    value={answers.toolsOther}
                    onChange={(e) => setAnswers((p) => ({ ...p, toolsOther: e.target.value }))}
                    placeholder="List any other tools your team uses..."
                    className="mt-1"
                  />
                </div>
              )}
              {needsToolDetail && answers.toolsOther.trim().length > 0 && answers.toolsOther.trim().length < 3 && (
                <p className="mt-2 text-body-sm text-[var(--color-danger)]">Name the extra tool so it factors into the diagnosis.</p>
              )}
              {needsToolSignalFollowup && (
                <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <p className="text-label uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] mb-2">
                    Stack signals
                  </p>
                  <p className="text-h4 font-sans font-medium text-[var(--color-fg)] mb-2">
                    Based on your stack, what still gets stitched together by hand?
                  </p>
                  <p className="text-body-sm text-[var(--color-fg-muted)] mb-4">
                    Pick the handoffs that feel familiar. This helps the diagnosis surface friction that tool lists alone don&apos;t show.
                  </p>
                  <MultiSelect
                    options={toolSignalOptions}
                    values={answers.toolSignals}
                    onChange={toggleMulti('toolSignals')}
                  />
                  <div className="mt-4">
                    <Input
                      type="text"
                      value={answers.toolSignalsDetail}
                      onChange={(e) => setAnswers((p) => ({ ...p, toolSignalsDetail: e.target.value }))}
                      placeholder="Optional: name another tool-to-tool handoff that breaks often..."
                    />
                  </div>
                  {answers.toolSignals.length === 0 && answers.toolSignalsDetail.trim().length > 0 && answers.toolSignalsDetail.trim().length < 10 && (
                    <p className="mt-2 text-body-sm text-[var(--color-danger)]">Add a little more detail so the workflow pain is clear.</p>
                  )}
                </div>
              )}
              {needsToolSignalFollowup && answers.toolSignals.length === 0 && answers.toolSignalsDetail.trim().length === 0 && (
                <p className="mt-3 text-body-sm text-[var(--color-fg-muted)]">Choose at least one stack pain point or write your own before continuing.</p>
              )}
            </>
          )}

          {/* Step 5 — Operations state */}
          {currentStep === 5 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[5]} />
              <StepHeader
                question="Which of these best describes your current operations?"
              />
              <InsightNote text="This sets the baseline. It also helps surface the gap between how systematized the agency feels and how fragmented the day-to-day reality actually is." />
              <SingleSelect
                options={OPERATIONS_STATE_OPTIONS}
                value={answers.operationsState}
                onChange={(v) => setAnswers((p) => ({ ...p, operationsState: v }))}
              />
            </>
          )}

          {/* Step 6 — Lead capture */}
          {currentStep === 6 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[6]} />
              <StepHeader
                question="Where should OpsRadar send your diagnosis?"
                hint="Your report lands in your inbox in about 3 minutes. No spam, no list."
              />
              <div className="space-y-4">
                <HoneypotField value={companyWebsite} onChange={setCompanyWebsite} />
                <div>
                  <Label htmlFor="leadName">Your name</Label>
                  <Input
                    id="leadName"
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Alex Johnson"
                    autoFocus
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="leadEmail">
                    Work email
                    <span className="ml-1.5 text-[var(--color-fg-subtle)] font-normal text-body-sm">— used only to send your report</span>
                  </Label>
                  <Input
                    id="leadEmail"
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="alex@youragency.com"
                    className="mt-1.5"
                    aria-invalid={leadEmail.length > 0 && !isValidEmail}
                  />
                  {leadEmail.length > 0 && !isValidEmail && (
                    <p className="mt-1.5 text-body-sm text-[var(--color-danger)]" role="alert">Enter a valid email address</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="leadCompany">Your agency&apos;s name</Label>
                  <Input
                    id="leadCompany"
                    type="text"
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                    placeholder="Acme Agency"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 7 — Hours lost */}
          {currentStep === 7 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[7]} />
              <StepHeader
                question="How many hours per week does your team lose to work that feels 'beneath' their pay grade?"
              />
              <InsightNote text="This is what turns a feeling into a number. OpsRadar uses conservative math — the goal is a believable waste estimate, not an inflated one." />
              <SingleSelect
                options={HOURS_LOST_OPTIONS}
                value={answers.hoursLost}
                onChange={(v) => setAnswers((p) => ({ ...p, hoursLost: v }))}
              />
            </>
          )}

          {/* Step 8 — Breakage response */}
          {currentStep === 8 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[8]} />
              <StepHeader
                question="When something breaks in your operations, what happens?"
              />
              <InsightNote text="This shows how visible the damage is — and how quickly small operational failures become client-facing ones." />
              <SingleSelect
                options={BREAKAGE_RESPONSE_OPTIONS}
                value={answers.breakageResponse}
                onChange={(v) => setAnswers((p) => ({ ...p, breakageResponse: v }))}
              />
            </>
          )}

          {/* Step 9 — Top pain process */}
          {currentStep === 9 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[9]} />
              <StepHeader
                question="What's the one process that, when it fails, costs you the most?"
              />
              <InsightNote text="This anchors the diagnosis. The more specific the answer, the sharper the waste estimate becomes." />
              <Textarea
                value={answers.topPainProcess}
                onChange={(e) => setAnswers((p) => ({ ...p, topPainProcess: e.target.value }))}
                placeholder={agencyCopy.automationPlaceholder}
                rows={5}
                className="resize-none"
              />
              {answers.topPainProcess.trim().length > 0 && answers.topPainProcess.trim().length < 20 && (
                <p className="mt-2 text-body-sm text-[var(--color-danger)]" role="alert">Add a bit more detail to continue</p>
              )}
            </>
          )}

          {/* Step 10 — Frequency */}
          {currentStep === 10 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[10]} />
              <StepHeader
                question="How often does this process happen?"
              />
              <InsightNote text="Frequency shapes the waste math. A daily drag and a monthly one have very different costs even when the same people touch them." />
              <SingleSelect
                options={PROCESS_FREQUENCY_OPTIONS}
                value={answers.processFrequency}
                onChange={(v) => setAnswers((p) => ({ ...p, processFrequency: v }))}
              />
            </>
          )}

          {/* Step 11 — Six-month cost */}
          {currentStep === 11 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[11]} />
              <StepHeader
                question="What does another 6 months of running this manually actually cost you?"
              />
              <InsightNote text="Put it in real terms: hours drained, clients at risk, growth delayed, team burned out, or the founder stuck in work nobody should own." />
              <Textarea
                value={answers.sixMonthCost}
                onChange={(e) => setAnswers((p) => ({ ...p, sixMonthCost: e.target.value }))}
                placeholder="Think about: hours wasted, clients lost, team burnout, missed growth"
                rows={5}
                className="resize-none"
              />
              {answers.sixMonthCost.trim().length > 0 && answers.sixMonthCost.trim().length < 20 && (
                <p className="mt-2 text-body-sm text-[var(--color-danger)]" role="alert">Add a bit more detail to continue</p>
              )}
            </>
          )}

          {/* Step 12 — Desired change */}
          {currentStep === 12 && (
            <>
              <StepEyebrow label={STEP_EYEBROWS[12]} />
              <StepHeader
                question="If your top operational drags were gone, what would actually change?"
              />
              <InsightNote text="This gives the diagnosis contrast. Describe what relief, speed, or headroom would look like — not the fix, just the outcome." />
              <Textarea
                value={answers.twoWeekChange}
                onChange={(e) => setAnswers((p) => ({ ...p, twoWeekChange: e.target.value }))}
                placeholder={agencyCopy.futureVisionPlaceholder}
                rows={5}
                className="resize-none"
              />
              {answers.twoWeekChange.trim().length > 0 && answers.twoWeekChange.trim().length < 20 && (
                <p className="mt-2 text-body-sm text-[var(--color-danger)]" role="alert">Add a bit more detail to continue</p>
              )}

              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                <Label htmlFor="websiteUrl">
                  Got a website?
                  <span className="ml-1.5 text-[var(--color-fg-subtle)] font-normal">Optional</span>
                </Label>
                <p className="mt-1 mb-3 text-body-sm text-[var(--color-fg-muted)]">
                  Share your URL and OpsRadar will tailor the diagnosis to your actual stack and services. Your site isn&apos;t graded — it just makes the findings more accurate.
                </p>
                <Input
                  id="websiteUrl"
                  type="text"
                  value={answers.websiteUrl}
                  onChange={(e) => setAnswers((p) => ({ ...p, websiteUrl: e.target.value }))}
                  placeholder="https://youragency.com"
                />
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="flex items-center gap-1.5 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] px-0 h-auto"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {currentStep === 0 ? 'Back to home' : 'Back'}
          </Button>

          {currentStep === 0 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Start my audit
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          ) : currentStep < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="gap-2"
            >
              Run My Diagnosis
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          )}
        </div>

        {/* Error */}
        {loadingError && (
          <div
            className="mt-4 p-3.5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 text-body-sm text-[var(--color-danger)] text-center"
            role="alert"
          >
            {loadingError}
          </div>
        )}
      </main>

      {/* ── Bottom hint ─────────────────────────────────────────────────── */}
      <div className="text-center pb-10">
        <p className="text-body-sm text-[var(--color-fg-faint)]">
          Free · Results sent to your inbox
        </p>
      </div>
    </div>
  )
}
