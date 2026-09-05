/**
 * `consult_coo` — Option C escalation primitive (CP-34a-5).
 *
 * Any employee (built-in agent OR custom) running mid-task can call this tool
 * to escalate a question to the AI COO. The COO has full cross-employee
 * context (reads the entire brain) and replies with cross-cutting wisdom.
 *
 * Mechanics:
 *   1. Employee calls consult_coo(question, context).
 *   2. We synthesize a focused prompt: question + context + the COO's role.
 *   3. We hit the LLM in NON-STREAMING mode (this is a programmatic call, not
 *      a customer chat), with the COO's system prompt + recent brain reads.
 *   4. We return the answer + suggested action plus an optional learned-rule
 *      hint (for CP-35 Apprentice Mode integration later).
 *
 * The COO's identity is preserved as a single advisor — every employee
 * escalates to the same COO, not to N personal advisors. This is the
 * hierarchical pattern (Anthropic, Devin, IBM) — see
 * docs/specs/ai-employees.md §3.2.
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { loadBrainDocuments, listBrainPaths } from '<npm>/lib/brain/store'

export type ConsultCooInput = {
  userId: string
  callerSlug: string          // 'revenue', 'employee:sarah', etc. — for logging
  question: string            // the actual question the employee needs answered
  context?: string            // free-form context the caller already has
  scopedBrainPrefixes?: string[]  // optional — limit what brain the COO reads
}

export type ConsultCooOutput = {
  success: true
  answer: string              // 1-3 sentence direct answer the caller can act on
  reasoning: string           // 1-2 sentence why
  suggested_action?: string   // optional concrete next-step suggestion
  learned_rule?: string       // if the COO derived a reusable rule, share it
  brain_paths_consulted: string[]
}

export type ConsultCooError = {
  success: false
  error: string
}

const consultSchema = z.object({
  answer: z
    .string()
    .min(1)
    .describe('Direct answer for the caller. 1-3 sentences. Action-oriented.'),
  reasoning: z
    .string()
    .min(1)
    .describe('Why this answer. 1-2 sentences. Cite the brain path / data point if relevant.'),
  suggested_action: z
    .string()
    .optional()
    .describe('Optional concrete next step the caller should take.'),
  learned_rule: z
    .string()
    .optional()
    .describe(
      'Optional reusable rule the caller should remember for next time. ' +
        'Format: "When X, do Y." Only include if there is a generalizable pattern.',
    ),
})

const COO_CONSULT_SYSTEM = `You are the AI Chief of Staff for an agency. One of your AI employees has paused mid-task to ask you for guidance. Your job is to give them a clear, decisive, actionable answer drawing on the full company context (the brain).

Rules:
- BE SPECIFIC. The employee is mid-task and needs to act. Vague answers waste their context window.
- CITE THE BRAIN when you can ("Marcus already logged this as a project deposit in pattern-cards/q2-bigco.md").
- IF the right answer is "ask the customer", say so explicitly — don't make up a guess.
- IF you see a generalizable rule (something the employee should remember for next time), include it in learned_rule. Keep it short: "When vendor name contains 'figma'/'notion'/'slack', classify as Software."
- DO NOT lecture. The employee already has their own system prompt and skills. Just answer the question.`

export async function consultCoo(input: ConsultCooInput): Promise<ConsultCooOutput | ConsultCooError> {
  const { userId, callerSlug, question, context, scopedBrainPrefixes } = input

  try {
    // Load a snapshot of the brain the COO can use to answer.
    // We default to the most relevant areas (pattern-cards, decision-log,
    // recent kpi-snapshots, recent agent-runs) unless the caller suggests
    // prefixes.
    const prefixes = scopedBrainPrefixes?.length
      ? scopedBrainPrefixes
      : ['pattern-cards/', 'decision-log/', 'kpi-snapshots/', 'agent-runs/']

    const [paths, docs] = await Promise.all([
      listBrainPaths({ userId }),
      loadBrainDocuments({ userId, prefixes, limit: 30 }),
    ])

    // Build the user message — question + caller context + brain snippets.
    const brainSnippet = docs
      .map((d) => `### ${d.path}\n${d.content.slice(0, 1200)}`)
      .join('\n\n---\n\n')
      .slice(0, 20_000) // cap to keep prompt bounded

    const userMessage = [
      `# Caller`,
      `Employee: ${callerSlug}`,
      ``,
      `# Question`,
      question,
      ``,
      context ? `# Context the caller already has\n${context}` : '',
      ``,
      `# Relevant brain documents (read these for cross-employee context)`,
      brainSnippet || '(no relevant documents in the brain yet)',
    ]
      .filter(Boolean)
      .join('\n')

    const { object } = await generateObject({
      model: openai('gpt-5.4'),
      schema: consultSchema,
      system: COO_CONSULT_SYSTEM,
      prompt: userMessage,
    })

    return {
      success: true,
      answer: object.answer,
      reasoning: object.reasoning,
      suggested_action: object.suggested_action,
      learned_rule: object.learned_rule,
      brain_paths_consulted: paths.slice(0, 50),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[consult-coo] failed', { callerSlug, message })
    return { success: false, error: message }
  }
}
