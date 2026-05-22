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
// First-cut tool surface (v1):
//   - opsradar.search_kb (scope: kb:read)  — public KB content; non-tenant-sensitive
//
// Future tools (Sprint 4+):
//   opsradar.get_finance · get_profitability · get_capacity · get_scope
//   opsradar.propose_action (HITL-gated)
//   opsradar.generate_workflow
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
import { retrieveCooKnowledge } from '<npm>/lib/knowledge-retrieval';
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
};

// ─── Tool registry ───────────────────────────────────────────────────────

const TOOLS: McpTool[] = [
  {
    name: 'opsradar.search_kb',
    description:
      "Search OpsRadar's agency operations knowledge base for industry benchmarks, operational patterns, and best practices. Use for questions about agency norms, what's typical, what to charge, why clients churn, or how other agencies handle a problem.",
    scope: 'kb:read',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Short search query, e.g. "paid media agency margin benchmark"',
        },
      },
      required: ['query'],
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

async function runTool(toolName: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  switch (toolName) {
    case 'opsradar.search_kb': {
      const query = typeof args.query === 'string' ? args.query : '';
      if (!query.trim()) throw new Error('query must be a non-empty string');
      const chunks = retrieveCooKnowledge(query);
      if (chunks.length === 0) {
        return { content: [{ type: 'text', text: `No knowledge-base content found for: "${query}"` }] };
      }
      const formatted = chunks
        .map(
          (c, i) =>
            `## Result ${i + 1} — ${c.frontmatter?.title ?? c.sourceFile}\n` +
            `Category: ${c.category}\n` +
            (c.frontmatter?.summary ? `Summary: ${c.frontmatter.summary}\n` : '') +
            `Source: ${c.sourceFile}\n\n` +
            c.content.slice(0, 2000),
        )
        .join('\n\n---\n\n');
      return { content: [{ type: 'text', text: formatted }] };
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function scopeFor(toolName: string): string | null {
  return TOOLS.find((t) => t.name === toolName)?.scope ?? null;
}

// ─── JSON-RPC handlers ───────────────────────────────────────────────────

async function handleInitialize(): Promise<unknown> {
  return {
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'opsradar',
      version: '0.1.0',
      title: 'OpsRadar',
    },
    capabilities: {
      tools: { listChanged: false },
    },
    instructions:
      'OpsRadar is the AI COO for marketing agencies. Use the search_kb tool to query agency-operations knowledge: benchmarks, playbooks, patterns. Future tools will expose live per-tenant data (finance, profitability, capacity, scope).',
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
    const result = await runTool(name, args);
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

// GET — discovery + health
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    server: 'opsradar',
    version: '0.1.0',
    transport: 'http',
    protocol_version: '2024-11-05',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, scope: t.scope })),
    auth: 'Bearer <supabase-jwt>',
    docs: 'https://opsradar.co/docs/mcp',
  });
}

// POST — JSON-RPC 2.0 entry point
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

  // initialize is the only unauthenticated method
  if (body.method === 'initialize') {
    const result = await handleInitialize();
    return NextResponse.json({ jsonrpc: '2.0', id, result } satisfies JsonRpcResponse);
  }

  // All other methods require auth
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
      {
        jsonrpc: '2.0',
        id,
        error: { code: -32001, message: 'Unauthorised', data: auth.message },
      } satisfies JsonRpcResponse,
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
          {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${body.method}` },
          } satisfies JsonRpcResponse,
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
