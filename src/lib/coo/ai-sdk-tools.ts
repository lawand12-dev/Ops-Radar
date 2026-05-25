/**
 * Converts COO_TOOLS (OpenAI ChatCompletionTool[] shape) into the Vercel AI
 * SDK's Tool record so we can pass them to streamText. Each tool's execute
 * delegates to the existing executeToolCall — no executor logic changes.
 *
 * Path A from the AI SDK docs: use jsonSchema() to wrap the existing
 * OpenAI-shape parameters (already valid JSON Schema). No need to rewrite
 * 20 tool schemas as zod just to move SDKs.
 *
 * Used by /api/dashboard/coo (route.ts) — the migration from raw OpenAI
 * streaming to Vercel AI SDK streamText.
 */

import { tool, jsonSchema, generateObject, type Tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { COO_TOOLS } from './tools'
import { executeToolCall, type ExecutorContext } from './executor'
import { loadSkillBody, loadSkillCatalog } from '<npm>/lib/skills'
import {
  webSearch,
  researchCompetitor,
  analyzeDocument,
} from './research'
import { queryEvents, aggregateByMonth } from '<npm>/lib/warehouse/query'
import type { EventSource } from '<npm>/lib/warehouse/types'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  listAutomations,
  inspectAutomation,
} from '<npm>/lib/automations/registry'
import {
  AutomationDraftSchema,
  type AutomationDraft,
} from '<npm>/lib/automations/draft-schema'
import { buildCompilationPrompt } from '<npm>/lib/automations/compile'
import {
  COMPOSIO_TRIGGER_CATALOG,
  COMPOSIO_ACTION_CATALOG,
} from '<npm>/lib/automations/composio-catalog'
import { getCachedTriggers, getCachedActions } from '<npm>/lib/composio/capability-cache'
import {
  registerComposioTrigger,
  deactivateComposioTrigger,
} from '<npm>/lib/automations/composio-triggers'
import type { ToolSlug } from '<npm>/lib/composio'
import type { Json } from '<npm>/lib/database.types'

