// src/lib/diorization/adapters/slack.ts
//
// Slack ingestion adapter STUB. When OAuth is wired (separate sprint),
// this becomes a real Slack Web API consumer with per-user tokens.
//
// Consent rule (encoded here):
//   - Public channels the user has access to → consent_verified=true
//   - Channels marked private where the user is a member AND the
//     workspace admin has enabled diorization at workspace level → true
//   - Direct messages with third parties → consent_verified=false
//     (we do NOT diorize private DMs without explicit per-thread opt-in)

import type { IngestionAdapter, RawConversation } from '../types';

export const slackAdapter: IngestionAdapter = {
  source_type: 'slack',

  async ingest(_opts) {
    // STUB: returns empty until OAuth + Slack Web API consumer is wired.
    // The shape is correct so the pipeline + cron + synthesizer all work
    // end-to-end; only this function changes when we ship real ingestion.
    const conversations: RawConversation[] = [];
    return { conversations, nextCursor: null };
  },
};
