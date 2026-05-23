import { z } from "zod";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import { logDebug, logInfo, logWarn } from "../../lib/logger";
import { redactJsonTextIfPossible } from "../../lib/redact";
import type {
  AiWorkflowOutput,
  FailureAnalysis,
  N8nConnectionTarget,
  N8nNode,
  N8nWorkflow
} from "../../types/workflow";
import {
  validateWorkflowSecurity,
  validateWorkflowStructure
} from "../validation/workflow-validator";
import {
  normalizeAiWorkflowCandidate,
  normalizeWorkflowDefinition
} from "../workflows/workflow-normalizer";
import {
  buildKnowledgeBasePromptBlock,
  buildKnowledgeBaseSelectionLogMeta,
  selectKnowledgeForRequest
} from "./knowledge-base-loader";
import { persistAIInteraction } from "./ai-interaction-repository";
import { getRequestContext } from "../../lib/request-context";
import {
  buildPatternCardsPromptBlock,
  patternCardCitation,
  selectPatternCards
} from "../memory/pattern-cards";
import {
  buildBreadcrumbsPromptBlock,
  failureClusterFor,
  recentBreadcrumbs
} from "../memory/breadcrumbs";
import { runHybridRetrieval } from "../memory/hybrid-retrieval";

/**
 * Resolves the platform RAG agent endpoint config. The agent is a single
 * shared resource (DigitalOcean Gen AI agent or any OpenAI-compatible
 * /chat/completions URL) — there is no per-user agent. Authorization is
 * gated by users.can_use_rag_agent, which the auth middleware reads onto
 * RequestContext.canUseRagAgent.
 *
 * Returns null when either the env config is missing OR the current request
 * context isn't permitted to use the agent. Callers fall through to the
 * regular Anthropic+KB path on null.
 */
export function resolveRagAgentConfig(): { url: string; apiKey: string } | null {
  const ctx = getRequestContext();
  if (!ctx?.canUseRagAgent) return null;
  const url = env.RAG_AGENT_URL?.trim();
  const apiKey = env.RAG_AGENT_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

/**
 * Resolve the Anthropic API key for the current call.
 *
 *  - Authenticated request (ctx present): MUST use the user's stored key.
 *    Never fall back to env here — that would silently bill the operator for
 *    every authenticated user's AI usage.
 *  - Background caller (ctx absent, e.g. monitoring's failure-analysis AI):
 *    falls back to env so the platform default keeps working.
 */
function resolveAnthropicApiKey(): string {
  const ctx = getRequestContext();

  if (ctx) {
    const userKey = ctx.anthropicApiKey?.trim();
    if (!userKey) {
      throw new AppError(
        400,
        "AI_CONFIG_MISSING",
        "Set your Anthropic API key under Account → API credentials before generating workflows."
      );
    }
    return userKey;
  }

  const fallback = env.ANTHROPIC_API_KEY?.trim();
  if (!fallback) {
    throw new AppError(500, "AI_CONFIG_ERROR", "ANTHROPIC_API_KEY is required for background AI calls.");
  }
  return fallback;
}

const BLOCKED_NODE_TYPES = [
  "n8n-nodes-base.function",
  "n8n-nodes-base.functionItem",
  "n8n-nodes-base.code"
];

const SAFE_TRANSFORM_NODE_TYPES = [
  "n8n-nodes-base.set",
  "n8n-nodes-base.if",
  "n8n-nodes-base.switch",
  "n8n-nodes-base.merge"
];

const GENERIC_ACTION_NODE_TAILS = new Set([
  "set",
  "if",
  "switch",
  "merge",
  "wait",
  "limit",
  "sort",
  "removeDuplicates",
  "noOp"
]);

const REQUEST_STOPWORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "into",
  "then",
  "than",
  "when",
  "where",
  "after",
  "before",
  "please",
  "build",
  "create",
  "automation",
  "workflow",
  "make"
]);

const NODE_SAFETY_PROMPT = [
  "STRICT NODE TYPE RULES:",
  "You MUST NOT use these blocked node types:",
  ...BLOCKED_NODE_TYPES.map((type) => `- ${type}`),
  "",
  "Do not include ```json or ``",
  "If you need to transform, format, map, or reshape data, DO NOT use code/function nodes.",
  "Use only safe no-code nodes such as:",
  ...SAFE_TRANSFORM_NODE_TYPES.map((type) => `- ${type}`),
  "",
  "If the requested automation seems to require custom JavaScript/code, redesign it using approved no-code nodes only.",
  "Never replace a blocked node with another blocked node."
].join("\n");

const WORKFLOW_SYSTEM_PROMPT = [
  env.AI_SYSTEM_PROMPT,
  NODE_SAFETY_PROMPT,
  "You must return only valid JSON.",
  "Act as a senior n8n automation engineer.",
  "Build general automations only. Do not default to Gmail, Telegram, Slack, IMAP, or any specific provider unless explicitly requested by the user.",
  "Detect trigger type (schedule/webhook/manual) and proper action nodes.",
  "Use this exact JSON shape:",
  '{ "project_name": "", "description": "", "required_credentials": [], "workflow": { "name": "", "nodes": [], "connections": {}, "settings": {} } }',
  "required_credentials must be dynamic and include only credential types actually used in node.credentials.",
  "Every node must include: id (string), name (string), type (string), typeVersion (number), position ([x,y]), parameters (object).",
  "Do not invent node typeVersion values. Use conservative, commonly available versions only.",
  "If unsure about a node version, use a conservative low version (especially for trigger nodes) instead of 2.x/3.x guesses.",
  "Avoid niche/optional integrations unless explicitly requested; prefer broadly available core nodes for transforms and routing.",
  "When credentials are required, use this format only:",
  '{ "credentials": { "credentialType": { "name": "Placeholder Credential Name" } } }',
  "Never include real credentials, tokens, API keys, passwords, cookies, authorization headers, refresh tokens, private keys, or secrets.",
  "Connections must reference node names exactly, not node ids.",
  "Never include reasoning_content or explanations.",
  "Never omit node.id.",
  "Never return markdown."
].join("\n");

const FIX_WORKFLOW_SYSTEM_PROMPT = [
  env.AI_SYSTEM_PROMPT,
  NODE_SAFETY_PROMPT,
  "You are fixing an existing n8n workflow rejected by backend validation.",
  "Return valid JSON only.",
  "Do not return markdown and do not include explanations.",
  "Output must be ONLY the workflow object with keys nodes, connections, settings.",
  "Every node must include: id, name, type, typeVersion, position, parameters.",
  "Connections must reference node names exactly, not node ids.",
  "If validation errors mention a blocked node type, remove that node or replace it with a safe no-code node.",
  "Do not use function, functionItem, or code nodes under any circumstance."
].join("\n");

const ANALYSIS_SYSTEM_PROMPT = [
  "You are a senior n8n reliability engineer.",
  "Analyze workflow failures and provide concrete fix suggestions.",
  "Return only JSON with fields: issue, reason, solution.",
  "Do not include markdown.",
    "Do not include ```json or ``"
].join("\n");

const WORKFLOW_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["project_name", "description", "required_credentials", "workflow"],
  properties: {
    project_name: { type: "string", minLength: 3, maxLength: 128 },
    description: { type: "string", minLength: 8, maxLength: 2000 },
    required_credentials: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    workflow: {
      type: "object",
      additionalProperties: false,
      required: ["name", "nodes", "connections", "settings"],
      properties: {
        name: { type: "string", minLength: 3, maxLength: 200 },
        nodes: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["id", "name", "type"],
            additionalProperties: true
          }
        },
        connections: { type: "object" },
        settings: { type: "object" }
      }
    }
  }
};

