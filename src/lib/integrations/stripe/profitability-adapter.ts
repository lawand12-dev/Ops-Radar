// src/lib/integrations/stripe/profitability-adapter.ts
import Stripe from 'stripe';

export type StripeClientRevenue = {
  id: string;
  name: string;
  revenue_current: number;   // USD paid invoices, current month-to-date
  revenue_prior: number;     // USD paid invoices, prior full month
  payment_status: 'on_time' | 'overdue' | 'unknown';
  days_overdue: number | null;
};

export type StripePerClientData = {
  clients: StripeClientRevenue[];
  currency: 'USD';
};

function stripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, { typescript: true, maxNetworkRetries: 2 });
}

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

export async function fetchStripePerClientRevenue(apiKey: string): Promise<StripePerClientData> {
  const stripe = stripeClient(apiKey);
  const now = new Date();

  // Current month bounds
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Prior month bounds
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(currentStart.getTime() - 1);

  const [currentInvoices, priorInvoices, overdueInvoices] = await Promise.all([
    stripe.invoices.list({
      status: 'paid',
      created: { gte: unix(currentStart) },
      limit: 100,
      expand: ['data.customer'],
    }),
    stripe.invoices.list({
      status: 'paid',
      created: { gte: unix(priorStart), lte: unix(priorEnd) },
      limit: 100,
      expand: ['data.customer'],
    }),
    stripe.invoices.list({
      status: 'open',
      due_date: { lt: unix(now) },
      limit: 100,
      expand: ['data.customer'],
    }),
  ]);

  // revenue_current keyed by customer id
  const currentByCustomer = new Map<string, { name: string; revenue: number }>();
  for (const inv of currentInvoices.data) {
    const custId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? 'unknown';
    const custName = typeof inv.customer === 'object' && inv.customer !== null
      ? ((inv.customer as Stripe.Customer).name ?? 'Unknown')
      : 'Unknown';
    const cur = currentByCustomer.get(custId) ?? { name: custName, revenue: 0 };
    cur.revenue += (inv.amount_paid ?? 0) / 100;
    currentByCustomer.set(custId, cur);
  }

  // revenue_prior keyed by customer id
  const priorByCustomer = new Map<string, number>();
  for (const inv of priorInvoices.data) {
    const custId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? 'unknown';
    priorByCustomer.set(custId, (priorByCustomer.get(custId) ?? 0) + (inv.amount_paid ?? 0) / 100);
  }

  // overdue status keyed by customer id
  const overdueByCustomer = new Map<string, number>(); // custId → max days overdue
  const nowSec = unix(now);
  for (const inv of overdueInvoices.data) {
    if (!inv.due_date || inv.due_date >= nowSec) continue;
    const custId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? 'unknown';
    const days = Math.floor((nowSec - inv.due_date) / 86400);
    overdueByCustomer.set(custId, Math.max(overdueByCustomer.get(custId) ?? 0, days));
  }

  // Merge all customer ids seen across any list
  const allIds = new Set([
    ...currentByCustomer.keys(),
    ...priorByCustomer.keys(),
    ...overdueByCustomer.keys(),
  ]);

  const clients: StripeClientRevenue[] = [];
  for (const id of allIds) {
    const cur = currentByCustomer.get(id);
    const name = cur?.name ?? 'Unknown';
    const revenueCurrent = cur?.revenue ?? 0;
    const revenuePrior = priorByCustomer.get(id) ?? 0;
    const daysOverdue = overdueByCustomer.get(id) ?? null;
    const paymentStatus = daysOverdue !== null ? 'overdue' : (revenueCurrent > 0 || revenuePrior > 0) ? 'on_time' : 'unknown';

    clients.push({
      id,
      name,
      revenue_current: revenueCurrent,
      revenue_prior: revenuePrior,
      payment_status: paymentStatus,
      days_overdue: daysOverdue,
    });
  }

  return { clients, currency: 'USD' };
}
