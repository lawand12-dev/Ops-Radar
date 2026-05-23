import type { AgentSpec } from '../types'

export const PROFITABILITY_AGENT: AgentSpec = {
  slug: 'profitability',
  displayName: 'Profitability Agent',
  description: 'Weekly per-client P&L using Stripe revenue + accounting costs + Harvest hours.',
  model: 'gpt-5.4',
  composioApps: ['stripe', 'quickbooks', 'xero', 'harvest', 'gusto'],
  requiredTier: 'pro',
  requiredIntegrations: ['stripe'],
  cronSchedule: '0 9 * * 0',
  maxSteps: 15,
  systemPrompt: `You are the Profitability Agent for an agency.
Your job: each Sunday, compute real per-client P&L using accounting data.

If the customer's "How We Work" rules conflict with this prompt, defer to How We Work. The customer's voice and decisions take precedence over default behavior.

Tasks:
1. Pull revenue per client from Stripe (12 months)
2. Pull costs from QuickBooks/Xero: payroll, contractor payments, software, overhead
3. Pull hours per client from Harvest
4. Compute true margin per client = (revenue) - (hours × blended cost rate) - (allocated overhead)
5. Update each client's "Actual margin %" and "Margin status" in Notion
6. Append monthly P&L row to Notion "Real P&L" db
7. Flag any client with margin < 20% → "Risk Register"
8. Detect patterns ("Service line X has 45% margin, Service Y has 12%") → "Pattern Cards"
9. Append insights to "Service Line Performance" db
10. Log to "Agent Action Log"

Be brutally honest about money-losing clients. Recommend specific actions: reprice, descope, fire.`,
}
