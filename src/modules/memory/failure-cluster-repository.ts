import { dbPgQuery, getPgPool } from "../../lib/db-pg";
import { env } from "../../config/env";
import { logWarn } from "../../lib/logger";
import type {
  FailureClusterRow,
  FailureClustersResponse
} from "../../types/memory-api";

/**
 * Admin /admin/memory/failure-clusters aggregator.
 *
 * Producer status (Phase 2 Week 2+)
 * ---------------------------------
 * The failure-cluster producer module (which writes to failure_clusters /
 * failure_cluster_hits as anomalies arrive) is NOT yet shipped. Until it
 * is, the table is empty and we return `producer_live: false` so the
 * frontend can render "Cluster ingestion not enabled". The endpoint
 * still 200s — no special status code, no error.
 *
 * PII redaction
 * -------------
 * This endpoint returns CLUSTER-level data only (counts + fingerprints).
 * The per-tenant `failure_cluster_hits` table is NEVER joined here — that
 * would leak which tenant hit which error. A future drill-in endpoint
 * (if needed) will surface only stable salted hashes of owner_user_id,
 * never the raw uuid.
 *
 * `tenant_count` is a distinct count and contains no per-tenant
 * identifiers, so it's safe to surface.
 *
 * `exemplar_text` is already normalized at insert time by Phase 1's
 * fingerprintErrorMessage (UUIDs/URLs/numerics stripped). No further
 * redaction needed.
 *
 * `known_remedies` is operator-authored prose; it is filtered server-side
 * to drop any property that looks like a tenant identifier
 * (`owner_user_id`, `user_id`, `tenant_id`). The list endpoint returns
 * only {remedy, attempted, succeeded, last_used}.
 */

export interface ListFailureClustersOptions {
  limit?: number;
  sinceDays?: number;
}

export async function listTopFailureClusters(
  options: ListFailureClustersOptions = {}
): Promise<FailureClustersResponse> {
  if (!env.POSTGRES_URL) {
    return { items: [], producer_live: false };
  }

  const limit = Math.min(Math.max(1, Math.floor(options.limit ?? 50)), 500);
  const sinceDays = Math.min(Math.max(1, Math.floor(options.sinceDays ?? 30)), 365);

  try {
    const pool = getPgPool();
    const { rows } = await dbPgQuery<{
      id: string;
      fingerprint: string;
      exemplar_text: string;
      first_seen: Date;
      last_seen: Date;
      hit_count: number;
      tenant_count: number;
      known_remedies: unknown;
    }>(
      pool,
      `SELECT id,
              fingerprint,
              exemplar_text,
              first_seen,
              last_seen,
              hit_count,
              tenant_count,
              known_remedies
         FROM failure_clusters
        WHERE archived_at IS NULL
          AND last_seen >= now() - ($1 || ' days')::interval
        ORDER BY hit_count DESC, last_seen DESC
        LIMIT $2`,
      [String(sinceDays), limit]
    );

    // Empty table → producer not yet shipped. Use COUNT(*) to verify
    // (the SELECT above could be empty for legitimate reasons too, but
    // we treat zero clusters as "not live" for the UI flag).
    const producerLive = rows.length > 0;

    const items: FailureClusterRow[] = rows.map((r) => ({
      id: r.id,
      fingerprint: r.fingerprint,
      exemplar_text: r.exemplar_text,
      first_seen: r.first_seen.toISOString(),
      last_seen: r.last_seen.toISOString(),
      hit_count: r.hit_count,
      tenant_count: r.tenant_count,
      known_remedies: sanitizeRemedies(r.known_remedies)
    }));

    return { items, producer_live: producerLive };
  } catch (err) {
    logWarn("failure-cluster-repository", "listing failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return { items: [], producer_live: false };
  }
}

/**
 * Strip any PII-shaped properties from the operator-authored remedies
 * jsonb blob. We surface only the safe quadruple. Defensive — the
 * producer is expected to write clean shapes — but this is the last
 * line before the admin client.
 */
function sanitizeRemedies(raw: unknown): Array<{
  remedy: string;
  attempted: number;
  succeeded: number;
  last_used: string | null;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const remedy = typeof e.remedy === "string" ? e.remedy : null;
      const attempted = typeof e.attempted === "number" ? e.attempted : 0;
      const succeeded = typeof e.succeeded === "number" ? e.succeeded : 0;
      const lastUsedRaw =
        typeof e.last_used === "string" || typeof e.last_used_at === "string"
          ? (e.last_used ?? e.last_used_at)
          : null;
      const lastUsed =
        typeof lastUsedRaw === "string" && !Number.isNaN(new Date(lastUsedRaw).getTime())
          ? new Date(lastUsedRaw).toISOString()
          : null;
      if (!remedy) return null;
      return { remedy, attempted, succeeded, last_used: lastUsed };
    })
    .filter((e): e is { remedy: string; attempted: number; succeeded: number; last_used: string | null } => e !== null);
}