const FIX_WORKFLOW_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nodes", "connections", "settings"],
  properties: {
    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "name", "type", "typeVersion", "position"],
        additionalProperties: true
      }
    },
    connections: { type: "object" },
    settings: { type: "object" }
  }
};

const failureAnalysisSchema = z.object({
  issue: z.string().min(3),
  reason: z.string().min(3),
  solution: z.string().min(3)
});

type AIProvider = "openai" | "digitalocean" | "anthropic" | "mock";
type RemoteAIProvider = Exclude<AIProvider, "mock">;

export interface AIResponse {
  text: string;
  raw?: unknown;
}

export interface AIRequestInput {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  timeoutMs: number;
  context?: AiRequestContext;
}

interface ProviderAdapter {
  name: RemoteAIProvider;
  call(input: AIRequestInput): Promise<AIResponse>;
}

// Keyed by `${provider}:${model}` so a model rejected by one provider can still
// be tried on another (the same logical Anthropic model is referenced by
// different IDs on DigitalOcean's gateway vs Anthropic's native API).
const unsupportedModelsCache = new Set<string>();
const MAX_WORKFLOW_ATTEMPTS_PER_MODEL = 2;

function unsupportedKey(provider: AIProvider, model: string): string {
  return `${provider}:${model}`;
}

export interface AiRequestContext {
  traceId?: string;
  /**
   * Optional caller identity for AI interaction logging. Plumbed through
   * `persistAIInteraction` into `ai_interactions.user_id`. Currently unused
   * by upstream routes (no auth surface), included for forward-compat so
   * adding auth later doesn't require schema changes.
   */
  userId?: string;
  /**
   * Pattern Card ids (with @version) selected by the deterministic memory
   * layer for this prompt. Recorded on the resulting ai_interactions row
   * via matched_pattern_ids so we can later measure card→outcome quality.
   */
  matchedPatternIds?: string[];
}

export interface FixWorkflowInput {
  originalRequest: string;
  workflow: N8nWorkflow;
  validationErrors: string[];
  approvedNodeTypePrefixes?: string[];
}

