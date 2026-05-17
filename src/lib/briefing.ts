import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { openai } from '<npm>/lib/openai';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';

export type AttentionItem = {
  priority: 1 | 2 | 3;
  text: string;
  kind: 'alert' | 'warning' | 'info';
};

export type BriefingContent = {
  health_score: number;
  attention: AttentionItem[];
  win: string;
  recommendation: string;
};

export type StoredBriefing = BriefingContent & {
  id: string;
  user_id: string;
  kind: 'weekly' | 'manual';
  email_sent: boolean;
  read_at: string | null;
  created_at: string;
};

function buildPrompt(snapshot: Record<string, unknown>): string {
  return `You are the COO of a marketing/AI agency. Based on this week's operational data, generate an executive briefing.

Return STRICT JSON with this exact shape:
{
  "health_score": <0-100 integer>,
  "attention": [
    { "priority": 1, "text": "<max 2 sentences>", "kind": "<alert|warning|info>" },
    { "priority": 2, "text": "<max 2 sentences>", "kind": "<alert|warning|info>" },
    { "priority": 3, "text": "<max 2 sentences>", "kind": "<alert|warning|info>" }
  ],
  "win": "<1 sentence positive signal from this week>",
  "recommendation": "<1 specific action to take today, completable in under 30 minutes>"
}

Rules:
- health_score: 100 = everything green, 0 = everything on fire. Heavily weight overdue invoices, negative margins, and workflow failures.
- attention: sorted urgency-first (alert > warning > info). Never invent numbers not present in the data.
- win: name the single most positive signal. If nothing is clearly positive, name the most stable area.
- recommendation: name specific clients or workflows when the data supports it.
- Style: direct English, no jargon, no emojis, no markdown.

DATA (this week):
${JSON.stringify(snapshot, null, 2)}`;
}

async function buildSnapshotForUser(
  userId: string,
  blendedRate: number,
): Promise<Record<string, unknown>> {
  const supabase = getServerSupabaseClient();
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['stripe', 'harvest']);

  const stripe = (rows ?? []).find((r) => r.tool === 'stripe' && r.status === 'connected');
  const harvest = (rows ?? []).find((r) => r.tool === 'harvest' && r.status === 'connected');
  const snapshot: Record<string, unknown> = {};

  try {
    if (stripe && harvest) {
      const [stripeData, harvestData] = await Promise.all([
        fetchStripePerClientRevenue(decryptApiKey(stripe)),
        fetchHarvestPerClientHours(decryptApiKey(harvest)),
      ]);
      snapshot.profitability = computeClientProfitability(stripeData, harvestData, blendedRate);
    } else if (stripe) {
      snapshot.stripe_revenue = await fetchStripePerClientRevenue(decryptApiKey(stripe));
    } else if (harvest) {
      snapshot.harvest_hours = await fetchHarvestPerClientHours(decryptApiKey(harvest));
    }
  } catch (err) {
    console.warn('[briefing] snapshot partial failure:', err);
  }

  return snapshot;
}

export async function generateBriefingForUser(
  userId: string,
  blendedRate: number,
  kind: 'weekly' | 'manual',
): Promise<StoredBriefing | null> {
  const snapshot = await buildSnapshotForUser(userId, blendedRate);
  if (Object.keys(snapshot).length === 0) return null;

  let content: BriefingContent;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an executive briefing assistant. Output strict JSON only.' },
        { role: 'user',   content: buildPrompt(snapshot) },
      ],
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed.health_score !== 'number' ||
      !Array.isArray(parsed.attention) ||
      typeof parsed.win !== 'string' ||
      typeof parsed.recommendation !== 'string'
    ) {
      throw new Error('malformed briefing shape');
    }
    content = parsed as unknown as BriefingContent;
  } catch (err) {
    console.warn('[briefing] GPT-4o failed for', userId, err);
    return null;
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('briefings')
    .insert({
      user_id: userId,
      kind,
      health_score: content.health_score,
      attention: content.attention,
      win: content.win,
      recommendation: content.recommendation,
      email_sent: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.warn('[briefing] DB insert failed for', userId, error);
    return null;
  }

  return data as StoredBriefing;
}
