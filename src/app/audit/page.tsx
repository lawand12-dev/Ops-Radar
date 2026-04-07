'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EmailCaptureModal, { type LeadInfo } from '../components/EmailCaptureModal'
import { Input } from '<npm>/components/ui/input'
import { Button } from '<npm>/components/ui/button'
import { storeAuditAccessToken } from '../../lib/audit-access-client'
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
  'Development': [
    'Ticket triage', 'Sprint handoffs', 'QA / bug reporting',
    'Client status updates', 'Release coordination', 'Scope changes',
  ],
  'PR/Communications': [
    'Media list building', 'Press outreach follow-up', 'Approval rounds',
    'Coverage reporting', 'Client updates', 'Campaign recap decks',
  ],
  'E-commerce': [
    'Order exception handling', 'Inventory updates', 'Customer support handoffs',
    'Campaign reporting', 'Returns / refunds', 'Launch coordination',
  ],
}

const TIME_HEAVY_Q: Record<string, string> = {
  'Marketing': 'Which of these client deliverables take the most time?',
  'Recruiting/Staffing': 'Which part of the hiring pipeline is most manual?',
  'Design/Creative': 'Where does your team lose the most time?',
  'Development': 'Where does your delivery process get bogged down?',
  'PR/Communications': 'Which part of client PR execution is still most manual?',
  'E-commerce': 'Which part of store operations still needs too much human work?',
}

