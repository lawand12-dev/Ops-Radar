// src/lib/diorization/adapters/manual-upload.ts
//
// Manual-upload diorization adapter. Unblocks the full diorization
// pipeline TODAY without requiring Slack OAuth / Gmail OAuth setup.
//
// The customer (or an OpsRadar operator) uploads a JSON file in one of
// the supported shapes via POST /api/dashboard/diorization/upload.
// The shape is then parsed into RawConversation[] and queued to the
// next diorize run for that user.
//
// Supported input shapes:
//
//   1. SLACK EXPORT (single channel JSON or array of channels):
//      [{ "channel": "general", "messages": [{ "user": "U1", "ts": "...", "text": "..." }] }, ...]
//
//   2. GMAIL EXPORT (array of threads):
//      [{ "thread_id": "abc", "messages": [{ "from": "a@b.co", "to": "c@d.co", "date": "...", "subject": "...", "body": "..." }] }, ...]
//
//   3. ZOOM / MEET TRANSCRIPT (array of transcripts):
//      [{ "meeting_id": "...", "date": "...", "participants": ["a", "b"], "transcript": "..." }, ...]
//
// All shapes require an explicit consent_verified flag on each item.

import type { RawConversation } from '../types';

type RawSlackMessage = {
  user?: string;
  ts?: string;
  text?: string;
};

type RawSlackChannel = {
  channel?: string;
  channel_id?: string;
  messages?: RawSlackMessage[];
  consent_verified?: boolean;
};

type RawGmailMessage = {
  from?: string;
  to?: string | string[];
  date?: string;
  subject?: string;
  body?: string;
};

type RawGmailThread = {
  thread_id?: string;
  messages?: RawGmailMessage[];
  consent_verified?: boolean;
};

type RawTranscript = {
  meeting_id?: string;
  date?: string;
  participants?: string[];
  transcript?: string;
  consent_verified?: boolean;
};

export type ManualUploadShape = 'slack' | 'gmail' | 'zoom_transcript';

export function parseManualUpload(
  shape: ManualUploadShape,
  raw: unknown,
): RawConversation[] {
  if (!Array.isArray(raw)) return [];

  switch (shape) {
    case 'slack':
      return parseSlackUpload(raw as RawSlackChannel[]);
    case 'gmail':
      return parseGmailUpload(raw as RawGmailThread[]);
    case 'zoom_transcript':
      return parseTranscriptUpload(raw as RawTranscript[]);
  }
}

function parseSlackUpload(channels: RawSlackChannel[]): RawConversation[] {
  const out: RawConversation[] = [];
  for (const ch of channels) {
    const consent = !!ch.consent_verified;
    const messages = Array.isArray(ch.messages) ? ch.messages : [];
    if (messages.length === 0) continue;

    // Group messages into 24h conversation windows (cheap, deterministic)
    const sorted = [...messages].sort((a, b) => Number(a.ts ?? 0) - Number(b.ts ?? 0));
    const WINDOW_SEC = 24 * 60 * 60;
    let currentStart = Number(sorted[0]?.ts ?? 0);
    let bucket: RawSlackMessage[] = [];

    const flush = () => {
      if (bucket.length === 0) return;
      const participants = [...new Set(bucket.map((m) => m.user).filter(Boolean))] as string[];
      const body = bucket.map((m) => `${m.user ?? '?'}: ${m.text ?? ''}`).join('\n');
      out.push({
        source_type: 'slack',
        source_ref: `slack:${ch.channel ?? ch.channel_id ?? 'unknown'}/${currentStart}`,
        occurred_at: new Date(Number(bucket[0]?.ts ?? 0) * 1000).toISOString(),
        participants,
        body,
        consent_verified: consent,
      });
    };

    for (const msg of sorted) {
      const ts = Number(msg.ts ?? 0);
      if (ts - currentStart > WINDOW_SEC) {
        flush();
        bucket = [];
        currentStart = ts;
      }
      bucket.push(msg);
    }
    flush();
  }
  return out;
}

function parseGmailUpload(threads: RawGmailThread[]): RawConversation[] {
  const out: RawConversation[] = [];
  for (const t of threads) {
    const consent = !!t.consent_verified;
    const messages = Array.isArray(t.messages) ? t.messages : [];
    if (messages.length === 0) continue;

    const participants = new Set<string>();
    for (const m of messages) {
      if (m.from) participants.add(m.from);
      if (typeof m.to === 'string') participants.add(m.to);
      else if (Array.isArray(m.to)) m.to.forEach((p) => participants.add(p));
    }

    const body = messages
      .map(
        (m) =>
          `From: ${m.from ?? '?'}\nDate: ${m.date ?? '?'}\nSubject: ${m.subject ?? ''}\n\n${m.body ?? ''}`,
      )
      .join('\n\n---\n\n');

    const occurredAt = messages[0]?.date
      ? new Date(messages[0].date).toISOString()
      : new Date().toISOString();

    out.push({
      source_type: 'gmail',
      source_ref: `gmail:${t.thread_id ?? 'unknown'}`,
      occurred_at: occurredAt,
      participants: [...participants],
      body,
      consent_verified: consent,
    });
  }
  return out;
}

function parseTranscriptUpload(transcripts: RawTranscript[]): RawConversation[] {
  const out: RawConversation[] = [];
  for (const t of transcripts) {
    const consent = !!t.consent_verified;
    const transcript = t.transcript ?? '';
    if (!transcript.trim()) continue;

    out.push({
      source_type: 'zoom_transcript',
      source_ref: `zoom:${t.meeting_id ?? 'unknown'}`,
      occurred_at: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
      participants: Array.isArray(t.participants) ? t.participants : [],
      body: transcript,
      consent_verified: consent,
    });
  }
  return out;
}
