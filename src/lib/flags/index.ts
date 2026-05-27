/**
 * Feature flag definitions for OpsRadar (CP-PROD-SAFETY step 2).
 *
 * Architecture:
 *   - Vercel's `flags` SDK is the dev-ergonomics wrapper (works with the
 *     Vercel Toolbar for local overrides).
 *   - Statsig (`@statsig/statsig-node-core`) is the backend — stores the
 *     flag values, supports per-customer targeting, and is the network
 *     source of truth.
 *   - This module wires the two together via a single `statsigAdapter`
 *     that all flag definitions reuse.
 *
 * Why we built our own adapter instead of relying on a published one:
 *   The `flags` package ships adapters as separate modules
 *   (e.g. @flags-sdk/statsig). Rolling our own is ~25 lines and keeps the
 *   surface area small + version pinning simple. If Statsig changes their
 *   SDK shape, we have one local file to update.
 *
 * Default values:
 *   Every flag has an explicit `defaultValue`. If Statsig is unreachable
 *   (network error, missing key, etc.), the flag returns the default and
 *   the request proceeds — fail-open for non-critical flags, fail-closed
 *   for kill switches that gate new features.
 *
 * See: docs/adr/0008-observability-sentry-statsig-langfuse.md §4 for the verified pick.
 */

import { flag, dedupe } from 'flags/next'
import { Statsig, StatsigUser } from '@statsig/statsig-node-core'

// ─── Statsig server SDK initialization (singleton) ───────────────────────
//
// We use Statsig.newShared() + Statsig.shared() so concurrent imports across
// our Vercel functions reuse the same SDK instance. .initialize() returns
// once the gate definitions are fetched + cached locally.
let statsigInitPromise: Promise<Statsig> | null = null

async function getStatsigClient(): Promise<Statsig> {
  if (!statsigInitPromise) {
    const secret = process.env.STATSIG_SERVER_SECRET
    if (!secret) {
      // No secret = no flags. Caller falls back to defaults.
      throw new Error('STATSIG_SERVER_SECRET is not set')
    }
    statsigInitPromise = (async () => {
      const client = Statsig.hasShared()
        ? Statsig.shared()
        : Statsig.newShared(secret, {
            environment: process.env.NODE_ENV ?? 'development',
          })
      await client.initialize()
      return client
    })()
  }
  return statsigInitPromise
}

// ─── Identify caller (current customer, if logged in) ────────────────────
//
// flags' identify() runs once per request (cached via dedupe). Whatever it
// returns becomes the StatsigUser the adapter checks against. We don't have
// access to NextRequest inside identify(), so we read the auth cookie via
// the shared Supabase SSR helper.
const identifyUser = dedupe(async (): Promise<StatsigUser> => {
  try {
    // Lazy-load to keep the flags module light; avoids pulling Supabase
    // into edge bundles where this file might be imported for type info.
    const { getCurrentUserId } = await import('<npm>/lib/supabase-ssr')
    const userId = await getCurrentUserId()
    return new StatsigUser({
      userID: userId ?? 'anonymous',
      custom: { tier: process.env.NODE_ENV ?? 'development' },
    })
  } catch {
    return new StatsigUser({ userID: 'anonymous' })
  }
})

// ─── Statsig adapter for the flags SDK ───────────────────────────────────
//
// flag({ adapter }) calls adapter.decide(key, ...) and uses the returned
// value. Our adapter:
//   1. Inits the Statsig SDK (once)
//   2. Identifies the current user (cached per request)
//   3. Reads the gate / dynamic config / experiment value from Statsig
//   4. Falls back to the flag's defaultValue if anything goes wrong
function statsigAdapter<T>() {
  return {
    decide: async ({
      key,
      defaultValue,
    }: {
      key: string
      defaultValue?: T
    }): Promise<T> => {
      try {
        const client = await getStatsigClient()
        const user = await identifyUser()
        // For boolean flags we use Statsig "gates". Non-boolean flags
        // should be modeled as dynamic configs — we'd add a second
        // adapter for those when we need them.
        const result = client.checkGate(user, key) as unknown as T
        return result ?? defaultValue ?? (false as unknown as T)
      } catch (err) {
        console.warn(
          `[flags] Statsig lookup failed for "${key}", returning default`,
          err instanceof Error ? err.message : err,
        )
        return defaultValue ?? (false as unknown as T)
      }
    },
  }
}

// ─── Flag definitions ────────────────────────────────────────────────────
//
// Six kill switches + experiment toggles that gate CP-34+ feature rollouts.
// Each starts as `false` (safe default — feature is OFF unless explicitly
// enabled in Statsig). When you ship a CP, you flip the gate on for your
// own user first, validate, then progressively roll out.
//
// To check a flag in code:
//   import { customEmployeesEnabled } from '<npm>/lib/flags'
//   if (await customEmployeesEnabled()) { ... }

/** CP-34: gate the entire AI Employees UI + tool surface. */
export const customEmployeesEnabled = flag<boolean>({
  key: 'custom-employees-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: false,
  description:
    'Master kill switch for CP-34 AI Employees (hiring + per-employee chat + scoped tools).',
  identify: identifyUser,
})

/** CP-34a: the consult_coo escalation tool that every employee can call. */
export const consultCooEnabled = flag<boolean>({
  key: 'consult-coo-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true, // already shipped + tested; safe to default ON
  description:
    'Whether employees can escalate to the AI COO via the consult_coo tool. Default ON; flip OFF if escalation generates bad outputs.',
  identify: identifyUser,
})

