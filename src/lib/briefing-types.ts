// Shared types for the legacy briefing inbox UI + email template.
// The active generator (src/lib/briefing.ts) was removed in favor of the
// Briefing Agent (src/lib/agents/briefing) which writes to Notion + Gmail.
// These types remain so the existing briefings table reader and the email
// template stay type-safe while we wire the dashboard inbox to the new system.
// TODO(post-cleanup): wire briefing-inbox UI to Notion "Weekly Briefings" DB
// via Briefing Agent and remove these types if the inbox shape changes.

export type AttentionItem = {
  priority: 1 | 2 | 3;
  text: string;
  kind: 'alert' | 'warning' | 'info';
};

export type BriefingContent = {
  health_score: number;
  attention: AttentionItem[];
  win: string;
  recommendation: string;
};

export type StoredBriefing = BriefingContent & {
  id: string;
  user_id: string;
  kind: 'weekly' | 'manual';
  email_sent: boolean;
  read_at: string | null;
  created_at: string;
};
