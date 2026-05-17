import Stripe from 'stripe';
import { openai } from '<npm>/lib/openai';
import { isDuplicate } from '../dedup';
import type { NewAction, InvoiceReminderPayload, UserContext } from '../types';

const OVERDUE_DAYS = 7;

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

async function draftReminderEmail(
  ctx: UserContext,
  clientName: string,
  amountDue: number,
  daysOverdue: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a professional email assistant. Output strict JSON only.',
      },
      {
        role: 'user',
        content: `Write a polite but firm payment reminder email.

Sender agency: ${ctx.companyName || 'our agency'}
Client name: ${clientName}
Amount overdue: $${amountDue.toFixed(2)} USD
Days overdue: ${daysOverdue}

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: professional, mentions amount, 1 line
- body: 3-4 short paragraphs, professional tone, no markdown, no emojis
- Include a request to arrange payment or contact us to discuss
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.3,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `Payment reminder: $${amountDue.toFixed(2)} overdue`,
    body: parsed.body ?? `Hi ${clientName},\n\nThis is a reminder that your invoice of $${amountDue.toFixed(2)} is ${daysOverdue} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n${ctx.companyName}`,
  };
}

export async function evalInvoiceReminders(
  ctx: UserContext,
  stripeApiKey: string,
): Promise<NewAction[]> {
  const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 });
  const now = new Date();
  const cutoff = new Date(now.getTime() - OVERDUE_DAYS * 24 * 60 * 60 * 1000);

  let invoices: Stripe.Invoice[];
  try {
    const resp = await stripe.invoices.list({
      status: 'open',
      due_date: { lt: unix(cutoff) },
      limit: 20,
      expand: ['data.customer'],
    });
    invoices = resp.data;
  } catch (err) {
    console.warn('[evalInvoiceReminders] Stripe fetch failed:', err);
    return [];
  }

  const actions: NewAction[] = [];

  for (const inv of invoices) {
    const custId =
      typeof inv.customer === 'object' && inv.customer !== null
        ? (inv.customer as Stripe.Customer).id
        : String(inv.customer ?? 'unknown');

    const clientName =
      typeof inv.customer === 'object' && inv.customer !== null
        ? ((inv.customer as Stripe.Customer).name ?? 'Unknown')
        : 'Unknown';

    const recipientEmail =
      typeof inv.customer === 'object' && inv.customer !== null
        ? ((inv.customer as Stripe.Customer).email ?? null)
        : (inv.customer_email ?? null);

    if (!recipientEmail) continue;
    if (!inv.due_date) continue;

    const daysOverdue = Math.floor((unix(now) - inv.due_date) / 86400);
    const amountDue = (inv.amount_due ?? 0) / 100;
    const invoiceId = inv.id;

    const dup = await isDuplicate(ctx.userId, 'invoice_reminder', 'invoice_id', invoiceId);
    if (dup) continue;

    let draft: { subject: string; body: string };
    try {
      draft = await draftReminderEmail(ctx, clientName, amountDue, daysOverdue);
    } catch {
      draft = {
        subject: `Payment reminder: $${amountDue.toFixed(2)} overdue`,
        body: `Hi ${clientName},\n\nYour invoice of $${amountDue.toFixed(2)} is ${daysOverdue} days overdue. Please arrange payment.\n\n${ctx.companyName}`,
      };
    }

    const payload: InvoiceReminderPayload = {
      stripe_customer_id: custId,
      invoice_id: invoiceId,
      client_name: clientName,
      amount_due: amountDue,
      days_overdue: daysOverdue,
      recipient_email: recipientEmail,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'invoice_reminder', payload });
  }

  return actions;
}
