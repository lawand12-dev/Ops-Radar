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
      description: 'Fetch CRM pipeline data: total pipeline value, open deal count, deals won this month. Reads from HubSpot if connected, otherwise falls back to Pipedrive. Call this for any pipeline or sales question.',
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
      description: 'Fetch team capacity: utilization %, hours tracked this month, available hours remaining. Reads from Harvest if connected, otherwise falls back to Toggl. Call this for any question about team load, bandwidth, or whether to take on new work.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_scope',
      description: 'Fetch project delivery and scope creep signals. Reads from ClickUp + Harvest (best — includes budget vs logged) if both connected, otherwise falls back to Asana or Monday for project status and overdue tasks. Call this for any question about scope, overruns, project health, or overdue work.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_outbound',
      description: 'Fetch outbound marketing/sales metrics from Apollo: emails sent, open rate, reply rate, top sequences. Call this for any question about outbound campaigns, prospecting effectiveness, or cold email performance.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_meetings',
      description: 'Fetch meeting bookings from Calendly: number of meetings booked, conversion rate, upcoming meetings. Call this for any question about meeting volume, sales calls, or the upcoming schedule.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_action',
      description: 'Queue a draft action for the user to review in their Actions queue. Only call this AFTER calling the relevant data tool (get_profitability, get_scope, etc.) so you have the real numbers. The draft appears in the queue — nothing is sent automatically. The user reviews and decides what to do.',
      parameters: {
        type: 'object',
        properties: {
          action_type: {
            type: 'string',
            enum: ['margin_alert', 'hours_budget_exceeded', 'scope_approaching', 'retainer_overage'],
            description: 'margin_alert: client margin is below target (use after get_profitability). hours_budget_exceeded: a project has logged more hours than its budget (use after get_scope where in_scope is false). scope_approaching: a project is using 80%+ of its hours budget but hasn\'t crossed yet. retainer_overage: a client has logged more hours than their monthly retainer covers.',
          },
          label: {
            type: 'string',
            description: 'One-line summary shown to the user in chat, e.g. "Margin alert for Acme Co — currently at -13%"',
          },
          client_name: {
            type: 'string',
            description: 'Client name exactly as it appeared in the prior tool call',
          },
          project_name: {
            type: 'string',
            description: 'Project name from get_scope. Required for hours_budget_exceeded and scope_approaching. Omit for margin_alert and retainer_overage.',
          },
          metrics: {
            type: 'object',
            description: 'Numeric metrics from your prior tool call. For margin_alert: { margin_pct, revenue_mtd_usd, cost_usd }. For hours_budget_exceeded: { hours_logged, budget_hours, overrun_pct }. For scope_approaching: { hours_logged, budget_hours, used_pct }. For retainer_overage: { hours_logged }.',
          },
          draft_subject: {
            type: 'string',
            description: 'Draft email subject line, e.g. "Quick chat about the retainer for Acme Co"',
          },
          draft_body: {
            type: 'string',
            description: 'Draft email body — 3-6 sentences, professional, warm tone. Reference the specific numbers. End with a clear ask (call, meeting, etc.).',
          },
        },
        required: ['action_type', 'label', 'client_name', 'metrics', 'draft_subject', 'draft_body'],
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
  get_outbound: 'Fetching outbound metrics...',
  get_meetings: 'Fetching meeting bookings...',
  queue_action: 'Queuing action for your approval...',
};
