// Retainer invoice draft evaluator.
// Fires within the last 5 days of the month for each configured retainer client.
// Proposes creating a draft Stripe invoice for the retainer amount.
// Approval-required — when the founder approves, the executor calls Stripe API
// to create the actual draft invoice (not auto-sent; founder reviews in Stripe).

import Stripe from 'stripe';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { normalizeClientName } from '<npm>/lib/retainer';
import { isDuplicate } from '../dedup';
import type { NewAction, RetainerInvoiceDraftPayload, UserContext } from '../types';

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysUntilEndOfMonth(now: Date): number {
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const diffMs = last.getTime() - now.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function currentPeriodLabel(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function evalRetainerInvoiceDraft(
  ctx: UserContext,
  stripeKey: string,
): Promise<NewAction[]> {
  const now = new Date();
  // Only propose within the last 5 days of the month — enough time to review + send.
  if (daysUntilEndOfMonth(now) > 5) return [];

  const supabase = getServerSupabaseClient();
  const actions: NewAction[] = [];

  const { data: configRows } = await supabase
    .from('retainer_configs')
    .select('client_name_display, client_name_norm, monthly_amount_usd')
    .eq('user_id', ctx.userId);

  if (!configRows || configRows.length === 0) return [];

  const stripe = new Stripe(stripeKey, { typescript: true, maxNetworkRetries: 2 });
  const period = currentPeriodLabel(now);

  // Cache the Stripe customer search so we don't paginate per-retainer.
  let allCustomers: Stripe.Customer[] = [];
  try {
    const result = await stripe.customers.list({ limit: 100 });
    allCustomers = result.data;
  } catch (err) {
    console.error('[retainer-invoice-draft] stripe.customers.list failed:', err);
    return [];
  }

  for (const cfg of configRows) {
    const norm = cfg.client_name_norm as string;
    const display = cfg.client_name_display as string;
    const amount = Number(cfg.monthly_amount_usd);
    if (amount <= 0) continue;

    // Find matching Stripe customer by normalized name
    const stripeCustomer = allCustomers.find((c) => normalizeClientName(c.name ?? '') === norm);
    if (!stripeCustomer?.id) continue;

    // Dedup on (client_name_norm + period) so we only propose one draft per client per month.
    const dedupKey = `${norm}|${period}`;
    const dup = await isDuplicate(
      ctx.userId,
      'retainer_invoice_draft',
      'client_period_key',
      dedupKey,
    );
    if (dup) continue;

    const description = `Monthly retainer — ${display} — ${period}`;

    const payload: RetainerInvoiceDraftPayload & { client_period_key: string } = {
      client_name: display,
      client_name_norm: norm,
      stripe_customer_id: stripeCustomer.id,
      amount_usd: amount,
      retainer_period: period,
      description,
      client_period_key: dedupKey,
    };

    actions.push({ action_type: 'retainer_invoice_draft', payload });
  }

  if (actions.length > 0) {
    console.log('[retainer-invoice-draft] proposed', actions.length, 'drafts (', fmtMoney(actions.reduce((s, a) => s + (a.payload as RetainerInvoiceDraftPayload).amount_usd, 0)), 'total ARR)');
  }

  return actions;
}
