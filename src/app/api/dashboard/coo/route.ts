// src/app/api/dashboard/coo/route.ts
//
// CP-14 Day 2: migrated from raw OpenAI SDK to Vercel AI SDK v6.
//
// Why: the AI SDK ships `needsApproval` as a first-class tool flag (Day 3
// will wire that in). The raw OpenAI SDK had no equivalent so we'd have had
// to hand-roll the entire approval-loop machinery. Migration also unifies
// the COO chat with the 10 cron agents (which already use generateText).
//
// What's PRESERVED (the public contract — the frontend depends on these):
//   - SSE event shape:  session, tool_call, tool_done, text_delta,
//                       action_proposed, done, error
//   - Session resolution + title backfill + per-message persistence
//   - Tool labels via TOOL_LABELS
//   - Action card emission when queue_action succeeds
//   - 5-step max iteration (now via stepCountIs(5))
//
// What CHANGED under the hood:
//   - openai.chat.completions.create({stream:true}) → streamText({...})
//   - Manual tool_calls delta accumulation → handled by SDK
//   - Tool execution loop → handled by SDK (we still pass executeToolCall
//     via buildAiSdkCooTools)
//   - We iterate result.fullStream to drive our existing SSE events

import { type NextRequest, NextResponse } from 'next/server';
import { streamText, stepCountIs, type LanguageModel } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { applyRateLimit } from '<npm>/lib/rate-limit';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { checkQuota, recordUsage } from '<npm>/lib/usage/track';
import { TOOL_LABELS } from '<npm>/lib/coo/tools';
import { type ExecutorContext } from '<npm>/lib/coo/executor';
import { buildAiSdkCooTools } from '<npm>/lib/coo/ai-sdk-tools';
// Skills are now lazy — no catalog injection at boot. The list_skills + load_skill
// tools in buildAiSdkCooTools handle on-demand discovery and loading.
import {
  COMPOSIO_TOOLS,
  getComposioToolsForUser,
  getConnectedToolSlugs,
} from '<npm>/lib/composio';
import { wrapToolsWithApprovalGate } from '<npm>/lib/agents/approval-gate';
import { getRecentOutcomes, formatOutcomesForPrompt } from '<npm>/lib/coo/outcomes';
import { buildCooSystemPrompt, PROMPT_VERSION } from '<npm>/lib/coo/prompts/coo-system-v1';
import type { Json } from '<npm>/lib/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  // Direct properties (AI SDK error object)
  if (e.code === 'rate_limit_exceeded') return true;
  if (e.status === 429 || e.statusCode === 429) return true;
  // Nested .error field (stream error chunk shape from AI SDK)
  const inner = e.error as Record<string, unknown> | undefined;
  if (inner?.code === 'rate_limit_exceeded') return true;
  if (inner?.type === 'tokens' && inner?.code === 'rate_limit_exceeded') return true;
  return false;
}

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

  // Monthly OpenAI quota gate. If exhausted, return 429 so the UI can show
  // an upgrade nudge instead of starting an expensive stream.
  const openaiQuota = await checkQuota({ userId, provider: 'openai' });
  if (!openaiQuota.allowed) {
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        provider: 'openai',
        used: openaiQuota.used,
        cap: openaiQuota.cap,
        resets_at: openaiQuota.resetsAt.toISOString(),
        message: `Monthly AI compute cap reached (${openaiQuota.used.toLocaleString()} / ${openaiQuota.cap.toLocaleString()} tokens). Resets ${openaiQuota.resetsAt.toISOString().slice(0, 10)}.`,
      },
      { status: 429 },
    );
  }

  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number' ? meta.blended_hourly_rate_usd : 85;
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : 'your agency';
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : '';

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

  // Composio sub-agent power: load the customer's most-recently-used
  // toolkits and wrap them with the approval gate. Cap at 2 toolkits to
  // stay inside the 30k TPM limit on OpenAI Tier 1.
  //
  // Why 2: each Composio toolkit exposes 60-100 actions × ~200 tokens each
  // = ~12k-20k tokens. System prompt + skills catalog already uses ~8k.
  // At cap=3 total context easily hits 24k+, triggering rate_limit_exceeded
  // before the model can even respond. At cap=2 we stay around 15k tokens.
  //
  // Notion is always included (reserved slot) — it's the Brain and must be
  // available regardless of usage order. So effectively: Notion + 1 other.
  //
  // Phase 2 will replace this with a sub-agent router pattern (one delegation
  // tool per toolkit instead of every action exposed flat).
  //
  // NOTE: connectedSlugs is resolved HERE (before the system prompt) so
  // notionConnected can be injected into the prompt. The model must not be
  // told to call NOTION_* tools if Notion isn't actually connected.
  const COMPOSIO_TOOLKIT_CAP = 2;
  let composioTools: Awaited<ReturnType<typeof getComposioToolsForUser>> = {};
  let notionConnected = false;
  try {
    const connectedSlugs = await getConnectedToolSlugs(userId);
    const hasNotion = connectedSlugs.includes('notion' as typeof connectedSlugs[number]);
    notionConnected = hasNotion;
    const others = connectedSlugs.filter((s) => s !== 'notion');
    const otherTop = others.slice(0, hasNotion ? COMPOSIO_TOOLKIT_CAP - 1 : COMPOSIO_TOOLKIT_CAP);
    const top = hasNotion ? [...otherTop, 'notion' as typeof connectedSlugs[number]] : otherTop;
    if (top.length > 0) {
      const toolkits = top.map((s) => COMPOSIO_TOOLS[s]);
      const rawComposio = await getComposioToolsForUser(userId, toolkits);
      composioTools = await wrapToolsWithApprovalGate(rawComposio, {
        userId,
        source: 'coo-chat',
      });
    }
  } catch (err) {
    // Don't kill the chat if Composio is down — degrade to read-only COO.
    console.warn('[coo-agent] composio tool load failed:', err);
  }

  // If Notion is connected, read the Brain database UUIDs from notion_workspaces
  // and inject them into the system prompt. Without these IDs the model can't
  // call NOTION_QUERY_DATABASE / NOTION_FETCH_DATABASE (both require a UUID).
  let brainDatabases: Record<string, string> | null = null;
  let brainParentPageId: string | null = null;
  if (notionConnected) {
    try {
      const { data: ws } = await service
        .from('notion_workspaces')
        .select('databases, parent_page_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (ws?.databases) {
        brainDatabases = ws.databases as Record<string, string>;
        brainParentPageId = ws.parent_page_id ?? null;
      }
    } catch (err) {
      console.warn('[coo-agent] brain workspace read failed:', err);
    }
  }

  const baseSystemPrompt = buildCooSystemPrompt({
    companyName,
    blendedRate,
    teamSizeRaw,
    pendingActionsCount,
    outcomesBlock,
    notionConnected,
    brainDatabases,
    brainParentPageId,
  });

  // Skills are loaded lazily via the list_skills + load_skill tools.
  // We no longer inject 47 skill descriptions (~1,400 tokens) into every prompt.
  const systemPrompt = baseSystemPrompt;

  console.log('[coo-agent] using prompt version:', PROMPT_VERSION, '· notion:', notionConnected);

  const tools = {
    ...buildAiSdkCooTools(ctx),
    ...composioTools,
  };

  // Model chain: OpenAI gpt-4o primary, DigitalOcean deepseek-v4-pro fallback.
  // Supports both DIGITALOCEAN_API_KEY and MODEL_ACCESS_KEY (DO docs use the latter).
  // If neither is set, the chain has only one entry and rate-limit errors surface normally.
  const doaiApiKey = process.env.DIGITALOCEAN_API_KEY ?? process.env.MODEL_ACCESS_KEY;
  const doaiProvider = doaiApiKey
    ? createOpenAI({
        baseURL: process.env.AI_DIGITALOCEAN_URL ?? 'https://inference.do-ai.run/v1',
        apiKey: doaiApiKey,
      })
    : null;
  const modelChain: LanguageModel[] = [
    openai('gpt-4o'),
    // Use .chat() to force /v1/chat/completions instead of /v1/responses.
    // DigitalOcean inference only implements the Chat Completions API.
    // @ai-sdk/openai v3 defaults to /responses for the shorthand call.
    ...(doaiProvider ? [doaiProvider.chat('deepseek-v4-pro')] : []),
  ];

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

      // Resolve the active session — either reuse the one the client passed
      // (verify it belongs to this user) or create a new one with the first
      // user message as the title.
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
            sessionId = null;
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
          const candidate = lastUserQuestion.slice(0, 60).trim();
          if (candidate) {
            await service.from('coo_chat_sessions').update({ title: candidate }).eq('id', sessionId);
            sessionTitle = candidate;
          }
        }
      } catch (err) {
        console.error('[coo-agent] session resolve failed:', err);
      }

      // Persist the user's message immediately so it survives mid-flight abort.
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

      if (sessionId) {
        emit({ type: 'session', session_id: sessionId, title: sessionTitle });
      }

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
        // Model fallback loop: try each model in order.
        // On rate-limit (TPM exceeded), switch to the next model silently.
        // Only the last model in the chain can emit a terminal error.
        for (let modelIdx = 0; modelIdx < modelChain.length; modelIdx++) {
          const activeModel = modelChain[modelIdx]!;
          const isLastModel = modelIdx === modelChain.length - 1;
          const modelLabel = modelIdx === 0 ? 'gpt-4o' : 'deepseek-v4-pro';

          if (modelIdx > 0) {
            // Reset accumulated state so the fallback response starts clean.
            finalAssistant.content = '';
            finalAssistant.toolSteps = [];
            finalAssistant.actionCard = null;
            console.log(`[coo-agent] falling back to model[${modelIdx}]: ${modelLabel}`);
          }

          const result = streamText({
            model: activeModel,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            tools,
            stopWhen: stepCountIs(5),
            temperature: 0.2,
          });

          // Drive our SSE events off the typed full-stream. Each chunk
          // carries a known type; we map to the existing AgentEvent shape so
          // the frontend doesn't need to change.
          let shouldFallback = false;
          for await (const chunk of result.fullStream) {
            switch (chunk.type) {
              case 'text-delta': {
                const delta = chunk.text;
                if (delta && delta.length > 0) {
                  finalAssistant.content += delta;
                  emit({ type: 'text_delta', delta });
                }
                break;
              }

              case 'tool-call': {
                const name = chunk.toolName;
                const label = TOOL_LABELS[name] ?? `Running ${name}...`;
                finalAssistant.toolSteps.push({ name, label, done: false });
                emit({ type: 'tool_call', name, label });
                break;
              }

              case 'tool-result': {
                const name = chunk.toolName;
                const step = finalAssistant.toolSteps.find((s) => s.name === name && !s.done);
                if (step) step.done = true;
                emit({ type: 'tool_done', name });
                if (name.startsWith('NOTION_') || name.startsWith('notion')) {
                  console.log('[coo-agent] notion-tool-result', {
                    tool: name,
                    output: JSON.stringify(chunk.output, null, 2).slice(0, 500),
                  });
                }

                // queue_action surfaces an action_proposed card to the chat UI.
                // Preserve the original event shape for the frontend.
                if (name === 'queue_action') {
                  const out = chunk.output as { success?: boolean; data?: { action_id?: string; label?: string } } | undefined;
                  const input = chunk.input as { action_type?: string } | undefined;
                  if (out?.success && out.data?.action_id && out.data.label && input?.action_type) {
                    finalAssistant.actionCard = {
                      action_id: out.data.action_id,
                      action_type: input.action_type,
                      label: out.data.label,
                    };
                    emit({
                      type: 'action_proposed',
                      action_id: out.data.action_id,
                      action_type: input.action_type,
                      label: out.data.label,
                    });
                  }
                } else {
                  // Composio write tools queued by the approval gate return a
                  // `{ queued: true, action_id, summary }` envelope. Surface
                  // them with the same action_proposed event so the chat UI
                  // renders an approval card identical to queue_action's.
                  const out = chunk.output as {
                    queued?: boolean;
                    action_id?: string;
                    summary?: string;
                    action_slug?: string;
                  } | undefined;
                  if (out?.queued && out.action_id) {
                    const label = out.summary ?? out.action_slug ?? name;
                    finalAssistant.actionCard = {
                      action_id: out.action_id,
                      action_type: 'composio_action',
                      label,
                    };
                    emit({
                      type: 'action_proposed',
                      action_id: out.action_id,
                      action_type: 'composio_action',
                      label,
                    });
                  }
                }
                break;
              }

              case 'tool-error': {
                // Tool's execute threw. Mark the step done so the UI doesn't
                // hang on a spinner; the model will see the error in its next
                // step and can recover or summarize the failure to the user.
                const name = chunk.toolName;
                const step = finalAssistant.toolSteps.find((s) => s.name === name && !s.done);
                if (step) step.done = true;
                emit({ type: 'tool_done', name });
                const toolErr = chunk.error;
                console.error('[coo-agent] tool-error ⚠', {
                  model: modelLabel,
                  tool: name,
                  errorType: toolErr instanceof Error ? toolErr.constructor.name : typeof toolErr,
                  message: toolErr instanceof Error ? toolErr.message : String(toolErr),
                  stack: toolErr instanceof Error ? toolErr.stack?.split('\n').slice(0, 5).join(' | ') : undefined,
                  raw: JSON.stringify(toolErr, null, 2),
                });
                break;
              }

              case 'error': {
                const err = chunk.error;
                const rateLimited = isRateLimitError(err);
                console.error('[coo-agent] stream-error ⚠', {
                  model: modelLabel,
                  rateLimited,
                  errorType: err instanceof Error ? err.constructor.name : typeof err,
                  message: err instanceof Error ? err.message : String(err),
                  raw: JSON.stringify(err, null, 2),
                });
                if (rateLimited && !isLastModel) {
                  shouldFallback = true;
                  break;
                }
                await persistAssistant();
                emit({
                  type: 'error',
                  message: rateLimited
                    ? 'AI provider is currently rate-limited. Please try again in a moment.'
                    : 'Something went wrong. Please try again.',
                });
                close();
                return;
              }

              case 'finish': {
                // Record token usage. Attribute to 'openai' for both models
                // since the COO quota tracks overall AI spend, not per-provider.
                const totalUsage = (chunk as { totalUsage?: { inputTokens?: number; outputTokens?: number } }).totalUsage;
                const tokens = (totalUsage?.inputTokens ?? 0) + (totalUsage?.outputTokens ?? 0);
                if (tokens > 0) {
                  await recordUsage({
                    userId,
                    provider: 'openai',
                    operation: 'coo_chat',
                    tokens,
                    metadata: { model: modelLabel, session_id: sessionId ?? null },
                  });
                }
                await persistAssistant();
                emit({ type: 'done' });
                close();
                return;
              }

              // Other chunk types (reasoning, source, raw, start, step-start,
              // step-finish, finish-step, tool-input-start, tool-input-delta,
              // tool-input-end, tool-approval-request, etc.) are silent in v1.
              default:
                break;
            }
            if (shouldFallback) break;
          }

          if (!shouldFallback) {
            // Stream ended without an explicit finish chunk — finalize defensively.
            await persistAssistant();
            emit({ type: 'done' });
            close();
            return;
          }
        }

        // All models in the chain were rate-limited.
        await persistAssistant();
        emit({ type: 'error', message: 'AI providers are temporarily busy. Please try again in a moment.' });
        close();
      } catch (err) {
        console.error('[coo-agent] fatal-catch ⚠', {
          errorType: err instanceof Error ? err.constructor.name : typeof err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack?.split('\n').slice(0, 10).join(' | ') : undefined,
          raw: JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : {}), 2),
        });
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
