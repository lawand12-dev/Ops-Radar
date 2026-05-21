// src/lib/coo/tools.ts
import type OpenAI from 'openai';

export const COO_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_finance',
      description: 'Fetch Stripe financial data: invoiced MTD, paid MTD, overdue invoices, open invoice total, cash due in 30 days. Call this for any revenue, cash flow, or invoice question.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sales',
      description: 'Fetch HubSpot pipeline data: total pipeline value, open deal count, deals won this month. Call this for any pipeline or sales question.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_profitability',
      description: 'Fetch per-client profitability: revenue vs hours vs margin for each client. Call this for any question about which clients are profitable, unprofitable, or should be repriced.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_capacity',
      description: 'Fetch team capacity: utilization %, hours tracked this month, available hours remaining. Call this for any question about team load, bandwidth, or whether to take on new work.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_scope',
      description: 'Fetch scope creep signals: which clients have logged hours exceeding their agreed budget. Call this for any question about scope, overruns, or project health.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_action',
      description: 'Queue an action for the user to approve in-chat. Use when you identify a concrete problem that warrants an action (overdue invoice reminder, reprice a client, scope alert). Always call this AFTER explaining the problem in your response.',
      parameters: {
        type: 'object',
        properties: {
          action_type: {
            type: 'string',
            description: 'One of: invoice_reminder, reprice_client, scope_alert, margin_alert',
          },
          label: {
            type: 'string',
            description: 'Human-readable description shown to the user, e.g. "Send invoice reminder to Acme Corp — $4,200 overdue 18 days"',
          },
          payload: {
            type: 'object',
            description: 'Action-specific data. For invoice_reminder: { client_name, amount_usd, days_overdue }. For reprice_client: { client_name, current_usd, suggested_usd }. For scope_alert: { client_name, budget_hours, logged_hours }.',
          },
        },
        required: ['action_type', 'label', 'payload'],
      },
    },
  },
];

export const TOOL_LABELS: Record<string, string> = {
  get_finance: 'Fetching financial data...',
  get_sales: 'Fetching sales pipeline...',
  get_profitability: 'Analysing client profitability...',
  get_capacity: 'Checking team capacity...',
  get_scope: 'Checking scope creep...',
  queue_action: 'Queuing action for your approval...',
};
