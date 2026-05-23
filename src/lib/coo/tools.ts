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
      name: 'search_kb',
      description: "Search the OpsRadar agency research knowledge base for industry benchmarks, operational patterns, and best practices. Use this when the user asks about general agency norms, what's typical, what to charge, why clients churn, or how other agencies handle a problem — anything that requires knowledge beyond the user's own live data.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Short search query, e.g. "paid media agency margin benchmark" or "client churn causes" or "hourly rate for designers".',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_brain',
      description: "Search the agency's OWN brain — past conversations (Slack/email/meeting breadcrumbs) and detected patterns. Use this for any question about the agency's history, recurring issues, what was said about a specific client/employee/project, past decisions, or detected patterns. This is the user's PER-AGENCY memory, distinct from search_kb (which is industry research). Call this first when the user asks 'what patterns have you seen', 'what did we say about X', 'has this happened before', 'what's the history with this client'.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural-language query, e.g. "Q4 scope expansion patterns" or "conversations about Client Acme" or "history of capacity issues".',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_real_pnl',
      description:
        "Get real profit and loss including all expenses (payroll, contractors, overhead) from the customer's accounting system (QuickBooks or Xero). Use this for any question about true net margin, real profit, or financial performance — distinct from get_finance which is Stripe revenue only.",
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payroll',
      description:
        'Fetch payroll costs MTD from Gusto: total payroll, employee count, contractor count. Call this for any question about payroll, labor cost, headcount cost, or staff spend.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_overdue_invoices_detail',
      description:
        'Itemized list of overdue Stripe invoices: client name, amount due, days overdue, due date. Use this when the user wants the actual list of overdue invoices (not just the total dollar number from get_finance).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_burnout',
      description:
        'Detect burnout signals from Slack messaging patterns and Google Calendar meeting density: after-hours Slack %, average meetings per day, deep-work hours per day, burnout risk score. Returns partial data if only one source is connected.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_capacity',
      description:
        'Fetch team headcount + utilization from BambooHR (headcount, PTOs) + Harvest (billable hours). Use for any question about staffing, team size, billable utilization, or upcoming time off. Different from get_capacity which estimates only from configured team size.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inbox',
      description:
        'Fetch Gmail inbox status: unread count (last 7 days), drafts queued by the Collections Agent, threads tied to clients with overdue invoices. Use for any question about email backlog, drafts to review, or client inbox status.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_web_traffic',
      description:
        'Fetch web traffic from Google Analytics: sessions, users, conversions, top traffic channels. Use this for any question about marketing traffic, conversions, or channel performance.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ad_performance',
      description:
        'Fetch ad spend + ROAS across Google Ads, Meta (Facebook) Ads, and LinkedIn Ads. Returns whichever are connected (partial OK). Use this for paid marketing performance, return on ad spend, blended ROAS, or channel-level ad questions.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contracts',
      description:
        'Fetch DocuSign contracts expiring soon: client name, signed date, expiry date, days to expiry, contract value. Use this for renewal planning, contract expiry questions, or revenue-at-risk analysis.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_decision',
      description:
        "Record a strategic decision the customer has just made or articulated in this conversation. Use this when the customer says things like \"I'll fire them,\" \"let's reprice next quarter,\" \"we're going to pause hiring,\" \"drop SEO as a service line,\" etc. The decision gets logged to their Notion Decision Log so other agents see it and don't re-suggest the same thing. Be conservative — only log clear, actionable decisions, not exploratory thinking or hypotheticals.",
      parameters: {
        type: 'object',
        properties: {
          decision: {
            type: 'string',
            description: 'One-sentence summary of the decision (imperative voice, e.g. "Fire Acme Corp at end of Q3").',
          },
          context: {
            type: 'string',
            description: 'Optional 1-3 sentence context: why, what triggered it, related entities (clients, projects, people).',
          },
          category: {
            type: 'string',
            enum: ['client', 'team', 'financial', 'strategic', 'operational'],
            description: 'What domain this decision belongs to.',
          },
        },
        required: ['decision'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_action',
      description:
        'Queue a draft action for the user to review in their Actions queue. Only call this AFTER calling the relevant data tool (get_profitability, get_scope, etc.) so you have the real numbers. The draft appears in the queue — nothing is sent automatically. The user reviews and decides what to do. When applicable, include entity tracking fields (entity_type, entity_id, entity_tool_slug, expected_outcome) so we can detect when the action\'s outcome materializes — that\'s how OpsRadar proves your work pays for itself.',
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
          entity_type: {
            type: 'string',
            enum: ['invoice', 'deal', 'contract', 'project', 'task'],
            description:
              'Optional. The kind of business entity this action is about. Include this whenever the action is tied to a specific upstream entity (invoice from get_finance, deal from get_sales, project from get_scope, contract from get_contracts). Required if entity_id is provided.',
          },
          entity_id: {
            type: 'string',
            description:
              'Optional. The upstream identifier of the tracked entity (e.g. Stripe invoice id "in_abc", HubSpot deal id "1234567", DocuSign envelope id). Pair with entity_type and entity_tool_slug so outcome detection can re-fetch this entity later and see when the state changed.',
          },
          entity_tool_slug: {
            type: 'string',
            enum: [
              'stripe',
              'hubspot',
              'pipedrive',
              'docusign',
              'clickup',
              'asana',
              'monday',
              'harvest',
              'toggl',
            ],
            description:
              'Optional. The OpsRadar tool slug for the source of the entity. Required if entity_id is provided.',
          },
          expected_outcome: {
            type: 'string',
            description:
              'Optional. Short string describing the outcome that would prove the action worked, e.g. "paid" for an invoice, "closed-won" for a deal, "renewed" for a contract, "completed" for a task. Used by the outcome-detection cron to know what state change to watch for.',
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
  search_kb: 'Searching the knowledge base...',
  search_brain: 'Searching your agency brain...',
  get_real_pnl: 'Looking at real P&L...',
  get_payroll: 'Fetching payroll costs...',
  get_overdue_invoices_detail: 'Listing overdue invoices...',
  get_burnout: 'Checking burnout signals...',
  get_team_capacity: 'Checking team capacity...',
  get_inbox: 'Checking inbox status...',
  get_web_traffic: 'Fetching web traffic...',
  get_ad_performance: 'Fetching ad performance...',
  get_contracts: 'Listing expiring contracts...',
  queue_action: 'Queuing action for your approval...',
  record_decision: 'Logging this decision to your Brain...',
};
