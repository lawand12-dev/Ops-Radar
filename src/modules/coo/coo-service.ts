import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import { runHybridRetrieval } from "../memory/hybrid-retrieval";
import { recentBreadcrumbs } from "../memory/breadcrumbs";
import { selectPatternCards } from "../memory/pattern-cards";
import { enqueueEmbeddingJob } from "../memory/embedding-jobs";
import type { CooQueryRequest, CooQueryResponse, CooDataPoint } from "../../types/coo-api";

const COO_SCOPE = "coo-service";

const SYSTEM_PROMPT = `You are a senior Chief Operating Officer analyst and strategic advisor with deep expertise in operational efficiency, risk management, and business intelligence.

You have access to the following operational data about this company:
- Recent workflow executions, AI interactions, and system events (BREADCRUMBS)
- Pattern cards showing recurring workflows and their success rates (PATTERNS)
- Semantic search results from the company's operational memory (CONTEXT)

Your job is to answer the user's business question with executive-level precision.

ALWAYS respond with valid JSON matching this exact schema:
{
  "answer": "detailed multi-paragraph answer",
  "executive_summary": "one-sentence TL;DR",
  "data_points": [{"label": "...", "value": "...", "source": "breadcrumb|pattern_card|semantic", "confidence": "high|medium|low"}],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"],
  "risks": ["risk 1", "risk 2"],
  "confidence": "high|medium|low"
}

Base your analysis strictly on the provided context. If context is insufficient, say so clearly in the answer and set confidence to "low".
Do not invent data. Do not include markdown in the JSON strings.`;

interface AiJsonPayload {
  answer?: string;
  executive_summary?: string;
  data_points?: unknown[];
  recommendations?: unknown[];
  risks?: unknown[];
  confidence?: string;
}

function extractFirstJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseAiConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function parseAiDataPoints(raw: unknown[]): CooDataPoint[] {
  const result: CooDataPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj["label"] !== "string" || typeof obj["value"] !== "string") continue;
    result.push({
      label: obj["label"],
      value: obj["value"],
      source: typeof obj["source"] === "string" ? obj["source"] : "semantic",
      confidence: parseAiConfidence(obj["confidence"])
    });
  }
  return result;
}

function parseAiStringArray(raw: unknown[]): string[] {
  return raw.filter((item): item is string => typeof item === "string");
}

function parseAiResponse(text: string): {
  answer: string;
  executive_summary: string;
  data_points: CooDataPoint[];
  recommendations: string[];
  risks: string[];
  confidence: "high" | "medium" | "low";
} {
  // Try direct parse first, then extract first {...} block
  let parsed: AiJsonPayload | null = null;
  try {
    parsed = JSON.parse(text) as AiJsonPayload;
  } catch {
    const block = extractFirstJsonBlock(text);
    if (block) {
      try {
        parsed = JSON.parse(block) as AiJsonPayload;
      } catch {
        // fall through to plain-text fallback
      }
    }
  }

  if (parsed) {
    const answer = typeof parsed.answer === "string" ? parsed.answer : text.slice(0, 2000);
    const rawSummary = parsed.executive_summary;
    const executive_summary =
      typeof rawSummary === "string" && rawSummary.length > 0
        ? rawSummary
        : (answer.split(/[.!?]/)[0] ?? answer).slice(0, 200);
    const data_points = Array.isArray(parsed.data_points)
      ? parseAiDataPoints(parsed.data_points)
      : [];
    const recommendations = Array.isArray(parsed.recommendations)
      ? parseAiStringArray(parsed.recommendations)
      : [];
    const risks = Array.isArray(parsed.risks) ? parseAiStringArray(parsed.risks) : [];
    const confidence = parseAiConfidence(parsed.confidence);
    return { answer, executive_summary, data_points, recommendations, risks, confidence };
  }

  // Plain-text fallback
  const truncated = text.slice(0, 2000);
  const firstSentence = (truncated.split(/[.!?]/)[0] ?? truncated).slice(0, 200);
  return {
    answer: truncated,
    executive_summary: firstSentence,
    data_points: [],
    recommendations: [],
    risks: [],
    confidence: "low"
  };
}

