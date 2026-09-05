/**
 * Stripe tools for hired AI employees, brokered through Nango.
 *
 * Same toolkit shape as Gmail (CP-38 pattern). Stripe API is REST under /v1.
 * Read-heavy by design: revenue / collections / bookkeeper employees mostly
 * READ (charges, invoices, balance, customers, subscriptions). The few write
 * actions (send/void an invoice) are approval-gated.
 *
 * Nango injects the customer's Stripe key. userId is closure-bound — the
 * model never sees credentials, only the per-call inputs.
 */

import { z } from 'zod'
import { tool } from 'ai'
import { nangoProxy, type NangoToolSlug } from '<npm>/lib/nango'

const STRIPE: NangoToolSlug = 'stripe'

// ─── CORE TOOLS (always loaded) ────────────────────────────────────────────

export function buildStripeToolsCore(userId: string) {
  return {
    stripe_list_charges: tool({
      description:
        'List recent charges (payments). Returns amount, currency, status, customer, created. Use to read cash collected and spot large or failed payments.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        starting_after: z.string().optional().describe('Charge id to paginate after'),
        created_gte: z
          .number()
          .optional()
          .describe('Only charges created at/after this unix timestamp'),
      }),
      execute: async ({ limit, starting_after, created_gte }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: '/v1/charges',
          params: {
            limit,
            ...(starting_after ? { starting_after } : {}),
            ...(created_gte ? { 'created[gte]': created_gte } : {}),
          },
        }),
    }),

    stripe_list_invoices: tool({
      description:
        'List invoices. status can be draft, open, paid, uncollectible, or void. Use "open" to find overdue/unpaid invoices for collections.',
      inputSchema: z.object({
        status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
        starting_after: z.string().optional(),
      }),
      execute: async ({ status, limit, starting_after }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: '/v1/invoices',
          params: {
            limit,
            ...(status ? { status } : {}),
            ...(starting_after ? { starting_after } : {}),
          },
        }),
    }),

    stripe_get_balance: tool({
      description: 'Read the current Stripe balance (available + pending) across currencies.',
      inputSchema: z.object({}),
      execute: async () =>
        nangoProxy({ userId, tool: STRIPE, method: 'GET', endpoint: '/v1/balance' }),
    }),

    stripe_list_customers: tool({
      description: 'List customers (id, email, name, created). Use to map a charge/invoice to a client.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        email: z.string().optional().describe('Filter by exact email'),
        starting_after: z.string().optional(),
      }),
      execute: async ({ limit, email, starting_after }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: '/v1/customers',
          params: {
            limit,
            ...(email ? { email } : {}),
            ...(starting_after ? { starting_after } : {}),
          },
        }),
    }),

    stripe_list_subscriptions: tool({
      description:
        'List subscriptions (MRR drivers). status can be active, past_due, canceled, etc. Returns plan, amount, current period. Use for recurring-revenue health.',
      inputSchema: z.object({
        status: z
          .enum(['active', 'past_due', 'canceled', 'unpaid', 'trialing', 'all'])
          .optional()
          .default('active'),
        limit: z.number().int().min(1).max(100).optional().default(50),
        starting_after: z.string().optional(),
      }),
      execute: async ({ status, limit, starting_after }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: '/v1/subscriptions',
          params: { limit, status, ...(starting_after ? { starting_after } : {}) },
        }),
    }),

    stripe_get_invoice: tool({
      description: 'Read one invoice in full — line items, amount due, status, customer, due date.',
      inputSchema: z.object({ invoice_id: z.string() }),
      execute: async ({ invoice_id }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: `/v1/invoices/${invoice_id}`,
        }),
    }),
  }
}

// ─── ADVANCED TOOLS (loaded on demand) ─────────────────────────────────────

export function buildStripeToolsAdvanced(userId: string) {
  return {
    stripe_send_invoice: tool({
      description:
        'Send (finalize + email) an open/draft invoice to the customer. Use for collections follow-up. Approval-gated.',
      inputSchema: z.object({ invoice_id: z.string() }),
      execute: async ({ invoice_id }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'POST',
          endpoint: `/v1/invoices/${invoice_id}/send`,
        }),
    }),

    stripe_void_invoice: tool({
      description: 'Void an open invoice (cannot be collected). Approval-gated.',
      inputSchema: z.object({ invoice_id: z.string() }),
      execute: async ({ invoice_id }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'POST',
          endpoint: `/v1/invoices/${invoice_id}/void`,
        }),
    }),

    stripe_list_payment_intents: tool({
      description: 'List payment intents (incl. failed attempts). Useful to diagnose failed payments.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        starting_after: z.string().optional(),
      }),
      execute: async ({ limit, starting_after }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: '/v1/payment_intents',
          params: { limit, ...(starting_after ? { starting_after } : {}) },
        }),
    }),

    stripe_get_customer: tool({
      description: 'Read one customer in full (incl. default payment method + metadata).',
      inputSchema: z.object({ customer_id: z.string() }),
      execute: async ({ customer_id }) =>
        nangoProxy({
          userId,
          tool: STRIPE,
          method: 'GET',
          endpoint: `/v1/customers/${customer_id}`,
        }),
    }),
  }
}

// ─── CATALOG ────────────────────────────────────────────────────────────────

export const STRIPE_TOOLS_ADVANCED_CATALOG = [
  { name: 'stripe_send_invoice', description: 'Send/finalize an open invoice (collections).' },
  { name: 'stripe_void_invoice', description: 'Void an open invoice.' },
  { name: 'stripe_list_payment_intents', description: 'List payment intents incl. failed.' },
  { name: 'stripe_get_customer', description: 'Read one customer in full.' },
  { name: 'stripe_create_invoice', description: 'Create a draft invoice for a customer.' },
  { name: 'stripe_list_payouts', description: 'List payouts to the bank account.' },
  { name: 'stripe_list_refunds', description: 'List refunds issued.' },
  { name: 'stripe_get_upcoming_invoice', description: 'Preview a customer’s next invoice.' },
  { name: 'stripe_list_disputes', description: 'List chargeback disputes.' },
] as const

export type StripeCoreToolName = keyof ReturnType<typeof buildStripeToolsCore>
export type StripeAdvancedToolName = keyof ReturnType<typeof buildStripeToolsAdvanced>

/**
 * Write actions — approval-gated. Stripe core is read-only; the only writes
 * are the advanced send/void invoice tools.
 */
export const STRIPE_DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  'stripe_send_invoice',
  'stripe_void_invoice',
  'stripe_create_invoice',
])
