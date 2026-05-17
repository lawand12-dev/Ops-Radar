import { openai } from '<npm>/lib/openai';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { isDuplicate } from '../dedup';
import type { NewAction, MarginAlertPayload, UserContext } from '../types';

const MARGIN_THRESHOLD = 15;

async function draftRepricingEmail(
  ctx: UserContext,
  clientName: string,
  marginPct: number,
  revenueMtd: number,
  costMtd: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a professional business advisor. Output strict JSON only.' },
      {
        role: 'user',
        content: `Write a professional repricing conversation email to a client.

Agency: ${ctx.companyName || 'our agency'}
Client: ${clientName}
Current margin: ${marginPct.toFixed(1)}%
Revenue this month: $${revenueMtd.toFixed(0)}
Cost this month: $${costMtd.toFixed(0)}

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: professional, does not mention "margin" or specific numbers
- body: 3-4 paragraphs, warm tone, explains service scope has grown, proposes a conversation about pricing
- Do NOT mention exact margin percentage to the client
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `Let's talk about our engagement — ${clientName}`,
    body: parsed.body ?? `Hi ${clientName},\n\nI wanted to reach out to discuss our engagement and ensure it continues to deliver great value for both sides.\n\nLet's find time to chat.\n\n${ctx.companyName}`,
  };
}

export async function evalMarginAlerts(
  ctx: UserContext,
  stripeApiKey: string,
  harvestApiKey: string,
): Promise<NewAction[]> {
  let stripeData, harvestData;
  try {
    [stripeData, harvestData] = await Promise.all([
      fetchStripePerClientRevenue(stripeApiKey),
      fetchHarvestPerClientHours(harvestApiKey),
    ]);
  } catch (err) {
    console.warn('[evalMarginAlerts] data fetch failed:', err);
    return [];
  }

  const result = computeClientProfitability(stripeData, harvestData, ctx.blendedRate);
  const actions: NewAction[] = [];

  for (const client of result.clients) {
    if (client.margin_pct >= MARGIN_THRESHOLD) continue;
    if (client.revenue_mtd < 500) continue;

    const dedupId = client.stripe_customer_id ?? client.id;
    const dup = await isDuplicate(ctx.userId, 'margin_alert', 'stripe_customer_id', dedupId);
    if (dup) continue;

    let draft: { subject: string; body: string };
    try {
      draft = await draftRepricingEmail(ctx, client.name, client.margin_pct, client.revenue_mtd, client.cost_mtd);
    } catch {
      draft = {
        subject: `Let's talk about our engagement — ${client.name}`,
        body: `Hi ${client.name},\n\nI wanted to reach out to discuss our current engagement and ensure the pricing reflects the scope of work we're delivering.\n\nWould you be open to a quick call this week?\n\n${ctx.companyName}`,
      };
    }

    const payload: MarginAlertPayload = {
      stripe_customer_id: dedupId,
      client_name: client.name,
      margin_pct: client.margin_pct,
      margin_prior_pct: client.margin_prior_pct,
      revenue_mtd: client.revenue_mtd,
      cost_mtd: client.cost_mtd,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'margin_alert', payload });
  }

  return actions;
}
