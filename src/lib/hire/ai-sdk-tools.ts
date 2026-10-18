/**
 * Hire chat tool registry (CP-38).
 *
 * Built from scratch for the dedicated /dashboard/hire surface. Mirrors
 * the 7 hiring tools formerly under `buildAiSdkCooTools` plus two helpers
 * the Hire assistant needs to do its job well:
 *   - `web_search` — to research what a typical "Bookkeeper" or "SDR"
 *     actually does so the proposed system prompt is grounded.
 *   - `list_skills` — to reference our skill catalog when shaping the
 *     proposed system_prompt (e.g. "this employee should follow our
 *     `firing-a-client` skill if asked").
 *
 * Intentionally OMITTED (the COO chat has these — Hire does not):
 *   - get_sales / get_profitability / get_capacity / etc.
 *   - search_brain / query_historical / write_brain_document
 *   - queue_action / record_decision / run_agent_now
 *   - analyze_document / research_competitor
 *   - all live tools (Hire never takes real-world action)
 */

import { tool, type Tool } from 'ai'
import { z } from 'zod'
import { webSearch } from '<npm>/lib/coo/research'
import { loadSkillCatalog } from '<npm>/lib/skills'

export type HireContext = {
  userId: string
}

export function buildHireTools(ctx: HireContext): Record<string, Tool> {
  const out: Record<string, Tool> = {}

  // ─── The 7 hiring tools (the core flow) ─────────────────────────────────

  out['propose_custom_employee'] = tool({
    description:
      "Compile the customer's described AI Employee (a NAMED, PERSISTENT teammate with persona, schedule, scoped tools) into a typed draft. Returns the draft for the customer to confirm — does NOT persist or run anything immediately. After this returns, the chat UI renders an inline 'Hire' / 'Edit' / 'Cancel' card from the draft.",
    // `description` is typed loosely on purpose: weaker backup models (Groq
    // Llama/Scout) sometimes pass an OBJECT or omit it instead of a plain
    // string, and Groq REJECTS the whole tool call at the schema boundary
    // ("parameters did not match schema: expected string, got object") before
    // execute() ever runs. Accepting unknown + normalizing in execute() makes
    // the tool robust to that model inconsistency. No `.min()` for the same
    // reason — a length constraint is one more thing a flaky model trips on.
    inputSchema: z.object({
      description: z
        .unknown()
        .describe(
          "The customer's full request verbatim — what kind of employee, name, schedule, tools, what it should do. Pass the customer's words as a plain string.",
        ),
    }),
    execute: async ({ description }) => {
      try {
        // Normalize whatever the model passed into a usable string.
        const descText =
          typeof description === 'string'
            ? description
            : description == null
            ? ''
            : JSON.stringify(description)
        if (descText.trim().length < 10) {
          return {
            success: false as const,
            error:
              'I need a bit more detail about who to hire — what role, schedule, and tools should they use?',
          }
        }
        const { compileCustomEmployee } = await import('<npm>/lib/employees/compile')
        const { loadCustomEmployees, BUILT_IN_BY_SLUG } = await import(
          '<npm>/lib/employees/registry'
        )
        // Connected toolkits drive which tools the compiler is allowed to
        // scope the new employee to. No integrations layer is wired right
        // now, so this is [] (chat/brain-only draft).
        const connectedToolkits: string[] = []
        const existingTeam = await loadCustomEmployees(ctx.userId)

        const draft = await compileCustomEmployee({
          description: descText,
          connectedToolkits,
          existingTeam: existingTeam.map((e) => ({ slug: e.slug, display: e.display })),
          reservedSlugs: Object.keys(BUILT_IN_BY_SLUG),
        })

        return {
          success: true as const,
          draft,
          // The chat client renders an inline confirmation card from this:
          card_kind: 'custom_employee_draft' as const,
        }
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'compile failed',
        }
      }
    },
  })

  out['install_custom_employee'] = tool({
    description:
      'Persist a CONFIRMED CustomEmployeeDraft (returned from propose_custom_employee) so the employee starts working on schedule. The chat UI normally calls this directly when the customer clicks Hire — you only call it yourself if the customer has confirmed the draft conversationally.',
    inputSchema: z.object({
      draft: z
        .object({
          slug: z.string(),
          name: z.string(),
          role: z.string(),
          emoji: z.string(),
          persona_summary: z.string(),
          schedule_human: z.string(),
          schedule_cron: z.string().nullable(),
          scoped_toolkits: z.array(z.string()),
          scoped_brain_prefixes: z.array(z.string()),
          model_slug: z.string(),
          max_steps: z.number(),
          system_prompt: z.string(),
          first_task: z.string(),
          unsupported: z
            .object({ reason: z.string() })
            .nullable()
            .default(null),
        })
        .describe('The confirmed draft, structurally matching CustomEmployeeDraft.'),
    }),
    execute: async ({ draft }) => {
      try {
        const { installCustomEmployee } = await import('<npm>/lib/employees/install')
        const result = await installCustomEmployee({
          userId: ctx.userId,
          draft: draft as Parameters<typeof installCustomEmployee>[0]['draft'],
        })
        return result
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'install failed',
        }
      }
    },
  })

  out['list_custom_employees'] = tool({
    description:
      "List the customer's custom AI employees (the team they've hired — NOT the 28 built-in agents). Use when the customer asks who's on their team or before proposing a new hire to avoid duplicates.",
    inputSchema: z.object({
      status: z.enum(['active', 'paused', 'archived']).optional(),
    }),
    execute: async ({ status }) => {
      try {
        const { loadCustomEmployees } = await import('<npm>/lib/employees/registry')
        const all = await loadCustomEmployees(ctx.userId)
        const filtered = status ? all.filter((e) => e.status === status) : all
        return {
          success: true as const,
          employees: filtered.map((e) => ({
            slug: e.slug,
            name: e.display.name,
            role: e.display.role,
            emoji: e.display.emoji,
            status: e.status,
            autonomy: e.autonomy,
            schedule_cron: e.runtime.cronSchedule,
            scoped_toolkits: e.runtime.scopedToolkits,
            url: `/dashboard/employees/${e.slug}`,
          })),
        }
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'list failed',
        }
      }
    },
  })

  out['inspect_custom_employee'] = tool({
    description:
      'Return the full spec for ONE custom employee — system prompt, persona, scoped toolkits + brain paths, model + max_steps. Call after list_custom_employees when the customer wants details on a specific hire.',
    inputSchema: z.object({
      slug: z.string().describe("The employee's slug (kebab-case)."),
    }),
    execute: async ({ slug }) => {
      try {
        const { loadCustomEmployeeBySlug } = await import('<npm>/lib/employees/registry')
        const emp = await loadCustomEmployeeBySlug(ctx.userId, slug)
        if (!emp) {
          return { success: false as const, error: `no custom employee with slug "${slug}"` }
        }
        return {
          success: true as const,
          employee: {
            slug: emp.slug,
            name: emp.display.name,
            role: emp.display.role,
            emoji: emp.display.emoji,
            persona_summary: emp.display.personaSummary,
            bio: emp.display.bio,
            status: emp.status,
            autonomy: emp.autonomy,
            schedule_cron: emp.runtime.cronSchedule,
            scoped_toolkits: emp.runtime.scopedToolkits,
            scoped_brain_prefixes: emp.runtime.scopedBrainPrefixes,
            model: emp.runtime.model,
            max_steps: emp.runtime.maxSteps,
            system_prompt: emp.runtime.systemPrompt,
          },
        }
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'inspect failed',
        }
      }
    },
  })

  out['pause_custom_employee'] = tool({
    description:
      'Pause or resume a custom employee. Pausing leaves the spec + brain memory intact — the employee just stops running on schedule. Pass resume=true to flip a paused employee back to active.',
    inputSchema: z.object({
      slug: z.string(),
      resume: z.boolean().optional().default(false),
    }),
    execute: async ({ slug, resume }) => {
      try {
        const { changeCustomEmployeeStatus } = await import('<npm>/lib/employees/install')
        return await changeCustomEmployeeStatus({
          userId: ctx.userId,
          slug,
          action: resume ? 'resume' : 'pause',
        })
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'status change failed',
        }
      }
    },
  })

  out['archive_custom_employee'] = tool({
    description:
      "Archive a custom employee — stop running them, hide from the team view, preserve their brain memory + run history. NOT a delete — re-installing the same slug reactivates this row's spec. Confirm intent with the customer before calling.",
    inputSchema: z.object({
      slug: z.string(),
    }),
    execute: async ({ slug }) => {
      try {
        const { changeCustomEmployeeStatus } = await import('<npm>/lib/employees/install')
        return await changeCustomEmployeeStatus({
          userId: ctx.userId,
          slug,
          action: 'archive',
        })
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'archive failed',
        }
      }
    },
  })

  out['set_employee_manager'] = tool({
    description:
      "Set or clear the manager for one of the customer's custom AI employees (CP-37 org chart). Once set, the employee can delegate work to the manager via delegate_to_employee from inside its run. Pass manager_slug=null to remove the manager. Only works for CUSTOM employees — built-in agents can't be managed by the customer in v1.",
    inputSchema: z.object({
      employee_slug: z.string(),
      manager_slug: z.string().nullable(),
    }),
    execute: async ({ employee_slug, manager_slug }) => {
      try {
        const { setEmployeeManager } = await import('<npm>/lib/employees/hierarchy')
        return await setEmployeeManager(ctx.userId, employee_slug, manager_slug)
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'set_employee_manager failed',
          code: 'write_failed' as const,
        }
      }
    },
  })

  // ─── Helpers the Hire assistant needs ───────────────────────────────────

  out['web_search'] = tool({
    description:
      "Search the public web for context on what a role typically does (e.g. 'what does an SDR do for a marketing agency', 'typical bookkeeper responsibilities'). Use ONLY for grounding role definitions when proposing a new hire — NOT for answering the customer's business questions (that belongs in the COO chat).",
    inputSchema: z.object({
      query: z.string().min(3),
    }),
    execute: async ({ query }) => {
      return await webSearch(query, { userId: ctx.userId, includeAnswer: true })
    },
  })

  out['list_skills'] = tool({
    description:
      'List the operational skills available to AI employees (e.g. firing-a-client, raising-retainer-prices, projecting-cash-runway). Use when shaping a proposed system_prompt — the new employee can be told to follow specific skills relevant to their role.',
    inputSchema: z.object({
      topic: z
        .string()
        .optional()
        .describe('Optional keyword filter (e.g. "retainer", "firing", "burnout").'),
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

  return out
}
