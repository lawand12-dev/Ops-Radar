// src/lib/diorization/types.ts
//
// Shared types for the diorization pipeline (Loop 2 of the AI-native
// company architecture). Read in this order:
//   adapters/*.ts → ingestRaw() emits RawConversation[]
//   synthesizer.ts → synthesise() turns RawConversation → BreadcrumbInput
//   pattern-detector.ts → derive PatternCardInput[] across breadcrumbs
//   living-brief.ts → produce the per-tenant LivingBrief text

export type RawConversation = {
  source_type: 'slack' | 'gmail' | 'zoom_transcript' | 'notion' | 'manual_upload';
  source_ref: string;                  // e.g. "slack:C12345/p1747000000"
  occurred_at: string;                 // ISO 8601
  participants: string[];              // emails or display names
  body: string;                        // the conversation/message/email text
  // Consent gate: false means "do not diorize" (private DM with
  // non-consenting third party, etc.). Adapters set this based on source ACLs.
  consent_verified: boolean;
};

export type BreadcrumbInput = {
  user_id: string;
  source_id: string | null;
  source_type: string;
  source_ref: string;
  occurred_at: string;
  participants: string[];
  summary: string;                     // 1-3 sentence synthesis
  tags: string[];
  consent_verified: boolean;
  embedding?: number[] | null;
};

export type PatternCardInput = {
  user_id: string;
  pattern_type: string;
  title: string;
  description: string;
  source_breadcrumb_ids: string[];
  confidence: number;                  // 0..1
  first_observed_at: string;
};

export type IngestionAdapter = {
  source_type: RawConversation['source_type'];
  /**
   * Pull new conversations from the source since the last sync cursor.
   * Returns the raw conversations + an updated cursor to persist.
   */
  ingest(opts: {
    userId: string;
    sourceId: string;
    cursor: Record<string, unknown> | null;
    oauthState: Record<string, unknown> | null;
  }): Promise<{
    conversations: RawConversation[];
    nextCursor: Record<string, unknown> | null;
  }>;
};
