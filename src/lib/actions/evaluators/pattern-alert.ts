// src/lib/actions/evaluators/pattern-alert.ts
//
// Turns high-confidence pattern cards into proposed actions. Closes
// the brain → pattern → action loop: the diorization pipeline detects
// a recurring theme, and the next nightly evaluator surfaces it to
// the owner as a concrete recommended action.
//
// Trigger: any active pattern card with confidence >= 0.70 that has
// NOT already produced a pattern_alert action in the last 60 days
// (dedup window matches the recurrence cycle for most agency patterns).

import { openai } from '<npm>/lib/openai';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { isDuplicate } from '../dedup';
import type { NewAction, PatternAlertPayload, UserContext } from '../types';

const CONFIDENCE_THRESHOLD = 0.70;

async function draftPatternRecommendation(
  ctx: UserContext,
  pattern: {
    pattern_type: string;
    title: string;
    description: string;
    confidence: number;
    source_breadcrumb_count: number;
  },
): Promise<{ recommended_action: string; subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are the AI COO of a marketing agency. Output strict JSON only.' },
      {
        role: 'user',
        content: `A recurring pattern has been detected across your agency's recent operational history. Draft a concrete recommendation for the owner.

Agency: ${ctx.companyName || 'the agency'}
Pattern type: ${pattern.pattern_type}
Pattern title: ${pattern.title}
Pattern description: ${pattern.description}
Confidence: ${(pattern.confidence * 100).toFixed(0)}%
Evidence: ${pattern.source_breadcrumb_count} conversations support this pattern

Return JSON: { "recommended_action": "...", "subject": "...", "body": "..." }

Rules:
- recommended_action: 1-3 sentences. WHAT to do, not WHY. The "why" is the pattern description itself.
- subject: tight, scannable in the actions queue. Reference the pattern.
- body: 3-4 short paragraphs. (1) state the pattern + evidence, (2) what's at risk if ignored, (3) the specific next steps to take this week.
- Founder-to-founder tone. Dollar amounts where you can. No fluff.
- This is an INTERNAL brief — the owner reads it, not a client.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { recommended_action?: string; subject?: string; body?: string };
  return {
    recommended_action:
      parsed.recommended_action ??
      `Review the "${pattern.title}" pattern this week and decide whether to act, document, or dismiss as noise.`,
    subject: parsed.subject ?? `Pattern detected: ${pattern.title}`,
    body:
      parsed.body ??
      `A recurring pattern was detected across ${pattern.source_breadcrumb_count} recent conversations. Confidence: ${(pattern.confidence * 100).toFixed(0)}%. Review when you have 10 minutes.`,
  };
}

export async function evalPatternAlerts(ctx: UserContext): Promise<NewAction[]> {
  const supabase = getServerSupabaseClient();

  const { data: cards } = await supabase
    .from('pattern_cards')
    .select('id, pattern_type, title, description, confidence, source_breadcrumb_ids')
    .eq('user_id', ctx.userId)
    .eq('is_active', true)
    .gte('confidence', CONFIDENCE_THRESHOLD)
    .order('confidence', { ascending: false })
    .limit(10);

  if (!cards?.length) return [];

  const actions: NewAction[] = [];

  for (const card of cards) {
    // Dedup by pattern_card_id: don't re-propose the same pattern within
    // 60 days unless the pattern card itself was regenerated (last_refreshed_at
    // changes drive a new card row eventually).
    const dup = await isDuplicate(ctx.userId, 'pattern_alert', 'pattern_card_id', card.id);
    if (dup) continue;

    const sourceCount = (card.source_breadcrumb_ids as string[] | null)?.length ?? 0;

    let draft: { recommended_action: string; subject: string; body: string };
    try {
      draft = await draftPatternRecommendation(ctx, {
        pattern_type: card.pattern_type,
        title: card.title,
        description: card.description,
        confidence: Number(card.confidence),
        source_breadcrumb_count: sourceCount,
      });
    } catch {
      draft = {
        recommended_action: `Review the "${card.title}" pattern this week.`,
        subject: `Pattern detected: ${card.title}`,
        body: `${card.description}\n\nConfidence: ${(Number(card.confidence) * 100).toFixed(0)}%. Evidence: ${sourceCount} conversations.`,
      };
    }

    const payload: PatternAlertPayload = {
      pattern_card_id: card.id,
      pattern_type: card.pattern_type,
      pattern_title: card.title,
      pattern_description: card.description,
      confidence: Number(card.confidence),
      source_breadcrumb_count: sourceCount,
      recommended_action: draft.recommended_action,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };

    actions.push({ action_type: 'pattern_alert', payload });
  }

  return actions;
}
