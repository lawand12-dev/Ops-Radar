/**
 * HubSpot CRM tools for hired AI employees, brokered through Nango.
 *
 * Same toolkit shape as Gmail (CP-38 pattern). HubSpot CRM v3 is REST:
 *   - Objects:  /crm/v3/objects/{contacts|deals|companies}
 *   - Search:   POST /crm/v3/objects/{type}/search
 * Nango injects the OAuth token. userId is closure-bound.
 *
 * Powers the growth / SDR / revenue employees: read pipeline, find leads,
 * log notes, create + advance deals (write actions are approval-gated).
 */

import { z } from 'zod'
import { tool } from 'ai'
import { nangoProxy, type NangoToolSlug } from '<npm>/lib/nango'

const HUBSPOT: NangoToolSlug = 'hubspot'

// ─── CORE TOOLS (always loaded) ────────────────────────────────────────────

export function buildHubspotToolsCore(userId: string) {
  return {
    hubspot_list_deals: tool({
      description:
        'List deals (pipeline). Returns deal name, amount, stage, close date. Use to read pipeline value, won/lost, and what is closing soon.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        after: z.string().optional().describe('Paging cursor from a prior call'),
        properties: z
          .string()
          .optional()
          .describe('Comma list of properties to return (defaults to common deal fields)'),
      }),
      execute: async ({ limit, after, properties }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'GET',
          endpoint: '/crm/v3/objects/deals',
          params: {
            limit,
            ...(after ? { after } : {}),
            properties: properties ?? 'dealname,amount,dealstage,closedate,pipeline',
          },
        }),
    }),

    hubspot_list_contacts: tool({
      description:
        'List contacts. Returns name, email, company, lifecycle stage. Use to find recent leads or build an outreach list.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        after: z.string().optional(),
        properties: z.string().optional(),
      }),
      execute: async ({ limit, after, properties }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'GET',
          endpoint: '/crm/v3/objects/contacts',
          params: {
            limit,
            ...(after ? { after } : {}),
            properties: properties ?? 'firstname,lastname,email,company,lifecyclestage',
          },
        }),
    }),

    hubspot_search: tool({
      description:
        'Search any CRM object with filters. object_type is "contacts", "deals", or "companies". filters is the HubSpot filterGroups payload (e.g. recent leads, deals over $X, stage = closedwon).',
      inputSchema: z.object({
        object_type: z.enum(['contacts', 'deals', 'companies']),
        filterGroups: z
          .array(z.unknown())
          .describe('HubSpot filterGroups array, e.g. [{filters:[{propertyName,operator,value}]}]'),
        properties: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
      }),
      execute: async ({ object_type, filterGroups, properties, limit }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'POST',
          endpoint: `/crm/v3/objects/${object_type}/search`,
          data: { filterGroups, ...(properties ? { properties } : {}), limit },
        }),
    }),

    hubspot_get_deal: tool({
      description: 'Read one deal by id, with full properties + optional associations.',
      inputSchema: z.object({
        deal_id: z.string(),
        properties: z.string().optional(),
        associations: z.string().optional().describe('Comma list, e.g. "contacts,companies"'),
      }),
      execute: async ({ deal_id, properties, associations }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'GET',
          endpoint: `/crm/v3/objects/deals/${deal_id}`,
          params: {
            ...(properties ? { properties } : {}),
            ...(associations ? { associations } : {}),
          },
        }),
    }),

    hubspot_create_note: tool({
      description:
        'Log a note (engagement) and associate it with a contact or deal. Use to record what an employee found or did. associated_object_type is "contacts" or "deals".',
      inputSchema: z.object({
        body: z.string().describe('Note text'),
        associated_object_type: z.enum(['contacts', 'deals', 'companies']),
        associated_object_id: z.string(),
      }),
      execute: async ({ body, associated_object_type, associated_object_id }) => {
        // HubSpot note associationTypeId: note→contact 202, note→company 190, note→deal 214.
        const typeId =
          associated_object_type === 'contacts'
            ? 202
            : associated_object_type === 'companies'
            ? 190
            : 214
        return nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'POST',
          endpoint: '/crm/v3/objects/notes',
          data: {
            properties: { hs_note_body: body, hs_timestamp: Date.now() },
            associations: [
              {
                to: { id: associated_object_id },
                types: [
                  { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: typeId },
                ],
              },
            ],
          },
        })
      },
    }),

    hubspot_update_deal: tool({
      description:
        'Update a deal — most commonly to move it to a new stage or change the amount. Pass only the properties you want changed.',
      inputSchema: z.object({
        deal_id: z.string(),
        properties: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .describe('e.g. { dealstage: "closedwon", amount: 5000 }'),
      }),
      execute: async ({ deal_id, properties }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'PATCH',
          endpoint: `/crm/v3/objects/deals/${deal_id}`,
          data: { properties },
        }),
    }),
  }
}

