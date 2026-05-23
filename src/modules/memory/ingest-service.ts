import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { enqueueEmbeddingJob, type EmbeddingSourceKind } from "./embedding-jobs";

// "company_brain" is a superset kind not yet in the core EmbeddingSourceKind
// union. We cast here so the rest of the codebase stays strictly typed and the
// extension point is localised to this file.
const COMPANY_BRAIN_KIND = "company_brain" as EmbeddingSourceKind;

export interface IngestDocumentInput {
  userId: string;
  title?: string | null;
  content: string;           // the text to ingest
  sourceKind?: string;       // default "manual"
  metadata?: Record<string, unknown> | null;
  consent_verified: boolean; // MUST be true — refuse if false
}

export interface IngestDocumentResult {
  document_id: string;
  content_chars: number;
  embedding_queued: boolean;
  message: string;
}

export async function ingestDocument(
  input: IngestDocumentInput
): Promise<IngestDocumentResult> {
  // 1. Consent gate
  if (input.consent_verified !== true) {
    throw new AppError(400, "CONSENT_REQUIRED", "consent_verified must be true.");
  }

  // 2. userId guard
  if (!input.userId || input.userId.trim().length === 0) {
    throw new AppError(400, "USER_REQUIRED", "userId is required.");
  }

  // 3. Content length validation
  const trimmedContent = input.content.trim();
  if (trimmedContent.length < 10) {
    throw new AppError(
      400,
      "CONTENT_TOO_SHORT",
      "content must be at least 10 characters."
    );
  }
  if (input.content.length > 100_000) {
    throw new AppError(
      400,
      "CONTENT_TOO_LONG",
      "content must not exceed 100,000 characters."
    );
  }

  // 4. Generate document id
  const id = randomUUID();

  // 5. Build excerpt (first 500 chars of raw content)
  const content_excerpt = input.content.slice(0, 500);

  // 6. Insert into MySQL tracking table
  await dbQuery<RowDataPacket[]>(
    getDb(),
    `INSERT INTO company_brain_documents
       (id, user_id, title, source_kind, content_excerpt, content_chars, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.title ?? null,
      input.sourceKind ?? "manual",
      content_excerpt,
      input.content.length,
      input.metadata != null ? JSON.stringify(input.metadata) : null
    ]
  );

  logInfo("ingest", "Company Brain document inserted", {
    id,
    userId: input.userId,
    content_chars: input.content.length,
    source_kind: input.sourceKind ?? "manual"
  });

  // 7. Fire-and-forget embedding enqueue (only when Postgres sidecar is configured)
  const embeddingQueued = Boolean(env.POSTGRES_URL);
  if (embeddingQueued) {
    setImmediate(() => {
      enqueueEmbeddingJob({
        ownerUserId: input.userId,
        sourceKind: COMPANY_BRAIN_KIND,
        sourceId: id,
        sourceVersion: 1,
        content: input.content.slice(0, 6000),
        metadata: {
          title: input.title ?? null,
          source_kind: input.sourceKind ?? "manual",
          ...((input.metadata ?? {}) as Record<string, unknown>)
        }
      }).catch((err) =>
        logWarn("ingest", "Failed to enqueue embedding (non-fatal)", {
          id,
          error: err instanceof Error ? err.message : String(err)
        })
      );
    });
  }

  // 8. Return result
  return {
    document_id: id,
    content_chars: input.content.length,
    embedding_queued: embeddingQueued,
    message: "Document ingested successfully."
  };
}
