/**
 * Action evaluators — previously proposed work for the owner to approve
 * (retainer invoice drafts via the payment provider, CRM client syncs,
 * etc.).
 *
 * Every evaluator ran against the integrations layer, which was removed —
 * there is nothing left to evaluate, so this is a no-op until evaluators
 * return alongside a new integrations layer.
 */
export async function evaluateActionsForUser(_userId: string): Promise<void> {
  // No evaluators registered — integrations layer pending.
}
