// src/lib/vip-blueprint-prompt.ts

import Anthropic from '@anthropic-ai/sdk'

export type TeamMember = { name: string; role: string; dailyWork: string }
export type Tool = { name: string; dataHeld: string; connections: string; manualBridge: boolean }
export type ManualTask = { task: string; hoursPerWeek: number; annualCost: number }
export type WorkflowStep = { step: string; tool: string; owner: string; breakPoint: string | null }
export type WorkflowMap = { name: string; steps: WorkflowStep[] }
export type FailureMode = { failure: string; frequency: string; impact: string; prevention: string }
export type ApprovalRule = { item: string; approver: string }
export type RoadmapItem = {
  rank: number
  workflow: string
  rationale: string
  buildTime: string
  expectedRoi: string
}

export type BlueprintData = {
  agencyName: string
  date: string
  executiveSummary: string
  annualWaste: number
  top3Opportunities: [string, string, string]
  companyDetails: string
  teamMembers: TeamMember[]
  toolStack: Tool[]
  manualTasks: ManualTask[]
  totalAnnualWaste: number
  workflows: [WorkflowMap, WorkflowMap, WorkflowMap]
  failureModes: FailureMode[]
  approvalRules: ApprovalRule[]
  neverAutomate: string[]
  roadmap: RoadmapItem[]
  investment: string
  firstBuild: string
  timeline: string
  howToProceed: string
}

const client = new Anthropic()

export async function generateBlueprintData(
  agencyName: string,
  layer1Answers: Record<string, unknown>,
  consultantFields: Record<string, string>,
  knowledgeContext: string,
): Promise<BlueprintData> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const systemPrompt = `You are an expert agency automation consultant writing a premium VIP Automation Blueprint.
Analyze the discovery data and return a single JSON object.
Return ONLY valid JSON — no markdown fences, no explanation, no preamble.
Use specific names, tools, and numbers from the data. If data is missing, make a reasonable inference.
Ensure "workflows" always has exactly 3 items and "top3Opportunities" always has exactly 3 strings.`

  const userContent = `Agency: ${agencyName}

DISCOVERY ANSWERS:
${JSON.stringify(layer1Answers, null, 2)}

CONSULTANT NOTES:
${JSON.stringify(consultantFields, null, 2)}

KNOWLEDGE BASE CONTEXT:
${knowledgeContext}

Return a JSON object with these exact top-level keys:
{
  "agencyName": "${agencyName}",
  "date": "${today}",
  "executiveSummary": "3-4 sentence overview of the agency's automation opportunity",
  "annualWaste": 0,
  "top3Opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "companyDetails": "Overview paragraph of the company",
  "teamMembers": [{ "name": "", "role": "", "dailyWork": "" }],
  "toolStack": [{ "name": "", "dataHeld": "", "connections": "", "manualBridge": false }],
  "manualTasks": [{ "task": "", "hoursPerWeek": 0, "annualCost": 0 }],
  "totalAnnualWaste": 0,
  "workflows": [
    { "name": "Workflow 1 name", "steps": [{ "step": "", "tool": "", "owner": "", "breakPoint": null }] },
    { "name": "Workflow 2 name", "steps": [] },
    { "name": "Workflow 3 name", "steps": [] }
  ],
  "failureModes": [{ "failure": "", "frequency": "", "impact": "", "prevention": "" }],
  "approvalRules": [{ "item": "", "approver": "" }],
  "neverAutomate": ["item 1", "item 2"],
  "roadmap": [{ "rank": 1, "workflow": "", "rationale": "", "buildTime": "", "expectedRoi": "" }],
  "investment": "$X,XXX/month",
  "firstBuild": "Description of what gets built first",
  "timeline": "X weeks",
  "howToProceed": "Next steps paragraph"
}`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  const parsed = JSON.parse(clean) as BlueprintData

  // Safety: ensure arrays that must have 3 items do
  if (!Array.isArray(parsed.top3Opportunities) || parsed.top3Opportunities.length < 3) {
    parsed.top3Opportunities = [
      parsed.top3Opportunities?.[0] ?? 'Automate client reporting',
      parsed.top3Opportunities?.[1] ?? 'Streamline onboarding',
      parsed.top3Opportunities?.[2] ?? 'Reduce manual data entry',
    ]
  }
  if (!Array.isArray(parsed.workflows) || parsed.workflows.length < 3) {
    const fill: WorkflowMap = { name: 'TBD', steps: [] }
    while (parsed.workflows.length < 3) parsed.workflows.push(fill)
  }

  return parsed
}
