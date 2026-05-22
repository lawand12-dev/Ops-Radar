// src/app/dashboard/settings/mcp/page.tsx
//
// MCP token + install snippet UI. Server component that loads the
// user's current Supabase session JWT (= their MCP Bearer token) and
// renders paste-ready install snippets for Claude Desktop + ChatGPT
// + raw HTTP usage.

import { redirect } from 'next/navigation';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { McpTokenView } from './_components/mcp-token-view';

export const dynamic = 'force-dynamic';

const MCP_TOOLS = [
  { name: 'opsradar.get_finance', scope: 'finance:read', description: 'Stripe finance snapshot' },
  { name: 'opsradar.get_sales', scope: 'sales:read', description: 'HubSpot/Pipedrive pipeline' },
  { name: 'opsradar.get_profitability', scope: 'profitability:read', description: 'Per-client margins' },
  { name: 'opsradar.get_capacity', scope: 'capacity:read', description: 'Team utilization' },
  { name: 'opsradar.get_scope', scope: 'scope:read', description: 'Scope creep signals' },
  { name: 'opsradar.get_outbound', scope: 'outbound:read', description: 'Apollo outbound metrics' },
  { name: 'opsradar.get_meetings', scope: 'meetings:read', description: 'Calendly bookings' },
  { name: 'opsradar.search_kb', scope: 'kb:read', description: 'Search the OpsRadar agency-ops knowledge base' },
  { name: 'opsradar.propose_action', scope: 'actions:write', description: 'Queue an action for owner review (HITL)' },
  { name: 'opsradar.generate_workflow', scope: 'workflows:write', description: 'Generate an automation workflow from natural language' },
];

export default async function McpSettingsPage() {
  const supabase = await getSessionSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect('/login?next=/dashboard/settings/mcp');
  }

  const accessToken = session.access_token;
  const mcpUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opsradar.co'}/api/mcp`;

  return (
    <div className="mx-auto max-w-3xl py-10 px-4 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">MCP — Model Context Protocol</h1>
        <p className="text-sm text-muted-foreground">
          Let external AI agents (Claude Desktop, ChatGPT, partner-agency agents) query your OpsRadar
          data and propose actions through the Model Context Protocol. Your token below is scoped to
          your account — no other tenant can be accessed with it.
        </p>
      </header>

      <McpTokenView token={accessToken} mcpUrl={mcpUrl} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Available tools</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tool</th>
                <th className="text-left px-4 py-2 font-medium">Scope</th>
                <th className="text-left px-4 py-2 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody>
              {MCP_TOOLS.map((t) => (
                <tr key={t.name} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs">{t.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{t.scope}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Security</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Bearer token = your current Supabase session JWT. Rotates whenever you re-authenticate.</li>
          <li>Every call is audited to <code className="text-xs">mcp_invocations</code> — caller, scope, args, latency, result.</li>
          <li>Cross-tenant data access is structurally impossible — the token resolves only to your <code className="text-xs">user_id</code>.</li>
          <li><code className="text-xs">propose_action</code> and <code className="text-xs">generate_workflow</code> are HITL-gated. Nothing auto-executes without your approval in <a href="/dashboard/actions" className="underline">Actions</a>.</li>
        </ul>
      </section>
    </div>
  );
}
