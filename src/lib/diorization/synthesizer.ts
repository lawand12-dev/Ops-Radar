// src/lib/diorization/synthesizer.ts
//
// Turns a RawConversation into a BreadcrumbInput via LLM summarisation.
// The breadcrumb (summary + tags + embedding) is what persists; the raw
// body does NOT enter our DB. Customer-owned raw content stays in the
// source system or in a customer-encrypted archive.

import { openai } from '<npm>/lib/openai';
import type { RawConversation, BreadcrumbInput } from './types';

const SYNTH_MODEL = 'gpt-4o-mini';
const EMBED_MODEL = 'text-embedding-3-small';

const SYNTH_SYSTEM_PROMPT = `You are a diorizer. Your job is to read a single conversation/email/meeting transcript and produce a structured "breadcrumb" — a 1-3 sentence summary + 3-8 short topic tags.

RULES:
1. Summary is dense. No filler. Names + facts + outcome. 25-60 words.
2. Tags are short kebab-case strings, useful for cross-conversation pattern detection.
   Examples: ["margin-conversation", "client-acme", "q4-budget", "scope-discussion"]
3. NEVER hallucinate. If the body is empty or noise, return summary="(empty)" tags=[].
4. Respect privacy: if the body contains explicit "off the record" / "do not share" markers, return summary="(redacted by request)" tags=["redacted"].

Return JSON only: {"summary": "...", "tags": ["..."]}`;

export async function synthesise(
  userId: string,
  sourceId: string | null,
  raw: RawConversation,
): Promise<BreadcrumbInput> {
  // Skip diorization for non-consented sources entirely
  if (!raw.consent_verified) {
    return {
      user_id: userId,
      source_id: sourceId,
      source_type: raw.source_type,
      source_ref: raw.source_ref,
      occurred_at: raw.occurred_at,
      participants: raw.participants,
      summary: '(skipped: consent not verified)',
      tags: ['consent-skipped'],
      consent_verified: false,
      embedding: null,
    };
  }

  // 1. Synthesise
  let summary = '(empty)';
  let tags: string[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: SYNTH_MODEL,
      messages: [
        { role: 'system', content: SYNTH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Participants: ${raw.participants.join(', ')}\nOccurred at: ${raw.occurred_at}\nSource: ${raw.source_type}\n\nConversation body:\n${raw.body.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    });
    const raw_json = completion.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw_json) as { summary?: string; tags?: string[] };
    summary = typeof parsed.summary === 'string' ? parsed.summary : '(empty)';
    tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === 'string').slice(0, 12) : [];
  } catch (err) {
    console.error('[diorize/synthesise] LLM failed:', err);
    return {
      user_id: userId,
      source_id: sourceId,
      source_type: raw.source_type,
      source_ref: raw.source_ref,
      occurred_at: raw.occurred_at,
      participants: raw.participants,
      summary: '(synthesis failed)',
      tags: ['synthesis-failed'],
      consent_verified: true,
      embedding: null,
    };
  }

  // 2. Embed the summary (not the body — privacy + cost)
  let embedding: number[] | null = null;
  try {
    const e = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: summary.slice(0, 4000),
    });
    embedding = e.data[0]?.embedding ?? null;
  } catch (err) {
    console.error('[diorize/synthesise] embedding failed:', err);
  }

  return {
    user_id: userId,
    source_id: sourceId,
    source_type: raw.source_type,
    source_ref: raw.source_ref,
    occurred_at: raw.occurred_at,
    participants: raw.participants,
    summary,
    tags,
    consent_verified: true,
    embedding,
  };
}
