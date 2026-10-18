// src/app/dashboard/settings/mcp/page.tsx
//
// MCP token + install snippet UI. Server component that loads the
// user's current Supabase session JWT (= their MCP Bearer token) and
// renders paste-ready install snippets for Claude Desktop + ChatGPT
// + raw HTTP usage.

import { redirect } from 'next/navigation';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { McpTokenView } from './_components/mcp-token-view';

export const dynamic = 'force-dynamic';

const MCP_TOOLS = [
  { name: 'opsradar.get_sales', scope: 'sales:read', description: 'HubSpot/Pipedrive pipeline' },
  { name: 'opsradar.get_profitability', scope: 'profitability:read', description: 'Per-client margins' },
  { name: 'opsradar.get_capacity', scope: 'capacity:read', description: 'Team utilization' },
  { name: 'opsradar.get_scope', scope: 'scope:read', description: 'Scope creep signals' },
  { name: 'opsradar.get_outbound', scope: 'outbound:read', description: 'Apollo outbound metrics' },
  { name: 'opsradar.get_meetings', scope: 'meetings:read', description: 'Calendly bookings' },
  { name: 'opsradar.propose_action', scope: 'actions:write', description: 'Queue an action for owner review (HITL)' },
];

type McpInvocation = {
  id: number;
  caller: string | null;
  tool_name: string;
  scope: string | null;
  result_status: string;
  latency_ms: number | null;
  created_at: string;
};

type ToolStat = {
  tool_name: string;
  call_count: number;
  success_count: number;
  error_count: number;
  avg_latency_ms: number;
};

export default async function McpSettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login?next=/dashboard/settings/mcp');

  const supabase = await getSessionSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect('/login?next=/dashboard/settings/mcp');
  }

  const accessToken = session.access_token;
  const mcpUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opsradar.co'}/api/mcp`;

  // Audit log — last 20 invocations + per-tool 7-day rollup
  const service = getServerSupabaseClient();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recentRes, statsRes] = await Promise.all([
    service
      .from('mcp_invocations')
      .select('id, caller, tool_name, scope, result_status, latency_ms, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    service
      .from('mcp_invocations')
      .select('tool_name, result_status, latency_ms')
      .eq('user_id', userId)
      .gte('created_at', since7d),
  ]);

  const recent = (recentRes.data ?? []) as McpInvocation[];
  const last7d = (statsRes.data ?? []) as Array<Pick<McpInvocation, 'tool_name' | 'result_status' | 'latency_ms'>>;

  // Roll up per-tool stats client-side (small set; no need for an RPC)
  const statsByTool: Record<string, ToolStat> = {};
  for (const r of last7d) {
    const s = statsByTool[r.tool_name] ?? {
      tool_name: r.tool_name,
      call_count: 0,
      success_count: 0,
      error_count: 0,
      avg_latency_ms: 0,
    };
    s.call_count++;
    if (r.result_status === 'success') s.success_count++;
    else s.error_count++;
    if (typeof r.latency_ms === 'number') s.avg_latency_ms += r.latency_ms;
    statsByTool[r.tool_name] = s;
  }
  const toolStats = Object.values(statsByTool)
    .map((s) => ({ ...s, avg_latency_ms: s.call_count ? Math.round(s.avg_latency_ms / s.call_count) : 0 }))
    .sort((a, b) => b.call_count - a.call_count);

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
        <h2 className="text-lg font-semibold">Usage — last 7 days</h2>
        {toolStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No MCP calls yet. After you install OpsRadar in Claude Desktop or another MCP client and run a query, calls will appear here.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Tool</th>
                  <th className="text-right px-4 py-2 font-medium">Calls</th>
                  <th className="text-right px-4 py-2 font-medium">Success</th>
                  <th className="text-right px-4 py-2 font-medium">Errors</th>
                  <th className="text-right px-4 py-2 font-medium">Avg latency</th>
                </tr>
              </thead>
              <tbody>
                {toolStats.map((s) => (
                  <tr key={s.tool_name} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{s.tool_name}</td>
                    <td className="px-4 py-2 text-right">{s.call_count}</td>
                    <td className="px-4 py-2 text-right text-emerald-500">{s.success_count}</td>
                    <td className={`px-4 py-2 text-right ${s.error_count > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {s.error_count}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{s.avg_latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent invocations</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invocations yet.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">When</th>
                  <th className="text-left px-4 py-2 font-medium">Caller</th>
                  <th className="text-left px-4 py-2 font-medium">Tool</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Latency</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2 text-xs truncate max-w-[180px]" title={r.caller ?? '—'}>
                      {r.caller ?? '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.tool_name}</td>
                    <td className="px-4 py-2 text-xs">
                      <span
                        className={`font-mono ${
                          r.result_status === 'success'
                            ? 'text-emerald-500'
                            : r.result_status === 'unauthorised'
                              ? 'text-amber-500'
                              : 'text-red-500'
                        }`}
                      >
                        {r.result_status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {r.latency_ms != null ? `${r.latency_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
