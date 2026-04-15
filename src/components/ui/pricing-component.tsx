'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'


type Plan = {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
}

const ONE_TIME_PLANS: Plan[] = [
  {
    name: 'Starter Build',
    price: '$1,500',
    description: 'One workflow, one pain point, fast fix',
    features: [
      'Single automation workflow',
      'Up to 3 tool integrations',
      'Delivered in 3-5 days',
      'Full documentation',
      '14-day bug-fix window',
      'You own the workflow',
    ],
    cta: 'Start Free Audit',
    highlighted: false,
  },
  {
    name: 'Core Build',
    price: '$2,800',
    description: 'Multi-step system for serious operations',
    features: [
      'Multi-step workflow with branching logic',
      'Up to 6 tool integrations',
      'Delivered in 7-10 days',
      'Error handling + retry logic',
      'Full documentation + Loom walkthrough',
      '30-day bug-fix window',
      'You own the workflow',
    ],
    cta: 'Start Free Audit',
    highlighted: true,
  },
  {
    name: 'Advanced Build',
    price: '$4,500',
    description: 'Full system with AI layer and complex logic',
    features: [
      'Complex multi-workflow system',
      'Unlimited tool integrations',
      'AI/LLM integration layer',
      'Delivered in 14-21 days',
      'Custom error handling + alerts',
      'Full documentation + training session',
      '60-day bug-fix window',
      'You own the workflow',
    ],
    cta: 'Start Free Audit',
    highlighted: false,
  },
]

const MONTHLY_PLANS: Plan[] = [
  {
    name: 'Care',
    price: '$400',
    period: '/month',
    description: 'I monitor it. I fix it if it breaks.',
    features: [
      'Monitoring of all your workflows',
      'Bug fixes within 48 hours',
      'Monthly health report',
      'Email support',
      'Cancel anytime — workflows stay in your account',
    ],
    cta: 'Start Free Audit',
    highlighted: false,
  },
  {
    name: 'Active',
    price: '$800',
    period: '/month',
    description: 'Everything in Care, plus small tweaks as you need them.',
    features: [
      'Everything in Care',
      'Up to 5 hours/month of tweaks and improvements',
      'Bug fixes within 24 hours',
      'Priority email support',
      'Cancel anytime — workflows stay in your account',
    ],
    cta: 'Start Free Audit',
    highlighted: true,
  },
  {
    name: 'Partner',
    price: '$1,500',
    period: '/month',
    description: 'Full operations partner. I become your automation team.',
    features: [
      'Everything in Active',
      '1 new workflow per quarter included',
      'Monthly strategy call',
      'Same-day bug fixes',
      'Priority Slack/WhatsApp support',
      'Direct founder access',
      'Cancel anytime — workflows stay in your account',
    ],
    cta: 'Start Free Audit',
    highlighted: false,
  },
]

const FAQ_ITEMS = [
  {
    q: 'Do I need my own n8n instance?',
    a: 'Yes — and that\u2019s a good thing. You create an n8n Cloud account (about $20/month) or self-host. I build inside your account so you own the workflow forever. If we ever stop working together, the workflow keeps running. You never get locked in.',
  },
  {
    q: 'What if my automation breaks after the bug-fix window?',
    a: 'One-time builds include a bug-fix window (14-60 days). After that, you can switch to a monthly plan for ongoing support or request paid fixes.',
  },
  {
    q: 'Can I start with a one-time build and move to monthly later?',
    a: 'Yes. Most clients start with a Core Build, then move to a monthly plan once they see the value.',
  },
  {
    q: 'Why is this cheaper than agencies charging $10k+?',
    a: 'No middlemen, no sales team, no project managers. You work directly with me (Lawand). Lower overhead = lower prices, same quality.',
  },
  {
    q: 'Is there a contract?',
    a: 'Monthly plans have no contracts. Cancel anytime. One-time builds are paid upfront after scoping.',
  },
]

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
        plan.highlighted
          ? 'border-white/10 bg-white/[0.02] scale-[1.02] shadow-[0_0_60px_rgba(59,130,246,0.08)]'
          : 'border-white/[0.08] hover:border-white/10'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[6px]" />
            <div className="relative px-4 py-1.5 bg-white/[0.03] backdrop-blur-sm rounded-full border border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs font-medium text-white/80">Most Popular</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-medium text-white mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{plan.price}</span>
          {plan.period && (
            <span className="text-sm text-white/40">{plan.period}</span>
          )}
        </div>
        <p className="text-sm text-white/40 mt-4">{plan.description}</p>
      </div>

      <div className="space-y-3 mb-6 flex-1">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2.5">
            <Check className="h-4 w-4 text-white/30 shrink-0" />
            <span className="text-sm text-[rgba(255,255,255,0.65)]">{feature}</span>
          </div>
        ))}
      </div>

      <Link
        href="/audit"
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors text-center block ${
          plan.highlighted
            ? 'bg-white text-black hover:bg-white/90'
            : 'border border-white/10 text-white hover:bg-white/[0.03]'
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  )
}

export default function OpsRadarPricing() {
  return (
    <div className="bg-[#000000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section 1: One-Time Builds */}
        <section className="mb-32">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              One-Time Builds
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              Pay once. Own the workflow.
            </h2>
            <p className="text-lg text-white/40">
              I build it, you keep it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {ONE_TIME_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>

          <p className="text-center text-xs text-white/25 mt-8">
            Take the free audit first — it tells you exactly what to build and which tier fits.
          </p>
        </section>

        {/* Section 2: Monthly Retainers */}
        <section className="mb-32">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              Monthly Retainers
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              I maintain it. You never touch a workflow.
            </h2>
            <p className="text-lg text-white/40">
              You never touch a workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {MONTHLY_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>

          <p className="text-center text-xs text-white/25 mt-8">
            Take the free audit first — it tells you exactly what to build and which tier fits.
          </p>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto mb-28">
          <h2 className="text-2xl font-bold text-white mb-10 text-center tracking-tight">
            Common questions
          </h2>
          <div>
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q}>
                <div className="py-6">
                  <p className="font-semibold text-[14px] text-white/80 mb-2">{q}</p>
                  <p className="text-[13px] text-[rgba(255,255,255,0.65)] leading-[1.7]">{a}</p>
                </div>
                <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Not sure which one fits?
          </h2>
          <p className="text-white/40 mb-8 mx-auto max-w-md">
            Take the free audit first. It tells you exactly what to build, how complex it is, and which tier matches your needs.
          </p>
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-black font-semibold text-[15px] hover:bg-white/90 transition-colors"
          >
            Start Free Audit →
          </Link>
        </section>
      </div>
    </div>
  )
}
