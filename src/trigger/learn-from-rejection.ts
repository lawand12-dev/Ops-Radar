/**
 * `learnFromRejection` — Trigger.dev task that turns a customer's rejection
 * (or edit) of an AI employee's proposed action into a permanent rule the
 * employee reads on every future run (CP-35 — Apprentice Mode).
 *
 * Flow:
 *   1. Fetch the top-K similar past rules for this employee via pgvector
 *      semantic search (so we don't write near-duplicates each rejection).
 *   2. Ask the model to derive ONE generalizable rule from the rejection
 *      payload + reason + edit + similar prior rules. Output is constrained
 *      to a single "When X, do Y." sentence-pattern paragraph.
 *   3. Commit the rule to the brain at
 *      `employees/<slug>/learned-rules/<actionId>.md` — the embedding for
 *      that path lands in pgvector automatically via the curated-paths
 *      hook in `commitBrainChanges`.
 *
 * The customer never waits for this — the rejection endpoint fires this
 * fire-and-forget. Retries on transient failures (3 attempts, exponential).
 *
 * See: docs/dev/specs/2026-05-25-ai-employees-master-plan.md §CP-35.
 */

import { task, logger } from '@trigger.dev/sdk/v3'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { commitBrainChanges, semanticSearchBrain } from '<npm>/lib/brain/store'
import type { BrainAuthorType } from '<npm>/lib/brain/types'
import { withQuota } from '<npm>/lib/usage/track'

export type LearnFromRejectionPayload = {
  userId: string
  employeeSlug: string
  actionId: string
  /** The full proposed payload the agent submitted (toolkit, action_slug, arguments, summary, etc.) */
  originalProposal: unknown
  /** Customer-supplied reason for rejection (or empty string if none). */
  rejectionReason: string
  /** Optional edited version of the proposal (when action='edit' instead of 'reject'). */
  edits?: unknown
}

const RuleSchema = z.object({
  rule: z
    .string()
    .min(10)
    .max(500)
    .describe(
      'One paragraph, formatted "When X, do Y." Specific. Generalizable enough that the employee can apply it next time. Do NOT repeat existing rules.',
    ),
})

const LEARN_RULE_SYSTEM_PROMPT = `You are extracting a generalizable rule from a customer rejection.

The customer rejected (or edited) an action proposed by their AI employee. Your job: write ONE paragraph the employee should follow next time to avoid the same mistake.

Constraints:
- Format: "When <situation>, do <behaviour>." (or "When <situation>, NEVER <behaviour>." for hard prohibitions)
- Be specific. Reference the toolkit / action type / arguments that triggered the rejection when relevant.
- Make it generalizable — the next case won't be identical. The rule should match the underlying pattern, not just the literal row.
- Don't repeat similar rules that already exist (you'll be shown them).
- Don't be apologetic. Don't explain — just state the rule.
- Max 500 characters.

Output schema: { rule: string }`

function stringifyProposal(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2).slice(0, 4000)
  } catch {
    return String(value).slice(0, 4000)
  }
}

export const learnFromRejection = task({
  id: 'learn-from-rejection',
  maxDuration: 60,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 30_000 },

  run: async (payload: LearnFromRejectionPayload, { ctx }) => {
    const { userId, employeeSlug, actionId, originalProposal, rejectionReason, edits } =
      payload
    logger.log('Learning from rejection', {
      userId,
      employeeSlug,
      actionId,
      runId: ctx.run.id,
    })

    // 1. Find similar past rules for this employee — so we don't duplicate.
    const queryText = [stringifyProposal(originalProposal), rejectionReason]
      .filter(Boolean)
      .join('\n')
    const similar = await semanticSearchBrain({
      userId,
      query: queryText,
      prefix: `employees/${employeeSlug}/learned-rules/`,
      limit: 5,
    })

    const similarRulesBlock =
      similar.length > 0
        ? similar.map((s) => `- (${s.similarity.toFixed(2)}) ${s.content.slice(0, 600)}`).join('\n')
        : '(none yet)'

    // 2. Derive the rule.
    const userPrompt = [
      `Original proposal (what the employee wanted to do):`,
      stringifyProposal(originalProposal),
      '',
      `Customer's reason for rejection:`,
      rejectionReason || '(no reason supplied)',
      '',
      edits ? `Customer's edited version of the proposal:` : '',
      edits ? stringifyProposal(edits) : '',
      '',
      `Similar past rules already in this employee's learned-rules (do NOT restate any of these):`,
      similarRulesBlock,
    ]
      .filter(Boolean)
      .join('\n')

    // Wrap the model call in the multi-tenant quota system. Without this,
    // a customer at cap who racks up many rejections could blow past the
    // per-tenant token cap with no enforcement.
    const quotaOutcome = await withQuota(
      {
        userId,
        provider: 'openai',
        operation: 'apprentice_mode_rule_derive',
      },
      async () => {
        const { object, usage } = await generateObject({
          model: openai('gpt-5.4'),
          schema: RuleSchema,
          system: LEARN_RULE_SYSTEM_PROMPT,
          prompt: userPrompt,
        })
        return {
          result: object,
          usage: { tokens: usage?.totalTokens ?? 0 },
        }
      },
    )

    if (!quotaOutcome.ok) {
      logger.warn('Skipping rule derivation — quota check failed', {
        userId,
        employeeSlug,
        actionId,
        reason: quotaOutcome.error,
      })
      return { skipped: 'quota' as const, reason: quotaOutcome.error }
    }

    const object = quotaOutcome.result

    // 3. Commit to brain — curated-paths hook automatically embeds + indexes.
    const path = `employees/${employeeSlug}/learned-rules/${actionId}.md`
    const content = [
      `# Rule`,
      '',
      object.rule,
      '',
      `## Context`,
      `Original proposal: ${stringifyProposal(originalProposal)}`,
      '',
      `Reason for rejection: ${rejectionReason || '(no reason supplied)'}`,
      edits ? `\nCustomer edits: ${stringifyProposal(edits)}` : '',
    ].join('\n')

    const commitResult = await commitBrainChanges({
      userId,
      authorType: 'system:apprentice-mode' as BrainAuthorType,
      message: `Learned rule for ${employeeSlug} from action ${actionId}`,
      changes: [{ path, content }],
    })

    logger.log('Apprentice Mode rule committed', {
      employeeSlug,
      actionId,
      path,
      commitId: commitResult.commitId,
      created: commitResult.documentsCreated,
      updated: commitResult.documentsUpdated,
    })

    return {
      rule: object.rule,
      actionId,
      employeeSlug,
      path,
      commitId: commitResult.commitId,
    }
  },
})
