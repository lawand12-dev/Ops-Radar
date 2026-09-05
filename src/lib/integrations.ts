// Tool names used across the dashboard. The integrations table CHECK constraint
// in Supabase enforces this at the DB level. Update both when adding a tool.

export type ToolName =
  | 'stripe' | 'hubspot' | 'clickup' | 'asana' | 'toggl' | 'harvest'
  | 'google_ads' | 'meta_ads' | 'calendly' | 'quickbooks' | 'pipedrive'
  | 'salesforce' | 'monday' | 'apollo';
