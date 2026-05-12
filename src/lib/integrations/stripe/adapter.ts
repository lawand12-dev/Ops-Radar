import Stripe from 'stripe';

function client(apiKey: string): Stripe {
  // Use SDK default apiVersion to avoid pinning to a literal that shifts
  // between major SDK releases; bump SDK to roll forward.
  return new Stripe(apiKey, {
    typescript: true,
    maxNetworkRetries: 2,
  });
}

export type StripeFinanceData = {
  invoiced: number; // USD, this month-to-date (sum of invoice amount_due)
  paid: number; // USD, this month-to-date (sum of paid invoice amount_paid)
  overdue: number; // USD, currently outstanding past due
  sparkline: Array<{ date: string; amount: number }>; // last 30 days, daily charge totals
  currency: 'USD';
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

/**
 * Validates a Stripe API key by calling /v1/account. Returns the account id
 * on success. Restricted keys with "Read" on Account → "View account details"
 * (the lightest scope) pass; anything weaker fails.
 */
export async function validateStripeKey(apiKey: string): Promise<AdapterValidation> {
  try {
    const stripe = client(apiKey);
    // SDK v22 requires an explicit id arg; passing null retrieves the
    // account associated with the API key (equivalent to GET /v1/account).
    const account = await stripe.accounts.retrieve(null);
    return { ok: true, externalAccountId: account.id };
  } catch (err: unknown) {
    const e = err as { type?: string; message?: string; statusCode?: number };
    if (e?.type === 'StripeAuthenticationError' || e?.statusCode === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The API key was rejected by Stripe.' };
    }
    if (e?.type === 'StripePermissionError' || e?.statusCode === 403) {
      return {
        ok: false,
        reason: 'permission',
        message: 'The API key lacks the required read permissions.',
      };
    }
    return { ok: false, reason: 'network', message: e?.message ?? 'Could not reach Stripe.' };
  }
}

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}
function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function subDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - n);
  return out;
}
function dayKey(sec: number): string {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

/**
 * Live-fetches the connected account's invoices + charges. No persistence.
 * v1 scope: USD only, single API page (limit 100).
 */
export async function fetchStripeFinanceData(apiKey: string): Promise<StripeFinanceData> {
  const stripe = client(apiKey);
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const thirtyDaysAgo = subDays(now, 30);
  const nowSec = unix(now);

  const [charges, invoices] = await Promise.all([
    stripe.charges.list({ created: { gte: unix(thirtyDaysAgo) }, limit: 100 }),
    stripe.invoices.list({ created: { gte: unix(monthStart) }, limit: 100 }),
  ]);

  const INVOICED_STATUSES: ReadonlyArray<Stripe.Invoice.Status> = ['open', 'paid', 'uncollectible'];
  const invoiced = invoices.data
    .filter((inv) => inv.status != null && INVOICED_STATUSES.includes(inv.status))
    .reduce((s, inv) => s + (inv.amount_due ?? 0), 0) / 100;
  const paid =
    invoices.data
      .filter((inv) => inv.status === 'paid')
      .reduce((s, inv) => s + (inv.amount_paid ?? 0), 0) / 100;
  const overdue =
    invoices.data
      .filter((inv) => inv.status === 'open' && inv.due_date != null && inv.due_date < nowSec)
      .reduce((s, inv) => s + (inv.amount_remaining ?? 0), 0) / 100;

  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) buckets[dayKey(unix(subDays(now, i)))] = 0;
  for (const ch of charges.data) {
    if (ch.status !== 'succeeded') continue;
    const k = dayKey(ch.created);
    if (k in buckets) buckets[k] += (ch.amount ?? 0) / 100;
  }
  const sparkline = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({ date, amount }));

  return { invoiced, paid, overdue, sparkline, currency: 'USD' };
}