function sleep(ms: number): Promise<void> {
  const delay = Math.max(0, Number(ms || 0));
  if (delay === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function truncateForError(input: string, maxLength = 2000): string {
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength)}...`;
}

function extractHttpStatusFromError(error: unknown): number | null {
  if (!(error instanceof AppError)) {
    return null;
  }

  if (!error.details || typeof error.details !== "object") {
    return null;
  }

  const details = error.details as Record<string, unknown>;
  const statusValue = details.status;
  return typeof statusValue === "number" && Number.isFinite(statusValue) ? statusValue : null;
}

function isAuthAiRequestError(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    return false;
  }

  if (error.code !== "AI_REQUEST_FAILED") {
    return false;
  }

  const status = extractHttpStatusFromError(error);
  return status === 401 || status === 403;
}

function markUnsupportedModelIfNeeded(
  provider: AIProvider,
  model: string,
  error: unknown
): boolean {
  if (!(error instanceof AppError)) {
    return false;
  }

  if (error.code !== "AI_REQUEST_FAILED") {
    return false;
  }

  const status = extractHttpStatusFromError(error);
  if (status !== 401 && status !== 403) {
    return false;
  }

  unsupportedModelsCache.add(unsupportedKey(provider, model));
  return true;
}

function isRetryableAiError(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    return false;
  }

  if (error.code === "AI_REQUEST_TIMEOUT") {
    return true;
  }

  if (error.code !== "AI_REQUEST_FAILED") {
    return false;
  }

  const status = extractHttpStatusFromError(error);
  if (status === null) {
    return false;
  }

  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function toAttemptErrorDetails(error: unknown): unknown {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      status_code: error.statusCode,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name
    };
  }

  return String(error);
}

async function withAiRetry<T>(
  input: {
    provider: RemoteAIProvider;
    model: string;
    operation: () => Promise<T>;
  },
  context?: AiRequestContext
): Promise<T> {
  const retries = env.AI_REQUEST_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const attemptNumber = attempt + 1;
    try {
      if (attempt > 0) {
        logInfo(
          "ai",
          "Retrying AI request",
          {
            provider: input.provider,
            model: input.model,
            attempt: attemptNumber,
            max_attempts: retries + 1
          },
          context?.traceId
        );
      }

      return await input.operation();
    } catch (error) {
      const canRetry = attempt < retries && isRetryableAiError(error);
      if (!canRetry) {
        throw error;
      }

      const delayMs = env.AI_REQUEST_RETRY_DELAY_MS * attemptNumber;
      logWarn(
        "ai",
        "AI request failed; waiting before retry",
        {
          provider: input.provider,
          model: input.model,
          attempt: attemptNumber,
          next_delay_ms: delayMs,
          error: toAttemptErrorDetails(error)
        },
        context?.traceId
      );
      await sleep(delayMs);
    }
  }

  throw new AppError(502, "AI_RETRY_EXHAUSTED", "AI retry attempts were exhausted.");
}

function isAppErrorLike(value: unknown): value is AppError {
  return value instanceof AppError;
}

function buildAiFailureError(input: {
  message: string;
  attempts: Array<{ model: string; details: unknown }>;
  fallbackCode: string;
}): AppError {
  const appErrors = input.attempts
    .map((attempt) => attempt.details)
    .filter(isAppErrorLike);

  const timeoutErrors = appErrors.filter((error) => error.code === "AI_REQUEST_TIMEOUT");
  if (timeoutErrors.length > 0) {
    return new AppError(
      504,
      "AI_REQUEST_TIMEOUT",
      "AI provider request timed out. Please retry.",
      input.attempts.map((attempt) => ({
        model: attempt.model,
        details: toAttemptErrorDetails(attempt.details)
      }))
    );
  }

  const hasNonAuthAttempt = input.attempts.some((attempt) => !isAuthAiRequestError(attempt.details));
  const authError = appErrors.find((error) => isAuthAiRequestError(error));
  if (authError && !hasNonAuthAttempt) {
    return new AppError(
      502,
      "AI_AUTH_FAILED",
      "AI provider authentication failed. Verify AI_API_KEY.",
      input.attempts.map((attempt) => ({
        model: attempt.model,
        details: toAttemptErrorDetails(attempt.details)
      }))
    );
  }

  const badOutputError = appErrors.find(
    (error) =>
      error.code === "AI_BAD_OUTPUT" ||
      error.code === "AI_EMPTY_OUTPUT" ||
      error.code === "AI_SCHEMA_MISMATCH"
  );
  if (badOutputError) {
    return new AppError(
      502,
      "AI_BAD_OUTPUT",
      "AI returned invalid workflow JSON. Please retry.",
      input.attempts.map((attempt) => ({
        model: attempt.model,
        details: toAttemptErrorDetails(attempt.details)
      }))
    );
  }

  return new AppError(
    502,
    input.fallbackCode,
    input.message,
    input.attempts.map((attempt) => ({
      model: attempt.model,
      details: toAttemptErrorDetails(attempt.details)
    }))
  );
}

function getRemainingBudgetMs(deadlineEpochMs: number): number {
  return Math.max(0, deadlineEpochMs - Date.now());
}

function assertWithinBudget(deadlineEpochMs: number): void {
  if (getRemainingBudgetMs(deadlineEpochMs) > 0) {
    return;
  }

  throw new AppError(
    504,
    "AI_WORKFLOW_TIMEOUT",
    "Workflow generation timed out before receiving a valid AI response.",
    {
      total_timeout_ms: env.AI_WORKFLOW_TOTAL_TIMEOUT_MS
    }
  );
}

function buildWorkflowGenerationSystemPrompt(
  message: string,
  traceId?: string,
  extras?: { patternCardsBlock?: string; breadcrumbsBlock?: string }
): string {
  const selection = selectKnowledgeForRequest(message);
  logInfo("ai", "Knowledge base selected", buildKnowledgeBaseSelectionLogMeta(selection), traceId);
  const kbBlock = buildKnowledgeBasePromptBlock(selection);

  // Order matters: rules → KB → pattern cards (curated) → breadcrumbs (live
  // tenant context). The breadcrumbs go last so the model treats them as the
  // most recent grounding, not as competing background reference.
  const parts: string[] = [WORKFLOW_SYSTEM_PROMPT];
  if (kbBlock) parts.push(kbBlock);
  if (extras?.patternCardsBlock) parts.push(extras.patternCardsBlock);
  if (extras?.breadcrumbsBlock) parts.push(extras.breadcrumbsBlock);
  return parts.join("\n\n");
}

/**
 * Tenant-scoped memory fetch — pattern cards (global, intent-matched) +
 * recent breadcrumbs (per-tenant). Errors here are non-fatal: we still
 * attempt the AI call without the extra context rather than fail the user
 * request because a memory query timed out.
 */
async function buildMemoryContext(
  message: string,
  context?: AiRequestContext
): Promise<{
  patternCardsBlock: string;
  breadcrumbsBlock: string;
  matchedPatternIds: string[];
}> {
  let patternCardsBlock = "";
  let matchedPatternIds: string[] = [];

  try {
    let scored;
    if (env.HYBRID_RETRIEVAL_ENABLED && env.POSTGRES_URL && context?.userId) {
      const result = await runHybridRetrieval({
        ownerUserId: context.userId,
        queryText: message,
        outputKind: "workflow_json"
      });
      scored = result.pattern_card_scores;
      if (result.used_fallback) {
        logInfo("ai", "Hybrid retrieval fell back to keyword selection", undefined, context?.traceId);
      }
    } else {
      scored = selectPatternCards({ prompt: message, outputKind: "workflow_json" });
    }

    if (scored.length > 0) {
      patternCardsBlock = buildPatternCardsPromptBlock(scored);
      matchedPatternIds = scored.map((s) => patternCardCitation(s.card));
      logInfo(
        "ai",
        "Pattern cards selected",
        {
          ids: matchedPatternIds,
          hybrid: env.HYBRID_RETRIEVAL_ENABLED && Boolean(context?.userId),
          scores: scored.map((s) => ({ id: s.card.id, score: s.score, matched: s.matched_triggers }))
        },
        context?.traceId
      );
    }
  } catch (error) {
    logWarn(
      "ai",
      "Pattern card selection failed; continuing without",
      { error: error instanceof Error ? error.message : String(error) },
      context?.traceId
    );
  }

  let breadcrumbsBlock = "";
  if (env.AI_BREADCRUMBS_ENABLED && context?.userId) {
    try {
      const rows = await recentBreadcrumbs({
        ownerUserId: context.userId,
        sinceHours: env.AI_BREADCRUMBS_HOURS,
        limit: env.AI_BREADCRUMBS_LIMIT
      });
      if (rows.length > 0) {
        breadcrumbsBlock = buildBreadcrumbsPromptBlock(rows);
        logInfo(
          "ai",
          "Breadcrumbs attached",
          { count: rows.length, chars: breadcrumbsBlock.length },
          context.traceId
        );
      }
    } catch (error) {
      logWarn(
        "ai",
        "Breadcrumb retrieval failed; continuing without",
        { error: error instanceof Error ? error.message : String(error) },
        context?.traceId
      );
    }
  }

  return { patternCardsBlock, breadcrumbsBlock, matchedPatternIds };
}

function buildWorkflowFixSystemPrompt(
  originalRequest: string,
  validationErrors: string[],
  traceId?: string
): string {
  const selectionQuery = `${originalRequest}\n${validationErrors.join("\n")}`.trim();
  const selection = selectKnowledgeForRequest(selectionQuery);
  logInfo(
    "ai",
    "Knowledge base selected for workflow fix",
    buildKnowledgeBaseSelectionLogMeta(selection),
    traceId
  );
  const promptBlock = buildKnowledgeBasePromptBlock(selection);
  if (!promptBlock) {
    return FIX_WORKFLOW_SYSTEM_PROMPT;
  }
  return `${FIX_WORKFLOW_SYSTEM_PROMPT}\n\n${promptBlock}`;
}

function buildWorkflowGenerationUserPrompt(message: string, promptHint: string): string {
  const sections = [`USER_REQUEST:\n${message}`];
  if (promptHint.length > 0) {
    sections.push(promptHint);
  }
  return sections.join("\n\n");
}

function tokenizeIntentText(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/gi)
    .map((value) => value.trim())
    .filter((value) => value.length >= 3)
    .filter((value) => !REQUEST_STOPWORDS.has(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 16);
}

function validateWorkflowIntentCoverage(message: string, workflow: N8nWorkflow): string[] {
  const errors: string[] = [];
  const triggerTypes = new Set([
    "n8n-nodes-base.scheduleTrigger",
    "n8n-nodes-base.webhook",
    "n8n-nodes-base.manualTrigger",
    "n8n-nodes-base.errorTrigger",
    "n8n-nodes-base.n8nTrigger"
  ]);

  const isTrigger = (type: string): boolean => {
    if (triggerTypes.has(type)) {
      return true;
    }
    const tail = type.split(".").at(-1) ?? type;
    return /trigger$/i.test(tail);
  };

  const actionNodes = workflow.nodes.filter((node) => !isTrigger(node.type));
  if (actionNodes.length === 0) {
    errors.push("Workflow needs at least one meaningful action node in addition to trigger nodes.");
  }

  const meaningfulActionNodes = actionNodes.filter((node) => {
    const tail = (node.type.split(".").at(-1) ?? node.type).toLowerCase();
    return !GENERIC_ACTION_NODE_TAILS.has(tail);
  });

  if (actionNodes.length > 0 && meaningfulActionNodes.length === 0) {
    errors.push("Workflow action nodes are too generic. Add at least one concrete business action node.");
  }

  const requestKeywords = tokenizeIntentText(message);
  const requestLatinKeywords = requestKeywords.filter((token) => /[a-z]/.test(token));

  if (requestLatinKeywords.length === 0) {
    return errors;
  }

  const normalizedActionText = (meaningfulActionNodes.length > 0 ? meaningfulActionNodes : actionNodes)
    .map((node) => `${node.name} ${node.type}`.toLowerCase())
    .join(" ");

  if (requestLatinKeywords.length > 0 && normalizedActionText.length > 0) {
    const hasRelevantKeyword = requestLatinKeywords.some((keyword) =>
      normalizedActionText.includes(keyword)
    );
    if (!hasRelevantKeyword && meaningfulActionNodes.length === 0) {
      errors.push("Workflow action node names/types are weakly related to the user request.");
    }
  }

  return errors;
}

function extractRequiredCredentialTypesFromWorkflow(workflow: N8nWorkflow): string[] {
  const detected = new Set<string>();

  for (const node of workflow.nodes) {
    if (!node || typeof node !== "object") {
      continue;
    }
    if (!node.credentials || typeof node.credentials !== "object") {
      continue;
    }
    for (const key of Object.keys(node.credentials)) {
      if (typeof key === "string" && key.trim().length > 0) {
        detected.add(key.trim());
      }
    }
  }

  return Array.from(detected);
}

function parseJsonFromText(input: string): unknown {
  const cleaned = input
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new AppError(502, "AI_BAD_OUTPUT", "AI output is not valid JSON.");
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (error) {
      throw new AppError(502, "AI_BAD_OUTPUT", "AI output is not valid JSON.", {
        parse_error: error instanceof Error ? error.message : String(error),
        output_excerpt: truncateForError(cleaned, 1000)
      });
    }
  }
}

function extractMessageText(payload: unknown): string {
  const data = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
  };

  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => typeof content.text === "string")?.text;
  if (outputText) {
    return outputText;
  }

  const chatContent = data.choices?.[0]?.message?.content;
  if (typeof chatContent === "string") {
    return chatContent;
  }

  if (Array.isArray(chatContent)) {
    const text = chatContent
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }

  throw new AppError(502, "AI_EMPTY_OUTPUT", "AI returned no text output.");
}

function extractAnthropicText(payload: unknown): string {
  const data = payload as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content
    ?.filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  if (text && text.length > 0) {
    return text;
  }

  throw new AppError(502, "AI_EMPTY_OUTPUT", "AI returned no text output.");
}

function requireKey(value: string | undefined, varName: string): string {
  if (!value || value.trim().length === 0) {
    throw new AppError(500, "AI_CONFIG_ERROR", `${varName} is required.`);
  }
  return value;
}

const openaiAdapter: ProviderAdapter = {
  name: "openai",
  async call(input: AIRequestInput): Promise<AIResponse> {
    const apiKey = requireKey(env.AI_API_KEY, "AI_API_KEY");
    logInfo("ai", "Calling OpenAI responses API", { model: input.model }, input.context?.traceId);
    const startedAt = Date.now();
    const response = await fetchWithTimeout({
      url: `${env.AI_BASE_URL}/responses`,
      timeoutMs: input.timeoutMs,
      requestName: `openai.responses:${input.model}`,
      errorCode: "AI_REQUEST_TIMEOUT",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: input.model,
          input: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt }
          ],
          ...(input.jsonSchema
            ? {
                text: {
                  format: {
                    type: "json_schema",
                    name: input.jsonSchema.name,
                    strict: true,
                    schema: input.jsonSchema.schema
                  }
                }
              }
            : {})
        })
      }
    });

    logInfo(
      "ai",
      "OpenAI responses API call completed",
      { model: input.model, status: response.status, duration_ms: Date.now() - startedAt },
      input.context?.traceId
    );

    if (!response.ok) {
      const details = await response.text();
      throw new AppError(502, "AI_REQUEST_FAILED", "AI request failed.", {
        provider: "openai",
        model: input.model,
        status: response.status,
        response_body: truncateForError(details)
      });
    }

    const payload = await response.json();
    if (env.LOG_AI_RAW_RESPONSE) {
      logDebug("ai", "Raw AI payload (OpenAI responses)", payload, input.context?.traceId);
    }
    return { text: extractMessageText(payload), raw: payload };
  }
};

const digitalOceanAdapter: ProviderAdapter = {
  name: "digitalocean",
  async call(input: AIRequestInput): Promise<AIResponse> {
    const apiKey = requireKey(env.AI_API_KEY, "AI_API_KEY");
    logInfo(
      "ai",
      "Calling DigitalOcean chat/completions API",
      { model: input.model },
      input.context?.traceId
    );
    const startedAt = Date.now();
    const response = await fetchWithTimeout({
      url: `${env.AI_BASE_URL}/chat/completions`,
      timeoutMs: input.timeoutMs,
      requestName: `digitalocean.chat.completions:${input.model}`,
      errorCode: "AI_REQUEST_TIMEOUT",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt }
          ],
          max_completion_tokens: 3000,
          temperature: 0.2
        })
      }
    });

    logInfo(
      "ai",
      "DigitalOcean chat/completions API call completed",
      { model: input.model, status: response.status, duration_ms: Date.now() - startedAt },
      input.context?.traceId
    );

    if (!response.ok) {
      const details = await response.text();
      throw new AppError(502, "AI_REQUEST_FAILED", "AI request failed.", {
        provider: "digitalocean",
        model: input.model,
        status: response.status,
        response_body: truncateForError(details)
      });
    }

    const payload = await response.json();
    if (env.LOG_AI_RAW_RESPONSE) {
      logDebug(
        "ai",
        "Raw AI payload (DigitalOcean chat/completions)",
        payload,
        input.context?.traceId
      );
    }
    return { text: extractMessageText(payload), raw: payload };
  }
};

const anthropicAdapter: ProviderAdapter = {
  name: "anthropic",
  async call(input: AIRequestInput): Promise<AIResponse> {
    // Per-user key when available, env fallback otherwise (covers monitoring's
    // background failure-analysis calls that run outside any auth context).
    const apiKey = resolveAnthropicApiKey();
    logInfo(
      "ai",
      "Calling Anthropic messages API",
      { model: input.model },
      input.context?.traceId
    );
    const startedAt = Date.now();
    const response = await fetchWithTimeout({
      url: `${env.ANTHROPIC_BASE_URL}/messages`,
      timeoutMs: input.timeoutMs,
      requestName: `anthropic.messages:${input.model}`,
      errorCode: "AI_REQUEST_TIMEOUT",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": env.ANTHROPIC_VERSION
        },
        body: JSON.stringify({
          model: input.model,
          max_tokens: env.ANTHROPIC_MAX_TOKENS,
          system: input.systemPrompt,
          messages: [{ role: "user", content: input.userPrompt }]
          // Anthropic does not support OpenAI-style json_schema; we rely on
          // prompt instructions + parseJsonFromText. (Tool-use enforcement
          // could be added later as an opt-in.)
        })
      }
    });

    logInfo(
      "ai",
      "Anthropic messages API call completed",
      { model: input.model, status: response.status, duration_ms: Date.now() - startedAt },
      input.context?.traceId
    );

    if (!response.ok) {
      const details = await response.text();
      throw new AppError(502, "AI_REQUEST_FAILED", "AI request failed.", {
        provider: "anthropic",
        model: input.model,
        status: response.status,
        response_body: truncateForError(details)
      });
    }

    const payload = await response.json();
    if (env.LOG_AI_RAW_RESPONSE) {
      logDebug("ai", "Raw AI payload (Anthropic messages)", payload, input.context?.traceId);
    }
    return { text: extractAnthropicText(payload), raw: payload };
  }
};

/**
 * Calls the platform RAG agent's OpenAI-compatible /chat/completions endpoint.
 * Sends ONLY the user message — no system prompt, no knowledge-base block.
 * The agent already has its own server-side system prompt + KB configured in
 * the DigitalOcean (or equivalent) console, so duplicating those locally would
 * waste tokens and dilute the agent's behavior.
 *
 * Kept outside PROVIDER_REGISTRY because it isn't a "model" the user can pick;
 * routing to it is gated by users.can_use_rag_agent + env.RAG_AGENT_*.
 */
async function callRagAgent(input: {
  userMessage: string;
  promptHint: string;
  timeoutMs: number;
  context?: AiRequestContext;
}): Promise<AIResponse> {
  const config = resolveRagAgentConfig();
  if (!config) {
    // Defensive: callers should have checked already, but throw a clear error
    // rather than a generic 500 if this is reached without configuration.
    throw new AppError(
      500,
      "RAG_AGENT_NOT_CONFIGURED",
      "RAG agent is not enabled for this account or platform env is missing."
    );
  }

  // The DO agent endpoint sometimes ships with /api/v1 already in the URL,
  // sometimes not — append only when missing so the operator can configure
  // either form.
  const baseUrl = config.url.replace(/\/+$/, "");
  const endpoint = /\/api\/v\d+$/i.test(baseUrl)
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/api/v1/chat/completions`;

  // promptHint is only set after a structurally-invalid retry; appending it
  // keeps the agent on-task without re-introducing a system prompt.
  const userContent = input.promptHint
    ? `${input.userMessage}\n\n${input.promptHint}`
    : input.userMessage;

  logInfo("ai", "Calling RAG agent", { endpoint }, input.context?.traceId);
  const startedAt = Date.now();
  const response = await fetchWithTimeout({
    url: endpoint,
    timeoutMs: input.timeoutMs,
    requestName: "rag_agent.chat.completions",
    errorCode: "AI_REQUEST_TIMEOUT",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: userContent }],
        stream: false,
        // We don't surface retrieval / function / guardrail metadata to the
        // user yet, so don't pay the bandwidth/latency cost of including it.
        include_retrieval_info: false,
        include_functions_info: false,
        include_guardrails_info: false
      })
    }
  });

  logInfo(
    "ai",
    "RAG agent call completed",
    { status: response.status, duration_ms: Date.now() - startedAt },
    input.context?.traceId
  );

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "AI_REQUEST_FAILED", "RAG agent request failed.", {
      provider: "rag_agent",
      status: response.status,
      response_body: truncateForError(details)
    });
  }

  const payload = await response.json();
  if (env.LOG_AI_RAW_RESPONSE) {
    logDebug("ai", "Raw AI payload (RAG agent)", payload, input.context?.traceId);
  }
  return { text: extractMessageText(payload), raw: payload };
}