export function buildAiSdkCooTools(ctx: ExecutorContext): Record<string, Tool> {
  const out: Record<string, Tool> = {}

  for (const entry of COO_TOOLS) {
    if (entry.type !== 'function') continue
    const fn = entry.function
    const params = fn.parameters as Record<string, unknown> | undefined

    out[fn.name] = tool({
      description: fn.description ?? `Run ${fn.name}`,
      inputSchema: jsonSchema(
        (params ?? { type: 'object', properties: {} }) as Parameters<typeof jsonSchema>[0],
      ),
      execute: async (args: unknown) => {
        const result = await executeToolCall(
          fn.name,
          (args ?? {}) as Record<string, unknown>,
          ctx,
        )
        return result
      },
    })
  }

  // ─── CP-20 automations: 5 tools for the propose → confirm → install flow ──

  out['propose_automation'] = tool({
    description:
      "Compile the customer's described RECURRING automation into a typed draft (when X happens → do Y automatically). Returns the draft for the customer to confirm — does NOT save or execute anything immediately. Use ONLY for recurring/triggered workflows, NOT for one-off direct actions. For one-off actions like 'create a Notion page', 'send an email', 'update a deal' — call the relevant Composio tool directly instead.",
    inputSchema: z.object({
      user_request: z
        .string()
        .min(5)
        .describe(
          'The customer\'s natural-language description of the automation, e.g. "When a HubSpot deal moves to closed-won, post in #ops Slack and create a Notion kickoff page".',
        ),
    }),
    execute: async ({ user_request }) => {
      try {
        const existing = await listAutomations(ctx.userId)
        // Prefer live cached triggers (populated on tool connect via webhook).
        // Fall back to static catalog if the cache is empty (new user or cache miss).
        const cachedTriggers = await getCachedTriggers(ctx.userId)
        const triggers = cachedTriggers.length > 0
          ? cachedTriggers.map((t) => ({ toolkit: t.toolkit, slug: t.slug, description: t.description }))
          : COMPOSIO_TRIGGER_CATALOG.map((t) => ({ toolkit: t.toolkit, slug: t.slug, description: t.description }))
        // Build the action list: start with static catalog (has descriptions), then
        // append any additional slugs from the cache not already in the static list.
        const staticActions = COMPOSIO_ACTION_CATALOG.map((a) => ({
          toolkit: a.toolkit,
          action_slug: a.action_slug,
          description: a.description,
        }))
        const cachedActions = await getCachedActions(ctx.userId)
        const staticSlugs: Set<string> = new Set(staticActions.map((a) => a.action_slug))
        const extraActions = cachedActions
          .filter((a) => !staticSlugs.has(a.slug))
          .map((a) => ({ toolkit: a.toolkit, action_slug: a.slug, description: a.slug }))
        const actions = [...staticActions, ...extraActions]

        const prompt = buildCompilationPrompt({
          userRequest: user_request,
          availableTriggers: triggers,
          availableActions: actions,
          existingAutomations: existing.map((a) => ({
            slug: a.slug,
            description: a.description,
          })),
        })
        const { object } = await generateObject({
          model: openai('gpt-5.4'),
          schema: AutomationDraftSchema,
          prompt,
        })
        return { kind: 'automation_draft' as const, draft: object as AutomationDraft }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false as const, error: message }
      }
    },
  })

  out['install_automation'] = tool({
    description:
      'Install a confirmed automation draft. Inserts the row, registers the Composio trigger (if composio_event), and returns the new id + URL. Only call this after the customer has explicitly confirmed the draft from propose_automation.',
    inputSchema: z.object({
      draft: AutomationDraftSchema,
      user_confirmed: z
        .literal(true)
        .describe('Must be true — explicit confirmation that the customer approved the draft.'),
    }),
    execute: async ({ draft }) => {
      if (draft.name === 'unsupported' || draft.spec.steps.length === 0) {
        return {
          success: false as const,
          error: 'Draft is marked unsupported — nothing to install.',
        }
      }
      const supabase = getServerSupabaseClient()

      const { data: row, error: insErr } = await supabase
        .from('customer_automations')
        .insert({
          user_id: ctx.userId,
          slug: draft.slug,
          name: draft.name,
          description: draft.description,
          status: 'active',
          trigger_kind: draft.trigger.kind,
          trigger_toolkit: draft.trigger.toolkit,
          trigger_slug: draft.trigger.slug,
          trigger_filter: (draft.trigger.filter ?? {}) as unknown as Json,
          spec: { version: 1, steps: draft.spec.steps } as unknown as Json,
          spec_version: 1,
          autonomy: draft.autonomy,
          source: 'coo-chat',
        })
        .select('id')
        .single()

      if (insErr || !row) {
        return {
          success: false as const,
          error: `insert failed: ${insErr?.message ?? 'unknown'}`,
        }
      }
      const automationId = row.id as string

      if (
        draft.trigger.kind === 'composio_event' &&
        draft.trigger.toolkit &&
        draft.trigger.slug
      ) {
        const reg = await registerComposioTrigger({
          userId: ctx.userId,
          automationId,
          toolkit: draft.trigger.toolkit as ToolSlug,
          triggerSlug: draft.trigger.slug,
        })
        if (!reg.ok) {
          await supabase.from('customer_automations').delete().eq('id', automationId)
          return { success: false as const, error: reg.error }
        }
      }

      return {
        success: true as const,
        automation_id: automationId,
        name: draft.name,
        view_url: `/dashboard/automations/${automationId}`,
      }
    },
  })

  out['list_automations'] = tool({
    description:
      "List the customer's automations. Optionally filter by status. Use this when the customer asks what's running, what's installed, or to compare against an existing automation before proposing a new one.",
    inputSchema: z.object({
      status: z.enum(['active', 'paused', 'archived']).optional(),
    }),
    execute: async ({ status }) => {
      try {
        const all = await listAutomations(ctx.userId)
        const filtered = status ? all.filter((a) => a.status === status) : all
        return {
          success: true as const,
          automations: filtered.map((a) => ({
            id: a.id,
            slug: a.slug,
            name: a.name,
            description: a.description,
            status: a.status,
            autonomy: a.autonomy,
            trigger_kind: a.trigger_kind,
            trigger_toolkit: a.trigger_toolkit,
            trigger_slug: a.trigger_slug,
            last_run_at: a.last_run_at,
            last_run_status: a.last_run_status,
            run_count: a.run_count,
          })),
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false as const, error: message }
      }
    },
  })

  out['inspect_automation'] = tool({
    description:
      'Read the full row for a single automation including its spec. Call this after list_automations when the customer wants details on a specific one.',
    inputSchema: z.object({
      id: z.string().describe('The automation UUID from list_automations.'),
    }),
    execute: async ({ id }) => {
      const row = await inspectAutomation(ctx.userId, id)
      if (!row) {
        return { success: false as const, error: 'automation not found' }
      }
      return { success: true as const, automation: row }
    },
  })

  out['pause_automation'] = tool({
    description:
      "Pause or resume an automation. Set resume=true to flip a paused automation back to active. When pausing a composio_event automation, the underlying Composio trigger is deactivated; when resuming, the customer must re-install (we don't auto-recreate Composio triggers).",
    inputSchema: z.object({
      id: z.string(),
      resume: z.boolean().optional().default(false),
    }),
    execute: async ({ id, resume }) => {
      const supabase = getServerSupabaseClient()
      const existing = await inspectAutomation(ctx.userId, id)
      if (!existing) {
        return { success: false as const, error: 'automation not found' }
      }
      const newStatus = resume ? 'active' : 'paused'
      const { data, error } = await supabase
        .from('customer_automations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.userId)
        .select('*')
        .single()
      if (error || !data) {
        return {
          success: false as const,
          error: `update failed: ${error?.message ?? 'unknown'}`,
        }
      }
      if (!resume) {
        await deactivateComposioTrigger(id)
      }
      return { success: true as const, automation: data }
    },
  })

  // ─── CP-22 research + web access: 3 tools so the COO is the customer's
  //     only AI surface — they don't need ChatGPT/Perplexity for business
  //     research, competitor intel, or document review. ────────────────────

  out['web_search'] = tool({
    description:
      "Search the public web for current information — news, pricing pages, blog posts, public data. Use this for ANY question that requires information beyond the customer's connected tools and Notion brain. Examples: 'latest Stripe API change', 'what does [vendor] cost', 'industry benchmarks for agency margin', 'recent news about [competitor]'. Returns top 5 results plus a one-paragraph synthesis. Do NOT use for questions answerable from the customer's own data — use the existing tools for that.",
    inputSchema: z.object({
      query: z
        .string()
        .min(3)
        .describe('The natural-language search query. Be specific. Add the current year (2026) when freshness matters.'),
      include_answer: z
        .boolean()
        .optional()
        .describe('Set to true (default) for a one-paragraph synthesis along with the results.'),
    }),
    execute: async ({ query, include_answer }) => {
      return await webSearch(query, {
        userId: ctx.userId,
        includeAnswer: include_answer ?? true,
      })
    },
  })

  out['research_competitor'] = tool({
    description:
      "Deep multi-step research on a competitor or vendor. Runs 4-6 targeted searches (pricing, product, funding, news), reads the top results, and returns a structured brief: positioning, what they sell, pricing, target customer, strengths, weaknesses, funding signals, recent news, and threat level relative to OpsRadar's positioning. Use this when the customer asks for competitor intel, vendor evaluation, or 'should I be worried about X' analysis. Takes 10-20 seconds — set expectations.",
    inputSchema: z.object({
      competitor_name: z
        .string()
        .min(2)
        .describe('The competitor or vendor name. Be specific (full name + domain if ambiguous).'),
      focus_areas: z
        .array(z.string())
        .optional()
        .describe('Optional focus areas, e.g. ["enterprise pricing", "API rate limits"]. Limited to 2.'),
      our_positioning: z
        .string()
        .optional()
        .describe('Optional one-paragraph reminder of our positioning so threat-level scoring is grounded. Defaults to a general AI-COO-for-services-businesses framing.'),
    }),
    execute: async ({ competitor_name, focus_areas, our_positioning }) => {
      return await researchCompetitor({
        userId: ctx.userId,
        competitorName: competitor_name,
        focusAreas: focus_areas,
        ourPositioning: our_positioning,
      })
    },
  })

  // CP-25 — historical event warehouse query. Use this for trend / drill-down
  // questions the curated Notion brain can't answer at row granularity
  // (e.g. "every overdue invoice in Q3 2024 for client X", "MRR by month
  // over the last 12 months", "deal close rate trend vs 6 months ago").
  out['query_historical'] = tool({
    description:
      "Query the customer's full raw history (5+ years across all connected tools — Stripe transactions, HubSpot deals, Harvest hours, ClickUp tasks, etc.). Use this for trend questions, period drill-downs, and per-client historical lookups that the curated Notion brain can't answer. Returns either a filtered event list (set aggregate=false, max 500 rows) or a monthly aggregate (set aggregate=true, returns count + sum_amount_cents per month). Prefer aggregate=true for trend questions to keep context small.",
    inputSchema: z.object({
      source: z
        .string()
        .describe(
          "The source tool: 'stripe', 'hubspot', 'pipedrive', 'apollo', 'clickup', 'asana', 'monday', 'harvest', 'toggl', 'gmail', 'slack', 'calendly', 'notion', 'google_calendar', 'google_analytics', 'google_ads', 'linkedin', 'quickbooks', 'xero', 'bamboo_hr', 'gusto', 'typeform', 'intercom', 'zendesk'.",
        ),
      event_type: z
        .string()
        .optional()
        .describe(
          "Optional event type filter, e.g. 'invoice.paid', 'deal.stage_updated', 'charge.failed'.",
        ),
      client_external_id: z
        .string()
        .optional()
        .describe('Optional filter to one specific client (the external id in the source tool).'),
      occurred_after: z
        .string()
        .optional()
        .describe('ISO date string. Filter to events at or after this time.'),
      occurred_before: z
        .string()
        .optional()
        .describe('ISO date string. Filter to events at or before this time.'),
      aggregate: z
        .boolean()
        .default(false)
        .describe(
          'If true, return monthly aggregates (count + sum_amount_cents). If false, return the raw event list (capped at 500 rows).',
        ),
    }),
    execute: async ({
      source,
      event_type,
      client_external_id,
      occurred_after,
      occurred_before,
      aggregate,
    }) => {
      if (aggregate) {
        const rows = await aggregateByMonth({
          userId: ctx.userId,
          source: source as EventSource,
          eventType: event_type,
          clientExternalId: client_external_id,
          occurredAfter: occurred_after,
          occurredBefore: occurred_before,
        })
        return { success: true as const, mode: 'aggregate' as const, rows }
      }
      const events = await queryEvents({
        userId: ctx.userId,
        source: source as EventSource,
        eventType: event_type,
        clientExternalId: client_external_id,
        occurredAfter: occurred_after,
        occurredBefore: occurred_before,
        limit: 200,
      })
      return { success: true as const, mode: 'list' as const, events }
    },
  })

  out['analyze_document'] = tool({
    description:
      "Analyze a piece of document text (contract, RFP, proposal, vendor agreement, NDA, MSA). The customer pastes or uploads the text; this tool extracts: document type, summary, key terms, obligations on each side, financial terms, risk flags (auto-renewal, unlimited liability, etc.), recommended action (sign/negotiate/reject/route-to-lawyer), and questions to ask the counterparty. Use this whenever the customer drops document text and asks for review.",
    inputSchema: z.object({
      text: z
        .string()
        .min(100)
        .describe('The full document text to analyze. Minimum 100 chars.'),
      question: z
        .string()
        .optional()
        .describe("Optional: the customer's specific question about the document, e.g. 'is this MSA fair' or 'what's the termination clause'."),
    }),
    execute: async ({ text, question }) => {
      return await analyzeDocument({ userId: ctx.userId, text, question })
    },
  })

  // Anthropic Agent Skills — lazy catalog discovery (tier 1) + body loader (tier 2).
  // The system prompt no longer injects all 47 descriptions at boot — this saves
  // ~1,400 tokens on every request that doesn't need skills (most requests).
  // Instead the agent calls list_skills() when it suspects a skill applies,
  // then load_skill(name) to get the full SKILL.md body.
  out['list_skills'] = tool({
    description:
      'List all available skills by name and one-line description. Call this when the user asks something that might benefit from specialized operational guidance (e.g. handling a difficult client, pricing analysis, burnout detection, competitor research). Then call load_skill(name) to read the full instructions for the relevant one.',
    inputSchema: z.object({
      topic: z
        .string()
        .optional()
        .describe('Optional topic keyword to filter results, e.g. "retainer", "firing", "burnout". If omitted, returns the full catalog.'),
    }),
    execute: async ({ topic }) => {
      const catalog = await loadSkillCatalog()
      const filtered = topic
        ? catalog.filter(
            (s) =>
              s.name.includes(topic.toLowerCase()) ||
              s.description.toLowerCase().includes(topic.toLowerCase()),
          )
        : catalog
      return {
        skills: filtered.map((s) => ({ name: s.name, description: s.description })),
        total: filtered.length,
      }
    },
  })

  out['get_brain_databases'] = tool({
    description:
      "Return the Notion Brain database UUIDs for this customer. Use when you need to call NOTION_QUERY_DATABASE, NOTION_FETCH_DATABASE, or NOTION_INSERT_ROW_DATABASE and don't have the UUID. Returns a slug→UUID map (e.g. 'risk_register', 'client_profiles', 'agent_action_log') plus the root page ID for creating new top-level Brain pages.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const supabase = getServerSupabaseClient()
        const { data, error } = await supabase
          .from('notion_workspaces')
          .select('databases, parent_page_id')
          .eq('user_id', ctx.userId)
          .maybeSingle()
        if (error || !data) {
          return {
            success: false as const,
            error: 'Brain not provisioned — the customer has not yet connected Notion or Brain setup is incomplete.',
          }
        }
        return {
          success: true as const,
          databases: data.databases as Record<string, string>,
          parent_page_id: data.parent_page_id,
        }
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'Unknown error reading Brain workspace',
        }
      }
    },
  })

  out['load_skill'] = tool({
    description:
      'Load the full SKILL.md body for a named skill (Anthropic Agent Skills pattern). The skill catalog (name + description) is in your system prompt. Call this only when a skill clearly applies to the current task — the returned body contains the operational procedure to follow.',
    inputSchema: z.object({
      name: z.string().describe('The skill name (kebab-case identifier) from the catalog.'),
    }),
    execute: async (args: { name: string }) => {
      try {
        const body = await loadSkillBody(args.name)
        return { success: true, name: args.name, body }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'load failed',
        }
      }
    },
  })

  return out
}
