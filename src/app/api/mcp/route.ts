// src/app/api/mcp/route.ts
//
// OpsRadar MCP server (Model Context Protocol).
// External agents (Claude Desktop, ChatGPT, partner-agency agents) call this
// endpoint to query OpsRadar capabilities.
//
// Transport: streamable HTTP per the MCP spec. JSON-RPC 2.0 envelope.
// Auth: Bearer <supabase-jwt> — we validate against Supabase Auth and scope
//   the call to the JWT's user_id. No multi-tenant leakage possible.
// Audit: every invocation written to mcp_invocations.
//
// Tool surface (v1):
//   READ TOOLS (load the tenant's integration keys + call the existing executor)
//   - opsradar.get_sales           (scope: sales:read)
//   - opsradar.get_profitability   (scope: profitability:read)
//   - opsradar.get_capacity        (scope: capacity:read)
//   - opsradar.get_scope           (scope: scope:read)
//   - opsradar.get_outbound        (scope: outbound:read)
//   - opsradar.get_meetings        (scope: meetings:read)
//   ACTION TOOLS (HITL-gated — never auto-executes)
//   - opsradar.propose_action      (scope: actions:write) — queues to agent_actions
//
// Install in Claude Desktop:
//   ~/Library/Application Support/Claude/claude_desktop_config.json
//   { "mcpServers": { "opsradar": {
//       "transport": "http",
//       "url": "https://opsradar.co/api/mcp",
//       "headers": { "Authorization": "Bearer <your-token>" }
//   }}}

import { type NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { executeToolCall } from '<npm>/lib/coo/executor';
import { buildExecutorContext } from '<npm>/lib/coo/build-executor-context';
import type { Json } from '<npm>/lib/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// ─── MCP protocol types ──────────────────────────────────────────────────

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: number | string | null; result: unknown }
  | { jsonrpc: '2.0'; id: number | string | null; error: { code: number; message: string; data?: unknown } };

type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  scope: string;
  // Maps the MCP tool name → the executor tool name (which may have a different shape).
  // null = handled inline (e.g. KB search has its own handler in runTool).
  executorName: string | null;
};

// ─── Tool registry ───────────────────────────────────────────────────────

const TOOLS: McpTool[] = [
  // ─── Read tools ────────────────────────────────────────────────────────
  {
    name: 'opsradar.get_sales',
    description:
      "Fetch live CRM pipeline data: total pipeline value, open deal count, deals won this month. Uses HubSpot if connected, otherwise Pipedrive.",
    scope: 'sales:read',
    executorName: 'get_sales',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'opsradar.get_profitability',
    description:
      'Per-client profitability: revenue vs hours vs margin for each active client. Use for any question about unprofitable clients, repricing decisions, or where the agency is losing money.',
    scope: 'profitability:read',
    executorName: 'get_profitability',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'opsradar.get_capacity',
    description:
      'Team capacity: utilization %, hours tracked this month, available hours remaining. Uses Harvest if connected, otherwise Toggl.',
    scope: 'capacity:read',
    executorName: 'get_capacity',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'opsradar.get_scope',
    description:
      'Project delivery and scope-creep signals: which projects are over budget, by how much, and which are approaching their hours cap. Uses ClickUp + Harvest if both connected, otherwise Asana or Monday.',
    scope: 'scope:read',
    executorName: 'get_scope',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'opsradar.get_outbound',
    description:
      'Outbound marketing/sales metrics from Apollo: emails sent, open rate, reply rate, top sequences.',
    scope: 'outbound:read',
    executorName: 'get_outbound',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'opsradar.get_meetings',
    description:
      'Meeting bookings from Calendly: number of meetings booked, conversion rate, upcoming meetings.',
    scope: 'meetings:read',
    executorName: 'get_meetings',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  // CP-16: opsradar.search_kb removed pending KB reframe.

  // ─── Action tools (HITL-gated) ─────────────────────────────────────────
  {
    name: 'opsradar.propose_action',
    description:
      "Propose a draft action for the agency owner to review in their Actions queue. Never auto-executes — the owner reviews and decides what to do. Use this AFTER calling the relevant read tool so the proposal references real numbers. Only these action types are supported: margin_alert, hours_budget_exceeded, scope_approaching, retainer_overage.",
    scope: 'actions:write',
    executorName: 'queue_action',
    inputSchema: {
      type: 'object',
      properties: {
        action_type: {
          type: 'string',
          enum: ['margin_alert', 'hours_budget_exceeded', 'scope_approaching', 'retainer_overage'],
        },
        label: { type: 'string', description: 'One-line summary shown to the owner' },
        client_name: { type: 'string' },
        project_name: { type: 'string', description: 'Required for hours_budget_exceeded and scope_approaching' },
        metrics: {
          type: 'object',
          description:
            'Numeric metrics. margin_alert: { margin_pct, revenue_mtd_usd, cost_usd }. hours_budget_exceeded: { hours_logged, budget_hours, overrun_pct }. scope_approaching: { hours_logged, budget_hours, used_pct }. retainer_overage: { hours_logged }.',
        },
        draft_subject: { type: 'string' },
        draft_body: { type: 'string', description: '3-6 sentences, professional, references the numbers, ends with a clear ask' },
      },
      required: ['action_type', 'label', 'client_name', 'metrics', 'draft_subject', 'draft_body'],
    },
  },
];

// ─── Auth ────────────────────────────────────────────────────────────────

type AuthResult =
  | { ok: true; userId: string; caller: string }
  | { ok: false; status: 'unauthorised' | 'invalid_token'; message: string };

async function authenticate(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') ?? '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, status: 'unauthorised', message: 'Missing Bearer token' };

  const token = m[1].trim();
  if (!token) return { ok: false, status: 'unauthorised', message: 'Empty Bearer token' };

  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { ok: false, status: 'invalid_token', message: 'Token did not resolve to a user' };

    const caller =
      request.headers.get('x-mcp-client') ??
      request.headers.get('user-agent')?.slice(0, 80) ??
      'unknown';

    return { ok: true, userId: data.user.id, caller };
  } catch {
    return { ok: false, status: 'invalid_token', message: 'Auth lookup failed' };
  }
}

