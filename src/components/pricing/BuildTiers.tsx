'use client'

import { useState } from 'react'

import Link from 'next/link'

import {
  ArrowRight,
  BarChart3,
  BellRing,
  Cable,
  CheckCircle2,
  ChevronLeft,
  Mail,
  Sparkles,
  Workflow,
} from 'lucide-react'

import HoneypotField from '<npm>/app/components/HoneypotField'
import { Button } from '<npm>/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '<npm>/components/ui/dialog'
import { Input } from '<npm>/components/ui/input'
import { getAbuseProtectionPayload } from '<npm>/lib/abuse-protection'
import { sendFunnelEvent } from '<npm>/lib/funnel'
import { cn } from '<npm>/lib/utils'

type BuildTier = {
  name: string
  difficulty: string
  price: string
  delivery: string
  color: string
  bg: string
  border: string
  description: string
  examples: string[]
  includes: string[]
  badge?: string
}

const BUILD_TIERS: BuildTier[] = [
  {
    name: 'Quick Win',
    difficulty: 'easy',
    price: '$1,500 – $2,500',
    delivery: '5–7 business days',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)',
    description:
      'A single, well-defined automation with 2–4 connected tools. Perfect for your first automation or a standalone time-saver.',
    examples: [
      'Lead → CRM sync',
      'Slack alert on form submit',
      'Weekly report to email',
      'Invoice generation trigger',
    ],
    includes: [
      'Scoping call',
      'n8n workflow built + tested',
      'Hand-off documentation',
      '14-day bug-fix window',
    ],
  },
  {
    name: 'Core System',
    difficulty: 'medium',
    price: '$2,500 – $4,000',
    delivery: '7–14 business days',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.2)',
    badge: 'Most Popular',
    description:
      'A multi-step workflow connecting 4–7 tools with branching logic, error handling, and data transformation.',
    examples: [
      'Full client onboarding flow',
      'Lead qualification + routing',
      'Multi-channel follow-up sequence',
      'Reporting pipeline',
    ],
    includes: [
      'Everything in Quick Win',
      'Conditional logic + error paths',
      'Hosted on your n8n instance',
      '30-day bug-fix window',
    ],
  },
  {
    name: 'Full Blueprint',
    difficulty: 'complex',
    price: '$4,000 – $7,000',
    delivery: '14–21 business days',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.18)',
    description:
      'An interconnected system of multiple workflows covering an entire operational area — sales, reporting, or client delivery.',
    examples: [
      'End-to-end sales ops system',
      'Full reporting + delivery stack',
      'AI-powered lead enrichment',
      'Custom agency OS',
    ],
    includes: [
      'Everything in Core System',
      'Multi-workflow architecture',
      'AI/LLM integrations',
      '60-day bug-fix window',
      'Ops review call on delivery',
    ],
  },
]

const TOOL_SUGGESTIONS = [
  'HubSpot',
  'Slack',
  'Google Sheets',
  'GoHighLevel',
  'Notion',
  'Stripe',
] as const

const GOAL_OPTIONS = [
  {
    value: 'Sync',
    title: 'Sync',
    description: 'Keep data aligned between your core systems without manual copy-paste.',
    icon: Workflow,
    accent: 'rgba(96,165,250,0.32)',
  },
  {
    value: 'Alert',
    title: 'Alert',
    description: 'Trigger high-signal notifications when revenue or delivery events happen.',
    icon: BellRing,
    accent: 'rgba(45,212,191,0.28)',
  },
  {
    value: 'Report',
    title: 'Report',
    description: 'Ship structured summaries to email, Slack, or dashboards on a schedule.',
    icon: BarChart3,
    accent: 'rgba(167,139,250,0.28)',
  },
] as const

type Goal = (typeof GOAL_OPTIONS)[number]['value']
type Status = 'idle' | 'submitting' | 'success' | 'error'

const gradientButtonStyle = {
  background: 'linear-gradient(135deg, #60a5fa 0%, #7c3aed 55%, #a78bfa 100%)',
}

function QuickWinOnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [primaryTool, setPrimaryTool] = useState('')
  const [goal, setGoal] = useState<Goal | ''>('')
  const [email, setEmail] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [startedAt] = useState(() => Date.now())
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canContinue =
    (step === 0 && primaryTool.trim().length > 0) ||
    (step === 1 && goal.length > 0) ||
    (step === 2 && isEmailValid)

  async function handleFinalSubmit() {
    if (!isEmailValid || !goal || primaryTool.trim().length === 0) {
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    sendFunnelEvent({
      event: 'build_request_submitted',
      source: 'pricing_quick_win',
      metadata: {
        tier: 'Quick Win',
        primaryTool: primaryTool.trim(),
        goal,
      },
    })

    try {
      const response = await fetch('/api/quick-win-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryTool: primaryTool.trim(),
          goal,
          email: email.trim(),
          source: 'pricing_quick_win',
          ...getAbuseProtectionPayload(startedAt, companyWebsite),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to submit your request')
      }

      setStatus('success')
      sendFunnelEvent({
        event: 'build_request_success',
        source: 'pricing_quick_win',
        metadata: {
          tier: 'Quick Win',
          primaryTool: primaryTool.trim(),
          goal,
        },
      })
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-1rem)] overflow-hidden border border-white/10 bg-surface-container-lowest p-0 text-on-surface shadow-[0_40px_120px_rgba(0,0,0,0.65)] sm:max-w-4xl"
      >
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(circle at top left, rgba(96,165,250,0.24), transparent 34%), radial-gradient(circle at 80% 12%, rgba(124,58,237,0.22), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
            }}
          />
          <div className="relative h-[2px] w-full" style={gradientButtonStyle} />

          <div className="grid md:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="relative p-6 md:p-8">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-on-surface-variant transition hover:border-white/20 hover:text-on-surface"
                aria-label="Close Quick Win onboarding"
              >
                <span className="text-lg leading-none">×</span>
              </button>

              <DialogHeader className="max-w-2xl">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick Win Setup
                </div>
                <DialogTitle className="max-w-xl font-headline text-3xl font-bold tracking-tight text-on-surface md:text-[2.35rem] md:leading-[1.02]">
                  Configure your first automation in under a minute.
                </DialogTitle>
                <DialogDescription className="max-w-lg text-sm leading-7 text-on-surface-variant md:text-[15px]">
                  This intake is intentionally lightweight. We use it to scope the first Quick Win,
                  match the right implementation pattern, and follow up with a focused rollout plan.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-7 flex flex-wrap gap-2">
                {['Primary Tool', 'Main Goal', 'Email'].map((label, index) => {
                  const isActive = step === index
                  const isComplete = status === 'success' || step > index

                  return (
                    <div
                      key={label}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors',
                        isActive && 'border-primary/30 bg-primary/[0.12] text-primary',
                        !isActive &&
                          isComplete &&
                          'border-emerald-300/20 bg-emerald-300/[0.10] text-emerald-300',
                        !isActive && !isComplete && 'border-white/10 bg-white/[0.03] text-on-surface-variant'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                          isActive && 'bg-primary/[0.15] text-primary',
                          !isActive && isComplete && 'bg-emerald-300/[0.12] text-emerald-300',
                          !isActive && !isComplete && 'bg-white/[0.04] text-on-surface-variant'
                        )}
                      >
                        {isComplete ? '✓' : index + 1}
                      </span>
                      {label}
                    </div>
                  )
                })}
              </div>

              {status === 'success' ? (
                <div className="mt-8 rounded-[1.75rem] border border-emerald-300/[0.18] bg-emerald-300/[0.08] p-6 md:p-7">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-300">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-headline text-2xl font-bold tracking-tight text-on-surface">
                    Quick Win request received.
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-on-surface-variant md:text-[15px]">
                    We have the core inputs we need. Expect a scoped follow-up around{' '}
                    <span className="text-on-surface">{primaryTool}</span>, focused on a{' '}
                    <span className="text-on-surface">{goal}</span> workflow, sent to{' '}
                    <span className="text-on-surface">{email.trim()}</span>.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.22)] transition hover:opacity-95"
                      style={gradientButtonStyle}
                    >
                      Book a strategy call
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="rounded-full border-white/12 bg-transparent px-5 text-on-surface-variant hover:border-white/20 hover:bg-white/[0.04] hover:text-on-surface"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  {step === 0 && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant/70">
                          Step 1
                        </p>
                        <h3 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-on-surface">
                          What&apos;s the primary tool you want to connect?
                        </h3>
                        <p className="mt-2 max-w-lg text-sm leading-7 text-on-surface-variant">
                          Pick the system that should anchor the workflow. This can be your CRM,
                          reporting source, or the place the trigger already lives.
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/75">
                          Primary Tool
                        </label>
                        <div className="relative">
                          <Cable className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
                          <Input
                            autoFocus
                            value={primaryTool}
                            onChange={(event) => setPrimaryTool(event.target.value)}
                            placeholder="HubSpot, Slack, Google Sheets..."
                            className="h-[52px] rounded-[1rem] border-white/10 bg-surface-container-high pl-11 text-[15px] text-on-surface placeholder:text-on-surface-variant/35 focus-visible:border-primary/30 focus-visible:ring-primary/15"
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {TOOL_SUGGESTIONS.map((tool) => (
                            <button
                              key={tool}
                              type="button"
                              onClick={() => setPrimaryTool(tool)}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-sm transition',
                                primaryTool === tool
                                  ? 'border-primary/25 bg-primary/[0.12] text-primary'
                                  : 'border-white/10 bg-white/[0.03] text-on-surface-variant hover:border-white/20 hover:text-on-surface'
                              )}
                            >
                              {tool}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant/70">
                          Step 2
                        </p>
                        <h3 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-on-surface">
                          What should this automation do first?
                        </h3>
                        <p className="mt-2 max-w-lg text-sm leading-7 text-on-surface-variant">
                          Choose the primary outcome. We&apos;ll use this to shape the implementation
                          path and keep the Quick Win scope tight.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {GOAL_OPTIONS.map((option) => {
                          const Icon = option.icon
                          const isSelected = goal === option.value

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setGoal(option.value)}
                              className={cn(
                                'group relative overflow-hidden rounded-[1.4rem] border p-4 text-left transition',
                                isSelected
                                  ? 'border-primary/30 bg-white/[0.05] shadow-[0_18px_60px_rgba(59,130,246,0.14)]'
                                  : 'border-white/10 bg-white/[0.025] hover:border-white/18 hover:bg-white/[0.04]'
                              )}
                            >
                              <div
                                className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                                style={{
                                  background: isSelected
                                    ? 'linear-gradient(90deg, #60a5fa, #7c3aed, #a78bfa)'
                                    : `linear-gradient(90deg, ${option.accent}, transparent)`,
                                }}
                              />
                              <div
                                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                                style={{ boxShadow: `0 10px 30px ${option.accent}` }}
                              >
                                <Icon className="h-5 w-5 text-on-surface" />
                              </div>
                              <h4 className="mt-4 font-headline text-xl font-semibold tracking-tight text-on-surface">
                                {option.title}
                              </h4>
                              <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                                {option.description}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant/70">
                          Step 3
                        </p>
                        <h3 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-on-surface">
                          Where should we send the Quick Win plan?
                        </h3>
                        <p className="mt-2 max-w-lg text-sm leading-7 text-on-surface-variant">
                          We&apos;ll use this email to send the scoped follow-up and next steps for the
                          first build.
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-primary/[0.14] bg-primary/[0.06] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                          Configuration Summary
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-[1rem] border border-white/10 bg-black/10 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/65">
                              Primary Tool
                            </p>
                            <p className="mt-2 text-[15px] font-semibold text-on-surface">
                              {primaryTool}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-black/10 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/65">
                              Main Goal
                            </p>
                            <p className="mt-2 text-[15px] font-semibold text-on-surface">{goal}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                        <HoneypotField value={companyWebsite} onChange={setCompanyWebsite} />
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/75">
                          Work Email
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
                          <Input
                            autoFocus
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="alex@youragency.com"
                            className="h-[52px] rounded-[1rem] border-white/10 bg-surface-container-high pl-11 text-[15px] text-on-surface placeholder:text-on-surface-variant/35 focus-visible:border-primary/30 focus-visible:ring-primary/15"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'error' && errorMessage && (
                    <p className="mt-4 text-sm text-[#f87171]">{errorMessage}</p>
                  )}

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="inline-flex h-2 w-2 rounded-full bg-secondary" />
                      Delivery window: 5–7 business days
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {step > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep((currentStep) => currentStep - 1)}
                          className="rounded-full border-white/12 bg-transparent px-5 text-on-surface-variant hover:border-white/20 hover:bg-white/[0.04] hover:text-on-surface"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </Button>
                      )}

                      {step < 2 ? (
                        <Button
                          type="button"
                          disabled={!canContinue}
                          onClick={() => setStep((currentStep) => currentStep + 1)}
                          className="rounded-full border-0 px-5 text-white shadow-[0_0_28px_rgba(124,58,237,0.22)]"
                          style={gradientButtonStyle}
                        >
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={!canContinue || status === 'submitting'}
                          onClick={handleFinalSubmit}
                          className="rounded-full border-0 px-5 text-white shadow-[0_0_28px_rgba(124,58,237,0.22)]"
                          style={gradientButtonStyle}
                        >
                          {status === 'submitting' ? 'Sending…' : 'Start Now'}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="relative border-t border-white/8 bg-white/[0.03] p-6 md:border-l md:border-t-0 md:p-7">
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                style={{
                  background:
                    'radial-gradient(circle at top, rgba(96,165,250,0.22), transparent 38%), radial-gradient(circle at 70% 80%, rgba(124,58,237,0.18), transparent 32%)',
                }}
              />
              <div className="relative space-y-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant/70">
                    Configuration
                  </p>
                  <h3 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-on-surface">
                    Quick Win Profile
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    A compact intake tuned for your first high-leverage automation, not a generic
                    contact form.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/60">
                      Tool
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-on-surface">
                      {primaryTool || 'Select your primary system'}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/60">
                      Goal
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-on-surface">
                      {goal || 'Choose the workflow outcome'}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/60">
                      Launch Window
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-on-surface">
                      5–7 business days
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-primary/[0.16] bg-primary/[0.06] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                    What Happens Next
                  </p>
                  <ol className="mt-4 space-y-4">
                    {[
                      'We review the tool + goal pair for the cleanest automation pattern.',
                      'You get a scoped follow-up with implementation guidance and next steps.',
                      'If the fit is right, we move directly into delivery.',
                    ].map((item, index) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-on-surface">
                          0{index + 1}
                        </span>
                        <span className="text-sm leading-7 text-on-surface-variant">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function BuildTiersSection() {
  const [isQuickWinModalOpen, setQuickWinModalOpen] = useState(false)

  function openQuickWinModal() {
    setQuickWinModalOpen(true)
    sendFunnelEvent({
      event: 'build_request_opened',
      source: 'pricing_quick_win',
      metadata: {
        tier: 'Quick Win',
      },
    })
  }

  return (
    <>
      <section>
        <div className="mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[3px] text-secondary">
            One-Time Builds
          </span>
          <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface">
            Build it once, run it forever.
          </h2>
          <p className="mt-2 max-w-lg text-on-surface-variant">
            Fixed price, fixed scope, fixed delivery date. No hourly billing, no scope creep.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {BUILD_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col overflow-hidden rounded-[20px]"
              style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
            >
              {tier.badge && (
                <div
                  className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest"
                  style={{
                    background: `${tier.color}20`,
                    border: `1px solid ${tier.color}40`,
                    color: tier.color,
                  }}
                >
                  {tier.badge}
                </div>
              )}
              <div
                className="h-[2px]"
                style={{ background: `linear-gradient(90deg, ${tier.color}, ${tier.color}00)` }}
              />
              <div className="flex flex-1 flex-col gap-6 p-7">
                <div>
                  <p
                    className="mb-1 text-[10px] font-bold uppercase tracking-[2px]"
                    style={{ color: tier.color }}
                  >
                    {tier.difficulty}
                  </p>
                  <h3 className="font-headline text-[22px] font-bold text-on-surface">
                    {tier.name}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-on-surface-variant">
                    {tier.description}
                  </p>
                </div>

                <div>
                  <p
                    className="font-headline text-[32px] font-extrabold leading-none"
                    style={{ color: tier.color }}
                  >
                    {tier.price}
                  </p>
                  <p className="mt-1 text-[12px] text-on-surface-variant">{tier.delivery}</p>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/40">
                    Examples
                  </p>
                  <ul className="space-y-1.5">
                    {tier.examples.map((example) => (
                      <li
                        key={example}
                        className="flex items-center gap-2 text-[13px] text-on-surface-variant"
                      >
                        <span style={{ color: tier.color }}>→</span> {example}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex-1">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/40">
                    Includes
                  </p>
                  <ul className="space-y-2">
                    {tier.includes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[13px] text-on-surface-variant"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className="mt-[2px] shrink-0"
                          style={{ color: tier.color }}
                        >
                          <circle
                            cx="7"
                            cy="7"
                            r="6"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            fill="currentColor"
                            fillOpacity="0.12"
                          />
                          <path
                            d="M4.5 7l2 2 3-3"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {tier.name === 'Quick Win' ? (
                  <button
                    type="button"
                    onClick={openQuickWinModal}
                    className="block rounded-[12px] border border-white/10 py-3 text-center text-[13px] font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.18)] transition hover:opacity-95"
                    style={gradientButtonStyle}
                  >
                    Start Now →
                  </button>
                ) : (
                  <a
                    href="https://calendly.com/opsradar-ai/ops-radar-strategy-call"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-[12px] py-3 text-center text-[13px] font-bold transition-all"
                    style={{
                      background: `${tier.color}15`,
                      border: `1px solid ${tier.color}35`,
                      color: tier.color,
                    }}
                  >
                    Get a Quote →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isQuickWinModalOpen && <QuickWinOnboardingModal onClose={() => setQuickWinModalOpen(false)} />}
    </>
  )
}
