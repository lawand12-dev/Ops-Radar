import type { ResponseFormatJSONSchema } from 'openai/resources/shared'

type AuditResponseStage = 'preview' | 'full'

const nullableString = {
  anyOf: [{ type: 'string' }, { type: 'null' }],
}

const nullableNumber = {
  anyOf: [{ type: 'number' }, { type: 'null' }],
}

const verdictSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    headline: { type: 'string' },
    subline: { type: 'string' },
    stakes: { type: 'string' },
    identity: {
      type: 'string',
      enum: ['Manual Chaos', 'Reactive Ops', 'Standardized', 'Compounding'],
    },
    identity_line: { type: 'string' },
  },
  required: ['headline', 'subline', 'stakes', 'identity', 'identity_line'],
}

const patternMatchSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: true,
      properties: {
        observed_in: nullableString,
        source_file: nullableString,
        similarity_note: nullableString,
      },
      required: ['observed_in', 'source_file', 'similarity_note'],
    },
    { type: 'null' },
  ],
}

const opportunitySchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    rank: { type: 'number' },
    title: { type: 'string' },
    hard_truth: { type: 'string' },
    hours_saved_weekly: { type: 'number' },
    monthly_savings: { type: 'number' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'complex'] },
    quick_win: { type: 'boolean' },
    confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
    urgency_reason: { type: 'string' },
    pattern_match: patternMatchSchema,
  },
  required: [
    'rank',
    'title',
    'hard_truth',
    'hours_saved_weekly',
    'monthly_savings',
    'difficulty',
    'quick_win',
    'urgency_reason',
  ],
}

const laborArbitrageSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    estimated_hourly_rate: { type: 'number' },
    hours_wasted_on_low_value_weekly: { type: 'number' },
    annual_labor_waste: { type: 'number' },
    explanation: { type: 'string' },
  },
  required: [
    'estimated_hourly_rate',
    'hours_wasted_on_low_value_weekly',
    'annual_labor_waste',
    'explanation',
  ],
}

const fullAuditSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    verdict: verdictSchema,
    executive_summary: { type: 'string' },
    polished_pain_statement: { type: 'string' },
    polished_business_consequence: { type: 'string' },
    estimated_monthly_waste: { type: 'number' },
    estimated_annual_waste: { type: 'number' },
    automation_readiness_score: { type: 'number', minimum: 1, maximum: 100 },
    labor_arbitrage_breakdown: laborArbitrageSchema,
    context_switching_analysis: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: true,
          properties: {
            tools_count: { type: 'number' },
            estimated_daily_switches: { type: 'number' },
            time_lost_daily_minutes: { type: 'number' },
            annual_cost: { type: 'number' },
          },
        },
        { type: 'null' },
      ],
    },
    opportunities: {
      type: 'array',
      minItems: 1,
      items: opportunitySchema,
    },
    benchmarks: { type: 'object', additionalProperties: true },
    onboarding_assessment: {
      anyOf: [
        { type: 'object', additionalProperties: true },
        { type: 'null' },
      ],
    },
  },
  required: [
    'executive_summary',
    'estimated_monthly_waste',
    'estimated_annual_waste',
    'automation_readiness_score',
    'opportunities',
  ],
}

const previewAuditSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    executive_summary: { type: 'string' },
    estimated_monthly_waste: { type: 'number' },
    estimated_annual_waste: { type: 'number' },
    automation_readiness_score: { type: 'number', minimum: 1, maximum: 100 },
    summary: {
      type: 'object',
      additionalProperties: true,
      properties: {
        total_hours_saved_weekly: { type: 'number' },
        total_annual_cost_savings: { type: 'number' },
        automation_readiness_score: { type: 'number' },
        headline: { type: 'string' },
      },
    },
    opportunities: {
      type: 'array',
      minItems: 1,
      items: opportunitySchema,
    },
    preview_notice: nullableString,
    estimated_labor_cost: nullableNumber,
  },
  required: [
    'executive_summary',
    'estimated_monthly_waste',
    'estimated_annual_waste',
    'automation_readiness_score',
    'summary',
    'opportunities',
  ],
}

export function getAuditResponseFormat(stage: AuditResponseStage): ResponseFormatJSONSchema {
  const isFull = stage === 'full'
  return {
    type: 'json_schema',
    json_schema: {
      name: isFull ? 'opsradar_full_audit' : 'opsradar_preview_audit',
      description: isFull
        ? 'Structured OpsRadar full automation audit report.'
        : 'Structured OpsRadar preview automation audit report.',
      strict: false,
      schema: isFull ? fullAuditSchema : previewAuditSchema,
    },
  }
}
