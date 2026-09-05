// Tier (plan) enforcement for OpsRadar.
//
// Branch: main / Supabase. The customer's plan is customer state, lives in
// supabase auth.users.user_metadata.plan. Tier is read directly from Supabase user metadata.
//
// Usage in API routes:
//   const userId = await getCurrentUserId();
//   const session = getSessionSupabaseClient();
//   const { data: { user } } = await session.auth.getUser();
//   const plan = getUserPlan(user?.user_metadata ?? {});
//   if (!canAccess(plan, 'profitability')) {
//     return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
//   }

export type Plan = 'starter' | 'growth' | 'pro' | 'fo';

const ALL_PLANS: readonly Plan[] = ['starter', 'growth', 'pro', 'fo'] as const;

/**
 * Feature matrix — which plans include each feature.
 * `fo` inherits all `pro` features by convention; we enumerate explicitly so
 * grep gives an honest answer about what each feature requires.
 */
export const PLAN_FEATURES = {
  // Growth+ features
  profitability:   ['growth', 'pro', 'fo'],
  scope:           ['growth', 'pro', 'fo'],
  benchmarks:      ['growth', 'pro', 'fo'],
  coo_chat:        ['growth', 'pro', 'fo'],
  hire_chat:       ['growth', 'pro', 'fo'],
  // Pro+ features
  agentic_actions: ['pro', 'fo'],
  retainer:        ['pro', 'fo'],
  custom_webhooks: ['pro', 'fo'],
  slack_routing:   ['pro', 'fo'],
  multi_client_view: ['pro', 'fo'],
  // FO-only
  fo_dashboard:    ['fo'],
} as const satisfies Record<string, readonly Plan[]>;

export type Feature = keyof typeof PLAN_FEATURES;

/**
 * Monthly agentic-action quota per plan. -1 means unlimited (no enforcement).
 * Starter doesn't get agentic_actions feature at all, so its limit is 0.
 */
export const ACTION_QUOTAS: Record<Plan, number> = {
  starter: 0,
  growth:  50,
  pro:     200,
  fo:      -1, // unlimited; FO usage tracked but not capped at the tier level
};

/**
 * Seat counts included in each tier. These are advisory until the team/seat
 * data model exists; today every account is 1 user. Used for display only.
 */
export const SEATS_INCLUDED: Record<Plan, number> = {
  starter: 1,
  growth:  3,
  pro:     10,
  fo:      1, // FO model is one operator across N managed agencies
};

/** Display labels (used in PlanGate UI). */
export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  growth:  'Growth',
  pro:     'Pro',
  fo:      'Fractional Operator',
};

/** Display prices (used in PlanGate UI). */
export const PLAN_PRICES: Record<Plan, string> = {
  starter: '$750/mo',
  growth:  '$1,500/mo',
  pro:     '$3,000/mo',
  fo:      '$1,200/mo + $300/agency',
};

export function canAccess(plan: Plan, feature: Feature): boolean {
  return (PLAN_FEATURES[feature] as readonly string[]).includes(plan);
}

/** Reads plan from user_metadata; defaults to 'starter' if unset or malformed. */
export function getUserPlan(meta: Record<string, unknown> | null | undefined): Plan {
  if (!meta) return 'starter';
  const p = meta.plan;
  if (typeof p === 'string' && (ALL_PLANS as readonly string[]).includes(p)) {
    return p as Plan;
  }
  return 'starter';
}

/**
 * Returns the upgrade-required JSON body for dashboard API routes.
 * Pair with `{ status: 402 }` so HTTP semantics match.
 *
 * Shape matches the dashboard `{ status: ... }` discriminator convention so
 * pages can switch on `resp.status === 'upgrade_required'` like any other state.
 */
export function upgradeRequiredBody(requiredPlan: Plan) {
  return {
    status: 'upgrade_required' as const,
    required_plan: requiredPlan,
    required_plan_label: PLAN_LABELS[requiredPlan],
    required_plan_price: PLAN_PRICES[requiredPlan],
  };
}

export function isValidPlan(value: unknown): value is Plan {
  return typeof value === 'string' && (ALL_PLANS as readonly string[]).includes(value);
}
