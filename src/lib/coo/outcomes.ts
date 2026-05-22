// src/lib/coo/outcomes.ts
//
// Helpers for the COO outcome-memory loop.
// - logOutcome(): writes one row to coo_outcomes when an action is
//   approved / dismissed / undone (called from actions PATCH route +
//   the auto-execute path).
// - getRecentOutcomes(): reads the user's last-N outcomes for prompt
//   injection into the COO chat AND the actions evaluator.
//
// The point: stop proposing actions the owner has already rejected
// for the same reason. Stop forgetting wins. Compound the brain.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export type OutcomeDecision = 'approved' | 'dismissed' | 'undone';

export async function logOutcome(input: {
  actionId: string;
  userId: string;
  actionType: string;
  decision: OutcomeDecision;
  ownerReasoning?: string | null;
}): Promise<void> {
  try {
    const supabase = getServerSupabaseClient();
    await supabase.from('coo_outcomes').insert({
      action_id: input.actionId,
      user_id: input.userId,
      action_type: input.actionType,
      decision: input.decision,
      owner_reasoning: input.ownerReasoning ?? null,
    });
  } catch (err) {
    // Outcome logging must never break the action flow
    console.error('[logOutcome] failed:', err);
  }
}

export type RecentOutcome = {
  action_type: string;
  decision: OutcomeDecision;
  decided_at: string;
  outcome_summary: string | null;
  owner_reasoning: string | null;
};

export async function getRecentOutcomes(
  userId: string,
  limit: number = 10,
): Promise<RecentOutcome[]> {
  try {
    const supabase = getServerSupabaseClient();
    const { data } = await supabase
      .from('coo_outcomes')
      .select('action_type, decision, decided_at, outcome_summary, owner_reasoning')
      .eq('user_id', userId)
      .order('decided_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as RecentOutcome[];
  } catch {
    return [];
  }
}

/**
 * Format last-N outcomes as a short, model-friendly string for injection
 * into either the COO chat system prompt or the actions evaluator context.
 * Returns empty string if no outcomes — the prompt should handle that
 * gracefully (i.e. the line just doesn't appear).
 */
export function formatOutcomesForPrompt(outcomes: RecentOutcome[]): string {
  if (outcomes.length === 0) return '';
  const lines = outcomes.slice(0, 10).map((o) => {
    const date = new Date(o.decided_at).toISOString().slice(0, 10);
    const verb =
      o.decision === 'approved' ? 'APPROVED'
      : o.decision === 'dismissed' ? 'DISMISSED'
      : 'UNDONE';
    const reason = o.owner_reasoning ? ` — reason: ${o.owner_reasoning}` : '';
    const result = o.outcome_summary ? ` — outcome: ${o.outcome_summary}` : '';
    return `- ${date}: ${verb} action_type=${o.action_type}${reason}${result}`;
  });
  return `Recent decisions you have made (most recent first):\n${lines.join('\n')}`;
}
