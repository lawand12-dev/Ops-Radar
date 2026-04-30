'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants'


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
    price: '$3,500',
    description: 'Typically replaces 5-8 hours/week of manual work \u2014 pays back in roughly 6-10 weeks.',
    features: [
      'Single automation workflow',
      'Up to 3 tool integrations',
      'Delivered in 5-7 business days',
      'Full documentation',
      '30-day bug-fix window',
      'You own the workflow',
    ],
    cta: 'Book a free 20-min call',
    highlighted: false,
  },
  {
    name: 'Core Build',
    price: '$7,500',
    description: 'Replaces the routine work of a $2,000/month ops hire. At those numbers it should pay back in roughly 6 weeks.',
    features: [
      'Multi-step workflow with branching logic',
      'Up to 6 tool integrations',
      'Delivered in 7-10 days',
      'Error handling + retry logic',
      'Full documentation + Loom walkthrough',
      '30-day bug-fix window',
      'You own the workflow',
    ],
    cta: 'Book a free 20-min call',
    highlighted: false,
  },
  {
    name: 'Advanced Build',
    price: '$9,500',
    description: 'Replaces an entire ops layer \u2014 multiple processes, AI integration, custom error handling. For agencies running complex multi-tool stacks.',
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
    cta: 'Book a free 20-min call',
    highlighted: false,
  },
]

const MONTHLY_PLANS: Plan[] = [
  {
    name: 'Care',
    price: '$750',
    period: '/month',
    description: 'After your build is delivered, our team monitors your workflow and fixes it if it breaks.',
    features: [
      'Monitoring of all your workflows',
      'Bug fixes within 24 hours',
      'Monthly health report',
      'Email support',
      '10% discount on any new builds',
      'Cancel anytime — workflows stay in your account',
    ],
    cta: 'Book a free 20-min call',
    highlighted: false,
  },
  {
    name: 'Active',
    price: '$1,500',
    period: '/month',
    description: 'Everything in Care, plus small tweaks and improvements as you ask. Up to 5 hours of team time per month.',
    features: [
      'Everything in Care',
      'Up to 5 hours/month of tweaks and improvements',
      'Bug fixes within 24 hours',
      'Priority email support',
      'Cancel anytime — workflows stay in your account',
    ],
    cta: 'Book a free 20-min call',
    highlighted: false,
  },
  {
    name: 'Partner',
    price: '$3,000',
    period: '/month',
    description: 'Everything in Active, plus 1 new workflow per quarter is included in the price. Anything beyond that is a separate build.',
    features: [
      'Everything in Active',
      '1 new workflow per quarter included',
      'Monthly strategy call',
      'Same-day bug fixes',
      'Priority Slack/WhatsApp support',
      'Direct OpsRadar team access',
      'Cancel anytime — workflows stay in your account',
    ],
    cta: 'Book a free 20-min call',
    highlighted: false,
  },
]

const FAQ_ITEMS = [
  {
    q: 'Is an n8n instance required?',
    a: 'Yes — and that\u2019s a good thing. You create an n8n Cloud account (about $20/month) or self-host. We build inside your account so you own the workflow forever. If we ever stop working together, the workflow keeps running. You never get locked in.',
  },
  {
    q: 'Can\u2019t we just build this ourselves?',
    a: 'You can. Most agencies that try to build this in-house end up spending hundreds of hours a year on it \u2014 developer time that was supposed to be billable client work. We\u2019ve built and tested 30+ agency workflows end-to-end. You\u2019re paying for experience that avoids the expensive mistakes. If you want to try it yourself first, take the free audit and build from our recommendations. No hard feelings.',
  },
  {
    q: 'What happens if OpsRadar disappears?',
    a: 'The workflow lives in your n8n account, not ours. If our team vanished tomorrow, your automation keeps running. Your team can edit it. Another automation consultant can take it over. That\u2019s the whole reason we build in n8n instead of a proprietary SaaS — there\u2019s no lock-in to us or to anyone.',
  },
  {
    q: 'What if my automation breaks after the bug-fix window?',
    a: 'One-time builds include a bug-fix window (30\u201360 days). After that, you can switch to a monthly plan for ongoing support or request paid fixes.',
  },
  {
    q: 'Can a one-time build move to monthly later?',
    a: 'Yes. Our recommendation is to start with a Core Build, then move to a monthly plan once you see the value from the first workflow.',
  },
  {
    q: 'Is there a contract?',
    a: 'Monthly plans have no contracts. Cancel anytime. One-time builds are paid 50% upfront after scoping, 50% on delivery.',
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

      <a
        href={CALENDLY_STRATEGY_CALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors text-center block ${
          plan.highlighted
            ? 'bg-white text-black hover:bg-white/90'
            : 'border border-white/10 text-white hover:bg-white/[0.03]'
        }`}
      >
        {plan.cta}
      </a>
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
              We build it, you keep it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {ONE_TIME_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>

          <p className="text-center text-xs text-white/25 mt-8">
            Book a 20-min call — we&apos;ll tell you which tier actually fits before you commit.
          </p>
        </section>

        {/* Section 2: Monthly Retainers */}
        <section className="mb-32">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              Monthly Retainers
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              We maintain it. You never touch a workflow.
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto mb-6">
              Monthly retainers are for ongoing care of a workflow we&apos;ve already built for you. They begin after delivery and don&apos;t include new builds — except where noted. New builds are scoped and priced separately using the build tiers above.
            </p>
            <p className="text-[13px] text-white/30 max-w-2xl mx-auto leading-relaxed">
              For context: hiring an ops coordinator costs $5,500–$9,500/month fully loaded. A Zapier or Make retainer typically runs $500–$2,000/month and gets more expensive as your workflow volume scales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {MONTHLY_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>

          <p className="text-center text-xs text-white/25 mt-8">
            Book a 20-min call — we&apos;ll tell you which tier actually fits before you commit.
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
            Book a 20-min call — we&apos;ll tell you what to build, how complex it is, and which tier fits.
          </p>
          <a
            href={CALENDLY_STRATEGY_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-black font-semibold text-[15px] hover:bg-white/90 transition-colors"
          >
            Book a free 20-min call →
          </a>
          <div className="mt-4">
            <Link
              href="/audit"
              className="text-[13px] text-white/55 hover:text-white/85 transition-colors underline decoration-white/20 hover:decoration-white/60 underline-offset-4"
            >
              Or run a 3-minute self-serve audit
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
