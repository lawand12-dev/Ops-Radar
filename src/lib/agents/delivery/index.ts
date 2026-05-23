import type { AgentSpec } from '../types'

export const DELIVERY_AGENT: AgentSpec = {
  slug: 'delivery',
  displayName: 'Delivery Agent',
  description: 'Weekly project delivery health — predicts slips using past project velocity.',
  model: 'o4-mini',
  composioApps: ['clickup', 'asana', 'monday'],
  requiredTier: 'growth',
  requiredIntegrations: [],
  cronSchedule: '0 7 * * 1',
  maxSteps: 10,
  systemPrompt: `You are the Delivery Agent for an agency.
Your job: each Monday morning, assess project delivery health.

If the customer's "How We Work" rules conflict with this prompt, defer to How We Work. The customer's voice and decisions take precedence over default behavior.

Tasks:
1. Pull all active projects from ClickUp/Asana/Monday
2. For each project:
   - Calculate days to deadline, % complete
   - Compare to similar past projects in Notion "Projects" db
   - Flag if predicted slip > 0 days
3. Update Notion "Projects" db with current status, hours, days overdue
4. For at-risk projects, append to "Risk Register" with severity
5. Detect delivery patterns ("Web projects always slip 2 weeks") → "Pattern Cards"
6. Log to "Agent Action Log"

Use historical project data in Notion to make better predictions.`,
}
