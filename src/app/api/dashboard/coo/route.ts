// src/app/api/dashboard/coo/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { applyRateLimit } from '<npm>/lib/rate-limit';
import { openai } from '<npm>/lib/openai';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { COO_TOOLS, TOOL_LABELS } from '<npm>/lib/coo/tools';
import { executeToolCall, type ExecutorContext } from '<npm>/lib/coo/executor';
import { getRecentOutcomes, formatOutcomesForPrompt } from '<npm>/lib/coo/outcomes';
import { buildCooSystemPrompt, PROMPT_VERSION } from '<npm>/lib/coo/prompts/coo-system-v1';
import type { Json } from '<npm>/lib/database.types';
import type OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type UserMessage = { role: 'user'; content: string };
type AssistantMessage = { role: 'assistant'; content: string };
type IncomingMessage = UserMessage | AssistantMessage;

type AgentEvent =
  | { type: 'session'; session_id: string; title: string }
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'action_proposed'; action_id: string; action_type: string; label: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

type FinalAssistantMessage = {
  content: string;
  toolSteps: Array<{ name: string; label: string; done: boolean }>;
  actionCard: { action_id: string; action_type: string; label: string } | null;
};

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

  const body = (await request.json().catch(() => ({}))) as {
    messages?: IncomingMessage[];
    session_id?: string;
  };
  const messages = (body.messages ?? []).slice(-10);
  const incomingSessionId = typeof body.session_id === 'string' && body.session_id ? body.session_id : null;

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

  // Post-Composio-OAuth: tool credentials live in Composio, not in our DB.
  // The executor calls `executeComposioAction(userId, …)` per tool.
  const session = await getSessionSupabaseClient();
  const { data: pendingRows } = await session
    .from('agent_actions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending');
  const pendingActionsCount = (pendingRows ?? []).length;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const lastUserQuestion = lastUserMessage?.content ?? '';

  const ctx: ExecutorContext = {
    userId,
    blendedRate,
    teamSizeRaw,
    lastUserQuestion,
  };

  const recentOutcomes = await getRecentOutcomes(userId, 10);
  const outcomesBlock = formatOutcomesForPrompt(recentOutcomes);

  const systemPrompt = buildCooSystemPrompt({
    companyName,
    blendedRate,
    teamSizeRaw,
    pendingActionsCount,
    outcomesBlock,
  });

  // Surface prompt version for observability — every chat session is
  // attributable to a specific prompt revision (Software 3.0 discipline).
  console.log('[coo-agent] using prompt version:', PROMPT_VERSION);

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

      // Resolve the active session — either reuse the one the client
      // passed (and verify it belongs to this user) or create a new one
      // with the first user message as the title.
      let sessionId = incomingSessionId;
      let sessionTitle = 'New chat';
      try {
        if (sessionId) {
          const { data: existing } = await service
            .from('coo_chat_sessions')
            .select('id, title, user_id')
            .eq('id', sessionId)
            .maybeSingle();
          if (!existing || existing.user_id !== userId) {
            sessionId = null; // tampered or stale id — fall through to create
          } else {
            sessionTitle = existing.title;
          }
        }
        if (!sessionId) {
          const firstUserMsg = lastUserQuestion.slice(0, 60).trim() || 'New chat';
          const { data: created } = await service
            .from('coo_chat_sessions')
            .insert({ user_id: userId, title: firstUserMsg })
            .select('id, title')
            .single();
          if (created) {
            sessionId = created.id;
            sessionTitle = created.title;
          }
        } else if (sessionTitle === 'New chat' && lastUserQuestion.trim()) {
          // Backfill the title now that we have the first real user message
          const candidate = lastUserQuestion.slice(0, 60).trim();
          if (candidate) {
            await service.from('coo_chat_sessions').update({ title: candidate }).eq('id', sessionId);
            sessionTitle = candidate;
          }
        }
      } catch (err) {
        console.error('[coo-agent] session resolve failed:', err);
      }

      // Persist the user's message immediately (so it survives even if
      // the assistant stream is aborted mid-flight)
      if (sessionId && messages.length > 0) {
        const lastUser = messages[messages.length - 1];
        try {
          await service.from('coo_chat_messages').insert({
            session_id: sessionId,
            user_id: userId,
            role: 'user',
            content: lastUser.content,
          });
        } catch (err) {
          console.error('[coo-agent] user message persist failed:', err);
        }
      }

      // Tell the client which session this stream belongs to (first event)
      if (sessionId) {
        emit({ type: 'session', session_id: sessionId, title: sessionTitle });
      }

      // Aggregate the final assistant message so we can persist it at the end
      const finalAssistant: FinalAssistantMessage = { content: '', toolSteps: [], actionCard: null };
      const persistAssistant = async (): Promise<void> => {
        if (!sessionId) return;
        if (!finalAssistant.content && finalAssistant.toolSteps.length === 0 && !finalAssistant.actionCard) return;
        try {
          await service.from('coo_chat_messages').insert({
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            content: finalAssistant.content,
            tool_steps: finalAssistant.toolSteps as unknown as Json,
            action_card: finalAssistant.actionCard as unknown as Json,
          });
        } catch (err) {
          console.error('[coo-agent] assistant message persist failed:', err);
        }
      };

      try {
        const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          ...messages.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
        ];

        let iterations = 0;
        const MAX_ITER = 5;

        while (iterations < MAX_ITER) {
          iterations++;

          // STREAMING: tokens arrive incrementally for both text and tool calls.
          // We accumulate tool_call deltas by index (the OpenAI streaming
          // protocol delivers function name + arguments as a series of partial
          // chunks under the same index). When the model finishes a turn we
          // either dispatch tool calls or close the stream.
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, ...history],
            tools: COO_TOOLS,
            temperature: 0.2,
            max_tokens: 800,
            stream: true,
          });

          const toolCallAcc: Record<number, { id: string; name: string; arguments: string }> = {};
          let assistantTextSoFar = '';
          let finishReason: OpenAI.Chat.Completions.ChatCompletionChunk.Choice['finish_reason'] = null;

          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            if (!choice) continue;

            // Text token — forward immediately for the typing effect
            const contentDelta = choice.delta?.content;
            if (typeof contentDelta === 'string' && contentDelta.length > 0) {
              assistantTextSoFar += contentDelta;
              finalAssistant.content += contentDelta;
              emit({ type: 'text_delta', delta: contentDelta });
            }

            // Tool-call streaming deltas — assemble by index
            const tcDeltas = choice.delta?.tool_calls ?? [];
            for (const tcDelta of tcDeltas) {
              const idx = tcDelta.index;
              if (typeof idx !== 'number') continue;
              const acc = toolCallAcc[idx] ?? { id: '', name: '', arguments: '' };
              if (tcDelta.id) acc.id = tcDelta.id;
              if (tcDelta.function?.name) acc.name = tcDelta.function.name;
              if (tcDelta.function?.arguments) acc.arguments += tcDelta.function.arguments;
              toolCallAcc[idx] = acc;
            }

            if (choice.finish_reason) finishReason = choice.finish_reason;
          }

          // Stream is done for this turn
          if (finishReason === 'stop') {
            await persistAssistant();
            emit({ type: 'done' });
            close();
            return;
          }

          if (finishReason === 'tool_calls') {
            const assembled = Object.values(toolCallAcc).filter((tc) => tc.name);
            const functionCalls: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall[] = assembled.map(
              (tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments || '{}' },
              }),
            );

            history.push({
              role: 'assistant',
              content: assistantTextSoFar || null,
              tool_calls: functionCalls,
            });

            for (const tc of functionCalls) {
              const name = tc.function.name;
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>; } catch { args = {}; }

              const label = TOOL_LABELS[name] ?? `Running ${name}...`;
              finalAssistant.toolSteps.push({ name, label, done: false });
              emit({ type: 'tool_call', name, label });

              const result = await executeToolCall(name, args, ctx);

              const step = finalAssistant.toolSteps.find((s) => s.name === name && !s.done);
              if (step) step.done = true;
              emit({ type: 'tool_done', name });

              if (name === 'queue_action' && result.success) {
                const d = result.data as { action_id: string; label: string };
                finalAssistant.actionCard = {
                  action_id: d.action_id,
                  action_type: args.action_type as string,
                  label: d.label,
                };
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

          // Unexpected finish_reason (length, content_filter, etc.)
          await persistAssistant();
          emit({ type: 'done' });
          close();
          return;
        }

        await persistAssistant();
        emit({ type: 'error', message: 'The COO ran too many steps. Please try a more specific question.' });
        close();
      } catch (err) {
        console.error('[coo-agent] error:', err);
        await persistAssistant();
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
