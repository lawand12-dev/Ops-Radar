import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { openai } from '<npm>/lib/openai';
import { Redis } from '@upstash/redis';

type Persona = 'ceo' | 'coo' | 'both';

const CACHE_TTL_SECONDS = 60 * 60; // 1h per spec

type NarrativeResponse = {
  status: 'ok' | 'unavailable';
  hero?: string;
  sections?: { automations: string; business: string };
  generated_at?: string;
  message?: string;
};

function buildPrompt(persona: Persona, snapshot: Record<string, unknown>): string {
  const personaBlurb = persona === 'ceo'
    ? 'Audience: CEO of a marketing/AI agency. Lead with revenue, growth, risk.'
    : persona === 'coo'
    ? 'Audience: COO of a marketing/AI agency. Lead with operations, what ran, what broke.'
    : 'Audience: CEO + COO of a marketing/AI agency. Cover both business and operations.';

  return `${personaBlurb}

Return STRICT JSON with this exact shape:
{
  "hero": "1-2 sentence headline summarizing the week.",
  "sections": {
    "business": "2-3 sentences on revenue, pipeline, prospects, bookings. Mention real entity names and numbers if present."
  }
}

Style: plain English, no jargon, no emojis. Never invent numbers. Use only the data below.

DATA (this customer, last 7 days):
${JSON.stringify(snapshot, null, 2)}`;
}

async function fetchSnapshot(request: NextRequest): Promise<Record<string, unknown>> {
  const origin = new URL(request.url).origin;
  // Parallel server-side fetch of Layer-2 endpoints.
  const cookieHeader = request.headers.get('cookie') ?? '';
  const headers = { cookie: cookieHeader };

  const endpoints = [
    'finance',
    'sales-live',
    'marketing',
  ];

  const results = await Promise.allSettled(
    endpoints.map((ep) =>
      fetch(`${origin}/api/dashboard/${ep}`, { headers, cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => [ep, data] as const),
    ),
  );

  const snapshot: Record<string, unknown> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const [ep, data] = r.value;
      snapshot[ep] = data;
    }
  }
  return snapshot;
}

export async function GET(request: NextRequest): Promise<NextResponse<NarrativeResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const persona = (new URL(request.url).searchParams.get('persona') ?? 'both') as Persona;
  if (!['ceo', 'coo', 'both'].includes(persona)) {
    return NextResponse.json({ status: 'unavailable', message: 'bad persona' }, { status: 400 });
  }

  const redis = Redis.fromEnv();
  const cacheKey = `dashboard:narrative:${userId}:${persona}`;

  const cached = await redis.get<NarrativeResponse>(cacheKey);
  if (cached?.status === 'ok') {
    return NextResponse.json(cached);
  }

  let snapshot: Record<string, unknown>;
  try {
    snapshot = await fetchSnapshot(request);
  } catch (err) {
    console.warn('[narrative] snapshot fetch failed:', err);
    return NextResponse.json({ status: 'unavailable', message: 'snapshot_failed' });
  }

  let parsed: { hero: string; sections: { automations: string; business: string } };
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an executive briefing assistant. Output strict JSON only.' },
        { role: 'user',   content: buildPrompt(persona, snapshot) },
      ],
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    parsed = JSON.parse(raw);
    if (!parsed?.hero || !parsed.sections?.automations || !parsed.sections?.business) {
      throw new Error('malformed narrative shape');
    }
  } catch (err) {
    console.warn('[narrative] OpenAI failed:', err);
    return NextResponse.json({ status: 'unavailable', message: 'llm_failed' });
  }

  const body: NarrativeResponse = {
    status: 'ok',
    hero: parsed.hero,
    sections: parsed.sections,
    generated_at: new Date().toISOString(),
  };

  await redis.set(cacheKey, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