/** CP-35: the rejection -> learned-rule loop. */
export const apprenticeModeEnabled = flag<boolean>({
  key: 'apprentice-mode-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: false,
  description:
    'Whether rejecting an action in /dashboard/actions fires the learn-from-rejection task that writes a rule to employees/<slug>/learned-rules.md.',
  identify: identifyUser,
})

/** CP-36: real-time "Team Live" widget on the dashboard. */
export const liveWorkforceViewEnabled = flag<boolean>({
  key: 'live-workforce-view-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: false,
  description:
    'Whether the dashboard shows the Trigger.dev realtime feed of currently-running employees.',
  identify: identifyUser,
})

/** CP-37: parent_employee_id + delegate_to_employee tool. */
export const orgChartDelegationEnabled = flag<boolean>({
  key: 'org-chart-delegation-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: false,
  description:
    'Whether manager-employees can delegate work to their direct reports via Trigger.dev step.waitForEvent.',
  identify: identifyUser,
})

/**
 * Generic per-customer kill switch — flip OFF to disable AI Employees for
 * one specific user when something misbehaves, without taking the feature
 * down for everyone. Statsig targeting rules let you scope the gate to a
 * single userID.
 */
export const customEmployeesPerCustomer = flag<boolean>({
  key: 'custom-employees-per-customer',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description:
    'Per-customer override for the AI Employees feature. Use Statsig targeting to disable for individual users.',
  identify: identifyUser,
})

/**
 * Master kill switch for the agent loop itself. Flip OFF in Statsig to halt
 * every runAgent / runAgentStream call globally — useful when a tool starts
 * misbehaving in production and we need to stop the bleeding before
 * shipping a fix. Default ON so the engine works out of the box.
 */
export const agentLoopEnabled = flag<boolean>({
  key: 'agent-loop-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description:
    'Master kill switch for runAgent / runAgentStream. Disable in Statsig to pause every agent run globally.',
  identify: identifyUser,
})

/**
 * Per-toolkit kill switch for Gmail. Flip OFF in Statsig to stop every
 * employee from making Gmail calls while a fix ships. Reads stay allowed
 * regardless (handled in hooks/classifyToolCall); this gate stops the
 * loop from even loading Gmail tools.
 */
export const gmailToolkitEnabled = flag<boolean>({
  key: 'gmail-toolkit-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description:
    'Whether the Gmail toolkit is available to employees. Flip OFF in Statsig to halt all Gmail tool calls (sends, drafts, modifies) without redeploying.',
  identify: identifyUser,
})

/**
 * Generic resolver — look up any boolean flag by Statsig gate key.
 *
 * Used by the toolkit registry's `killSwitchFlag` field so adding a new
 * integration doesn't require editing this file. Defaults to TRUE
 * (allow) on lookup miss so a typo in a toolkit's flag name doesn't
 * silently disable it — the typo would surface as "this flag should
 * have been gating something" instead of "this toolkit is dead".
 */
/**
 * Per-toolkit kill switches for the CP-38 ICP-core integrations. Same shape
 * as Gmail: default ON, flip OFF in Statsig to halt that toolkit's tool calls
 * without a redeploy. Reads stay allowed regardless (handled in
 * hooks/classifyToolCall); these gates stop the loop from loading the tools.
 */
export const slackToolkitEnabled = flag<boolean>({
  key: 'slack-toolkit-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description: 'Whether the Slack toolkit is available to employees.',
  identify: identifyUser,
})

export const hubspotToolkitEnabled = flag<boolean>({
  key: 'hubspot-toolkit-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description: 'Whether the HubSpot toolkit is available to employees.',
  identify: identifyUser,
})

export const clickupToolkitEnabled = flag<boolean>({
  key: 'clickup-toolkit-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description: 'Whether the ClickUp toolkit is available to employees.',
  identify: identifyUser,
})

export const stripeToolkitEnabled = flag<boolean>({
  key: 'stripe-toolkit-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description: 'Whether the Stripe toolkit is available to employees.',
  identify: identifyUser,
})

export const notionToolkitEnabled = flag<boolean>({
  key: 'notion-toolkit-enabled',
  adapter: statsigAdapter<boolean>(),
  defaultValue: true,
  description: 'Whether the Notion toolkit is available to employees.',
  identify: identifyUser,
})

const TOOLKIT_FLAG_REGISTRY: Record<string, () => Promise<boolean>> = {
  'gmail-toolkit-enabled': gmailToolkitEnabled,
  'slack-toolkit-enabled': slackToolkitEnabled,
  'hubspot-toolkit-enabled': hubspotToolkitEnabled,
  'clickup-toolkit-enabled': clickupToolkitEnabled,
  'stripe-toolkit-enabled': stripeToolkitEnabled,
  'notion-toolkit-enabled': notionToolkitEnabled,
}

export async function resolveToolkitFlag(flagKey: string | undefined): Promise<boolean> {
  if (!flagKey) return true
  const fn = TOOLKIT_FLAG_REGISTRY[flagKey]
  if (!fn) {
    console.warn(`[flags] Unknown toolkit kill-switch "${flagKey}" — defaulting to allow.`)
    return true
  }
  return fn()
}