function buildContextBlock(
  hits: Array<{ source_kind: string; content: string; final_score: number }>,
  breadcrumbs: Array<{ at: Date; kind: string; summary: string | null; outcome: string | null }>,
  patternCards: Array<{ card: { id: string; version: number; intent: string | null; body: string } }>
): string {
  const MAX_CONTEXT_CHARS = 8000;
  const sections: string[] = [];

  // Semantic hits (up to 20)
  if (hits.length > 0) {
    const hitLines: string[] = [];
    const limit = Math.min(hits.length, 20);
    for (let n = 0; n < limit; n++) {
      const h = hits[n]!;
      const score = h.final_score.toFixed(2);
      const content = h.content.slice(0, 300);
      hitLines.push(
        `[SEMANTIC HIT ${n + 1}] kind=${h.source_kind} score=${score}\n${content}`
      );
    }
    sections.push(`=== CONTEXT (Semantic) ===\n${hitLines.join("\n\n")}`);
  }

  // Pattern cards (up to 5)
  if (patternCards.length > 0) {
    const cardLines: string[] = [];
    const limit = Math.min(patternCards.length, 5);
    for (let i = 0; i < limit; i++) {
      const s = patternCards[i]!;
      const c = s.card;
      const bodyExcerpt = c.body.slice(0, 200);
      cardLines.push(
        `[PATTERN: ${c.id}@v${c.version}] intent=${c.intent ?? "(none)"}\nbody: ${bodyExcerpt}`
      );
    }
    sections.push(`=== PATTERNS ===\n${cardLines.join("\n\n")}`);
  }

  // Breadcrumbs (up to 30, truncated from oldest if over budget)
  if (breadcrumbs.length > 0) {
    const crumbs = breadcrumbs.slice(0, 30);
    const crumbLines = crumbs.map(
      (b) =>
        `[${b.at.toISOString()}] ${b.kind}: ${b.summary ?? "(no summary)"} → ${b.outcome ?? "?"}`
    );
    sections.push(`=== BREADCRUMBS ===\n${crumbLines.join("\n")}`);
  }

  let contextBlock = sections.join("\n\n");

  // If over budget, trim breadcrumbs from oldest (they're at the end)
  if (contextBlock.length > MAX_CONTEXT_CHARS && breadcrumbs.length > 0) {
    const overhead = contextBlock.length - MAX_CONTEXT_CHARS;
    const crumbSection = sections[sections.length - 1] ?? "";
    const crumbLines = crumbSection.split("\n").slice(1); // drop header line
    let removed = 0;
    let trimmedLines = [...crumbLines];
    // Remove from oldest first (they should already be sorted desc, so remove from end)
    while (removed < overhead && trimmedLines.length > 0) {
      const last = trimmedLines.pop()!;
      removed += last.length + 1;
    }
    const trimmedSection =
      trimmedLines.length > 0
        ? `=== BREADCRUMBS ===\n${trimmedLines.join("\n")}`
        : "";
    const mainSections = sections.slice(0, sections.length - 1);
    if (trimmedSection) mainSections.push(trimmedSection);
    contextBlock = mainSections.join("\n\n");
  }

  return contextBlock.slice(0, MAX_CONTEXT_CHARS);
}

// Resolve which AI backend to use for COO queries.
// Prefers Anthropic when ANTHROPIC_API_KEY is set; falls back to the
// OpenAI-compatible AI_BASE_URL (DigitalOcean, etc.).
function resolveCooAiBackend(): {
  url: string;
  headers: Record<string, string>;
  model: string;
  maxTokens: number;
  mode: "anthropic" | "openai_compat";
} {
  if (env.ANTHROPIC_API_KEY) {
    return {
      url: `${env.ANTHROPIC_BASE_URL}/messages`,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": env.ANTHROPIC_VERSION
      },
      model: env.AI_MODEL_COMPLEX || env.AI_MODEL_PRIMARY,
      maxTokens: env.ANTHROPIC_MAX_TOKENS,
      mode: "anthropic"
    };
  }
  if (env.AI_API_KEY) {
    return {
      url: `${env.AI_BASE_URL}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_API_KEY}`
      },
      model: env.AI_MODEL_COMPLEX || env.AI_MODEL_PRIMARY,
      maxTokens: env.ANTHROPIC_MAX_TOKENS,
      mode: "openai_compat"
    };
  }
  throw new AppError(500, "AI_CONFIG_ERROR", "No AI provider configured. Set ANTHROPIC_API_KEY or AI_API_KEY.");
}

function extractAiText(
  payload: Record<string, unknown>,
  mode: "anthropic" | "openai_compat"
): string {
  if (mode === "anthropic") {
    const content = payload["content"] as Array<{ type: string; text?: string }> | undefined;
    return content?.find((p) => p.type === "text")?.text ?? "";
  }
  // OpenAI-compatible: choices[0].message.content
  const choices = payload["choices"] as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? "";
}