const PROVIDER_REGISTRY: Record<RemoteAIProvider, ProviderAdapter> = {
  openai: openaiAdapter,
  digitalocean: digitalOceanAdapter,
  anthropic: anthropicAdapter
};

function callProvider(provider: RemoteAIProvider, input: AIRequestInput): Promise<AIResponse> {
  const adapter = PROVIDER_REGISTRY[provider];
  if (!adapter) {
    return Promise.reject(
      new AppError(500, "AI_PROVIDER_UNSUPPORTED", `Unsupported provider: ${provider}`)
    );
  }
  return adapter.call(input);
}

/**
 * Best-effort token-count extraction across provider response shapes.
 * Returns null if no usage data is present — never throws.
 */
function extractTokenCount(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const usage = (raw as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") {
    return null;
  }
  const u = usage as {
    total_tokens?: unknown;
    input_tokens?: unknown;
    output_tokens?: unknown;
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
  };

  if (typeof u.total_tokens === "number" && Number.isFinite(u.total_tokens)) {
    return u.total_tokens;
  }
  const input =
    (typeof u.input_tokens === "number" ? u.input_tokens : 0) +
    (typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0);
  const output =
    (typeof u.output_tokens === "number" ? u.output_tokens : 0) +
    (typeof u.completion_tokens === "number" ? u.completion_tokens : 0);
  const sum = input + output;
  return sum > 0 ? sum : null;
}

