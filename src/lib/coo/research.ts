/**
 * Research + web access for the AI COO chat (CP-22).
 *
 * Three capabilities the AI COO needs to be the customer's *only* AI tool:
 *
 *   1. `webSearch(query)` — single-shot search via Tavily (purpose-built for
 *      LLM agents; free tier). Returns top results with title, url, snippet.
 *
 *   2. `researchCompetitor(name, focus)` — multi-step deep research:
 *      search → fetch top pages → structured extraction → optional Notion
 *      write. This is the "research my competitor" use case that today
 *      pushes customers to Perplexity / ChatGPT.
 *
 *   3. `analyzeDocument(text, question)` — structured analysis of a piece
 *      of provided text (pasted contract, RFP, proposal, etc). Multimodal
 *      file upload is wired separately at the chat UI layer; this helper
 *      handles the model call once the text is in hand.
 *
 * All three live in this single file so the tool wiring in
 * src/lib/coo/ai-sdk-tools.ts stays compact.
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// ─── 1. Web search via Tavily ──────────────────────────────────────────────

const TAVILY_ENDPOINT = 'https://api.tavily.com/search'

export type WebSearchResult = {
  title: string
  url: string
  snippet: string
  published_at?: string | null
}

export type WebSearchResponse = {
  success: true
  query: string
  answer?: string // Tavily's own one-paragraph synthesis when include_answer=true
  results: WebSearchResult[]
} | {
  success: false
  error: string
  hint?: string
}

export async function webSearch(
  query: string,
  opts: {
    maxResults?: number
    depth?: 'basic' | 'advanced'
    includeAnswer?: boolean
    includeDomains?: string[]
    excludeDomains?: string[]
  } = {},
): Promise<WebSearchResponse> {
  const apiKey = (process.env.TAVILY_API_KEY ?? '').trim()
  if (!apiKey) {
    return {
      success: false,
      error: 'TAVILY_API_KEY is not set',
      hint: 'Add TAVILY_API_KEY to Vercel env (free tier at tavily.com). Until then, web search is disabled — tell the customer.',
    }
  }

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: opts.depth ?? 'basic',
        max_results: opts.maxResults ?? 5,
        include_answer: opts.includeAnswer ?? true,
        include_domains: opts.includeDomains ?? [],
        exclude_domains: opts.excludeDomains ?? [],
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        success: false,
        error: `Tavily ${response.status}: ${text.slice(0, 200)}`,
      }
    }

    const payload = (await response.json()) as {
      answer?: string
      results?: Array<{
        title?: string
        url?: string
        content?: string
        published_date?: string | null
      }>
    }

    return {
      success: true,
      query,
      answer: payload.answer,
      results: (payload.results ?? []).map((r) => ({
        title: r.title ?? '(no title)',
        url: r.url ?? '',
        snippet: (r.content ?? '').slice(0, 800),
        published_at: r.published_date ?? null,
      })),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `web_search threw: ${message}` }
  }
}

// ─── 2. Competitor research (multi-step) ───────────────────────────────────

const CompetitorBriefSchema = z.object({
  competitor: z.string(),
  one_line_positioning: z.string(),
  what_they_sell: z.array(z.string()).max(6),
  pricing_signal: z.string().describe('Public pricing if found, or "not public" / "tiered, contact sales"'),
  target_customer: z.string(),
  notable_strengths: z.array(z.string()).max(5),
  notable_gaps_or_weaknesses: z.array(z.string()).max(5),
  team_size_signal: z.string().describe('Headcount estimate or "unknown" — cite source'),
  funding_signal: z.string().describe('Funding status if found or "unknown"'),
  recent_signals: z.array(z.string()).describe('Recent product launches, hires, fundraises, partnerships — last 90 days'),
  threat_level_to_us: z.enum(['low', 'medium', 'high']),
  threat_reasoning: z.string(),
  source_urls: z.array(z.string().url()).max(8),
})

export type CompetitorBrief = z.infer<typeof CompetitorBriefSchema>

export type CompetitorResearchResponse =
  | { success: true; brief: CompetitorBrief }
  | { success: false; error: string }

export async function researchCompetitor(input: {
  competitorName: string
  ourPositioning?: string // optional — included so threat_level_to_us is grounded
  focusAreas?: string[]
}): Promise<CompetitorResearchResponse> {
  const { competitorName, ourPositioning, focusAreas } = input

  const queries = [
    `${competitorName} pricing`,
    `${competitorName} product features`,
    `${competitorName} funding team`,
    `${competitorName} recent news 2026`,
  ]
  if (focusAreas && focusAreas.length > 0) {
    for (const focus of focusAreas.slice(0, 2)) {
      queries.push(`${competitorName} ${focus}`)
    }
  }

  const searchResults = await Promise.all(
    queries.map((q) =>
      webSearch(q, { depth: 'advanced', maxResults: 4, includeAnswer: false }),
    ),
  )

  const allHits: WebSearchResult[] = []
  for (const r of searchResults) {
    if (r.success) allHits.push(...r.results)
  }
  if (allHits.length === 0) {
    return {
      success: false,
      error: 'No search results — likely missing TAVILY_API_KEY or competitor name too obscure.',
    }
  }

  // Dedupe by url, keep first 15 to bound token usage.
  const seen = new Set<string>()
  const unique = allHits.filter((h) => {
    if (seen.has(h.url)) return false
    seen.add(h.url)
    return true
  }).slice(0, 15)

  const evidenceBlock = unique
    .map((h, i) => `[${i + 1}] ${h.title}\n${h.url}\n${h.snippet}`)
    .join('\n\n')

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: CompetitorBriefSchema,
      prompt: `You are a market analyst writing a competitor brief for a services-business AI COO product (OpsRadar). The customer asked you to research **${competitorName}**.

${ourPositioning ? `Our positioning, for threat-level grounding:\n${ourPositioning}\n\n` : ''}Use ONLY the evidence below. Do not invent facts. If something isn't found in the evidence, write "unknown" or "not public". Keep each field tight — the customer reads this in 60 seconds.

Evidence (numbered, cite the [N] in source_urls):

${evidenceBlock}

Return the structured brief. threat_level_to_us must be grounded in concrete overlap with ${ourPositioning ? 'the positioning above' : 'an AI COO for services businesses'} — not hand-waved.`,
    })
    return { success: true, brief: object }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `extraction failed: ${message}` }
  }
}

// ─── 3. Document analysis (structured) ─────────────────────────────────────

const DocumentAnalysisSchema = z.object({
  document_type: z.string().describe('e.g. "MSA contract", "RFP", "client proposal", "vendor agreement"'),
  one_line_summary: z.string(),
  key_terms: z.array(z.string()).max(10),
  obligations_on_us: z.array(z.string()),
  obligations_on_them: z.array(z.string()),
  financial_terms: z.array(z.string()).describe('Pricing, payment terms, penalties, late fees'),
  risk_flags: z.array(z.string()).describe('Things a senior COO would flag — auto-renewal, no termination clause, unlimited liability, etc.'),
  recommended_action: z.string().describe('What the owner should do next: sign / negotiate / reject / route to lawyer'),
  recommended_questions: z.array(z.string()).max(5).describe('Questions to ask the counterparty before signing'),
})

export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>

export type DocumentAnalysisResponse =
  | { success: true; analysis: DocumentAnalysis }
  | { success: false; error: string }

export async function analyzeDocument(input: {
  text: string
  question?: string
}): Promise<DocumentAnalysisResponse> {
  const { text, question } = input
  const trimmed = text.trim()
  if (trimmed.length < 100) {
    return { success: false, error: 'Document text too short (<100 chars).' }
  }

  // Cap context at ~30K chars — well within gpt-4o's window, leaves room
  // for the structured-output schema.
  const bounded = trimmed.length > 30000 ? `${trimmed.slice(0, 30000)}\n\n[TRUNCATED — ${trimmed.length - 30000} more chars]` : trimmed

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: DocumentAnalysisSchema,
      prompt: `You are reviewing a document for an agency / services-business owner. Read it carefully and produce the structured analysis below.

${question ? `The customer's specific question: ${question}\n\n` : ''}Cite specific clauses when flagging risks. Be a senior COO, not a lawyer — actionable risk flags, not exhaustive legal review.

Document:
"""
${bounded}
"""`,
    })
    return { success: true, analysis: object }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `analysis failed: ${message}` }
  }
}