export async function executeCooQuery(
  userId: string,
  request: CooQueryRequest
): Promise<CooQueryResponse> {
  const startedAt = Date.now();

  // Throws AI_CONFIG_ERROR if neither key is set.
  const backend = resolveCooAiBackend();

  const contextWindowHours = Math.min(
    Math.max(1, request.context_window_hours ?? 168),
    720
  );

  // Gather context in parallel
  const [retrievalResult, breadcrumbList, patternCardScores] = await Promise.all([
    env.HYBRID_RETRIEVAL_ENABLED && env.POSTGRES_URL
      ? runHybridRetrieval({
          ownerUserId: userId,
          queryText: request.query,
          outputKind: "coo_playbook",
          topK: 15
        }).catch((err) => {
          logWarn(COO_SCOPE, "hybrid retrieval failed, using empty hits", {
            error: err instanceof Error ? err.message : String(err)
          });
          return { hits: [], pattern_card_scores: [], used_fallback: true };
        })
      : Promise.resolve({ hits: [], pattern_card_scores: [], used_fallback: true }),

    env.AI_BREADCRUMBS_ENABLED
      ? recentBreadcrumbs({
          ownerUserId: userId,
          sinceHours: contextWindowHours,
          limit: 50
        }).catch((err) => {
          logWarn(COO_SCOPE, "breadcrumb retrieval failed", {
            error: err instanceof Error ? err.message : String(err)
          });
          return [];
        })
      : Promise.resolve([]),

    Promise.resolve(
      selectPatternCards({ prompt: request.query, outputKind: "coo_playbook" })
    )
  ]);

  const { hits, pattern_card_scores: hybridPatternCards, used_fallback } = retrievalResult;

  // Merge pattern cards: prefer hybrid results, fall back to local selector
  const effectivePatternCards =
    hybridPatternCards.length > 0 ? hybridPatternCards : patternCardScores;

  const contextBlock = buildContextBlock(hits, breadcrumbList, effectivePatternCards);

  const userMessage = `OPERATIONAL CONTEXT:
${contextBlock || "(No context available — answer based on general knowledge only)"}

---

BUSINESS QUESTION:
${request.query}`;

  if (env.LOG_AI_RAW_RESPONSE) {
    logInfo(COO_SCOPE, "COO query context built", {
      hits: hits.length,
      breadcrumbs: breadcrumbList.length,
      pattern_cards: effectivePatternCards.length,
      context_chars: contextBlock.length
    });
  }

  let aiText = "";
  try {
    const requestBody =
      backend.mode === "anthropic"
        ? JSON.stringify({
            model: backend.model,
            max_tokens: backend.maxTokens,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }]
          })
        : JSON.stringify({
            model: backend.model,
            max_tokens: backend.maxTokens,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMessage }
            ]
          });

    const response = await fetchWithTimeout({
      url: backend.url,
      timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
      requestName: "ai:coo",
      errorCode: "AI_REQUEST_TIMEOUT",
      init: { method: "POST", headers: backend.headers, body: requestBody }
    });

    if (!response.ok) {
      const details = await response.text();
      throw new AppError(502, "AI_REQUEST_FAILED", "COO AI request failed.", {
        status: response.status,
        body: details.slice(0, 500)
      });
    }

    const payload = (await response.json()) as Record<string, unknown>;
    aiText = extractAiText(payload, backend.mode);

    if (env.LOG_AI_RAW_RESPONSE) {
      logInfo(COO_SCOPE, "raw COO AI response", { text: aiText.slice(0, 500) });
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logWarn(COO_SCOPE, "COO AI call failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    const latency_ms = Date.now() - startedAt;
    return {
      query: request.query,
      answer: "Unable to process query at this time. Please retry.",
      executive_summary: "Query processing failed.",
      data_points: [],
      recommendations: [],
      risks: [],
      confidence: "low",
      context_used: {
        semantic_hits: hits.length,
        breadcrumbs_analyzed: breadcrumbList.length,
        pattern_cards_matched: effectivePatternCards.length,
        used_hybrid_retrieval: !used_fallback
      },
      latency_ms
    };
  }

  const parsed = parseAiResponse(aiText);

  // Fire-and-forget: enqueue coo_query embedding
  if (userId && env.POSTGRES_URL) {
    const embeddingContent = `Q: ${request.query}\nA: ${parsed.answer}`.slice(0, 4000);
    setImmediate(() => {
      enqueueEmbeddingJob({
        ownerUserId: userId,
        sourceKind: "ai_interaction",
        sourceId: `coo_query:${userId}:${startedAt}`,
        sourceVersion: 1,
        content: embeddingContent,
        metadata: {
          kind: "coo_query",
          query_chars: request.query.length,
          confidence: parsed.confidence
        }
      }).catch((err: unknown) => {
        logWarn(COO_SCOPE, "failed to enqueue coo_query embedding", {
          error: err instanceof Error ? err.message : String(err)
        });
      });
    });
  }

  logInfo(COO_SCOPE, "COO query completed", {
    userId,
    latency_ms: Date.now() - startedAt,
    confidence: parsed.confidence,
    semantic_hits: hits.length,
    breadcrumbs: breadcrumbList.length,
    pattern_cards: effectivePatternCards.length
  });

  return {
    query: request.query,
    answer: parsed.answer,
    executive_summary: parsed.executive_summary,
    data_points: parsed.data_points,
    recommendations: parsed.recommendations,
    risks: parsed.risks,
    confidence: parsed.confidence,
    context_used: {
      semantic_hits: hits.length,
      breadcrumbs_analyzed: breadcrumbList.length,
      pattern_cards_matched: effectivePatternCards.length,
      used_hybrid_retrieval: !used_fallback
    },
    latency_ms: Date.now() - startedAt
  };
}
