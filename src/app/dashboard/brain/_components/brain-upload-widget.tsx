'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const SHAPES = ['slack', 'gmail', 'zoom_transcript'] as const;
type Shape = (typeof SHAPES)[number];

const PLACEHOLDERS: Record<Shape, string> = {
  slack:
    '[{"channel":"revenue","consent_verified":true,"messages":[{"user":"lawand","ts":"1747000000","text":"Client B is over budget by $4,200 this month"}, {"user":"atta","ts":"1747000060","text":"What action?"}]}]',
  gmail:
    '[{"thread_id":"abc","consent_verified":true,"messages":[{"from":"a@b.co","to":"c@d.co","date":"2026-05-21","subject":"Project scope","body":"We need to expand scope for Q4..."}]}]',
  zoom_transcript:
    '[{"meeting_id":"m1","date":"2026-05-20","consent_verified":true,"participants":["lawand","sean"],"transcript":"Sean: Our agency is over budget on Acme. We need to fix it..."}]',
};

export function BrainUploadWidget() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shape, setShape] = useState<Shape>('slack');
  const [label, setLabel] = useState('');
  const [json, setJson] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload() {
    setMessage(null);
    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      setMessage('Invalid JSON — paste the export array.');
      return;
    }
    const res = await fetch('/api/dashboard/diorization/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shape, source_label: label || `Manual ${shape} upload`, payload }),
    });
    const data = (await res.json()) as { ok?: boolean; conversations_parsed?: number; breadcrumbs_inserted?: number; error?: string };
    if (!res.ok || !data.ok) {
      setMessage(`Upload failed: ${data.error ?? 'unknown error'}`);
      return;
    }
    setMessage(
      `✓ Parsed ${data.conversations_parsed ?? 0} conversations · inserted ${data.breadcrumbs_inserted ?? 0} breadcrumbs. Pattern detection + brief regenerate at 3am UTC, or click Seed sample data to also trigger them now.`,
    );
    setJson('');
    startTransition(() => router.refresh());
  }

  async function handleSeed() {
    setMessage(null);
    const res = await fetch('/api/dashboard/diorization/seed-sample', { method: 'POST' });
    const data = (await res.json()) as {
      ok?: boolean;
      breadcrumbs_inserted?: number;
      pattern_cards_added?: number;
      brief_version?: number | null;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      setMessage(`Seed failed: ${data.error ?? 'unknown error'}`);
      return;
    }
    setMessage(
      `✓ Seeded sample data: ${data.breadcrumbs_inserted ?? 0} breadcrumbs · ${data.pattern_cards_added ?? 0} pattern cards · brief v${data.brief_version ?? '?'}. Reloading...`,
    );
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Upload export</h2>
        <button
          type="button"
          onClick={handleSeed}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/40 transition disabled:opacity-50"
        >
          {pending ? 'Working...' : 'Seed sample data'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm flex items-center gap-2">
          <span className="text-muted-foreground">Shape</span>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as Shape)}
            className="text-sm bg-background border border-border rounded px-2 py-1"
          >
            {SHAPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-muted-foreground">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`Manual ${shape} upload`}
            className="text-sm bg-background border border-border rounded px-2 py-1 flex-1"
          />
        </label>
      </div>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={PLACEHOLDERS[shape]}
        rows={6}
        className="w-full text-xs font-mono bg-background border border-border rounded p-3 resize-y"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Each item needs <code>consent_verified: true</code> or the breadcrumb is skipped.
        </p>
        <button
          type="button"
          onClick={handleUpload}
          disabled={pending || !json.trim()}
          className="text-xs px-4 py-2 rounded bg-foreground text-background font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
