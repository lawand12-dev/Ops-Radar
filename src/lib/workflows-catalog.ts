/**
 * Workflow catalog — the 8 OpsRadar agency workflow blueprints.
 *
 * Each entry is the public-facing spec for one workflow. The same data is
 * built and running in the OpsRadar n8n account; copy here mirrors the
 * sticky-note explanation attached to each workflow there.
 *
 * Pages that consume this:
 *   /workflows                — index/cards
 *   /workflows/[slug]         — detail
 */

export type WorkflowComplexity = 'Medium' | 'High'

export type GraphNodeKind =
  | 'trigger'
  | 'http'
  | 'set'
  | 'code'
  | 'if'
  | 'switch'
  | 'slack'
  | 'postgres'
  | 'gmail'
  | 'loop'
  | 'approval'
  | 'merge'

export interface GraphNode {
  id: string
  label: string
  kind: GraphNodeKind
  /** Optional secondary line (e.g. "trigger", "audit row", "approval gate"). */
  hint?: string
}

export interface GraphEdge {
  source: string
  target: string
  /** Branch label (e.g. "true", "false", "retainer", "approved"). */
  label?: string
}

export interface WorkflowGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface WorkflowEntry {
  slug: string
  title: string
  shortPain: string
  fullPain: string
  agencyProfile: string
  complexity: WorkflowComplexity
  deliveryDays: string
  trigger: string
  techFlow: string
  howItWorks: string[]
  wireUp: string[]
  guarantees?: string[]
  /** Real branching graph for the React Flow detail view. Falls back to techFlow string if absent. */
  graph?: WorkflowGraph
}

