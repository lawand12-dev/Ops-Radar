import { dbPgQuery, getPgPool } from "../../lib/db-pg";
import { env } from "../../config/env";
import { logWarn } from "../../lib/logger";
import type {
  OutputKind,
  PatternCardTelemetryItem,
  PatternCardTelemetryResponse
} from "../../types/memory-api";

/**
 * Admin /admin/memory/pattern-cards aggregator.
 *
 * Reads the live `pattern_cards` table in Postgres (synced from
 * knowledge-base/patterns/*.md by pattern-card-sync.ts). The
 * matches_30d / deployed_30d / rejected_30d counters are populated by
 * the outcome-telemetry-sync nightly job — Phase 2 Week 2+. Until that
 * job ships and runs at least once, every row's counters are zero.
 *
 * `telemetry_populated` is true iff at least one row has matches_30d > 0,
 * giving the UI a clear signal to render "Awaiting first sync" instead
 * of misleading zero-success-rate badges.
 *
 * Read-only — never writes. No tenant scope (pattern cards are global
 * procedural memory).
 */
export async function listPatternCardTelemetry(): Promise<PatternCardTelemetryResponse> {
  if (!env.POSTGRES_URL) {
    return { items: [], telemetry_populated: false };
  }

  try {
    const pool = getPgPool();
    // Self-join with embeddings to compute `embedded` per card. LEFT JOIN
    // because newly-synced cards may not have an active embedding row
    // yet (the worker hasn't picked the job up).
    const { rows } = await dbPgQuery<{
      id: string;
      version: number;
      output_kind: OutputKind;
      intent: string | null;
      triggers: string[];
      archived_at: Date | null;
      matches_30d: number;
      deployed_30d: number;
      rejected_30d: number;
      success_rate: string | null;
      updated_at: Date;
      embedded: boolean;
    }>(
      pool,
      `SELECT pc.id,
              pc.version,
              pc.output_kind,
              pc.intent,
              pc.triggers,
              pc.archived_at,
              pc.matches_30d,
              pc.deployed_30d,
              pc.rejected_30d,
              pc.success_rate::text AS success_rate,
              pc.updated_at,
              EXISTS (
                SELECT 1 FROM embeddings e
                 WHERE e.source_kind = 'pattern_card'
                   AND e.source_id = pc.id
                   AND e.source_version = pc.version
                   AND e.active
              ) AS embedded
         FROM pattern_cards pc
        ORDER BY pc.success_rate DESC NULLS LAST, pc.id`
    );

    let telemetryPopulated = false;
    const items: PatternCardTelemetryItem[] = rows.map((r) => {
      if (r.matches_30d > 0) telemetryPopulated = true;
      return {
        id: r.id,
        version: r.version,
        output_kind: r.output_kind,
        intent: r.intent,
        triggers: r.triggers ?? [],
        archived: r.archived_at !== null,
        archived_at: r.archived_at ? r.archived_at.toISOString() : null,
        matches_30d: r.matches_30d,
        deployed_30d: r.deployed_30d,
        rejected_30d: r.rejected_30d,
        success_rate: r.success_rate !== null ? Number(r.success_rate) : null,
        last_synced_at: r.updated_at.toISOString(),
        embedded: r.embedded
      };
    });

    return { items, telemetry_populated: telemetryPopulated };
  } catch (err) {
    logWarn("pattern-card-telemetry", "listing failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return { items: [], telemetry_populated: false };
  }
}
