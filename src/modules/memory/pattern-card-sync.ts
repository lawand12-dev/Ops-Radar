import { createHash } from "node:crypto";
import { env } from "../../config/env";
import { dbPgQuery, withPgTransaction } from "../../lib/db-pg";
import { logError, logInfo, logWarn } from "../../lib/logger";
import { loadAllPatternCards, type PatternCard } from "./pattern-cards";
import {
  enqueueEmbeddingJob,
  hashContent
} from "./embedding-jobs";

/**
 * Pattern card sync — markdown -> postgres -> embedding queue.
 *
 * Source of truth
 * ---------------
 * The .md files in knowledge-base/patterns remain authoritative for human
 * editing (Phase 1 behavior). This sync job projects them into the
 * `pattern_cards` table so the runtime retrieval layer can:
 *   - rank by success_rate telemetry (set by outcome-telemetry-sync)
 *   - auto-archive weak cards
 *   - participate in hybrid retrieval via embeddings
 *
 * Hash-based versioning
 * ---------------------
 * For each card we compute sha256(body). If the row for (id, version)
 * exists and the hash matches, we skip. If it exists but the hash differs,
 * we INSERT a new row at version+1 — old version stays for replay/audit;
 * new version is what the selector sees once archived_at on old is set.
 *
 * Embeddings
 * ----------
 * On every new/updated row we enqueue an embedding_job. The worker picks
 * it up and lands the vector in `embeddings`. Failure to enqueue does NOT
 * roll back the pattern_cards write — the card is still usable via the
 * keyword path; the embedding catches up on the next sync.
 *
 * Idempotency / concurrency
 * -------------------------
 * The whole sync runs inside ONE transaction. If two instances race
 * (e.g. boot + cron firing simultaneously), the second one's UPSERTs are
 * no-ops because (id, version) is the primary key and hashes will match.
 * The advisory lock below adds belt-and-braces serialization.
 */

const SYNC_ADVISORY_LOCK_KEY = 0x70617474_6e635f73; // "pattn_s" — arbitrary stable id

export interface PatternCardSyncResult {
  scanned: number;
  unchanged: number;
  inserted_new: number;
  bumped_version: number;
  archived_superseded: number;
  embedding_jobs_enqueued: number;
}

export async function runPatternCardSync(): Promise<PatternCardSyncResult> {
  if (!env.POSTGRES_URL) {
    throw new Error("runPatternCardSync requires POSTGRES_URL");
  }

  const cards = loadAllPatternCards();
  logInfo("pattern-card-sync", "Starting sync", { card_count: cards.length });

  let inserted_new = 0;
  let bumped_version = 0;
  let archived_superseded = 0;
  let unchanged = 0;
  const enqueueQueue: Array<{
    cardId: string;
    version: number;
    body: string;
    metadata: Record<string, unknown>;
  }> = [];

  await withPgTransaction(async (client) => {
    // Advisory lock prevents two sync cycles overlapping inside the same
    // database. Released automatically on transaction end.
    await dbPgQuery(client, "SELECT pg_advisory_xact_lock($1)", [
      SYNC_ADVISORY_LOCK_KEY
    ]);

    for (const card of cards) {
      const hash = hashContent(card.body);

      // Look up the current latest row for this card id (any version).
      const { rows: existingRows } = await dbPgQuery<{
        version: number;
        body_hash: Buffer;
        archived_at: Date | null;
      }>(
        client,
        `SELECT version, body_hash, archived_at
           FROM pattern_cards
          WHERE id = $1
          ORDER BY version DESC
          LIMIT 1`,
        [card.id]
      );

      const latest = existingRows[0];

      if (!latest) {
        // Brand new card.
        await insertCard(client, card, hash);
        inserted_new += 1;
        enqueueQueue.push(buildEmbedJob(card));
        continue;
      }

      const bodyHashHex = hash.toString("hex");
      const latestHashHex = Buffer.from(latest.body_hash).toString("hex");

      if (latestHashHex === bodyHashHex) {
        unchanged += 1;
        continue;
      }

      // Content changed -> bump version. Old row stays (replay/audit) but
      // we archive it so the selector ignores it. We honor any manual
      // archive that was already set (don't unarchive on bump).
      if (latest.archived_at === null) {
        await dbPgQuery(
          client,
          `UPDATE pattern_cards
              SET archived_at = now()
            WHERE id = $1 AND version = $2 AND archived_at IS NULL`,
          [card.id, latest.version]
        );
        archived_superseded += 1;
      }

      const nextVersion = latest.version + 1;
      await insertCard(client, { ...card, version: nextVersion }, hash);
      bumped_version += 1;
      enqueueQueue.push(buildEmbedJob({ ...card, version: nextVersion }));
    }
  });

  // Enqueue embeddings AFTER the pattern_cards transaction commits so the
  // NOTIFY fires only on actually-persisted rows. If enqueue fails for any
  // job we log + continue; the card is still usable via keyword.
  let enqueued = 0;
  for (const job of enqueueQueue) {
    try {
      await enqueueEmbeddingJob({
        ownerUserId: null, // pattern cards are global procedural memory
        sourceKind: "pattern_card",
        sourceId: job.cardId,
        sourceVersion: job.version,
        content: job.body,
        metadata: job.metadata
      });
      enqueued += 1;
    } catch (err) {
      logWarn("pattern-card-sync", "Failed to enqueue embedding job for card", {
        card_id: job.cardId,
        version: job.version,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  const result: PatternCardSyncResult = {
    scanned: cards.length,
    unchanged,
    inserted_new,
    bumped_version,
    archived_superseded,
    embedding_jobs_enqueued: enqueued
  };

  logInfo("pattern-card-sync", "Sync complete", result);
  return result;
}

async function insertCard(
  client: Parameters<typeof dbPgQuery>[0],
  card: PatternCard,
  bodyHash: Buffer
): Promise<void> {
  await dbPgQuery(
    client,
    `INSERT INTO pattern_cards (
       id, version, intent, triggers, tools, output_kind,
       body, body_hash, source_path
     ) VALUES (
       $1, $2, $3, $4::text[], $5::text[], $6,
       $7, decode($8, 'hex'), $9
     )
     ON CONFLICT (id, version) DO NOTHING`,
    [
      card.id,
      card.version,
      card.intent,
      card.triggers,
      card.tools,
      card.output_kind,
      card.body,
      bodyHash.toString("hex"),
      card.source_path
    ]
  );
}

function buildEmbedJob(card: PatternCard): {
  cardId: string;
  version: number;
  body: string;
  metadata: Record<string, unknown>;
} {
  // The embedded text concatenates the semantically meaningful fields.
  // Order matters: model anchors on the front of the input.
  const composedBody = [
    `intent: ${card.intent ?? ""}`,
    `triggers: ${card.triggers.join(", ")}`,
    `tools: ${card.tools.join(", ")}`,
    "",
    card.body
  ].join("\n");

  return {
    cardId: card.id,
    version: card.version,
    body: composedBody,
    metadata: {
      intent: card.intent,
      triggers: card.triggers,
      tools: card.tools,
      output_kind: card.output_kind,
      source_path: card.source_path,
      body_sha256: createHash("sha256").update(card.body).digest("hex")
    }
  };
}
