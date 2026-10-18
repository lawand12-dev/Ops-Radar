export type ActionType =
  | 'invoice_reminder'
  | 'margin_alert'
  | 'hours_budget_exceeded'
  | 'scope_approaching'
  | 'workflow_failure'
  | 'hubspot_harvest_sync'
  | 'retainer_overage'
  | 'retainer_invoice_draft'
  | 'cash_flow_alert'
  | 'capacity_drift'
  | 'pattern_alert'
  | 'tool_action'
  | 'integration_expired'
  | 'automation_disabled'

export type ActionStatus =
  | 'pending'
  | 'executed'
  | 'dismissed'
  | 'undone'
  | 'failed'

export type ActionRisk = 'auto' | 'approval'

export const ACTION_RISK: Record<ActionType, ActionRisk> = {
  invoice_reminder:      'auto',
  margin_alert:          'approval',
  hours_budget_exceeded: 'approval',
  scope_approaching:     'approval',
  workflow_failure:      'auto',
  hubspot_harvest_sync:  'auto',
  retainer_overage:      'approval',
  retainer_invoice_draft: 'approval',
  cash_flow_alert:       'approval',
  capacity_drift:        'approval',
  pattern_alert:         'approval',
  tool_action:       'approval',
  integration_expired:   'approval',
  automation_disabled:   'approval',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  invoice_reminder:      'Payment reminder sent',
  margin_alert:          'Repricing email ready',
  hours_budget_exceeded: 'Scope conversation ready',
  scope_approaching:     'Scope warning — approaching budget',
  workflow_failure:      'Workflow failure alert sent',
  hubspot_harvest_sync:  'New client synced to Harvest',
  retainer_overage:      'Retainer overage — billing conversation ready',
  retainer_invoice_draft: 'Retainer invoice — Stripe draft ready',
  cash_flow_alert:       'Cash flow risk — advisory ready',
  capacity_drift:        'Capacity drift — staffing advisory ready',
  pattern_alert:         'New pattern detected — recommendation ready',
  tool_action:       'Agent wants to act on a connected tool',
  integration_expired:   'Integration needs reconnecting',
  automation_disabled:   'Automation auto-auto-disabled by the broker',
}

// ─── Payload types ────────────────────────────────────────────────────────────

export type InvoiceReminderPayload = {
  stripe_customer_id: string
  invoice_id: string
  client_name: string
  amount_due: number
  days_overdue: number
  recipient_email: string
  draft_subject: string
  draft_body: string
  resend_email_id?: string
}

export type MarginAlertPayload = {
  stripe_customer_id: string
  client_name: string
  margin_pct: number
  margin_prior_pct: number | null
  revenue_mtd: number
  cost_mtd: number
  draft_subject: string
  draft_body: string
}

export type HoursBudgetPayload = {
  client_name: string
  project_name: string
  harvest_project_id: string
  hours_logged: number
  budget_hours: number
  overage_pct: number
  draft_subject: string
  draft_body: string
}

export type ScopeApproachingPayload = {
  client_name: string
  project_name: string
  harvest_project_id: string
  hours_logged: number
  budget_hours: number
  used_pct: number
  draft_subject: string
  draft_body: string
}

export type WorkflowFailurePayload = {
  n8n_workflow_id: string
  workflow_name: string
  failure_count: number
  last_failed_at: string
  n8n_base_url: string
  resend_email_id?: string
}

export type HubSpotHarvestPayload = {
  hubspot_contact_id: string
  hubspot_company_name: string
  client_email: string | null
  harvest_client_id?: string
}

export type RetainerOveragePayload = {
  client_name: string
  client_name_norm: string
  monthly_amount_usd: number
  included_hours: number
  logged_hours: number
  overage_hours: number
  overage_cost_usd: number
  implied_hourly_rate: number
  draft_subject: string
  draft_body: string
}

export type RetainerInvoiceDraftPayload = {
  client_name: string
  client_name_norm: string
  stripe_customer_id: string
  amount_usd: number
  retainer_period: string // YYYY-MM
  description: string
  stripe_invoice_id?: string // populated after successful execute
}

export type CashFlowAlertPayload = {
  paid_mtd_usd: number
  overdue_usd: number
  open_invoice_usd: number
  overdue_ratio_pct: number          // overdue / paid_mtd × 100
  top_overdue_clients: Array<{ name: string | null; amount_usd: number; days_overdue: number }>
  draft_subject: string
  draft_body: string
}

export type CapacityDriftPayload = {
  utilization_pct: number             // current month
  utilization_prior_pct: number | null
  direction: 'over_capacity' | 'under_capacity'
  threshold_crossed: string           // e.g. ">=95%" or "<=50%"
  hours_logged_mtd: number
  hours_capacity_mtd: number
  draft_subject: string
  draft_body: string
}

export type PatternAlertPayload = {
  pattern_card_id: string
  pattern_type: string
  pattern_title: string
  pattern_description: string
  confidence: number
  source_breadcrumb_count: number
  recommended_action: string          // 1-3 sentence operator brief on what to DO
  draft_subject: string
  draft_body: string
}

// Generic tool call queued by the approval gate. The agent (cron or
// COO sub-agent) wanted to fire `action_slug` with `arguments` against the
// customer's connected tool. The executor runs it on approval.
export type ToolActionPayload = {
  toolkit: string                     // e.g. 'gmail'
  action_slug: string                 // e.g. 'GMAIL_SEND_EMAIL'
  arguments: Record<string, unknown>  // shape varies per action
  source: 'cron-agent' | 'coo-chat' | 'employee-chat'
  agent_slug?: string                 // for cron source: which agent
  summary?: string                    // one-line human description
  result?: unknown                    // populated after execute
}

// The broker told us a customer's connected account expired (OAuth lapsed, refresh
// failed, etc.). We mark it inactive in the legacy OAuth-connections table and queue this so
// the customer sees it in /dashboard/actions with a re-auth link.
export type IntegrationExpiredPayload = {
  tool_slug: string                           // 'hubspot', 'stripe', 'gmail', etc.
  connection_id: string
  reason?: string                             // whatever the broker supplied
  reconnect_url: string                       // re-auth deep link supplied by the broker
}

// The broker platform-disabled a trigger (auth dead, repeated webhook failures, etc.).
// We pause the matching automation(s) and queue this so the customer knows.
export type AutomationDisabledPayload = {
  automation_id: string
  automation_slug: string
  trigger_slug: string                        // e.g. 'HUBSPOT_DEAL_STAGE_UPDATED'
  connection_id: string
  disabled_reason?: string                    // platform-supplied reason
  detail_url: string                          // '/dashboard/employees/[slug]'
}

export type ActionPayload =
  | InvoiceReminderPayload
  | MarginAlertPayload
  | HoursBudgetPayload
  | ScopeApproachingPayload
  | WorkflowFailurePayload
  | HubSpotHarvestPayload
  | RetainerOveragePayload
  | RetainerInvoiceDraftPayload
  | CashFlowAlertPayload
  | CapacityDriftPayload
  | PatternAlertPayload
  | ToolActionPayload
  | IntegrationExpiredPayload
  | AutomationDisabledPayload

export type NewAction = {
  action_type: ActionType
  payload: ActionPayload
}

export type AgentAction = {
  id: string
  user_id: string
  action_type: ActionType
  status: ActionStatus
  payload: ActionPayload
  created_at: string
  approved_at: string | null
  executed_at: string | null
  undone_at: string | null
  undo_deadline: string | null
}

export type UserContext = {
  userId: string
  email: string
  companyName: string
  blendedRate: number
}