// ─── Audit log ───────────────────────────────────────────────────────────

async function logInvocation(input: {
  userId: string | null;
  caller: string | null;
  toolName: string;
  scope: string | null;
  args: Record<string, unknown> | null;
  resultStatus: 'success' | 'error' | 'unauthorised' | 'rate_limited';
  errorMessage?: string;
  latencyMs: number;
}): Promise<void> {
  try {
    const supabase = getServerSupabaseClient();
    await supabase.from('mcp_invocations').insert({
      user_id: input.userId,
      caller: input.caller,
      tool_name: input.toolName,
      scope: input.scope,
      args: input.args as unknown as Json,
      result_status: input.resultStatus,
      error_message: input.errorMessage ?? null,
      latency_ms: input.latencyMs,
    });
  } catch {
    // Audit failures must not break the agent
  }
}

// ─── Tool execution ──────────────────────────────────────────────────────

async function runTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const tool = TOOLS.find((t) => t.name === toolName);
  if (!tool) throw new Error(`Unknown tool: ${toolName}`);

  if (!tool.executorName) throw new Error(`Tool ${toolName} has no executor binding`);

  const lastQuestion =
    typeof args.context === 'string' ? args.context : `MCP call to ${toolName}`;
  const ctx = await buildExecutorContext(userId, lastQuestion);
  const result = await executeToolCall(tool.executorName, args, ctx);

  if (!result.success) {
    return {
      content: [{ type: 'text', text: `Tool returned no usable data: ${result.reason}` }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
  };
}

function scopeFor(toolName: string): string | null {
  return TOOLS.find((t) => t.name === toolName)?.scope ?? null;
}

// ─── JSON-RPC handlers ───────────────────────────────────────────────────

async function handleInitialize(): Promise<unknown> {
  return {
    protocolVersion: '2024-11-05',
    serverInfo: { name: 'opsradar', version: '0.2.0', title: 'OpsRadar' },
    capabilities: { tools: { listChanged: false } },
    instructions:
      'OpsRadar is the AI COO for marketing agencies. Use the get_* tools for live per-tenant data (finance, profitability, capacity, scope, outbound, meetings). Use propose_action to queue a draft action for owner review — never auto-executes.',
  };
}

function handleToolsList(): unknown {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

async function handleToolsCall(
  params: Record<string, unknown>,
  ctx: { userId: string; caller: string },
): Promise<unknown> {
  const name = typeof params.name === 'string' ? params.name : '';
  const args = (params.arguments && typeof params.arguments === 'object'
    ? (params.arguments as Record<string, unknown>)
    : {});

  const started = Date.now();
  try {
    const result = await runTool(name, args, ctx.userId);
    await logInvocation({
      userId: ctx.userId,
      caller: ctx.caller,
      toolName: name,
      scope: scopeFor(name),
      args,
      resultStatus: 'success',
      latencyMs: Date.now() - started,
    });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logInvocation({
      userId: ctx.userId,
      caller: ctx.caller,
      toolName: name,
      scope: scopeFor(name),
      args,
      resultStatus: 'error',
      errorMessage: msg,
      latencyMs: Date.now() - started,
    });
    throw err;
  }
}

// ─── Route handlers ──────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    server: 'opsradar',
    version: '0.2.0',
    transport: 'http',
    protocol_version: '2024-11-05',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, scope: t.scope })),
    auth: 'Bearer <supabase-jwt>',
    docs: 'https://opsradar.co/docs/mcp',
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 },
    );
  }

  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return NextResponse.json(
      { jsonrpc: '2.0', id: body.id ?? null, error: { code: -32600, message: 'Invalid Request' } },
      { status: 400 },
    );
  }

  const id = body.id ?? null;
  const params = body.params ?? {};

  if (body.method === 'initialize') {
    const result = await handleInitialize();
    return NextResponse.json({ jsonrpc: '2.0', id, result } satisfies JsonRpcResponse);
  }

  const auth = await authenticate(request);
  if (!auth.ok) {
    await logInvocation({
      userId: null,
      caller: request.headers.get('user-agent')?.slice(0, 80) ?? null,
      toolName: body.method,
      scope: null,
      args: null,
      resultStatus: 'unauthorised',
      errorMessage: auth.message,
      latencyMs: 0,
    });
    return NextResponse.json(
      { jsonrpc: '2.0', id, error: { code: -32001, message: 'Unauthorised', data: auth.message } } satisfies JsonRpcResponse,
      { status: 401 },
    );
  }

  try {
    switch (body.method) {
      case 'tools/list': {
        const result = handleToolsList();
        return NextResponse.json({ jsonrpc: '2.0', id, result } satisfies JsonRpcResponse);
      }
      case 'tools/call': {
        const result = await handleToolsCall(params, { userId: auth.userId, caller: auth.caller });
        return NextResponse.json({ jsonrpc: '2.0', id, result } satisfies JsonRpcResponse);
      }
      default:
        return NextResponse.json(
          { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${body.method}` } } satisfies JsonRpcResponse,
          { status: 404 },
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { jsonrpc: '2.0', id, error: { code: -32603, message: msg } } satisfies JsonRpcResponse,
      { status: 500 },
    );
  }
}
