/**
 * Smoke test: Revenue Agent end-to-end with MOCKED Composio tools.
 *
 * Goal: prove the stack (OpenAI ↔ Vercel AI SDK ↔ tools ↔ multi-step loop ↔ Notion stub)
 * works against the real OpenAI API without needing a live Stripe connection.
 *
 * Run with:  npx tsx --env-file=.env.local scripts/smoke-revenue-agent.ts
 */

import { generateText, tool, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { REVENUE_AGENT } from '../src/lib/agents/revenue'

// ---------- Mocked Composio tools ----------
// These simulate what `composio.tools.get(userId, { toolkits: ['stripe'] })` would return
// if the customer had connected Stripe via OAuth. Numbers are fictional but plausible
// for a $34K-MRR agency. The mock returns deterministic data so we can read the
// agent's reasoning against known inputs.

const stripeMRR = tool({
  description: "Fetch the agency's current Monthly Recurring Revenue from Stripe.",
  inputSchema: z.object({}),
  execute: async () => {
    console.log('  📞 STRIPE_GET_MRR called')
    return {
      mrr_usd: 34_200,
      currency: 'usd',
      active_subscriptions: 14,
      as_of: new Date().toISOString().slice(0, 10),
    }
  },
})

const stripeOutstandingInvoices = tool({
  description: 'List all unpaid invoices from Stripe. Returns amount due and days overdue.',
  inputSchema: z.object({
    only_overdue: z.boolean().optional().describe('If true, filter to invoices past their due date.'),
  }),
  execute: async ({ only_overdue }) => {
    console.log(`  📞 STRIPE_LIST_INVOICES called (only_overdue=${only_overdue ?? false})`)
    const all = [
      { id: 'in_001', client: 'Acme Corp', amount_due_usd: 4_500, days_overdue: 32 },
      { id: 'in_002', client: 'Globex',    amount_due_usd: 2_100, days_overdue: 14 },
      { id: 'in_003', client: 'Initech',   amount_due_usd: 1_800, days_overdue: 7 },
      { id: 'in_004', client: 'Umbrella',  amount_due_usd: 3_900, days_overdue: 0 },
      { id: 'in_005', client: 'Stark Co',  amount_due_usd: 5_200, days_overdue: 0 },
    ]
    return only_overdue ? all.filter((i) => i.days_overdue > 0) : all
  },
})

const stripeCashCollectedToday = tool({
  description: 'Total cash collected via Stripe charges since midnight UTC.',
  inputSchema: z.object({}),
  execute: async () => {
    console.log('  📞 STRIPE_CASH_TODAY called')
    return { cash_collected_today_usd: 2_400, charges_count: 3 }
  },
})

// ---------- Mocked Notion write tools ----------

let notionWrites = 0

const appendRiskRegister = tool({
  description: 'Append a new entry to the Notion Risk Register database.',
  inputSchema: z.object({
    title: z.string(),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    description: z.string(),
    financial_exposure_usd: z.number().optional(),
  }),
  execute: async (input) => {
    notionWrites++
    console.log('  📝 NOTION write — Risk Register:', JSON.stringify(input))
    return { ok: true, notion_page_id: `mock-risk-${notionWrites}` }
  },
})

const appendActionLog = tool({
  description: 'Append a row to the Notion Agent Action Log.',
  inputSchema: z.object({
    action: z.string(),
    trigger: z.string(),
    outcome: z.enum(['Resolved', 'Pending', 'Escalated', 'No action']),
  }),
  execute: async (input) => {
    notionWrites++
    console.log('  📝 NOTION write — Action Log:', JSON.stringify(input))
    return { ok: true, notion_page_id: `mock-action-${notionWrites}` }
  },
})

// ---------- Run the agent ----------

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Revenue Agent smoke test (mocked Composio + Notion)')
  console.log(`Model:      ${REVENUE_AGENT.model}`)
  console.log(`Max steps:  ${REVENUE_AGENT.maxSteps}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const startedAt = Date.now()

  const result = await generateText({
    model: openai(REVENUE_AGENT.model),
    system: REVENUE_AGENT.systemPrompt,
    prompt: `Run your morning analysis. Today is ${new Date().toISOString().slice(0, 10)}.`,
    tools: {
      STRIPE_GET_MRR: stripeMRR,
      STRIPE_LIST_INVOICES: stripeOutstandingInvoices,
      STRIPE_CASH_TODAY: stripeCashCollectedToday,
      NOTION_APPEND_RISK: appendRiskRegister,
      NOTION_APPEND_ACTION_LOG: appendActionLog,
    },
    stopWhen: stepCountIs(REVENUE_AGENT.maxSteps),
  })

  const elapsedMs = Date.now() - startedAt

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Final agent summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(result.text)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Steps:           ${result.steps.length}`)
  console.log(`Notion writes:   ${notionWrites}`)
  console.log(`Tokens (in/out): ${result.usage.inputTokens} / ${result.usage.outputTokens}`)
  console.log(`Elapsed:         ${elapsedMs}ms`)
  console.log(`Finish reason:   ${result.finishReason}`)
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err)
  process.exit(1)
})
