/**
 * Server-side helpers for inspecting Nango connections across all customers.
 *
 * These are batch helpers used by:
 *   - cron jobs that need to know which customers have a given integration
 *   - benchmarks aggregator scanning every active tenant
 *   - brain-status route checking whether a specific tool is connected
 *
 * The shape mirrors what the historical OAuth-connections table used to return
 * — (user_id, tool_slug, is_active) tuples — so call sites can switch over
 * with a one-line change instead of a refactor.
 *
 * Implementation: paginated `listConnections` on Nango, filtered + mapped back
 * to OpsRadar tool slugs via the providerConfigKey ↔ slug inverse map.
 * Connections without a `tags.end_user_id` (i.e. team-managed legacy ones)
 * are skipped — only customer-tagged connections count.
 */

import { getNango, NANGO_TOOLS, type NangoToolSlug } from '<npm>/lib/nango'

export type ConnectionRow = {
  user_id: string
  tool_slug: NangoToolSlug
  connection_id: string
  is_active: true
  created_at: string | null
}

// Inverse map: providerConfigKey → OpsRadar tool slug.
const PROVIDER_TO_SLUG: Record<string, NangoToolSlug> = Object.fromEntries(
  (Object.entries(NANGO_TOOLS) as [NangoToolSlug, string][]).map(
    ([slug, providerKey]) => [providerKey, slug],
  ),
) as Record<string, NangoToolSlug>

type RawNangoConnection = {
  connection_id?: string
  provider_config_key?: string
  created?: string
  tags?: { end_user_id?: string } & Record<string, unknown>
  errors?: Array<unknown>
}

/**
 * Pull ALL Nango connections for the environment, mapped to OpsRadar shape.
 * Skips connections with auth errors and connections lacking `end_user_id`.
 *
 * Pages through the Nango list endpoint at LIST_PAGE_LIMIT per request so
 * we don't silently truncate at 100+ customers (Nango's default cap).
 * Use sparingly — cron / benchmark batch contexts only. For per-customer
 * queries use `listCustomerConnections(userId)` below.
 */
const LIST_PAGE_LIMIT = 100
const LIST_MAX_PAGES = 50 // 5,000-connection ceiling — bumps if we ever need it

export async function listAllConnections(): Promise<ConnectionRow[]> {
  const nango = getNango()
  const out: ConnectionRow[] = []
  let page = 0

  while (page < LIST_MAX_PAGES) {
    try {
      const { connections } = (await nango.listConnections({
        limit: LIST_PAGE_LIMIT,
        page,
      } as unknown as Parameters<typeof nango.listConnections>[0])) as unknown as {
        connections: RawNangoConnection[]
      }

      if (!connections || connections.length === 0) break

      for (const c of connections) {
        const slug = PROVIDER_TO_SLUG[c.provider_config_key ?? '']
        const userId = c.tags?.end_user_id
        if (!slug || !userId || !c.connection_id) continue
        if ((c.errors ?? []).length > 0) continue
        out.push({
          user_id: userId,
          tool_slug: slug,
          connection_id: c.connection_id,
          is_active: true,
          created_at: c.created ?? null,
        })
      }

      // Short page means last page reached.
      if (connections.length < LIST_PAGE_LIMIT) break
      page++
    } catch (err) {
      console.warn(
        `[nango/connections.listAllConnections] page=${page} failed:`,
        err instanceof Error ? err.message : err,
      )
      // Return partial — partial benchmarks > no benchmarks.
      break
    }
  }

  if (page === LIST_MAX_PAGES) {
    console.warn(
      `[nango/connections.listAllConnections] hit LIST_MAX_PAGES ceiling — bump if customer count climbs.`,
    )
  }
  return out
}

/**
 * List one customer's connections. Convenience wrapper around
 * listConnections({ tags }) — used by per-tenant routes.
 */
export async function listCustomerConnections(userId: string): Promise<ConnectionRow[]> {
  try {
    const nango = getNango()
    const { connections } = (await nango.listConnections({
      tags: { end_user_id: userId },
    } as unknown as Parameters<typeof nango.listConnections>[0])) as unknown as {
      connections: RawNangoConnection[]
    }
    return (connections ?? [])
      .map((c): ConnectionRow | null => {
        const slug = PROVIDER_TO_SLUG[c.provider_config_key ?? '']
        if (!slug || !c.connection_id) return null
        if ((c.errors ?? []).length > 0) return null
        return {
          user_id: userId,
          tool_slug: slug,
          connection_id: c.connection_id,
          is_active: true,
          created_at: c.created ?? null,
        }
      })
      .filter(Boolean) as ConnectionRow[]
  } catch (err) {
    console.warn(
      `[nango/connections.listCustomerConnections] failed for ${userId}:`,
      err instanceof Error ? err.message : err,
    )
    return []
  }
}
