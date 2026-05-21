// src/app/api/dashboard/coo/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { applyRateLimit } from '<npm>/lib/rate-limit';
import { openai } from '<npm>/lib/openai';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { COO_TOOLS, TOOL_LABELS } from '<npm>/lib/coo/tools';
import { executeToolCall, type ExecutorContext } from '<npm>/lib/coo/executor';
import type OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type UserMessage = { role: 'user'; content: string };
type AssistantMessage = { role: 'assistant'; content: string };
type IncomingMessage = UserMessage | AssistantMessage;

type AgentEvent =
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'action_proposed'; action_id: string; action_type: string; label: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

const SUGGESTED_QUESTIONS = [
  'How did we do this month?',
  'Which clients should I worry about?',
  'Will I make payroll next month?',
  'Which clients should I reprice?',
  'How close are we to capacity?',
  'What are the most important things to do today?',
];

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ suggested_questions: SUGGESTED_QUESTIONS });
}

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const limited = await applyRateLimit(request, 'dashboard-coo', userId);
  if (limited) return limited as Response;

  const body = (await request.json().catch(() => ({}))) as { messages?: IncomingMessage[] };
  const messages = (body.messages ?? []).slice(-10);

  if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
  }

  const service = getServerSupabaseClient();
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId);
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const plan = getUserPlan(meta);
  if (!canAccess(plan, 'coo_chat')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
  }

  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number' ? meta.blended_hourly_rate_usd : 85;
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : 'your agency';
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : '';

  const session = await getSessionSupabaseClient();
  const { data: keyRows } = await session
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected');

  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool);
    try { return row ? decryptApiKey(row) : null; } catch { return null; }
  };

  const { data: pendingRows } = await session
    .from('agent_actions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending');
  const pendingActionsCount = (pendingRows ?? []).length;

  const ctx: ExecutorContext = {
    stripeKey: getKey('stripe'),
    hubspotKey: getKey('hubspot'),
    harvestKey: getKey('harvest'),
    clickupKey: getKey('clickup'),
    pipedriveKey: getKey('pipedrive'),
    togglKey: getKey('toggl'),
    asanaKey: getKey('asana'),
    mondayKey: getKey('monday'),
    apolloKey: getKey('apollo'),
    calendlyKey: getKey('calendly'),
    blendedRate,
    teamSizeRaw,
    userId,
  };

  const systemPrompt = `You are the AI COO of ${companyName}. You answer questions about the business using live data from your tools.

Rules you MUST follow:
1. Before answering any question about metrics, finances, clients, pipeline, or capacity — call the relevant tool first
2. Base your answer ONLY on tool results — never guess or invent numbers
3. If a tool returns success: false, tell the user that data is unavailable and what integration to connect
4. For questions about industry norms, benchmarks, best practices, or "what's typical" — call search_kb FIRST to ground your answer in OpsRadar's research library
5. When you spot a concrete problem (low-margin client, scope overrun, retainer over its hours), call queue_action AFTER explaining it. The action saves a draft email/note to the user's Actions queue — nothing is sent automatically. Only use queue_action for the 4 supported types: margin_alert, hours_budget_exceeded, scope_approaching, retainer_overage.
6. Be concise and direct. Dollar amounts over adjectives. No markdown headers.

Account context (from settings — do not fetch via tools):
- Company: ${companyName}
- Blended hourly rate: $${blendedRate}/hr
- Team size: ${teamSizeRaw || 'not set in settings'}
- Pending actions awaiting approval: ${pendingActionsCount}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      function emit(event: AgentEvent) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      function close() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      try {
        const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          ...messages.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
        ];

        let iterations = 0;
        const MAX_ITER = 5;

        while (iterations < MAX_ITER) {
          iterations++;

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, ...history],
            tools: COO_TOOLS,
            temperature: 0.2,
            max_tokens: 800,
          });

          const choice = completion.choices[0];
          if (!choice) break;

          if (choice.finish_reason === 'stop') {
            emit({ type: 'text_delta', delta: choice.message.content ?? '' });
            emit({ type: 'done' });
            close();
            return;
          }

          if (choice.finish_reason === 'tool_calls') {
            const toolCalls = choice.message.tool_calls ?? [];
            const functionCalls = toolCalls.filter(
              (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === 'function',
            );
            history.push({
              role: 'assistant',
              content: choice.message.content ?? null,
              tool_calls: functionCalls,
            });

            for (const tc of functionCalls) {
              const name = tc.function.name;
              const args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;

              emit({ type: 'tool_call', name, label: TOOL_LABELS[name] ?? `Running ${name}...` });

              const result = await executeToolCall(name, args, ctx);

              emit({ type: 'tool_done', name });

              if (name === 'queue_action' && result.success) {
                const d = result.data as { action_id: string; label: string };
                emit({
                  type: 'action_proposed',
                  action_id: d.action_id,
                  action_type: args.action_type as string,
                  label: d.label,
                });
              }

              history.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
            continue;
          }

          // Unexpected finish_reason (length, content_filter, etc.) — emit any partial text and stop
          const partial = choice.message.content ?? '';
          if (partial) emit({ type: 'text_delta', delta: partial });
          emit({ type: 'done' });
          close();
          return;
        }

        emit({ type: 'error', message: 'The COO ran too many steps. Please try a more specific question.' });
        close();
      } catch (err) {
        console.error('[coo-agent] error:', err);
        emit({ type: 'error', message: 'Something went wrong. Please try again.' });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
