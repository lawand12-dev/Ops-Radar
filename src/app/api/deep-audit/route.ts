import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { type SupabaseClient } from '@supabase/supabase-js'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../lib/supabase-server'
import {
  retrieveRelevantKnowledge,
  formatKnowledgeContext,
} from '../../../lib/knowledge-retrieval'
import { AUDIT_2_SYSTEM_PROMPT } from '../../../lib/audit-2-system-prompt'

const schema = z.object({
  // Section 1: Agency Overview
  agency_name: z.string().min(1),
  agency_type: z.string().min(1),
  years_in_business: z.string().min(1),
  client_count: z.string().min(1),
  // Section 2: Tech Stack
  project_management_tool: z.string().min(1),
  crm_tool: z.string().min(1),
  communication_tool: z.string().min(1),
  invoicing_tool: z.string().min(1),
  // Section 3: Operations & Workflows
  onboarding_process: z.string().min(1),
  reporting_process: z.string().min(1),
  delivery_workflow: z.string().min(1),
  handoff_process: z.string().min(1),
  // Section 4: Revenue & Growth
  monthly_revenue: z.string().min(1),
  revenue_model: z.string().min(1),
  biggest_revenue_blocker: z.string().min(1),
  churn_rate: z.string().min(1),
  // Section 5: Team & Capacity
  team_size: z.string().min(1),
  contractor_usage: z.string().min(1),
  biggest_capacity_issue: z.string().min(1),
  hiring_plans: z.string().min(1),
  // Section 6: Pain Points
  top_manual_task: z.string().min(1),
  automation_wish: z.string().min(1),
  biggest_operational_pain: z.string().min(1),
  tool_frustrations: z.string().min(1),
  // Section 7: Vision & Goals
  six_month_goal: z.string().min(1),
  ideal_outcome: z.string().min(1),
  previous_automation_attempts: z.string().min(1),
  budget_for_automation: z.string().min(1),
})

type DeepAuditInput = z.infer<typeof schema>

function buildUserContent(input: DeepAuditInput, knowledgeContext: string): string {
  const answers = [
    '=== SECTION 1: AGENCY OVERVIEW ===',
    `Agency Name: ${input.agency_name}`,
    `Agency Type: ${input.agency_type}`,
    `Years in Business: ${input.years_in_business}`,
    `Active Client Count: ${input.client_count}`,
    '',
    '=== SECTION 2: TECH STACK ===',
    `Project Management Tool: ${input.project_management_tool}`,
    `CRM / Client Management: ${input.crm_tool}`,
    `Team Communication: ${input.communication_tool}`,
    `Invoicing / Accounting: ${input.invoicing_tool}`,
    '',
    '=== SECTION 3: OPERATIONS & WORKFLOWS ===',
    `Client Onboarding Process: ${input.onboarding_process}`,
    `Reporting Process: ${input.reporting_process}`,
    `Work Delivery Workflow: ${input.delivery_workflow}`,
    `Internal Handoff Process: ${input.handoff_process}`,
    '',
    '=== SECTION 4: REVENUE & GROWTH ===',
    `Monthly Revenue Range: ${input.monthly_revenue}`,
    `Revenue Model: ${input.revenue_model}`,
    `Biggest Revenue Blocker: ${input.biggest_revenue_blocker}`,
    `Client Churn Rate: ${input.churn_rate}`,
    '',
    '=== SECTION 5: TEAM & CAPACITY ===',
    `Full-Time Team Size: ${input.team_size}`,
    `Contractor / Freelancer Usage: ${input.contractor_usage}`,
    `Biggest Capacity Issue: ${input.biggest_capacity_issue}`,
    `Hiring Plans (next 6 months): ${input.hiring_plans}`,
    '',
    '=== SECTION 6: PAIN POINTS & BOTTLENECKS ===',
    `Most Time-Consuming Manual Task: ${input.top_manual_task}`,
    `Automation Wish (if one thing): ${input.automation_wish}`,
    `Biggest Operational Pain: ${input.biggest_operational_pain}`,
    `Tool Frustrations: ${input.tool_frustrations}`,
    '',
    '=== SECTION 7: VISION & GOALS ===',
    `6-Month Goal: ${input.six_month_goal}`,
    `12-Month Ideal Outcome: ${input.ideal_outcome}`,
    `Previous Automation Attempts: ${input.previous_automation_attempts}`,
    `Budget for Automation / Tooling: ${input.budget_for_automation}`,
  ].join('\n')

  if (knowledgeContext) {
    return `${answers}\n\n---\n\n${knowledgeContext}`
  }
  return answers
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const input = parsed.data

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  // Retrieve relevant wiki pages for this agency's pain points
  const knowledgeChunks = await retrieveRelevantKnowledge(
    `${input.top_manual_task} ${input.automation_wish} ${input.biggest_operational_pain}`,
    8,
    { agencyType: input.agency_type, automationWish: input.automation_wish },
  )
  const knowledgeContext = formatKnowledgeContext(knowledgeChunks)

  const systemPrompt = AUDIT_2_SYSTEM_PROMPT
  const userContent = buildUserContent(input, knowledgeContext)

  let rawText: string
  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })
    const block = message.content[0]
    if (!block || block.type !== 'text') {
      return Response.json({ error: 'Unexpected response format from Claude' }, { status: 502 })
    }
    rawText = block.text
  } catch (err) {
    console.error('[deep-audit] Anthropic call failed:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Claude API error' },
      { status: 502 },
    )
  }

  let brief: Record<string, unknown>
  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    brief = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    console.error('[deep-audit] Failed to parse Claude JSON output:', rawText.slice(0, 500))
    return Response.json(
      { error: 'Claude returned non-JSON output', raw: rawText.slice(0, 2000) },
      { status: 502 },
    )
  }

  const confidenceScore =
    typeof brief.confidence_score === 'number'
      ? Math.max(0, Math.min(100, Math.round(brief.confidence_score)))
      : 0
  const gaps = Array.isArray(brief.gaps) ? brief.gaps : []

  if (hasServerSupabaseClient()) {
    try {
      const supabase = getServerSupabaseClient() as unknown as SupabaseClient
      const { error: insertError } = await supabase
        .from('deep_audit_briefs')
        .insert({
          agency_name: input.agency_name,
          answers: input,
          brief,
          system_prompt_for_claude: systemPrompt,
          confidence_score: confidenceScore,
          gaps,
        })
      if (insertError) {
        console.error('[deep-audit] Supabase insert failed:', insertError.message)
      }
    } catch (err) {
      console.error('[deep-audit] Supabase insert threw:', err)
    }
  }

  return Response.json({ brief, confidence_score: confidenceScore, gaps })
}
