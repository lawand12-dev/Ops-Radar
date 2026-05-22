// src/lib/actions/evaluators/cash-flow.ts
//
// Watches the agency's cash flow signals via Stripe and proposes an
// advisory action when the overdue ratio crosses a risk threshold.
//
// Trigger logic:
//   overdue_ratio = overdue_usd / max(1, paid_mtd_usd)
//   alert when overdue_ratio >= 50% AND overdue_usd >= $2,000
//
// Why: an agency with $20K paid MTD and $12K overdue is one bad month
// from a cash crunch. Catching it BEFORE the crunch is the whole point.

import { openai } from '<npm>/lib/openai';
import { fetchStripeFinanceData } from '<npm>/lib/integrations/stripe/adapter';
import { isDuplicate } from '../dedup';
import type { NewAction, CashFlowAlertPayload, UserContext } from '../types';

const OVERDUE_RATIO_THRESHOLD = 0.5;
const OVERDUE_MIN_USD = 2000;

async function draftCashFlowAdvisory(
  ctx: UserContext,
  paidMtd: number,
  overdue: number,
  ratioPct: number,
  topClients: Array<{ name: string | null; amount_usd: number; days_overdue: number }>,
): Promise<{ subject: string; body: string }> {
  const topClientLines = topClients
    .slice(0, 3)
    .map((c) => `- ${c.name ?? 'Unnamed'}: $${c.amount_usd.toFixed(0)} (${c.days_overdue}d overdue)`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a CFO advisor for a marketing agency. Output strict JSON only.' },
      {
        role: 'user',
        content: `Draft an internal cash-flow advisory for the agency owner. This is NOT sent to a client — it's a brief for the founder.

Agency: ${ctx.companyName || 'the agency'}
Paid this month: $${paidMtd.toFixed(0)}
Currently overdue: $${overdue.toFixed(0)}
Overdue ratio: ${ratioPct.toFixed(0)}% of MTD paid

Top overdue clients:
${topClientLines || '(no detail available)'}

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: tight, dollar-anchored, no panic. e.g. "Cash flow watch — $X overdue is ${ratioPct.toFixed(0)}% of paid MTD"
- body: 3 short paragraphs — (1) the situation in numbers, (2) the specific clients to chase first, (3) the 3 levers to pull this week (collections sequence, payment plan offer for one client, retainer-cadence change)
- No fluff. Founder-to-founder tone. Numbers over adjectives.`,
      },
    ],
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `Cash flow watch — $${overdue.toFixed(0)} overdue (${ratioPct.toFixed(0)}% of paid MTD)`,
    body:
      parsed.body ??
      `Heads up — your overdue balance is $${overdue.toFixed(0)} against $${paidMtd.toFixed(0)} paid this month (${ratioPct.toFixed(0)}%). Start collections on the oldest invoices today; consider a payment-plan offer for the largest one.`,
  };
}

export async function evalCashFlow(
  ctx: UserContext,
  stripeApiKey: string,
): Promise<NewAction[]> {
  let data;
  try {
    data = await fetchStripeFinanceData(stripeApiKey);
  } catch (err) {
    console.warn('[evalCashFlow] data fetch failed:', err);
    return [];
  }

  const paidMtd = data.paid;
  const overdue = data.overdue;
  const ratio = overdue / Math.max(1, paidMtd);
  if (overdue < OVERDUE_MIN_USD) return [];
  if (ratio < OVERDUE_RATIO_THRESHOLD) return [];

  // Dedup on (period). Only one cash flow alert per agency per 30-day window.
  const periodKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const dup = await isDuplicate(ctx.userId, 'cash_flow_alert', 'period', periodKey);
  if (dup) return [];

  const topClients = data.rows.slice(0, 5).map((r) => ({
    name: r.customer_name ?? null,
    amount_usd: r.amount,
    days_overdue: r.days_overdue,
  }));

  let draft: { subject: string; body: string };
  try {
    draft = await draftCashFlowAdvisory(ctx, paidMtd, overdue, ratio * 100, topClients);
  } catch {
    draft = {
      subject: `Cash flow watch — $${overdue.toFixed(0)} overdue (${(ratio * 100).toFixed(0)}% of paid MTD)`,
      body: `Overdue is $${overdue.toFixed(0)} against $${paidMtd.toFixed(0)} paid MTD. Run collections this week.`,
    };
  }

  const payload: CashFlowAlertPayload = {
    paid_mtd_usd: paidMtd,
    overdue_usd: overdue,
    open_invoice_usd: data.invoiced,
    overdue_ratio_pct: Number((ratio * 100).toFixed(1)),
    top_overdue_clients: topClients,
    draft_subject: draft.subject,
    draft_body: draft.body,
  };
  return [{ action_type: 'cash_flow_alert', payload }];
}