// ─── ADVANCED TOOLS (loaded on demand) ─────────────────────────────────────

export function buildHubspotToolsAdvanced(userId: string) {
  return {
    hubspot_create_deal: tool({
      description: 'Create a new deal. Pass properties like dealname, amount, dealstage, pipeline.',
      inputSchema: z.object({
        properties: z.record(z.string(), z.union([z.string(), z.number()])),
      }),
      execute: async ({ properties }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'POST',
          endpoint: '/crm/v3/objects/deals',
          data: { properties },
        }),
    }),

    hubspot_create_contact: tool({
      description: 'Create a new contact. Pass properties like email, firstname, lastname, company.',
      inputSchema: z.object({
        properties: z.record(z.string(), z.union([z.string(), z.number()])),
      }),
      execute: async ({ properties }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'POST',
          endpoint: '/crm/v3/objects/contacts',
          data: { properties },
        }),
    }),

    hubspot_update_contact: tool({
      description: 'Update a contact by id. Pass only the properties to change.',
      inputSchema: z.object({
        contact_id: z.string(),
        properties: z.record(z.string(), z.union([z.string(), z.number()])),
      }),
      execute: async ({ contact_id, properties }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'PATCH',
          endpoint: `/crm/v3/objects/contacts/${contact_id}`,
          data: { properties },
        }),
    }),

    hubspot_list_companies: tool({
      description: 'List companies (accounts). Returns name, domain, industry.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        after: z.string().optional(),
      }),
      execute: async ({ limit, after }) =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'GET',
          endpoint: '/crm/v3/objects/companies',
          params: { limit, ...(after ? { after } : {}), properties: 'name,domain,industry' },
        }),
    }),

    hubspot_list_pipelines: tool({
      description: 'List deal pipelines + their stages (so you can map stage labels to ids).',
      inputSchema: z.object({}),
      execute: async () =>
        nangoProxy({
          userId,
          tool: HUBSPOT,
          method: 'GET',
          endpoint: '/crm/v3/pipelines/deals',
        }),
    }),
  }
}

// ─── CATALOG ────────────────────────────────────────────────────────────────

export const HUBSPOT_TOOLS_ADVANCED_CATALOG = [
  { name: 'hubspot_create_deal', description: 'Create a new deal.' },
  { name: 'hubspot_create_contact', description: 'Create a new contact.' },
  { name: 'hubspot_update_contact', description: 'Update a contact by id.' },
  { name: 'hubspot_list_companies', description: 'List companies/accounts.' },
  { name: 'hubspot_list_pipelines', description: 'List deal pipelines + stages.' },
  { name: 'hubspot_create_task', description: 'Create a CRM task associated with a record.' },
  { name: 'hubspot_create_company', description: 'Create a new company.' },
  { name: 'hubspot_associate', description: 'Associate two CRM objects.' },
  { name: 'hubspot_list_owners', description: 'List CRM owners (reps) to assign records.' },
  { name: 'hubspot_get_contact', description: 'Read one contact by id.' },
] as const

export type HubspotCoreToolName = keyof ReturnType<typeof buildHubspotToolsCore>
export type HubspotAdvancedToolName = keyof ReturnType<typeof buildHubspotToolsAdvanced>

/** Write actions — approval-gated. Read tools (list/get/search) are auto. */
export const HUBSPOT_DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  'hubspot_create_note',
  'hubspot_update_deal',
  'hubspot_create_deal',
  'hubspot_create_contact',
  'hubspot_update_contact',
])