export const WORKFLOWS: WorkflowEntry[] = [
  {
    slug: 'cross-agency-handoff-router',
    title: 'Cross-Agency Handoff Router',
    shortPain:
      'Holding-co and specialist-collective agencies leak data between brands and partners because one workflow assumes a single operating model.',
    fullPain:
      "Holding-company and specialist-collective agencies sell retainers, projects, white-label work, and referrals all at once — but most automation assumes a single operating model. The result: enterprise clients receive SMB-style automated comms, white-label data leaks into the wrong brand's reports, and finance reconciliation finds mismatches that no PM tool can explain.",
    agencyProfile: 'Holding companies & specialist collectives',
    complexity: 'Medium',
    deliveryDays: '5–8 days',
    trigger: 'Webhook (any inbound event from form, CRM, Stripe, partner portal)',
    techFlow:
      'Webhook → Audit Intake → Fetch Client Config → Config Loaded? → Switch by Operating Model → Notify Right Channel → Audit Outcome',
    howItWorks: [
      'Inbound event hits the webhook (any source: form, CRM, Stripe, partner portal).',
      'Write an audit-intake row immediately — that row is the replay control + audit trail if anything fails downstream.',
      'Fetch the client_config (tier, model, SLA, approval policy, brand_id, portal_domain, Slack channel).',
      'Fail closed if config is missing — alert ops rather than route blindly.',
      'Switch routes by operating_model: retainer → AM channel, project → PM channel, white-label → brand channel, referral → partner-ops.',
      'Final audit row records the outcome.',
    ],
    wireUp: [
      'Postgres credentials + a workflow_audit table',
      'Slack credentials + the four operational channels',
      'The client-config endpoint URL',
    ],
    graph: {
      nodes: [
        { id: 'webhook',         label: 'Handoff Event',         kind: 'trigger',  hint: 'Webhook' },
        { id: 'audit_intake',    label: 'Write Audit Intake',    kind: 'postgres', hint: 'Audit row' },
        { id: 'fetch_config',    label: 'Fetch Client Config',   kind: 'http',     hint: 'Tier, model, SLA' },
        { id: 'config_check',    label: 'Config Loaded?',        kind: 'if' },
        { id: 'route',           label: 'Route by Operating Model', kind: 'switch' },
        { id: 'notify_retainer', label: 'Notify Retainer AM',    kind: 'slack' },
        { id: 'notify_project',  label: 'Notify Project PM',     kind: 'slack' },
        { id: 'notify_wl',       label: 'Notify White-Label Lead', kind: 'slack' },
        { id: 'notify_partner',  label: 'Notify Partner Ops',    kind: 'slack' },
        { id: 'fallback',        label: 'Alert Unknown Model',   kind: 'slack' },
        { id: 'alert_missing',   label: 'Alert Ops: Missing Config', kind: 'slack' },
        { id: 'audit_outcome',   label: 'Write Audit Outcome',   kind: 'postgres', hint: 'Audit row' },
      ],
      edges: [
        { source: 'webhook',      target: 'audit_intake' },
        { source: 'audit_intake', target: 'fetch_config' },
        { source: 'fetch_config', target: 'config_check' },
        { source: 'config_check', target: 'route',           label: 'true' },
        { source: 'config_check', target: 'alert_missing',   label: 'false' },
        { source: 'route',        target: 'notify_retainer', label: 'retainer' },
        { source: 'route',        target: 'notify_project',  label: 'project' },
        { source: 'route',        target: 'notify_wl',       label: 'white-label' },
        { source: 'route',        target: 'notify_partner',  label: 'referral' },
        { source: 'route',        target: 'fallback',        label: 'default' },
        { source: 'notify_retainer', target: 'audit_outcome' },
        { source: 'notify_project',  target: 'audit_outcome' },
        { source: 'notify_wl',       target: 'audit_outcome' },
        { source: 'notify_partner',  target: 'audit_outcome' },
      ],
    },
  },
  {
    slug: 'retainer-invoicing-dunning',
    title: 'Retainer Invoicing + Dunning',
    shortPain:
      'Renewal-risk and dunning are reactive — invoices slip, retainers churn before anyone notices, and cash collection drags 30+ days past terms.',
    fullPain:
      'Cash timing drives every other ops priority — hiring, automation investment, renewal-risk management. But finance teams spend 2–4 hours every billing cycle on invoice creation, dispatch, and follow-up, and dunning escalation lives in someone\'s head instead of a system. By the time anyone notices a retainer is at risk, the renewal call is two weeks away.',
    agencyProfile: 'Any agency with 10+ retainer clients',
    complexity: 'Medium',
    deliveryDays: '6–10 days',
    trigger: 'Schedule (1st of month, 8am, retainer cadence)',
    techFlow:
      'Schedule → Get Active Clients → Generate Invoice Number → Currency Convert → Create Invoice → Slack Approval → Send Email → CRM Note → 7/14/30-Day Follow-up',
    howItWorks: [
      'Monthly schedule fetches active retainer clients with billing date due this cycle.',
      'Atomic invoice number generation via Postgres or Redis counter (thread-safe — no duplicate invoices).',
      'Currency conversion for international clients with cached FX rates.',
      'Create invoice in QuickBooks / Xero / Stripe Billing with idempotency key.',
      'Slack approval gate before client send (auto-escalates after 4h timeout).',
      'Send invoice email with PDF + payment link, record in CRM.',
      '7-day, 14-day, 30-day follow-up sequence — escalates to AM at 30 days unpaid.',
    ],
    wireUp: [
      'CRM (HubSpot or Airtable) for active retainer clients',
      'Accounting system (QuickBooks / Xero / Stripe Billing)',
      'Email (Resend or SendGrid)',
      'Postgres or Redis for atomic invoice counter',
      'Slack credentials for approval + finance notifications',
    ],
    graph: {
      nodes: [
        { id: 'schedule',        label: 'Monthly Schedule',     kind: 'trigger',  hint: '1st @ 8am' },
        { id: 'fetch_clients',   label: 'Get Active Clients',   kind: 'http',     hint: 'CRM' },
        { id: 'loop',            label: 'Per Client',           kind: 'loop' },
        { id: 'invoice_num',     label: 'Generate Invoice #',   kind: 'postgres', hint: 'Atomic counter' },
        { id: 'currency_check',  label: 'Non-USD?',             kind: 'if' },
        { id: 'fx',              label: 'Currency Conversion',  kind: 'http',     hint: 'FX rate' },
        { id: 'create_invoice',  label: 'Create Invoice',       kind: 'http',     hint: 'QB / Xero / Stripe' },
        { id: 'approval',        label: 'Slack Approval',       kind: 'approval', hint: '4h timeout' },
        { id: 'approved_check',  label: 'Approved?',            kind: 'if' },
        { id: 'send_email',      label: 'Send Invoice Email',   kind: 'gmail' },
        { id: 'record_crm',      label: 'Record in CRM',        kind: 'http' },
        { id: 'abort_notify',    label: 'Aborted — Notify',     kind: 'slack' },
      ],
      edges: [
        { source: 'schedule',       target: 'fetch_clients' },
        { source: 'fetch_clients',  target: 'loop' },
        { source: 'loop',           target: 'invoice_num' },
        { source: 'invoice_num',    target: 'currency_check' },
        { source: 'currency_check', target: 'fx',             label: 'true' },
        { source: 'currency_check', target: 'create_invoice', label: 'false' },
        { source: 'fx',             target: 'create_invoice' },
        { source: 'create_invoice', target: 'approval' },
        { source: 'approval',       target: 'approved_check' },
        { source: 'approved_check', target: 'send_email',     label: 'approved' },
        { source: 'approved_check', target: 'abort_notify',   label: 'rejected' },
        { source: 'send_email',     target: 'record_crm' },
      ],
    },
  },
  {
    slug: 'client-health-score',
    title: 'Client Health Score + Tiered SLA Router',
    shortPain:
      'AMs find out about churn risk only at the renewal call. Enterprise clients get the same automation as SMBs.',
    fullPain:
      'Client tiers should define SLA, automation level, approval depth, reporting cadence, and escalation path — but most agencies have one workflow for everyone. NPS, response time, billing health, and activity signals sit in different tools. Nobody owns the composite view, so churn risk surfaces only when someone manually checks before the renewal.',
    agencyProfile: 'Agencies with 15+ clients across multiple tiers',
    complexity: 'High',
    deliveryDays: '12–18 days',
    trigger: 'Schedule (Monday 7am)',
    techFlow:
      'Weekly Schedule → Fetch Clients + Signals → Compute Score → Lookup Prior → Record Trend → Drop ≥10? → Tier Router → Page/Notify/Digest',
    howItWorks: [
      'Weekly Monday 7am — fetch all active clients with their signals from one aggregated endpoint.',
      'Code node computes a weighted composite score (NPS 30%, support 25%, billing 25%, activity 20%) → 0–100 + green/yellow/red band.',
      'Look up prior score, then write this week\'s score to the trend table.',
      'If the score dropped ≥10 points vs prior, route the alert by tier:',
      'Enterprise → director Slack page (24h SLA)',
      'Midmarket → AM Slack channel',
      'SMB → digest channel',
    ],
    wireUp: [
      'Postgres credentials + a client_health_history table',
      'Slack credentials + three escalation channels (director, AM, digest)',
      'Aggregated signals endpoint, OR replace with 4 parallel HTTP fetches (NPS, support, billing, activity) merged by client_id before scoring',
    ],
    graph: {
      nodes: [
        { id: 'schedule',     label: 'Weekly Schedule',     kind: 'trigger',  hint: 'Mon 7am' },
        { id: 'fetch',        label: 'Fetch Clients + Signals', kind: 'http' },
        { id: 'compute',      label: 'Compute Health Score', kind: 'code',    hint: 'Weighted 0–100' },
        { id: 'lookup_prior', label: 'Lookup Prior Score',  kind: 'postgres' },
        { id: 'record',       label: 'Record Health Trend', kind: 'postgres' },
        { id: 'drop_check',   label: 'Drop ≥ 10?',          kind: 'if' },
        { id: 'tier_router',  label: 'Escalate by Tier',    kind: 'switch' },
        { id: 'enterprise',   label: 'Page Director',       kind: 'slack',    hint: 'Enterprise' },
        { id: 'midmarket',    label: 'Notify AM',           kind: 'slack',    hint: 'Midmarket' },
        { id: 'smb',          label: 'Digest Channel',      kind: 'slack',    hint: 'SMB' },
        { id: 'no_drop',      label: 'No Significant Drop', kind: 'set' },
      ],
      edges: [
        { source: 'schedule',     target: 'fetch' },
        { source: 'fetch',        target: 'compute' },
        { source: 'compute',      target: 'lookup_prior' },
        { source: 'lookup_prior', target: 'record' },
        { source: 'record',       target: 'drop_check' },
        { source: 'drop_check',   target: 'tier_router', label: 'true' },
        { source: 'drop_check',   target: 'no_drop',     label: 'false' },
        { source: 'tier_router',  target: 'enterprise',  label: 'enterprise' },
        { source: 'tier_router',  target: 'midmarket',   label: 'midmarket' },
        { source: 'tier_router',  target: 'smb',         label: 'smb' },
      ],
    },
  },
  {
    slug: 'brand-namespaced-reporting',
    title: 'Brand-Namespaced Reporting Pipeline',
    shortPain:
      "Multi-brand accounts leak data between brands when one workflow shares writes, logos, or recipients across all clients.",
    fullPain:
      "Multi-brand accounts (holding cos, white-label resellers) need isolated reporting, permissions, workflows, and billing namespaces. When one workflow assumes a single client, brand A's spend lands in brand B's row, the wrong logo appears in the PDF, and the wrong stakeholder gets the Slack notification. Every step has to key off brand_id — there is no shortcut.",
    agencyProfile: 'Multi-brand agencies & white-label resellers',
    complexity: 'High',
    deliveryDays: '10–15 days',
    trigger: 'Schedule (Monday 6am)',
    techFlow:
      'Weekly Schedule → Fetch Brand Configs → Per Brand → Brand Valid? → Fetch Metrics → Namespace Row → Write Brand Table → Render Branded PDF → Notify Brand Channel',
    howItWorks: [
      'Weekly Monday 6am — pull all active brand configs (brand_id, logo, color, portal_domain, ad-account IDs, recipient channel).',
      'Loop per brand. Fail-closed gate verifies brand_id + logo + portal_domain exist; missing config is alerted to ops, not silently skipped.',
      "Fetch metrics keyed to that brand's ad-account IDs (Meta + Google Ads + GA4).",
      'Build a namespaced row (report_namespace = brand_id:client_id) and insert into brand_metrics. Every downstream query must filter on this namespace.',
      "Render the PDF using the brand's logo + primary color (no shared template).",
      'Notify the brand-specific Slack channel only — never a global one.',
    ],
    wireUp: [
      'Postgres (brand_metrics table partitioned/indexed by brand_id)',
      'Slack credentials',
      'Brand-config endpoint',
      'Per-brand metrics endpoint (or 3 parallel: Meta + Google Ads + GA4)',
      'PDF renderer endpoint (PDFShift or your own)',
    ],
    guarantees: [
      'Namespace isolation: every step keys off brand_id, never a global ID',
      'Fail-closed on missing config (ops alert, no silent skip)',
      'Brand-specific Slack notifications only',
    ],
    graph: {
      nodes: [
        { id: 'schedule',      label: 'Weekly Schedule',           kind: 'trigger',  hint: 'Mon 6am' },
        { id: 'fetch_brands',  label: 'Fetch Brand Configs',       kind: 'http' },
        { id: 'loop',          label: 'Per Brand',                 kind: 'loop' },
        { id: 'check',         label: 'Brand Namespace Valid?',    kind: 'if' },
        { id: 'fetch_metrics', label: 'Fetch Brand Metrics',       kind: 'http',     hint: 'Per brand_id' },
        { id: 'compose',       label: 'Compose Namespaced Row',    kind: 'set' },
        { id: 'write',         label: 'Write to Brand Table',      kind: 'postgres' },
        { id: 'render',        label: 'Render Branded PDF',        kind: 'http',     hint: 'Logo + color' },
        { id: 'notify',        label: 'Notify Brand Channel',      kind: 'slack' },
        { id: 'alert_missing', label: 'Alert Missing Brand Config', kind: 'slack' },
      ],
      edges: [
        { source: 'schedule',      target: 'fetch_brands' },
        { source: 'fetch_brands',  target: 'loop' },
        { source: 'loop',          target: 'check' },
        { source: 'check',         target: 'fetch_metrics', label: 'true' },
        { source: 'check',         target: 'alert_missing', label: 'false' },
        { source: 'fetch_metrics', target: 'compose' },
        { source: 'compose',       target: 'write' },
        { source: 'write',         target: 'render' },
        { source: 'render',        target: 'notify' },
      ],
    },
  },
  {
    slug: 'lead-attribution-commission',
    title: 'Lead-Source Attribution + Commission',
    shortPain:
      'Commission paid before the invoice is collected. Attribution windows expire silently. Partner disputes have no audit trail.',
    fullPain:
      'Referral, white-label, channel, and strategic partnerships need attribution, commission, and portal workflows. The #1 partner-ops failure is paying commission before the underlying invoice is collected — followed closely by attribution expiring on cold leads with no record. This workflow locks both sides: stamp at lead capture, hold payout behind a finance approval that fires only after the invoice is paid.',
    agencyProfile: 'Agencies with active partner / referral programs',
    complexity: 'High',
    deliveryDays: '10–14 days',
    trigger: 'Two webhooks: lead capture + invoice paid',
    techFlow:
      'Lead Webhook → Parse UTM → Lookup Partner → Stamp Attribution || Invoice Paid Webhook → Find Active Attribution → Compute Commission → Finance Approval → Mark Paid + Record Payout',
    howItWorks: [
      'Flow A — Lead Webhook: parse UTM → look up partner config → if active partner, write partner_attributions row with eligible_until = now + window_days and notify partner-ops. Unattributed leads fall through cleanly.',
      'Flow B — Invoice Paid Webhook: query for an active attribution (status=pending AND eligible_until>now) on the lead\'s email → compute commission → finance approval gate (Slack sendAndWait, 24h) → on approve, mark attribution paid + insert partner_payouts row + notify; on reject, mark disputed + notify.',
      'Why two-step: the attribution window prevents zombie commissions on cold leads. The finance gate prevents paying out before invoice cash is collected — the #1 partner-ops failure mode.',
    ],
    wireUp: [
      'Postgres (partner_attributions, partner_payouts tables)',
      'Slack (#partner-ops, #finance-approvals)',
      'Partner config endpoint',
      'Point your form / CRM lead webhook + Stripe / QB invoice.paid webhook at the two trigger URLs',
    ],
    graph: {
      nodes: [
        { id: 'lead_webhook',     label: 'Lead Captured',          kind: 'trigger',  hint: 'Webhook A' },
        { id: 'parse_utm',        label: 'Parse UTM',              kind: 'set' },
        { id: 'lookup_partner',   label: 'Lookup Partner Config',  kind: 'http' },
        { id: 'partner_check',    label: 'Partner Active?',        kind: 'if' },
        { id: 'stamp',            label: 'Stamp Attribution',      kind: 'postgres', hint: 'eligible_until' },
        { id: 'notify_ops_a',     label: 'Notify Partner Ops',     kind: 'slack' },
        { id: 'log_unattributed', label: 'Log Unattributed',       kind: 'set' },

        { id: 'invoice_webhook',  label: 'Invoice Paid',           kind: 'trigger',  hint: 'Webhook B' },
        { id: 'find_attribution', label: 'Find Active Attribution', kind: 'postgres' },
        { id: 'match_check',      label: 'Attribution Match?',     kind: 'if' },
        { id: 'compute_commission', label: 'Compute Commission',   kind: 'set' },
        { id: 'finance_approval', label: 'Finance Approval',       kind: 'approval', hint: '24h, money-touching' },
        { id: 'approved',         label: 'Approved?',              kind: 'if' },
        { id: 'mark_paid',        label: 'Mark Paid',              kind: 'postgres' },
        { id: 'record_payout',    label: 'Record Payout',          kind: 'postgres' },
        { id: 'notify_paid',      label: 'Notify: Approved',       kind: 'slack' },
        { id: 'mark_disputed',    label: 'Mark Disputed',          kind: 'postgres' },
        { id: 'notify_disputed',  label: 'Notify: Rejected',       kind: 'slack' },
        { id: 'no_match',         label: 'No Attribution',         kind: 'set' },
      ],
      edges: [
        { source: 'lead_webhook',    target: 'parse_utm' },
        { source: 'parse_utm',       target: 'lookup_partner' },
        { source: 'lookup_partner',  target: 'partner_check' },
        { source: 'partner_check',   target: 'stamp',           label: 'true' },
        { source: 'partner_check',   target: 'log_unattributed', label: 'false' },
        { source: 'stamp',           target: 'notify_ops_a' },

        { source: 'invoice_webhook', target: 'find_attribution' },
        { source: 'find_attribution', target: 'match_check' },
        { source: 'match_check',     target: 'compute_commission', label: 'true' },
        { source: 'match_check',     target: 'no_match',           label: 'false' },
        { source: 'compute_commission', target: 'finance_approval' },
        { source: 'finance_approval', target: 'approved' },
        { source: 'approved',        target: 'mark_paid',       label: 'true' },
        { source: 'approved',        target: 'mark_disputed',   label: 'false' },
        { source: 'mark_paid',       target: 'record_payout' },
        { source: 'record_payout',   target: 'notify_paid' },
        { source: 'mark_disputed',   target: 'notify_disputed' },
      ],
    },
  },
  {
    slug: 'performance-billing-reconciliation',
    title: 'Performance Billing Reconciliation',
    shortPain:
      'Performance invoices get disputed because the calculation and the attribution evidence are nowhere near each other.',
    fullPain:
      "Performance pricing needs attribution evidence, reconciliation, dispute handling, and finance approval — and most agencies bolt these on after the fact. Clients challenge the bonus formula, and ops scrambles to assemble screenshots after the dispute. This workflow generates the evidence pack before the invoice exists, gates everything behind two human approvals, and stores the audit trail.",
    agencyProfile: 'Performance-priced engagements (paid media, growth retainers)',
    complexity: 'High',
    deliveryDays: '10–16 days',
    trigger: 'Schedule (2nd of month, 9am)',
    techFlow:
      'Monthly Schedule → Fetch Contracts → Per Contract → Fetch Metrics → Compute Invoice → Generate Evidence → AM Approval (24h) → Finance Approval (8h) → Create Invoice → Email Client → Audit',
    howItWorks: [
      'Monthly schedule (2nd of month, 9am) — gives ad platforms time to finalize last month\'s conversion data.',
      'Fetch all active performance contracts (base_fee, bonus_rate, performance_cap, KPI, target).',
      'Loop per contract → fetch aggregated platform metrics for the billing period.',
      'Compute invoice: performance_ratio = actual/target. If ratio < 1: base only. If ≥ 1: bonus = base × bonus_rate × (min(ratio, cap) − 1). Cap prevents runaway overperformance bonuses.',
      'Generate evidence package — bundle screenshots + metrics PDF + raw data, returned as a shareable URL.',
      'Stage 1 AM approval (24h): the AM confirms metrics match their understanding before finance sees it.',
      'Stage 2 Finance approval (8h): finance signs off on amount + currency before client dispatch.',
      'Create invoice (QB/Xero/Stripe) with evidence URL attached → email client → write audit row.',
      'Rejection paths: AM revision halts the flow; Finance reject escalates to director.',
    ],
    wireUp: [
      'Postgres (performance_invoices table)',
      'Slack (#cs-team, #finance-approvals, #finance-director)',
      'Gmail / Resend',
      'Contracts endpoint',
      'Ad-metrics endpoint',
      'Evidence renderer',
      'Accounting create-invoice endpoint',
    ],
    graph: {
      nodes: [
        { id: 'schedule',         label: 'Monthly Schedule',       kind: 'trigger',  hint: '2nd @ 9am' },
        { id: 'fetch_contracts',  label: 'Fetch Contracts',        kind: 'http' },
        { id: 'loop',             label: 'Per Contract',           kind: 'loop' },
        { id: 'fetch_metrics',    label: 'Fetch Platform Metrics', kind: 'http',     hint: 'Google + Meta + …' },
        { id: 'compute',          label: 'Compute Invoice',        kind: 'code',     hint: 'Base + capped bonus' },
        { id: 'evidence',         label: 'Generate Evidence',      kind: 'http',     hint: 'PDF + screenshots' },
        { id: 'am_approval',      label: 'Stage 1: AM Approval',   kind: 'approval', hint: '24h' },
        { id: 'am_check',         label: 'AM Approved?',           kind: 'if' },
        { id: 'finance_approval', label: 'Stage 2: Finance',       kind: 'approval', hint: '8h' },
        { id: 'finance_check',    label: 'Finance Approved?',      kind: 'if' },
        { id: 'create_invoice',   label: 'Create Invoice',         kind: 'http',     hint: 'QB / Xero / Stripe' },
        { id: 'send_email',       label: 'Send Invoice + Evidence', kind: 'gmail' },
        { id: 'audit',            label: 'Write Audit Trail',      kind: 'postgres' },
        { id: 'am_reject',        label: 'AM Revision Requested',  kind: 'slack' },
        { id: 'finance_reject',   label: 'Escalate to Director',   kind: 'slack' },
      ],
      edges: [
        { source: 'schedule',         target: 'fetch_contracts' },
        { source: 'fetch_contracts',  target: 'loop' },
        { source: 'loop',             target: 'fetch_metrics' },
        { source: 'fetch_metrics',    target: 'compute' },
        { source: 'compute',          target: 'evidence' },
        { source: 'evidence',         target: 'am_approval' },
        { source: 'am_approval',      target: 'am_check' },
        { source: 'am_check',         target: 'finance_approval', label: 'approved' },
        { source: 'am_check',         target: 'am_reject',        label: 'revision' },
        { source: 'finance_approval', target: 'finance_check' },
        { source: 'finance_check',    target: 'create_invoice',   label: 'approved' },
        { source: 'finance_check',    target: 'finance_reject',   label: 'rejected' },
        { source: 'create_invoice',   target: 'send_email' },
        { source: 'send_email',       target: 'audit' },
      ],
    },
  },
  {
    slug: 'project-status-clean-closure',
    title: 'Project Status + Clean-Closure',
    shortPain:
      'Retainer automations keep firing after a project contract ends. Weekly status reports go out late or off-message.',
    fullPain:
      'Two failures rolled into one workflow. Weekly client status reports go out late or off-message because nobody owns the assembly. After a project contract ends, retainer-style automations keep firing — invoicing, reporting, Slack bots — leaving zombie processes and stale access. The closure half is the real money: every disabled automation = saved API spend + no embarrassing "you\'re still being billed for this" client moment.',
    agencyProfile: 'Project-based or mixed retainer/project agencies',
    complexity: 'Medium',
    deliveryDays: '7–11 days',
    trigger: 'Two schedules: weekly Friday 4pm + daily 8am',
    techFlow:
      'Weekly: Fetch Projects → Per Project → Pull Metrics → Narrative → AM Review → Portal + Email + Audit || Daily: Fetch Expired → Disable Automations → Revoke Access → Notify AM → Audit',
    howItWorks: [
      'Flow A — Weekly Status (Friday 4pm): fetch active projects → loop → pull tasks/hours/milestones/blockers → compose narrative → AM review (Slack sendAndWait, 4h) → on approve, post to client portal + email client + audit; on hold, ping PM for edits.',
      'Flow B — Daily Closure Watcher (8am): fetch projects with end_date <= today AND status=active → loop → disable linked automations (kills the zombie retainer flows) → revoke access (portals, Drive, Slack guests) → notify AM with renewal/upsell prompt → write closure audit row.',
      "The closure flow is the real money: every disabled automation = saved API spend + no embarrassing 'you're still being billed for this' client moment. The audit row gives finance evidence the workflow actually stopped.",
    ],
    wireUp: [
      'Postgres (project_status_audit, project_closures tables)',
      'Slack credentials',
      'Gmail / Resend',
      'Project metrics endpoint (PM tool + time tracking)',
      'Client portal endpoint',
      'Automation-disabler endpoint (n8n public API or your control plane)',
      'Access-revocation endpoint',
    ],
    graph: {
      nodes: [
        { id: 'weekly',           label: 'Weekly Status',          kind: 'trigger',  hint: 'Fri 4pm' },
        { id: 'fetch_active',     label: 'Fetch Active Projects',  kind: 'http' },
        { id: 'loop_active',      label: 'Per Project',            kind: 'loop' },
        { id: 'fetch_metrics',    label: 'Tasks + Hours + Milestones', kind: 'http' },
        { id: 'compose',          label: 'Compose Status Narrative', kind: 'set' },
        { id: 'am_review',        label: 'AM Review',              kind: 'approval', hint: '4h, client-facing' },
        { id: 'am_check',         label: 'Approved?',              kind: 'if' },
        { id: 'post_portal',      label: 'Post to Client Portal',  kind: 'http' },
        { id: 'email_client',     label: 'Email Client Status',    kind: 'gmail' },
        { id: 'audit_status',     label: 'Write Status Audit',     kind: 'postgres' },
        { id: 'hold',             label: 'Hold for Edits',         kind: 'slack' },

        { id: 'daily',            label: 'Daily Closure Watcher',  kind: 'trigger',  hint: 'Daily 8am' },
        { id: 'fetch_expired',    label: 'Fetch Expired Projects', kind: 'http',     hint: 'end_date ≤ today' },
        { id: 'loop_expired',     label: 'Per Expired Project',    kind: 'loop' },
        { id: 'disable',          label: 'Disable Automations',    kind: 'http',     hint: 'Kill zombies' },
        { id: 'revoke',           label: 'Revoke Access',          kind: 'http' },
        { id: 'notify_closure',   label: 'Notify AM: Closed',      kind: 'slack' },
        { id: 'audit_closure',    label: 'Write Closure Audit',    kind: 'postgres' },
      ],
      edges: [
        { source: 'weekly',         target: 'fetch_active' },
        { source: 'fetch_active',   target: 'loop_active' },
        { source: 'loop_active',    target: 'fetch_metrics' },
        { source: 'fetch_metrics',  target: 'compose' },
        { source: 'compose',        target: 'am_review' },
        { source: 'am_review',      target: 'am_check' },
        { source: 'am_check',       target: 'post_portal',   label: 'approved' },
        { source: 'am_check',       target: 'hold',          label: 'hold' },
        { source: 'post_portal',    target: 'email_client' },
        { source: 'email_client',   target: 'audit_status' },

        { source: 'daily',          target: 'fetch_expired' },
        { source: 'fetch_expired',  target: 'loop_expired' },
        { source: 'loop_expired',   target: 'disable' },
        { source: 'disable',        target: 'revoke' },
        { source: 'revoke',         target: 'notify_closure' },
        { source: 'notify_closure', target: 'audit_closure' },
      ],
    },
  },
  {
    slug: 'white-label-report-generator',
    title: 'White-Label Report Generator',
    shortPain:
      "When the delivery agency hides behind a reseller's brand, one leak destroys the relationship.",
    fullPain:
      'White-label work hides the delivery agency behind another brand and raises branding, access, and data-isolation stakes. A footer, a PDF metadata Producer field, a from-address — any one of them leaks and the reseller has a problem with their client. Most workflows hope for clean output. This one makes leakage a hard fail: an automated check before any email leaves.',
    agencyProfile: 'White-label / reseller delivery agencies',
    complexity: 'High',
    deliveryDays: '10–15 days',
    trigger: 'Schedule (1st of month, 7am)',
    techFlow:
      'Monthly Schedule → Fetch Engagements → Per Engagement → Fetch Metrics → Strip Delivery Metadata → Render PDF → Verify No Leakage → Reseller Approval → Send As Reseller → Audit',
    howItWorks: [
      'Monthly schedule (1st, 7am) — fetch active white-label engagements (reseller_id, end_client_id, logo, color, send-as email/name, reseller AM channel).',
      'Loop per engagement → fetch end-client metrics → compose record with reseller branding (delivery agency name nowhere in payload).',
      'Render PDF using reseller template (PDF metadata: author / creator / producer all set to reseller).',
      'Leakage verifier scans PDF metadata + URL for forbidden delivery-agency strings.',
      "Reseller AM approval (24h sendAndWait) in the reseller's specific Slack channel.",
      'On approve: send via Gmail with reseller send-as → write white_label_audit row with leakage_check = passed.',
      'On reject or leakage detected: halt before any email leaves; alert reseller channel or ops.',
    ],
    wireUp: [
      'Postgres (white_label_audit table)',
      'Slack (per-reseller channels + #ops-alerts)',
      'Gmail with verified send-as aliases for each reseller (or per-reseller SMTP creds)',
      'Engagements endpoint',
      'End-client metrics endpoint',
      'PDF renderer that supports custom metadata fields and footer overrides',
    ],
    guarantees: [
      'Namespace isolation: every step keys off reporting_namespace = reseller_id:end_client_id',
      'Automated leakage check: Code node greps PDF metadata + URL for forbidden strings; halts before send if found',
      "Reseller-specific approval gate: posts to the reseller's Slack channel, not a global one",
    ],
    graph: {
      nodes: [
        { id: 'schedule',         label: 'Monthly Schedule',         kind: 'trigger',  hint: '1st @ 7am' },
        { id: 'fetch_engagements', label: 'Fetch White-Label Engagements', kind: 'http' },
        { id: 'loop',             label: 'Per Engagement',           kind: 'loop' },
        { id: 'fetch_metrics',    label: 'Fetch End-Client Metrics', kind: 'http' },
        { id: 'strip',            label: 'Strip Delivery Metadata',  kind: 'set',      hint: 'Reseller branding only' },
        { id: 'render',           label: 'Render White-Label PDF',   kind: 'http',     hint: 'Reseller logo + color' },
        { id: 'verify',           label: 'Verify No Leakage',        kind: 'code',     hint: 'Grep PDF metadata' },
        { id: 'leakage_check',    label: 'Clean (No Leakage)?',      kind: 'if' },
        { id: 'reseller_approval', label: 'Reseller AM Approval',    kind: 'approval', hint: '24h, client-facing' },
        { id: 'approved',         label: 'Approved?',                kind: 'if' },
        { id: 'send_as_reseller', label: 'Send As Reseller',         kind: 'gmail' },
        { id: 'audit',            label: 'Write White-Label Audit',  kind: 'postgres' },
        { id: 'reseller_reject',  label: 'Reseller Rejected — Halt', kind: 'slack' },
        { id: 'leakage_halt',     label: 'LEAKAGE — Halt + Page Ops', kind: 'slack',   hint: 'Hard fail' },
      ],
      edges: [
        { source: 'schedule',          target: 'fetch_engagements' },
        { source: 'fetch_engagements', target: 'loop' },
        { source: 'loop',              target: 'fetch_metrics' },
        { source: 'fetch_metrics',     target: 'strip' },
        { source: 'strip',             target: 'render' },
        { source: 'render',            target: 'verify' },
        { source: 'verify',            target: 'leakage_check' },
        { source: 'leakage_check',     target: 'reseller_approval', label: 'clean' },
        { source: 'leakage_check',     target: 'leakage_halt',      label: 'leaked' },
        { source: 'reseller_approval', target: 'approved' },
        { source: 'approved',          target: 'send_as_reseller',  label: 'true' },
        { source: 'approved',          target: 'reseller_reject',   label: 'false' },
        { source: 'send_as_reseller',  target: 'audit' },
      ],
    },
  },
]

export function getWorkflowBySlug(slug: string): WorkflowEntry | undefined {
  return WORKFLOWS.find((w) => w.slug === slug)
}