/**
 * Wraps `callProvider` with non-blocking persistence of the interaction.
 * Latency is measured at the wrapper boundary, so retry attempts via
 * `withAiRetry` each produce their own row (one per real HTTP call) and
 * fallback rows are emitted from the same code path with no duplication.
 *
 * Contract:
 *  - Errors from `callProvider` are re-thrown unchanged so retry/fallback
 *    semantics in `withAiRetry` and `callWithFallback` are unaffected.
 *  - Persistence is fire-and-forget; a DB outage cannot fail an AI request.
 */
async function instrumentedCall(
  provider: RemoteAIProvider,
  input: AIRequestInput
): Promise<AIResponse> {
  const startedAt = Date.now();
  try {
    const response = await callProvider(provider, input);
    persistAIInteraction({
      userId: input.context?.userId ?? null,
      provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      response: response.text,
      rawResponse: response.raw,
      status: "success",
      errorMessage: null,
      tokensUsed: extractTokenCount(response.raw),
      latencyMs: Date.now() - startedAt,
      matchedPatternIds: input.context?.matchedPatternIds ?? null
    });
    return response;
  } catch (error) {
    persistAIInteraction({
      userId: input.context?.userId ?? null,
      provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      response: "",
      rawResponse: null,
      status: "error",
      errorMessage: error instanceof Error ? error.message : String(error),
      tokensUsed: null,
      latencyMs: Date.now() - startedAt,
      matchedPatternIds: input.context?.matchedPatternIds ?? null
    });
    throw error;
  }
}

function resolveBackupModel(backup: RemoteAIProvider, primaryModel: string): string {
  if (env.AI_BACKUP_MODEL && env.AI_BACKUP_MODEL.trim().length > 0) {
    return env.AI_BACKUP_MODEL.trim();
  }
  if (backup === "anthropic") {
    return env.ANTHROPIC_MODEL;
  }
  // For openai/digitalocean we don't have a guaranteed-good default that
  // differs from the primary model, so reuse the primary model name. If it
  // doesn't exist on the backup, the request will fail and surface clearly.
  return primaryModel;
}

async function callWithFallback(input: AIRequestInput): Promise<AIResponse> {
  const primary = env.AI_PROVIDER as RemoteAIProvider;
  const backup =
    env.AI_BACKUP_PROVIDER && env.AI_BACKUP_PROVIDER !== "mock"
      ? (env.AI_BACKUP_PROVIDER as RemoteAIProvider)
      : null;

  // Skip primary entirely if we already know this (provider, model) pair fails.
  const primaryUnsupported = unsupportedModelsCache.has(unsupportedKey(primary, input.model));

  if (!primaryUnsupported) {
    try {
      return await withAiRetry(
        {
          provider: primary,
          model: input.model,
          operation: () => instrumentedCall(primary, input)
        },
        input.context
      );
    } catch (primaryError) {
      markUnsupportedModelIfNeeded(primary, input.model, primaryError);

      if (!backup || backup === primary) {
        throw primaryError;
      }

      logWarn(
        "ai",
        "Primary AI provider failed; falling back to backup",
        {
          primary,
          backup,
          model: input.model,
          // Intentionally NOT logging systemPrompt/userPrompt to avoid leaking
          // user input or knowledge-base content.
          error: toAttemptErrorDetails(primaryError)
        },
        input.context?.traceId
      );

      const backupModel = resolveBackupModel(backup, input.model);
      try {
        return await withAiRetry(
          {
            provider: backup,
            model: backupModel,
            operation: () =>
              instrumentedCall(backup, {
                ...input,
                model: backupModel,
                // Anthropic ignores jsonSchema; safe to forward — adapters
                // strip what they don't support.
                jsonSchema: backup === "openai" ? input.jsonSchema : undefined
              })
          },
          input.context
        );
      } catch (backupError) {
        markUnsupportedModelIfNeeded(backup, backupModel, backupError);
        throw new AppError(
          502,
          "AI_PROVIDERS_EXHAUSTED",
          "Both primary and backup AI providers failed.",
          {
            primary: {
              provider: primary,
              model: input.model,
              error: toAttemptErrorDetails(primaryError)
            },
            backup: {
              provider: backup,
              model: backupModel,
              error: toAttemptErrorDetails(backupError)
            }
          }
        );
      }
    }
  }

  // Primary skipped due to cached unsupported flag — go straight to backup if any.
  if (!backup || backup === primary) {
    throw new AppError(
      502,
      "AI_PROVIDER_UNAVAILABLE",
      `Primary provider ${primary} is marked unsupported for model ${input.model} and no backup is configured.`
    );
  }

  const backupModel = resolveBackupModel(backup, input.model);
  return withAiRetry(
    {
      provider: backup,
      model: backupModel,
      operation: () =>
        instrumentedCall(backup, {
          ...input,
          model: backupModel,
          jsonSchema: backup === "openai" ? input.jsonSchema : undefined
        })
    },
    input.context
  );
}

async function callAiForJson(input: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  requestTimeoutMs?: number;
  context?: AiRequestContext;
}): Promise<unknown> {
  const response = await callWithFallback({
    model: input.model,
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    jsonSchema: input.jsonSchema,
    timeoutMs: input.requestTimeoutMs ?? env.AI_REQUEST_TIMEOUT_MS,
    context: input.context
  });

  if (env.LOG_AI_OUTPUT_TEXT) {
    logDebug(
      "ai",
      "AI output_text",
      { text: redactJsonTextIfPossible(response.text) },
      input.context?.traceId
    );
  }

  return parseJsonFromText(response.text);
}

