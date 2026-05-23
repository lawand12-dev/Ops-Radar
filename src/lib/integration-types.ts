/**
 * Type definitions for integration data shapes.
 *
 * History: these used to live alongside the legacy Model C adapters in
 * src/lib/integrations/{tool}/adapter.ts. After the Composio migration
 * (commits 6610d1f → da1bf98 → a2052f8...), those adapter implementations
 * were deleted. The TYPE definitions remain because dashboard widgets +
 * COO chat + agent loop all reshape Composio responses back into these
 * shapes so the frontend doesn't need to change.
 *
 * Note: AdapterValidation was duplicated identically across all 10 legacy
 * adapter files; it is exported here exactly once.
 */

// ===== Shared =====
export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

// ===== Stripe =====
export type StripeInvoiceRow = {
  id: string;
  customer_name: string;
  amount: number; // USD
  due_date: string; // YYYY-MM-DD
  days_overdue: number;
};

export type StripeRecentCharge = {
  id: string;
  customer_name: string | null;
  amount: number; // USD
  timestamp: string; // ISO8601
};

export type StripeFinanceData = {
  invoiced: number; // USD, this month-to-date (sum of invoice amount_due)
  paid: number; // USD, this month-to-date (sum of paid invoice amount_paid)
  overdue: number; // USD, currently outstanding past due
  sparkline: Array<{ date: string; amount: number }>; // last 30 days, daily charge totals
  currency: 'USD';
  rows: StripeInvoiceRow[];
  recent_charges: StripeRecentCharge[]; // last 5 succeeded charges for activity feed
};

export type StripeClientRevenue = {
  id: string;
  name: string;
  revenue_current: number;   // USD paid invoices, current month-to-date
  revenue_prior: number;     // USD paid invoices, prior full month
  payment_status: 'on_time' | 'overdue' | 'unknown';
  days_overdue: number | null;
};

export type StripePerClientData = {
  clients: StripeClientRevenue[];
  currency: 'USD';
};

// ===== HubSpot =====
export type HubspotDealRow = {
  id: string;
  name: string;
  amount: number;              // USD
  stage: string;
  close_date: string | null;  // YYYY-MM-DD or null
};

export type HubspotWonDeal = {
  id: string;
  name: string;
  amount: number; // USD
  closed_at: string; // ISO8601
};

export type HubspotSalesData = {
  pipeline_value: number;             // sum of `amount` for all open deals (USD)
  open_deals_count: number;
  new_leads: number;                  // contacts created in last 30 days
  deals_won_this_month: number;       // count of deals closed-won this month
  sparkline: Array<{ date: string; deals_created: number }>; // last 30 days
  currency: 'USD';
  truncated: boolean;                 // true if either deals or contacts response had a next page
  rows: HubspotDealRow[];
  recent_deals_won: HubspotWonDeal[]; // last 5 won deals in 30 days for activity feed
};

// ===== Harvest =====
export type HarvestProjectRow = {
  project_name: string;
  hours: number;
  client_name: string | null;
};

export type HarvestTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: HarvestProjectRow[];
  period_label: string;
};

export type HarvestMonthlyProjectRow = {
  project_name: string;
  hours: number;
};

export type HarvestMonthlyProjectData = {
  projects: HarvestMonthlyProjectRow[];
};

export type HarvestClientHours = {
  name: string;
  hours_current: number;
  hours_prior: number;
};

export type HarvestPerClientData = {
  clients: HarvestClientHours[];
};

// ===== ClickUp =====
export type ClickupProjectBudget = {
  project_name: string;
  estimated_hours: number;
};

export type ClickupScopeData = {
  projects: ClickupProjectBudget[];
};

// ===== Pipedrive =====
export type PipedriveDealRow = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  expected_close: string | null;
};

export type PipedriveSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  deals_won_this_month: number;
  rows: PipedriveDealRow[];
  currency: string;
};

// ===== Apollo =====
export type ApolloMarketingData = {
  emails_sent: number;
  open_rate_pct: number;
  reply_rate_pct: number;
  reply_sparkline: number[];
  sequences: Array<{
    id: string;
    name: string;
    contacts_enrolled: number;
    emails_sent: number;
    open_rate_pct: number;
    reply_rate_pct: number;
  }>;
  period_label: string;
};

// ===== Toggl =====
export type TogglTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: Array<{
    project_name: string;
    hours: number;
    color: string;
  }>;
  period_label: string;
};

// ===== Calendly =====
export type CalendlyBookingsData = {
  meetings_booked: number;
  meeting_conversion_pct: number | null;
  period_label: string;
  upcoming: Array<{
    name: string;
    invitee_name: string;
    invitee_email: string;
    start_time: string;
  }>;
};
