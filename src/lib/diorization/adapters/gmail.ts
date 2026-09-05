// src/lib/diorization/adapters/gmail.ts
//
// Gmail ingestion adapter STUB. When Google OAuth is wired (separate
// sprint), this becomes a Gmail API consumer using the user's OAuth
// token + the gmail.readonly scope.
//
// Consent rule:
//   - Emails the authenticated user sent or received → consent_verified=true
//   - Emails forwarded from third parties without explicit consent → false

import type { IngestionAdapter, RawConversation } from '../types';

export const gmailAdapter: IngestionAdapter = {
  source_type: 'gmail',

  async ingest(_opts) {
    // STUB: returns empty until Google OAuth + Gmail API consumer is wired.
    const conversations: RawConversation[] = [];
    return { conversations, nextCursor: null };
  },
};