function buildMockWorkflow(message: string): AiWorkflowOutput {
  const lower = message.toLowerCase();
  const wantsCron = /every|daily|weekly|friday|monday|cron|schedule/.test(lower);
  const triggerType = wantsCron ? "n8n-nodes-base.scheduleTrigger" : "n8n-nodes-base.webhook";
  const triggerName = wantsCron ? "Schedule Trigger" : "Webhook Trigger";

  const nodes: N8nNode[] = [
    {
      id: "trigger_1",
      name: triggerName,
      type: triggerType,
      typeVersion: 1,
      position: [220, 300],
      parameters: wantsCron
        ? {
            rule: {
              interval: [{ field: "days", triggerAtHour: 9 }]
            }
          }
        : {
            path: "automation-event",
            httpMethod: "POST"
          }
    },
    {
      id: "http_1",
      name: "Fetch Data",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [470, 300],
      parameters: {
        method: "GET",
        url: "https://example.com/api/data"
      }
    },
    {
      id: "set_1",
      name: "Format Payload",
      type: "n8n-nodes-base.set",
      typeVersion: 3,
      position: [730, 300],
      parameters: {
        mode: "manual",
        values: {
          string: [
            {
              name: "summary",
              value: "={{ JSON.stringify($json) }}"
            }
          ]
        }
      }
    }
  ];

  const connections: N8nWorkflow["connections"] = {
    [triggerName]: {
      main: [[{ node: "Fetch Data", type: "main", index: 0 }]]
    },
    "Fetch Data": {
      main: [[{ node: "Format Payload", type: "main", index: 0 }]]
    }
  };

  return {
    project_name: message.slice(0, 120),
    description: `Automation generated from chat: ${message}`,
    required_credentials: [],
    workflow: {
      name: message.slice(0, 80) || "Generated Automation",
      nodes,
      connections,
      settings: {}
    }
  };
}
function parseModelList(input: string | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function uniqueModelPlan(models: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of models) {
    if (seen.has(model)) {
      continue;
    }
    seen.add(model);
    out.push(model);
  }
  return out;
}

/**
 * RAG-agent code path. Mirrors the structure of the regular Anthropic loop:
 * up to N validation-retry attempts with a `promptHint` describing the previous
 * failure, but with no model-fallback chain (the agent is the only "model").
 * Persists each call to ai_interactions so cost/latency stay observable.
 */
async function generateWorkflowViaRagAgent(
  message: string,
  context?: AiRequestContext
): Promise<AiWorkflowOutput> {
  const deadline = Date.now() + env.AI_WORKFLOW_TOTAL_TIMEOUT_MS;
  const attemptErrors: Array<{ model: string; details: unknown }> = [];
  let promptHint = "";
  // Tighter retry budget than the full provider chain — there's no other
  // model to escalate to, so every retry is the same agent re-asked.
  const MAX_RAG_ATTEMPTS = 3;
  const PROVIDER_TAG = "rag_agent";

  for (let attempt = 1; attempt <= MAX_RAG_ATTEMPTS; attempt += 1) {
    try {
      assertWithinBudget(deadline);
      const remainingBudgetMs = getRemainingBudgetMs(deadline);
      const requestTimeoutMs = Math.max(
        1000,
        Math.min(env.AI_REQUEST_TIMEOUT_MS, remainingBudgetMs)
      );
      logInfo(
        "ai",
        "RAG workflow generation attempt",
        { attempt, request_timeout_ms: requestTimeoutMs, remaining_budget_ms: remainingBudgetMs },
        context?.traceId
      );

      const startedAt = Date.now();
      let response: AIResponse;
      try {
        response = await callRagAgent({
          userMessage: message,
          promptHint,
          timeoutMs: requestTimeoutMs,
          context
        });
        // Track the call for observability — same shape as the Anthropic path.
        persistAIInteraction({
          userId: context?.userId ?? null,
          provider: PROVIDER_TAG,
          model: PROVIDER_TAG,
          systemPrompt: "",
          userPrompt: message,
          response: response.text,
          rawResponse: response.raw,
          status: "success",
          errorMessage: null,
          tokensUsed: extractTokenCount(response.raw),
          latencyMs: Date.now() - startedAt,
          matchedPatternIds: context?.matchedPatternIds ?? null
        });
      } catch (callError) {
        persistAIInteraction({
          userId: context?.userId ?? null,
          provider: PROVIDER_TAG,
          model: PROVIDER_TAG,
          systemPrompt: "",
          userPrompt: message,
          response: "",
          rawResponse: null,
          status: "error",
          errorMessage: callError instanceof Error ? callError.message : String(callError),
          tokensUsed: null,
          latencyMs: Date.now() - startedAt,
          matchedPatternIds: context?.matchedPatternIds ?? null
        });
        throw callError;
      }

      if (env.LOG_AI_OUTPUT_TEXT) {
        logDebug(
          "ai",
          "AI output_text (rag_agent)",
          { text: redactJsonTextIfPossible(response.text) },
          context?.traceId
        );
      }

      const candidateRaw = parseJsonFromText(response.text);
      const candidate = normalizeAiWorkflowCandidate(candidateRaw, context?.traceId);
      const parsed = validateWorkflowStructure(candidate);
      if (!parsed.parsed) {
        attemptErrors.push({ model: PROVIDER_TAG, details: parsed.errors });
        promptHint = `PREVIOUS_ATTEMPT_FAILED_STRUCTURE:\n${JSON.stringify(parsed.errors)}`;
        logWarn(
          "ai",
          "RAG workflow structure validation failed",
          { attempt, errors: parsed.errors },
          context?.traceId
        );
        continue;
      }

      const security = validateWorkflowSecurity(parsed.parsed.workflow);
      if (!security.valid) {
        attemptErrors.push({ model: PROVIDER_TAG, details: security.errors });
        promptHint = `PREVIOUS_ATTEMPT_FAILED_SECURITY:\n${JSON.stringify(security.errors)}`;
        logWarn(
          "ai",
          "RAG workflow security validation failed",
          { attempt, errors: security.errors },
          context?.traceId
        );
        continue;
      }

      // Skip intent-coverage check — the agent's own KB is meant to ground
      // the response on user intent, and adding a second heuristic on top
      // tends to reject acceptable agent outputs that phrase nodes
      // differently from the user's wording.

      logInfo(
        "ai",
        "RAG workflow generation finished",
        { attempt, node_count: parsed.parsed.workflow.nodes.length },
        context?.traceId
      );
      return {
        ...parsed.parsed,
        required_credentials: extractRequiredCredentialTypesFromWorkflow(parsed.parsed.workflow)
      };
    } catch (error) {
      attemptErrors.push({ model: PROVIDER_TAG, details: error });
      logWarn(
        "ai",
        "RAG workflow attempt failed",
        { attempt, error: toAttemptErrorDetails(error) },
        context?.traceId
      );
      // For non-validation errors (network/auth/timeout), don't loop — surface
      // immediately so the user sees the real problem instead of three retries.
      if (error instanceof AppError && error.code !== "AI_BAD_OUTPUT") {
        throw buildAiFailureError({
          fallbackCode: "AI_RAG_AGENT_FAILED",
          message: "RAG agent request failed.",
          attempts: attemptErrors
        });
      }
    }
  }

  throw buildAiFailureError({
    fallbackCode: "AI_RAG_AGENT_FAILED",
    message: "RAG agent failed to produce a valid workflow after retries.",
    attempts: attemptErrors
  });
}

