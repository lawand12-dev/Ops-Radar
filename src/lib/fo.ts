// FO (Fractional Operator) multi-client dashboard types.
// Branch: main / Supabase. The FO entity is a Supabase user with plan='fo'.

export type FoClient = {
  id: string;
  agency_name: string;
  team_size: string | null;
  notes: string | null;
  created_at: string;
};

export type FoIntegrationSummary = {
  id: string;
  tool: string;
  status: string;
  connected_at: string;
};

export type FoIntegrationRow = {
  id: string;
  fo_client_id: string;
  fo_user_id: string;
  tool: string;
  encrypted_token: string;
  iv: string;
  auth_tag: string;
  status: string;
};

export type FoClientHealth = {
  client: FoClient;
  margin_pct: number | null;
  total_revenue_mtd: number | null;
  total_cost_mtd: number | null;
  at_risk_projects: number;
  integrations_connected: string[];
  computed_at: string;
  fetch_errors: string[];
};

export type FoDashboardResponse = {
  clients: FoClientHealth[];
  total_revenue_mtd: number;
  total_at_risk: number;
  computed_at: string;
};

/**
 * Tools supported for per-agency integration on the FO dashboard.
 * Mirrors the main app's supported integrations.
 */
export const FO_SUPPORTED_TOOLS = [
  'stripe',
  'harvest',
  'clickup',
  'hubspot',
  'asana',
  'monday',
  'toggl',
  'pipedrive',
  'apollo',
  'calendly',
] as const;

export type FoSupportedTool = (typeof FO_SUPPORTED_TOOLS)[number];

export function isFoSupportedTool(value: string): value is FoSupportedTool {
  return (FO_SUPPORTED_TOOLS as readonly string[]).includes(value);
}
