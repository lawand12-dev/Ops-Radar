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
  },
]

export function getWorkflowBySlug(slug: string): WorkflowEntry | undefined {
  return WORKFLOWS.find((w) => w.slug === slug)
}