export async function generateWorkflowFromMessage(
  message: string,
  context?: AiRequestContext
): Promise<AiWorkflowOutput> {
  logInfo("ai", "Workflow generation started", { provider: env.AI_PROVIDER }, context?.traceId);
  if (env.AI_PROVIDER === "mock") {
    return buildMockWorkflow(message);
  }

  // Pre-fetch tenant memory (pattern cards + breadcrumbs) once before the
  // model fallback loop. The selection is deterministic on the user message
  // so it doesn't need to vary per attempt.
  const memory = await buildMemoryContext(message, context);
  const ctxWithPatterns: AiRequestContext = {
    ...(context ?? {}),
    matchedPatternIds: memory.matchedPatternIds.length > 0 ? memory.matchedPatternIds : undefined
  };

  // Short-circuit users granted access to the platform RAG agent. The agent
  // already encodes the n8n-engineer system prompt + curated knowledge base
  // server-side, so we send only the raw message and skip both locally. We
  // still validate the returned workflow with the same security/structure
  // checks and use the same retry-with-promptHint loop for self-correction.
  if (resolveRagAgentConfig()) {
    return generateWorkflowViaRagAgent(message, ctxWithPatterns);
  }

  const deadline = Date.now() + env.AI_WORKFLOW_TOTAL_TIMEOUT_MS;

  const allModels = uniqueModelPlan([
    env.AI_WORKFLOW_MODEL,
    env.AI_MODEL_PRIMARY,
    ...parseModelList(env.AI_WORKFLOW_FALLBACK_MODELS),
    env.AI_MODEL_FAST,
    env.AI_MODEL_COMPLEX
  ].filter((value): value is string => Boolean(value)));
  const modelPlan = allModels.filter(
    (model) => !unsupportedModelsCache.has(unsupportedKey(env.AI_PROVIDER, model))
  );
  const effectivePlan = modelPlan.length > 0 ? modelPlan : allModels;
  const workflowSystemPrompt = buildWorkflowGenerationSystemPrompt(message, context?.traceId, {
    patternCardsBlock: memory.patternCardsBlock,
    breadcrumbsBlock: memory.breadcrumbsBlock
  });

  const attemptErrors: Array<{ model: string; details: unknown }> = [];

  for (const model of effectivePlan) {
    let promptHint = "";

    for (let modelAttempt = 1; modelAttempt <= MAX_WORKFLOW_ATTEMPTS_PER_MODEL; modelAttempt += 1) {
      try {
        assertWithinBudget(deadline);
        const remainingBudgetMs = getRemainingBudgetMs(deadline);
        const requestTimeoutMs = Math.max(1000, Math.min(env.AI_REQUEST_TIMEOUT_MS, remainingBudgetMs));
        logInfo(
          "ai",
          "Workflow generation attempt",
          {
            model,
            model_attempt: modelAttempt,
            request_timeout_ms: requestTimeoutMs,
            remaining_budget_ms: remainingBudgetMs
          },
          context?.traceId
        );
        const candidateRaw = await callAiForJson({
          model,
          systemPrompt: workflowSystemPrompt,
          userPrompt: buildWorkflowGenerationUserPrompt(message, promptHint),
          requestTimeoutMs,
          jsonSchema:
            env.AI_PROVIDER === "openai"
              ? { name: "workflow_generation", schema: WORKFLOW_OUTPUT_SCHEMA }
              : undefined,
          context: ctxWithPatterns
        });

        const candidate = normalizeAiWorkflowCandidate(candidateRaw, context?.traceId);
        const parsed = validateWorkflowStructure(candidate);
        if (!parsed.parsed) {
          attemptErrors.push({ model, details: parsed.errors });
          promptHint = `PREVIOUS_ATTEMPT_FAILED_STRUCTURE:\n${JSON.stringify(parsed.errors)}`;
          logWarn(
            "ai",
            "Workflow structure validation failed for model",
            { model, model_attempt: modelAttempt, errors: parsed.errors },
            context?.traceId
          );
          continue;
        }

        const security = validateWorkflowSecurity(parsed.parsed.workflow);
        if (!security.valid) {
          attemptErrors.push({ model, details: security.errors });
          promptHint = `PREVIOUS_ATTEMPT_FAILED_SECURITY:\n${JSON.stringify(security.errors)}`;
          logWarn(
            "ai",
            "Workflow security validation failed for model",
            { model, model_attempt: modelAttempt, errors: security.errors },
            context?.traceId
          );
          continue;
        }

        const intentCoverageErrors = validateWorkflowIntentCoverage(message, parsed.parsed.workflow);
        if (intentCoverageErrors.length > 0) {
          attemptErrors.push({ model, details: intentCoverageErrors });
          promptHint = `PREVIOUS_ATTEMPT_FAILED_INTENT_COVERAGE:\n${JSON.stringify(intentCoverageErrors)}`;
          logWarn(
            "ai",
            "Workflow intent coverage failed for model",
            { model, model_attempt: modelAttempt, errors: intentCoverageErrors },
            context?.traceId
          );
          continue;
        }

        logInfo(
          "ai",
          "Workflow generation finished",
          { model, model_attempt: modelAttempt, node_count: parsed.parsed.workflow.nodes.length },
          context?.traceId
        );
        return {
          ...parsed.parsed,
          required_credentials: extractRequiredCredentialTypesFromWorkflow(parsed.parsed.workflow)
        };
      } catch (error) {
        const modelMarkedUnsupported = markUnsupportedModelIfNeeded(env.AI_PROVIDER, model, error);
        if (modelMarkedUnsupported) {
          logWarn(
            "ai",
            "Marking model as unsupported for this process due to auth/permission error",
            { model },
            context?.traceId
          );
          attemptErrors.push({ model, details: error });
          break;
        }

        attemptErrors.push({ model, details: error });
        logWarn(
          "ai",
          "Workflow generation attempt failed",
          { model, model_attempt: modelAttempt, error: toAttemptErrorDetails(error) },
          context?.traceId
        );
      }
    }
  }

  throw buildAiFailureError({
    fallbackCode: "AI_SCHEMA_MISMATCH",
    message: "All AI models failed to produce a valid workflow JSON.",
    attempts: attemptErrors
  });
}

