// src/lib/diorization/living-brief.ts
//
// Synthesises the per-tenant "living brief" — a 5-10 page markdown
// document the COO agent always has loaded. Generated monthly from
// the active pattern cards + last 30 days of breadcrumbs.

import { generateTextWithFallback } from '<npm>/lib/ai/model-provider';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const BRIEF_MODEL = 'gpt-4o';
const BRIEF_PROMPT_VERSION = 'living-brief-v1';

const BRIEF_SYSTEM_PROMPT = `You are writing the LIVING BRIEF for an agency owner — a 5-10 page markdown document that captures everything an AI COO should know about THIS specific agency, right now.

Use only the inputs provided. Do not hallucinate. Do not invent client names. The owner will read this — accuracy matters more than coverage.

STRUCTURE:
1. The agency in one paragraph (size, focus, stage)
2. Active pattern cards (cite confidence)
3. Recent operational themes (last 30 days of breadcrumbs)
4. Open questions / unknowns the brief CANNOT answer
5. What an AI COO should pay attention to next

VOICE: founder-to-founder, dollar amounts, short sentences, no markdown headers larger than ##.`;

export async function generateLivingBrief(userId: string): Promise<{ version: number; chars: number } | null> {
  const supabase = getServerSupabaseClient();

  // Pull active pattern cards
  const { data: cards } = await supabase
    .from('pattern_cards')
    .select('pattern_type, title, description, confidence, first_observed_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('confidence', { ascending: false })
    .limit(30);

  // Pull last 30 days of breadcrumbs (top by recency)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: breadcrumbs } = await supabase
    .from('breadcrumbs')
    .select('occurred_at, summary, tags')
    .eq('user_id', userId)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(100);

  // Pull user metadata for agency-level context
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  if (!cards?.length && !breadcrumbs?.length) {
    return null;
  }

  const cardsBlock = (cards ?? [])
    .map(
      (c) =>
        `- ${c.title} (${c.pattern_type}, conf=${c.confidence}, first observed ${c.first_observed_at?.slice(0, 10)})\n  ${c.description}`,
    )
    .join('\n');

  const breadcrumbsBlock = (breadcrumbs ?? [])
    .slice(0, 80)
    .map((b) => `- [${b.occurred_at.slice(0, 10)}] ${b.summary} (tags: ${(b.tags ?? []).join(', ')})`)
    .join('\n');

  const userPrompt = `Agency profile:
- Company: ${meta.company_name ?? 'unknown'}
- Team size: ${meta.team_size ?? 'unknown'}
- Blended rate: $${meta.blended_hourly_rate_usd ?? 85}/hr

ACTIVE PATTERN CARDS (${cards?.length ?? 0}):
${cardsBlock || '(none)'}

RECENT BREADCRUMBS (last 30 days, ${breadcrumbs?.length ?? 0}):
${breadcrumbsBlock || '(none)'}`;

  let briefContent = '';
  try {
    const completion = await generateTextWithFallback({
      model: BRIEF_MODEL,
      system: BRIEF_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
      maxOutputTokens: 4000,
    });
    briefContent = completion.text ?? '';
  } catch (err) {
    console.error('[living-brief] LLM failed:', err);
    return null;
  }

  if (!briefContent.trim()) return null;

  // Determine next version number
  const { data: lastBrief } = await supabase
    .from('living_briefs')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  const nextVersion = (lastBrief?.version ?? 0) + 1;

  await supabase.from('living_briefs').insert({
    user_id: userId,
    version: nextVersion,
    brief_content: briefContent,
    model_used: BRIEF_MODEL,
    prompt_version: BRIEF_PROMPT_VERSION,
    is_current: true,
  });

  return { version: nextVersion, chars: briefContent.length };
}
