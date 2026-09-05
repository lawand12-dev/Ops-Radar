/**
 * Pre-computed mapping of legacy KB files → target SKILL.md files.
 *
 * Hand-curated per the conversion-research recommendation: never let the
 * model decide whether to merge across buckets. Each entry consolidates
 * 1-5 source files into one skill. All source paths verified to exist.
 *
 * Target: 33 new skills bringing the total catalog from 10 → 43.
 */

export type SkillCluster = {
  name: string
  domain:
    | 'agency-ops'
    | 'revenue'
    | 'profitability'
    | 'delivery'
    | 'client-comms'
    | 'integrations'
    | 'coo-briefings'
    | 'agency-types'
    | 'benchmarks'
  sourceFiles: string[]
  voiceExamples: string[]
  extraGuidance?: string
}

const VOICE_OPS_DECISIONAL = [
  'agency-ops/notion-brain-schema/SKILL.md',
  'profitability/flagging-margin-erosion/SKILL.md',
]
const VOICE_CONVERSATION = [
  'client-comms/firing-a-client/SKILL.md',
  'client-comms/raising-retainer-prices/SKILL.md',
]
const VOICE_BRIEFING = [
  'coo-briefings/composing-weekly-briefing/SKILL.md',
  'revenue/projecting-cash-runway/SKILL.md',
]
const VOICE_DETECTOR = [
  'delivery/detecting-scope-creep/SKILL.md',
  'profitability/flagging-margin-erosion/SKILL.md',
]