export async function analyzeWorkflowFailure(
  input: {
    workflowJson: N8nWorkflow;
    errorMessage: string | null;
    recentEvents: Array<Record<string, unknown>>;
    /** Owning workflow id — used for failure-cluster lookup. Optional so
     *  legacy callers keep working; without it we skip cluster context. */
    workflowId?: string;
    /** Owning tenant id — required for breadcrumb + cluster injection.
     *  When absent, the analyzer falls back to its original behavior
     *  (no tenant memory). Strict tenant scoping is preserved by routing
     *  through `recentBreadcrumbs` / `failureClusterFor`, both of which
     *  refuse calls without an ownerUserId. */
    ownerUserId?: string;
  },
  context?: AiRequestContext
): Promise<FailureAnalysis> {
  logInfo("ai", "Failure analysis started", undefined, context?.traceId);
  if (env.AI_PROVIDER === "mock") {
    return {
      issue: "Workflow execution failed.",
      reason: input.errorMessage ?? "Unknown runtime error.",
      solution: "Review credentials, endpoint availability, and required input fields."
    };
  }

  // Memory enrichment for tenants we can identify. The failure-cluster signal
  // is the highest-value piece — "this exact error has hit this workflow N
  // times in the last 30 days" reframes the model from "guess a fix" to
  // "this is a known recurrence". Skip if the lookup fails for any reason.
  let breadcrumbsBlock = "";
  let failureClusterBlock = "";
  if (input.ownerUserId && env.AI_BREADCRUMBS_ENABLED) {
    try {
      const rows = await recentBreadcrumbs({
        ownerUserId: input.ownerUserId,
        sinceHours: Math.max(env.AI_BREADCRUMBS_HOURS, 72),
        limit: env.AI_BREADCRUMBS_LIMIT,
        kindPrefixes: ["event:", "anomaly:"]
      });
      if (rows.length > 0) {
        breadcrumbsBlock = buildBreadcrumbsPromptBlock(rows, {
          header: "RECENT_WORKFLOW_SIGNALS"
        });
      }
    } catch (error) {
      logWarn(
        "ai",
        "Failure analysis: breadcrumb fetch failed",
        { error: error instanceof Error ? error.message : String(error) },
        context?.traceId
      );
    }

    if (input.workflowId && input.errorMessage) {
      try {
        const cluster = await failureClusterFor({
          ownerUserId: input.ownerUserId,
          workflowId: input.workflowId,
          errorMessage: input.errorMessage
        });
        if (cluster) {
          failureClusterBlock = [
            "<FAILURE_CLUSTER>",
            `fingerprint: ${cluster.fingerprint}`,
            `occurrences_last_30d: ${cluster.count}`,
            `first_seen: ${cluster.first_seen.toISOString()}`,
            `last_seen: ${cluster.last_seen.toISOString()}`,
            "</FAILURE_CLUSTER>"
          ].join("\n");
        }
      } catch (error) {
        logWarn(
          "ai",
          "Failure analysis: cluster lookup failed",
          { error: error instanceof Error ? error.message : String(error) },
          context?.traceId
        );
      }
    }
  }

  const systemPrompt = [
    ANALYSIS_SYSTEM_PROMPT,
    failureClusterBlock,
    breadcrumbsBlock
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");

  const candidate = await callAiForJson({
    model: env.AI_ANALYSIS_MODEL || env.AI_MODEL_PRIMARY,
    systemPrompt,
    userPrompt: JSON.stringify(
      {
        error_message: input.errorMessage,
        workflow: input.workflowJson,
        recent_events: input.recentEvents
      },
      null,
      2
    ),
    context
  });

  const parsed = failureAnalysisSchema.safeParse(candidate);
  if (!parsed.success) {
    logWarn("ai", "Failure analysis schema mismatch", parsed.error.issues, context?.traceId);
    throw new AppError(502, "AI_ANALYSIS_SCHEMA_MISMATCH", "AI analysis schema mismatch.", parsed.error.issues);
  }

  logInfo("ai", "Failure analysis completed", undefined, context?.traceId);
  return parsed.data;
}

export async function fixRejectedWorkflow(
  input: FixWorkflowInput,
  context?: AiRequestContext
): Promise<{ workflow: N8nWorkflow; validation: { valid: boolean; errors: string[] } }> {
  logInfo("ai", "Workflow fix started", undefined, context?.traceId);

  if (env.AI_PROVIDER === "mock") {
    const normalized = normalizeWorkflowDefinition(input.workflow, context?.traceId);
    const validation = validateWorkflowSecurity(normalized);
    return {
      workflow: normalized,
      validation
    };
  }

  const allModels = uniqueModelPlan(
    [
      env.AI_WORKFLOW_MODEL,
      env.AI_MODEL_PRIMARY,
      ...parseModelList(env.AI_WORKFLOW_FALLBACK_MODELS),
      env.AI_MODEL_FAST,
      env.AI_MODEL_COMPLEX
    ].filter((value): value is string => Boolean(value))
  );
  const modelPlan = allModels.filter(
    (model) => !unsupportedModelsCache.has(unsupportedKey(env.AI_PROVIDER, model))
  );
  const effectivePlan = modelPlan.length > 0 ? modelPlan : allModels;
  const fixSystemPrompt = buildWorkflowFixSystemPrompt(
    input.originalRequest,
    input.validationErrors,
    context?.traceId
  );

  const attemptErrors: Array<{ model: string; details: unknown }> = [];
  const deadline = Date.now() + env.AI_WORKFLOW_TOTAL_TIMEOUT_MS;
  let lastInvalidResult: { workflow: N8nWorkflow; validation: { valid: boolean; errors: string[] } } | null =
    null;

  for (const model of effectivePlan) {
    let promptHint = "";

    for (let modelAttempt = 1; modelAttempt <= MAX_WORKFLOW_ATTEMPTS_PER_MODEL; modelAttempt += 1) {
      try {
        assertWithinBudget(deadline);
        const remainingBudgetMs = getRemainingBudgetMs(deadline);
        const requestTimeoutMs = Math.max(1000, Math.min(env.AI_REQUEST_TIMEOUT_MS, remainingBudgetMs));
        logInfo(
          "ai",
          "Workflow fix attempt",
          {
            model,
            model_attempt: modelAttempt,
            request_timeout_ms: requestTimeoutMs,
            remaining_budget_ms: remainingBudgetMs
          },
          context?.traceId
        );
        const candidateRaw = await callAiForJson({
          model,
          systemPrompt: fixSystemPrompt,
          requestTimeoutMs,
          userPrompt:
            JSON.stringify(
              {
                original_request: input.originalRequest,
                current_workflow: input.workflow,
                validation_errors: input.validationErrors,
                approved_node_type_prefixes: input.approvedNodeTypePrefixes ?? [
                  "n8n-nodes-base.",
                  "n8n-nodes-"
                ],
                required_workflow_shape: {
                  nodes: [
                    {
                      id: "string",
                      name: "string",
                      type: "string",
                      typeVersion: 1,
                      position: [220, 300],
                      parameters: {}
                    }
                  ],
                  connections: {},
                  settings: {}
                }
              },
              null,
              2
            ) + (promptHint ? `\n\n${promptHint}` : ""),
          jsonSchema:
            env.AI_PROVIDER === "openai"
              ? { name: "fix_workflow", schema: FIX_WORKFLOW_OUTPUT_SCHEMA }
              : undefined,
          context
        });

        const workflowCandidate =
          candidateRaw &&
          typeof candidateRaw === "object" &&
          "workflow" in (candidateRaw as Record<string, unknown>)
            ? (candidateRaw as Record<string, unknown>).workflow
            : candidateRaw;
        const normalized = normalizeWorkflowDefinition(workflowCandidate, context?.traceId);
        const validation = validateWorkflowSecurity(normalized);
        if (!validation.valid) {
          lastInvalidResult = {
            workflow: normalized,
            validation
          };
          attemptErrors.push({ model, details: validation.errors });
          promptHint = `PREVIOUS_ATTEMPT_ERRORS:\n${JSON.stringify(validation.errors)}`;
          logWarn(
            "ai",
            "Workflow fix candidate still invalid",
            { model, model_attempt: modelAttempt, errors: validation.errors },
            context?.traceId
          );
          continue;
        }

        logInfo("ai", "Workflow fix completed", { model, model_attempt: modelAttempt }, context?.traceId);
        return {
          workflow: normalized,
          validation
        };
      } catch (error) {
        const modelMarkedUnsupported = markUnsupportedModelIfNeeded(env.AI_PROVIDER, model, error);
        if (modelMarkedUnsupported) {
          logWarn(
            "ai",
            "Marking model as unsupported for this process due to auth/permission error",
            { model },
            context?.traceId
          );
          attemptErrors.push({ model, details: error });
          break;
        }
        attemptErrors.push({ model, details: error });
        logWarn(
          "ai",
          "Workflow fix attempt failed",
          { model, model_attempt: modelAttempt, error: toAttemptErrorDetails(error) },
          context?.traceId
        );
      }
    }
  }

  if (lastInvalidResult) {
    logWarn(
      "ai",
      "Workflow fix returned rejected candidate after all attempts",
      { errors: lastInvalidResult.validation.errors },
      context?.traceId
    );
    return lastInvalidResult;
  }

  throw buildAiFailureError({
    fallbackCode: "AI_WORKFLOW_FIX_FAILED",
    message: "Failed to generate a corrected workflow from AI.",
    attempts: attemptErrors
  });
}

export const aiServiceInternals = {
  buildWorkflowGenerationSystemPrompt,
  buildWorkflowGenerationUserPrompt,
  validateWorkflowIntentCoverage
};