const AGENCY_COPY = {
  default: {
    toolsHint: 'Choose the systems your team touches every week. This shapes the integration map and stack score.',
    leadEntryHint: 'We use this to identify the cleanest first automation trigger.',
    onboardingHint: 'This shows us how chaotic the post-close handoff really is.',
    progressHint: 'This tells us where deadlines disappear and who gets surprised.',
    automationPlaceholder: 'e.g. Every time a new client signs, we still copy details into multiple tools, create docs by hand, and chase people in Slack before work can actually start...',
    futureVisionPlaceholder: 'e.g. New work kicks off automatically, status updates stay visible without chasing, and the team spends time on delivery instead of admin...',
  },
  'Marketing': {
    toolsHint: 'Think ads, CRM, reporting, content, scheduling, and client communication tools.',
    leadEntryHint: 'This shows us what should trigger lead routing, enrichment, and follow-up automatically.',
    onboardingHint: 'This helps us spot where kickoff, reporting, and campaign setup still rely on humans remembering things.',
    progressHint: 'This tells us where campaign visibility breaks down between account managers, specialists, and clients.',
    automationPlaceholder: 'e.g. Every Friday we still pull Google Ads, GA4, and client notes into a report deck manually before sending updates...',
    futureVisionPlaceholder: 'e.g. Leads get routed instantly, campaign reporting is automated, and client updates go out without the team spending Friday in spreadsheets...',
  },
  'Recruiting/Staffing': {
    toolsHint: 'Think ATS, sourcing, scheduling, submissions, candidate communication, and client update tools.',
    leadEntryHint: 'This helps us map candidate and client intake triggers into a cleaner recruiting workflow.',
    onboardingHint: 'This tells us where recruiter-to-client handoffs and placement ops are still manual.',
    progressHint: 'This shows us where candidate stages, interview status, and client visibility start drifting apart.',
    automationPlaceholder: 'e.g. When a candidate reaches final round, we still coordinate scheduling, reminders, and client updates manually across email and our ATS...',
    futureVisionPlaceholder: 'e.g. Candidate stages stay synced automatically, interview logistics run without chasing, and recruiters spend more time placing than coordinating...',
  },
  'Design/Creative': {
    toolsHint: 'Think briefs, files, feedback, PM, approvals, asset delivery, and invoicing tools.',
    leadEntryHint: 'This helps us see where inquiries should turn into projects without manual admin.',
    onboardingHint: 'This reveals how much of your kickoff and asset setup still depends on memory and back-and-forth.',
    progressHint: 'This tells us where revisions, approvals, and delivery updates fall out of sync.',
    automationPlaceholder: 'e.g. We still create project boards, kickoff docs, folder structures, and feedback loops manually every time a client signs...',
    futureVisionPlaceholder: 'e.g. Projects launch with templates automatically, revisions stay organized, and the team spends more time designing than chasing approvals...',
  },
  'Development': {
    toolsHint: 'Think repos, tickets, QA, docs, deployments, client communication, and monitoring tools.',
    leadEntryHint: 'This shows us where new work or bug requests should enter a structured delivery flow.',
    onboardingHint: 'This tells us how much project setup, access provisioning, and sprint kickoff still depends on manual coordination.',
    progressHint: 'This reveals where delivery visibility breaks between engineering, PM, QA, and clients.',
    automationPlaceholder: 'e.g. New projects still require someone to set up tickets, docs, repos, Slack channels, and client updates manually before dev work starts...',
    futureVisionPlaceholder: 'e.g. Delivery status stays visible automatically, handoffs are clean, and new work spins up from templates without PM overhead...',
  },
  'PR/Communications': {
    toolsHint: 'Think media databases, pitching, approvals, reporting, recaps, and client communication tools.',
    leadEntryHint: 'This helps us map how inquiries, campaign requests, and media opportunities should trigger the next workflow.',
    onboardingHint: 'This shows us where kickoff, approvals, and outreach prep are still being run manually.',
    progressHint: 'This reveals where campaign updates, approvals, and coverage reporting go dark.',
    automationPlaceholder: 'e.g. We still build media lists, coordinate approvals, and turn coverage into client recap reports manually every campaign...',
    futureVisionPlaceholder: 'e.g. Coverage reports build themselves, approvals move faster, and client updates stay proactive without account teams chasing...',
  },
  'E-commerce': {
    toolsHint: 'Think storefront, support, retention, fulfillment, inventory, finance, and reporting tools.',
    leadEntryHint: 'This helps us identify the first trigger for support, retention, or post-purchase automation.',
    onboardingHint: 'This shows us how new wholesale clients, campaigns, or launch work are handed off internally after the sale.',
    progressHint: 'This tells us where launches, customer issues, and cross-team operations become invisible.',
    automationPlaceholder: 'e.g. We still handle launch checklists, order issues, and customer handoffs manually across Shopify, email, and support tools...',
    futureVisionPlaceholder: 'e.g. Launches run from checklists automatically, support and ops stay synced, and the team handles exceptions instead of repetitive store admin...',
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
const REPORT_HANDOFF_KEY = 'opsradar_report_handoff'
const PROCESS_FREQUENCY_OPTIONS = [
  'Multiple times daily',
  'Daily',
  'A few times a week',
  'Weekly',
  'Per new lead/client',
  'Monthly or ad hoc',
]
const PROCESS_OWNER_OPTIONS = [
  'Founder',
  'Sales rep',
  'Account manager',
  'Project manager',
  'Ops/admin',
  'Multiple people',
]
const FAILURE_IMPACT_OPTIONS = [
  'Minor annoyance',
  'Delayed follow-up',
  'Internal handoff breaks',
  'Client delivery gets delayed',
  'Revenue is at risk',
  'Client trust takes a hit',
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
  agencyType: string
  agencyTypeOther: string
  teamSize: string
  revenue: string
  activeClients: string
  tools: string[]
  toolsOther: string
  toolSignals: string[]
  toolSignalsDetail: string
  crmTool: string
  crmDetail: string
  timeHeavyMulti: string[]
  timeHeavyText: string
  leadEntry: string
  leadEntryDetail: string
  onboarding: string[]
  progressTracking: string
  progressTrackingDetail: string
  automationWish: string
  processFrequency: string
  processOwner: string
  failureImpact: string
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

function ChipSingleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/55">
        {label}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                selected
                  ? 'border-primary/60 bg-primary/10 text-on-surface option-selected'
                  : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-outline-variant/40 hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {selected && (
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-secondary align-middle" />
              )}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InsightNote({ text }: { text: string }) {
  return (
    <div
      className="mb-6 rounded-2xl border px-4 py-3.5"
      style={{ background: 'rgba(173,198,255,0.05)', borderColor: 'rgba(173,198,255,0.12)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
        This sharpens your blueprint
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
    agencyType: '',
    agencyTypeOther: '',
    teamSize: '',
    revenue: '',
    activeClients: '',
    tools: [],
    toolsOther: '',
    toolSignals: [],
    toolSignalsDetail: '',
    crmTool: '',
    crmDetail: '',
    timeHeavyMulti: [],
    timeHeavyText: '',
    leadEntry: '',
    leadEntryDetail: '',
    onboarding: [],
    progressTracking: '',
    progressTrackingDetail: '',
    automationWish: '',
    processFrequency: '',
    processOwner: '',
    failureImpact: '',
    futureVision: '',
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
  const needsCrmDetail = answers.crmTool === 'Other'
  const showsLeadEntryDetail = ['Web form', 'Email', 'Referral spreadsheet', 'Other'].includes(answers.leadEntry)
  const requiresLeadEntryDetail = answers.leadEntry === 'Other'
  const needsProgressTrackingDetail = ['Project management tool', 'Other'].includes(answers.progressTracking)

  useEffect(() => {
    const allowedTools = new Set(toolOptions)
    const allowedTimeHeavy = agencyCategory !== 'default'
      ? new Set(TIME_HEAVY_OPTS[agencyCategory] ?? [])
      : null

    setAnswers((prev) => {
      const filteredTools = prev.tools.filter((tool) => allowedTools.has(tool))
      const filteredTimeHeavy = allowedTimeHeavy
        ? prev.timeHeavyMulti.filter((item) => allowedTimeHeavy.has(item))
        : []
      const filteredToolSignals = prev.toolSignals.filter((signal) => toolSignalOptions.includes(signal))

      const hasToolChange = filteredTools.length !== prev.tools.length
      const hasTimeHeavyChange =
        filteredTimeHeavy.length !== prev.timeHeavyMulti.length ||
        filteredTimeHeavy.some((item, index) => item !== prev.timeHeavyMulti[index])
      const hasToolSignalChange =
        filteredToolSignals.length !== prev.toolSignals.length ||
        filteredToolSignals.some((item, index) => item !== prev.toolSignals[index])

      if (!hasToolChange && !hasTimeHeavyChange && !hasToolSignalChange) {
        return prev
      }

      return {
        ...prev,
        tools: filteredTools,
        timeHeavyMulti: filteredTimeHeavy,
        toolSignals: filteredToolSignals,
      }
    })
  }, [agencyCategory, toolOptions, toolSignalOptions])

  const describeWithDetail = (label: string, detail: string): string => {
    const trimmed = detail.trim()
    if (!trimmed) return label
    if (label === 'Other') return trimmed
    return `${label} (${trimmed})`
  }

  const canProceed = (): boolean => {
    const cat = agencyCategory
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
      case 5:
        return !!answers.crmTool && (!needsCrmDetail || answers.crmDetail.trim().length >= 2)
      case 6:
        return cat === 'default'
          ? answers.timeHeavyText.trim().length >= 10
          : answers.timeHeavyMulti.length > 0
      case 7:
        return !!answers.leadEntry && (!requiresLeadEntryDetail || answers.leadEntryDetail.trim().length >= 2)
      case 8:  return answers.onboarding.length > 0
      case 9:
        return !!answers.progressTracking && (!needsProgressTrackingDetail || answers.progressTrackingDetail.trim().length >= 2)
      case 10:
        return (
          answers.automationWish.trim().length >= 20 &&
          !!answers.processFrequency &&
          !!answers.processOwner &&
          !!answers.failureImpact
        )
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
      const cat = agencyCategory
      const timeHeavy = cat === 'default'
        ? answers.timeHeavyText
        : answers.timeHeavyMulti.join(', ')
      const crmToolValue = describeWithDetail(answers.crmTool, answers.crmDetail)
      const leadEntryValue = describeWithDetail(answers.leadEntry, answers.leadEntryDetail)
      const progressTrackingValue = describeWithDetail(answers.progressTracking, answers.progressTrackingDetail)

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
        crmToolValue !== 'None' ? crmToolValue : '',
        needsProgressTrackingDetail ? answers.progressTrackingDetail.trim() : '',
      ]
      const uniqueHandoffTools = [...new Set(handoffTools)].filter((tool) => (
        !!tool &&
        tool !== 'Spreadsheet/Manual' &&
        tool !== 'Project management tool'
      ))

      const res = await fetch('/api/generate-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          company: lead.company,
          websiteUrl: lead.websiteUrl,
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
          crmTool: crmToolValue,
          timeHeavy,
          leadEntry: leadEntryValue,
          onboarding: answers.onboarding.join(', '),
          progressTracking: progressTrackingValue,
          automationWish: answers.automationWish,
          processFrequency: answers.processFrequency,
          processOwner: answers.processOwner,
          failureImpact: answers.failureImpact,
          futureVision: answers.futureVision,
        }),
      })

      const data = await res.json()
      if (!res.ok || (!data.id && !data.audit)) throw new Error(data.error ?? 'Something went wrong')

      const secureAuditId = (
        typeof data.id === 'string' &&
        typeof data.accessToken === 'string' &&
        data.accessToken.trim()
      )
        ? data.id
        : null

      if (secureAuditId) {
        storeAuditAccessToken(secureAuditId, data.accessToken)
      }

      sendFunnelEvent({
        event: 'audit_submitted',
        sessionId: sessionIdRef.current,
        auditId: secureAuditId,
        step: TOTAL_STEPS,
        reportStage: data.audit?.report_stage === 'full' ? 'full' : 'preview',
        metadata: {
          websiteProvided: Boolean(lead.websiteUrl?.trim()),
          toolCount: uniqueHandoffTools.length,
        },
      })

      sessionStorage.setItem(REPORT_HANDOFF_KEY, JSON.stringify({
        auditId: secureAuditId,
        company: lead.company,
        agencyType: answers.agencyType === 'Other' && answers.agencyTypeOther
          ? answers.agencyTypeOther
          : answers.agencyType,
        automationWish: answers.automationWish,
        futureVision: answers.futureVision,
        processFrequency: answers.processFrequency,
        processOwner: answers.processOwner,
        failureImpact: answers.failureImpact,
        toolSignals: [
          ...answers.toolSignals,
          ...(answers.toolSignalsDetail.trim() ? [answers.toolSignalsDetail.trim()] : []),
        ].slice(0, 4),
        websiteUrl: lead.websiteUrl,
        tools: uniqueHandoffTools.slice(0, 6),
        createdAt: Date.now(),
      }))

      if (data.audit) {
        sessionStorage.setItem('opsradar_audit', JSON.stringify(data.audit))
      } else {
        sessionStorage.removeItem('opsradar_audit')
      }

      const dest = secureAuditId
        ? `/results?id=${encodeURIComponent(secureAuditId)}&access=${encodeURIComponent(data.accessToken)}`
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

  const toggleMulti = (field: 'tools' | 'toolSignals' | 'timeHeavyMulti' | 'onboarding') => (value: string) => {
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
                <p className="mt-2 text-xs text-on-surface-variant/50">Name the extra tool so we can factor it into the blueprint.</p>
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
                    Pick the handoffs that feel painfully familiar. This gives the AI better workflow context before it recommends automations.
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

          {/* Step 6 — CRM */}
          {currentStep === 5 && (
            <>
              <StepHeader
                question="Where do deals and client records actually live?"
                hint="Even if it is a spreadsheet, inbox, or messy hybrid, tell us the real source of truth."
              />
              <InsightNote text="This answer changes how we think about lead routing, client handoff, and how much manual cleanup your team is doing before real work can start." />
              <SingleSelect
                options={CRM_OPTIONS}
                value={answers.crmTool}
                onChange={(v) => setAnswers((p) => ({
                  ...p,
                  crmTool: v,
                  crmDetail: v === 'Other' ? p.crmDetail : '',
                }))}
              />
              {needsCrmDetail && (
                <div className="mt-4">
                  <TextInput
                    value={answers.crmDetail}
                    onChange={(v) => setAnswers((p) => ({ ...p, crmDetail: v }))}
                    placeholder="e.g. Attio, Zoho CRM, Close..."
                  />
                </div>
              )}
              {answers.crmTool === 'Spreadsheet/Manual' && (
                <p className="mt-3 text-xs text-[#ffb786]">This is a strong signal that revenue and handoff quality are probably leaking through manual ops.</p>
              )}
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
                  <InsightNote text="We turn these answers into labor-waste math, not vague advice. The more operational and repetitive the task, the more accurate the ROI model gets." />
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
                <InsightNote text="These are usually the places where expensive people are doing low-leverage work. We use this to rank the fastest-return automations first." />
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
              <StepHeader
                question="How do new leads or new work actually enter your system today?"
                hint={agencyCopy.leadEntryHint}
              />
              <InsightNote text="This is often the first trigger in the workflow. If we know how work enters, we can design what should happen instantly afterward." />
              <SingleSelect
                options={LEAD_ENTRY_OPTIONS}
                value={answers.leadEntry}
                onChange={(v) => setAnswers((p) => ({
                  ...p,
                  leadEntry: v,
                  leadEntryDetail: ['Web form', 'Email', 'Referral spreadsheet', 'Other'].includes(v)
                    ? p.leadEntryDetail
                    : '',
                }))}
              />
              {showsLeadEntryDetail && (
                <div className="mt-4">
                  <TextInput
                    value={answers.leadEntryDetail}
                    onChange={(v) => setAnswers((p) => ({ ...p, leadEntryDetail: v }))}
                    placeholder={answers.leadEntry === 'Other'
                      ? 'Describe the source...'
                      : 'Optional: name the source or tool, e.g. Typeform, shared inbox, partner sheet...'}
                  />
                </div>
              )}
              {requiresLeadEntryDetail && answers.leadEntryDetail.trim().length > 0 && answers.leadEntryDetail.trim().length < 2 && (
                <p className="mt-2 text-xs text-on-surface-variant/50">Tell us what that source is so the trigger is not vague.</p>
              )}
            </>
          )}

          {/* Step 9 — Post-close onboarding */}
          {currentStep === 8 && (
            <>
              <StepHeader
                question="What happens after you close a new client?"
                hint={agencyCopy.onboardingHint}
              />
              <InsightNote text="Most agencies think their problem is reporting or project tracking, but the mess often starts right after the sale. This step helps us see the handoff cracks." />
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
              <StepHeader
                question="How do you currently track progress, handoffs, and deadlines?"
                hint={agencyCopy.progressHint}
              />
              <InsightNote text="We use this to understand where updates disappear, where accountability is weak, and whether your team is working from one operating view or six." />
              <SingleSelect
                options={PROGRESS_OPTIONS}
                value={answers.progressTracking}
                onChange={(v) => setAnswers((p) => ({
                  ...p,
                  progressTracking: v,
                  progressTrackingDetail: ['Project management tool', 'Other'].includes(v)
                    ? p.progressTrackingDetail
                    : '',
                }))}
              />
              {needsProgressTrackingDetail && (
                <div className="mt-4">
                  <TextInput
                    value={answers.progressTrackingDetail}
                    onChange={(v) => setAnswers((p) => ({ ...p, progressTrackingDetail: v }))}
                    placeholder={answers.progressTracking === 'Project management tool'
                      ? 'Which one, e.g. Asana, ClickUp, Jira, Linear...'
                      : 'Describe how you track it...'}
                  />
                </div>
              )}
            </>
          )}

          {/* Step 11 — Automation wish */}
          {currentStep === 10 && (
            <>
              <StepHeader
                question="What's the ONE process that, if automated, would save you the most time this month?"
                hint="Give us the process, the volume, the owner, and how painful failure is."
              />
              <InsightNote text="This is the most important answer in the whole form. Name the exact workflow, mention the tools involved, and describe what currently has to be done by hand." />
              <TextArea
                value={answers.automationWish}
                onChange={(v) => setAnswers((p) => ({ ...p, automationWish: v }))}
                placeholder={agencyCopy.automationPlaceholder}
              />
              <div className="mt-6 space-y-5">
                <ChipSingleSelect
                  label="How often does this happen?"
                  options={PROCESS_FREQUENCY_OPTIONS}
                  value={answers.processFrequency}
                  onChange={(v) => setAnswers((p) => ({ ...p, processFrequency: v }))}
                />
                <ChipSingleSelect
                  label="Who feels this pain most directly?"
                  options={PROCESS_OWNER_OPTIONS}
                  value={answers.processOwner}
                  onChange={(v) => setAnswers((p) => ({ ...p, processOwner: v }))}
                />
                <ChipSingleSelect
                  label="What happens when this process slips?"
                  options={FAILURE_IMPACT_OPTIONS}
                  value={answers.failureImpact}
                  onChange={(v) => setAnswers((p) => ({ ...p, failureImpact: v }))}
                />
              </div>
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
              <InsightNote text="We use this to write the roadmap in the language of your business. The clearer your picture of the future, the less generic the strategy feels." />
              <TextArea
                value={answers.futureVision}
                onChange={(v) => setAnswers((p) => ({ ...p, futureVision: v }))}
                placeholder={agencyCopy.futureVisionPlaceholder}
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