export const CLUSTERS: SkillCluster[] = [
  // ─── Integrations (10 skills — agency-deep dives, not API docs) ─────────
  // The 10 integrations/* files already have agency-shaped frontmatter
  // (coo_relevance: 4, category: integrations). These are the highest-
  // quality source material — closest to skill-shape already.
  {
    name: 'using-stripe',
    domain: 'integrations',
    sourceFiles: ['integrations/stripe.md', 'tools/api-stripe.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
    extraGuidance:
      'Focus on agency-owner concerns: charges, invoices, refunds, subscription renewals, dispute handling, idempotency for retries. Drop platform/Connect material.',
  },
  {
    name: 'using-hubspot',
    domain: 'integrations',
    sourceFiles: ['integrations/hubspot.md', 'tools/api-hubspot.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
    extraGuidance:
      'Focus on Deal lifecycle, Contact/Company records, sequences, renewal-driven workflows. Drop generic CRM ontology.',
  },
  {
    name: 'using-clickup',
    domain: 'integrations',
    sourceFiles: ['integrations/clickup.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-asana',
    domain: 'integrations',
    sourceFiles: ['integrations/asana.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-monday',
    domain: 'integrations',
    sourceFiles: ['integrations/monday.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-harvest',
    domain: 'integrations',
    sourceFiles: ['integrations/harvest.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-toggl',
    domain: 'integrations',
    sourceFiles: ['integrations/toggl.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-apollo',
    domain: 'integrations',
    sourceFiles: ['integrations/apollo.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-calendly',
    domain: 'integrations',
    sourceFiles: ['integrations/calendly.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'using-pipedrive',
    domain: 'integrations',
    sourceFiles: ['integrations/pipedrive.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },

  // ─── Revenue (4 skills) ─────────────────────────────────────────────────
  {
    name: 'monitoring-client-health-score',
    domain: 'revenue',
    sourceFiles: [
      'patterns/workflow-client-health-score.md',
      'patterns/workflow-churn-detection.md',
    ],
    voiceExamples: VOICE_DETECTOR,
  },
  {
    name: 'spotting-upsell-windows',
    domain: 'revenue',
    sourceFiles: ['patterns/workflow-upsell-detection.md'],
    voiceExamples: VOICE_DETECTOR,
  },
  {
    name: 'managing-retainer-invoicing',
    domain: 'revenue',
    sourceFiles: [
      'patterns/workflow-invoicing-retainer.md',
      'patterns/workflow-invoicing-performance.md',
    ],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'routing-leads-by-fit',
    domain: 'revenue',
    sourceFiles: [
      'patterns/workflow-lead-routing-source.md',
      'patterns/workflow-lead-routing-budget.md',
      'patterns/workflow-lead-routing-service.md',
    ],
    voiceExamples: VOICE_OPS_DECISIONAL,
    extraGuidance:
      'Three source files cover the same job (routing) with different routing dimensions. Consolidate into ONE skill that explains the unified routing logic.',
  },

  // ─── Profitability (3 skills) ───────────────────────────────────────────
  {
    name: 'tracking-team-capacity',
    domain: 'profitability',
    sourceFiles: ['patterns/workflow-capacity-planning.md', 'playbooks/capacity-planning.md'],
    voiceExamples: VOICE_DETECTOR,
  },
  {
    name: 'tracking-billable-time',
    domain: 'profitability',
    sourceFiles: ['patterns/workflow-time-tracking.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'handling-cash-flow-crunch',
    domain: 'profitability',
    sourceFiles: ['playbooks/cash-flow-recovery.md', 'agency-profiles/cash-flow-patterns.md'],
    voiceExamples: VOICE_BRIEFING,
    extraGuidance:
      'The "Friday-payroll panic" playbook. Three levers (accelerate AR / slow AP / raise capital) with exact scripts and decision criteria.',
  },

  // ─── Delivery (4 skills) ────────────────────────────────────────────────
  {
    name: 'monitoring-project-status',
    domain: 'delivery',
    sourceFiles: ['patterns/workflow-project-status.md'],
    voiceExamples: VOICE_DETECTOR,
  },
  {
    name: 'preparing-status-calls',
    domain: 'delivery',
    sourceFiles: ['patterns/workflow-reporting-paid-media.md', 'patterns/workflow-reporting-seo.md', 'patterns/workflow-reporting-full-service.md'],
    voiceExamples: VOICE_CONVERSATION,
    extraGuidance:
      'Three reporting variants by service line. Consolidate into ONE skill that explains how to prep a client status call across paid media / SEO / full-service work.',
  },
  {
    name: 'following-up-on-meetings',
    domain: 'delivery',
    sourceFiles: ['patterns/workflow-meeting-followup.md'],
    voiceExamples: VOICE_CONVERSATION,
  },
  {
    name: 'distributing-content',
    domain: 'delivery',
    sourceFiles: ['patterns/workflow-content-distribution.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },

  // ─── Client comms (5 skills) ────────────────────────────────────────────
  {
    name: 'onboarding-new-clients',
    domain: 'client-comms',
    sourceFiles: [
      'patterns/workflow-onboarding-paid-media.md',
      'patterns/workflow-onboarding-seo.md',
      'patterns/research-41-client-onboarding-workflow-blueprints.md',
      'playbooks/onboarding-excellence.md',
    ],
    voiceExamples: VOICE_CONVERSATION,
    extraGuidance:
      'Four source files cover client onboarding across service lines + the playbook. Consolidate into ONE high-value onboarding skill.',
  },
  {
    name: 'generating-proposals',
    domain: 'client-comms',
    sourceFiles: ['patterns/workflow-proposal-generation.md'],
    voiceExamples: VOICE_CONVERSATION,
  },
  {
    name: 'diagnosing-difficult-clients',
    domain: 'client-comms',
    sourceFiles: ['playbooks/difficult-client-diagnostic.md'],
    voiceExamples: VOICE_CONVERSATION,
  },
  {
    name: 'discussing-margin-with-client',
    domain: 'client-comms',
    sourceFiles: ['playbooks/client-conversation-margin-alert.md'],
    voiceExamples: VOICE_CONVERSATION,
  },
  {
    name: 'discussing-scope-with-client',
    domain: 'client-comms',
    sourceFiles: ['playbooks/client-conversation-scope-creep.md'],
    voiceExamples: VOICE_CONVERSATION,
  },

  // ─── COO briefings + ops (2 skills) ─────────────────────────────────────
  {
    name: 'tuning-autonomy-policies',
    domain: 'coo-briefings',
    sourceFiles: [
      'patterns/approval-money-touching.md',
      'patterns/approval-client-facing-actions.md',
      'patterns/approval-bulk-actions.md',
      'patterns/approval-data-deletion.md',
      'patterns/approval-human-decision-framework.md',
    ],
    voiceExamples: VOICE_BRIEFING,
    extraGuidance:
      'The 5 approval files consolidate into ONE skill on tuning per-tool autonomy policies (Ask / Auto / Off). Explains when to flip each toolkit and how to recover when auto-mode misfires.',
  },
  {
    name: 'composing-slack-digest',
    domain: 'coo-briefings',
    sourceFiles: ['patterns/workflow-slack-digest.md'],
    voiceExamples: VOICE_BRIEFING,
  },

  // ─── Agency types (3 skills) ────────────────────────────────────────────
  {
    name: 'serving-marketing-agencies',
    domain: 'agency-types',
    sourceFiles: [
      'benchmarks/research-21-marketing-agency-operational-trends-2025-2026.md',
      'benchmarks/research-24-saas-focused-marketing-agencies-vs-traditional-marketing-agencies.md',
    ],
    voiceExamples: VOICE_OPS_DECISIONAL,
    extraGuidance:
      'How OpsRadar serves marketing agencies specifically — what they care about (CAC payback, ad spend efficiency, client churn lag), what they ignore.',
  },
  {
    name: 'serving-recruiting-agencies',
    domain: 'agency-types',
    sourceFiles: ['benchmarks/research-22-recruiting-agency-operational-trends-2025-2026.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },
  {
    name: 'serving-design-agencies',
    domain: 'agency-types',
    sourceFiles: ['benchmarks/research-23-design-and-creative-agency-operational-trends-2025-2026.md'],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },

  // ─── Benchmarks (2 reference skills) ────────────────────────────────────
  {
    name: 'looking-up-cost-benchmarks',
    domain: 'benchmarks',
    sourceFiles: [
      'benchmarks/research-04-agency-role-internal-hourly-cost-benchmarks-by-market.md',
      'benchmarks/research-08-revenue-per-employee-benchmarks-for-agencies.md',
      'benchmarks/research-01-agency-operations-benchmarks-for-marketing-recruiting-and-design-agencies.md',
    ],
    voiceExamples: VOICE_OPS_DECISIONAL,
    extraGuidance:
      'Reference skill — the agent calls this when it needs a number to cite (loaded hourly cost, revenue per employee). Returns benchmarks by agency type and market.',
  },
  {
    name: 'looking-up-time-benchmarks',
    domain: 'benchmarks',
    sourceFiles: [
      'benchmarks/research-05-hours-wasted-on-manual-work-by-operational-function-and-agency-size.md',
      'benchmarks/research-06-cognitive-cost-of-context-switching-in-knowledge-work.md',
      'benchmarks/research-29-agency-tool-stack-evolution-by-revenue-level.md',
    ],
    voiceExamples: VOICE_OPS_DECISIONAL,
  },

  // ─── Agency-ops core (3 skills) ─────────────────────────────────────────
  {
    name: 'recovering-from-integration-failure',
    domain: 'agency-ops',
    sourceFiles: [
      'failures/oauth-refresh-failures.md',
      'failures/rate-limit-recovery.md',
      'failures/webhook-reliability.md',
      'failures/data-sync-drift.md',
    ],
    voiceExamples: VOICE_DETECTOR,
    extraGuidance:
      'The trust-event skill. When an integration breaks (OAuth expired, rate limit, webhook missed, data drift), the agent surfaces a "we caught it, here is the recovery" message rather than failing silently.',
  },
  {
    name: 'analyzing-retainer-vs-project-mix',
    domain: 'agency-ops',
    sourceFiles: [
      'agency-profiles/retainer-vs-project.md',
      'agency-profiles/client-tier-patterns.md',
    ],
    voiceExamples: VOICE_OPS_DECISIONAL,
    extraGuidance:
      'How to think about the right mix of retainer revenue vs project revenue, by agency stage. Cite explicit thresholds.',
  },
  {
    name: 'identifying-burnout-risks',
    domain: 'agency-ops',
    sourceFiles: [
      'agency-profiles/research-26-agency-owner-and-employee-burnout-operational-causes-and-interventions.md',
    ],
    voiceExamples: VOICE_DETECTOR,
    extraGuidance:
      'When the agent should flag burnout risk to the founder — both their own and team members. Specific signals + named thresholds.',
  },
]
