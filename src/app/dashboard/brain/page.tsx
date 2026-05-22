// src/app/dashboard/brain/page.tsx
//
// The Company Brain — customer-facing surface for the diorization pipeline.
// Shows the current living brief, active pattern cards, recent breadcrumbs,
// ingestion sources, and an upload widget for Slack / Gmail / Zoom exports.
//
// Server-component: loads everything in one round-trip, then hands the
// upload interactions off to the client component.

import { redirect } from 'next/navigation';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { BrainUploadWidget } from './_components/brain-upload-widget';

export const dynamic = 'force-dynamic';

type LivingBrief = {
  id: string;
  version: number;
  brief_content: string;
  generated_at: string;
  model_used: string | null;
  prompt_version: string | null;
};

type PatternCard = {
  id: string;
  pattern_type: string;
  title: string;
  description: string;
  confidence: number;
  first_observed_at: string;
  last_refreshed_at: string;
  source_breadcrumb_ids: string[];
};

type Breadcrumb = {
  id: string;
  source_type: string;
  source_ref: string | null;
  occurred_at: string;
  participants: string[] | null;
  summary: string;
  tags: string[] | null;
  consent_verified: boolean;
};

type IngestionSource = {
  id: string;
  source_type: string;
  source_label: string | null;
  status: string;
  last_synced_at: string | null;
  last_error: string | null;
};

export default async function BrainPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login?next=/dashboard/brain');

  const supabase = await getSessionSupabaseClient();

  const [briefRes, patternsRes, breadcrumbsRes, sourcesRes, patternActionsRes] = await Promise.all([
    supabase
      .from('living_briefs')
      .select('id, version, brief_content, generated_at, model_used, prompt_version')
      .eq('is_current', true)
      .maybeSingle(),
    supabase
      .from('pattern_cards')
      .select('id, pattern_type, title, description, confidence, first_observed_at, last_refreshed_at, source_breadcrumb_ids')
      .eq('is_active', true)
      .order('confidence', { ascending: false })
      .limit(20),
    supabase
      .from('breadcrumbs')
      .select('id, source_type, source_ref, occurred_at, participants, summary, tags, consent_verified')
      .order('occurred_at', { ascending: false })
      .limit(30),
    supabase
      .from('ingestion_sources')
      .select('id, source_type, source_label, status, last_synced_at, last_error')
      .order('created_at', { ascending: false }),
    supabase
      .from('agent_actions')
      .select('id, status, payload, created_at')
      .eq('action_type', 'pattern_alert')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const brief = (briefRes.data ?? null) as LivingBrief | null;
  const patterns = (patternsRes.data ?? []) as PatternCard[];
  const breadcrumbs = (breadcrumbsRes.data ?? []) as Breadcrumb[];
  const sources = (sourcesRes.data ?? []) as IngestionSource[];

  // Build pattern_card_id → linked actions index for the cards section
  const patternActionRows = (patternActionsRes.data ?? []) as Array<{
    id: string;
    status: string;
    payload: { pattern_card_id?: string } | null;
    created_at: string;
  }>;
  const actionsByPattern: Record<string, Array<{ id: string; status: string; created_at: string }>> = {};
  for (const a of patternActionRows) {
    const pcId = a.payload?.pattern_card_id;
    if (!pcId) continue;
    const list = actionsByPattern[pcId] ?? [];
    list.push({ id: a.id, status: a.status, created_at: a.created_at });
    actionsByPattern[pcId] = list;
  }

  const isEmpty = !brief && patterns.length === 0 && breadcrumbs.length === 0;

  return (
    <div className="mx-auto max-w-5xl py-10 px-4 space-y-10">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold">Company Brain</h1>
          <span className="text-xs text-muted-foreground">
            {brief ? `Brief v${brief.version} · ${formatDate(brief.generated_at)}` : 'No brief yet'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          The living memory of your agency. Conversations from Slack, email, and meetings are diorized into
          breadcrumbs; recurring themes become pattern cards; the whole thing synthesises into a brief your
          AI COO always has loaded.
        </p>
      </header>

      {isEmpty && <EmptyState />}

      <BrainUploadWidget />

      {brief && <LivingBriefSection brief={brief} />}

      {patterns.length > 0 && <PatternCardsSection patterns={patterns} actionsByPattern={actionsByPattern} />}

      {breadcrumbs.length > 0 && <BreadcrumbsSection breadcrumbs={breadcrumbs} />}

      {sources.length > 0 && <SourcesSection sources={sources} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
      <h2 className="text-lg font-medium">Your brain is empty</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Upload a Slack export, Gmail mbox JSON, or Zoom transcript below to seed your first breadcrumbs.
        The diorize cron runs nightly (3am UTC) — pattern cards + living brief generate automatically after
        enough breadcrumbs accumulate.
      </p>
      <p className="text-xs text-muted-foreground">
        Want to see it populated instantly without an upload? Click{' '}
        <strong>Seed sample data</strong> on the upload widget below.
      </p>
    </div>
  );
}

function LivingBriefSection({ brief }: { brief: LivingBrief }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Current brief</h2>
      <div className="rounded-lg border border-border bg-card p-6">
        <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {brief.brief_content}
        </article>
        <footer className="mt-6 pt-4 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
          <span>v{brief.version}</span>
          <span>·</span>
          <span>{formatDate(brief.generated_at)}</span>
          {brief.model_used && (
            <>
              <span>·</span>
              <span>{brief.model_used}</span>
            </>
          )}
          {brief.prompt_version && (
            <>
              <span>·</span>
              <span>prompt {brief.prompt_version}</span>
            </>
          )}
        </footer>
      </div>
    </section>
  );
}

function PatternCardsSection({
  patterns,
  actionsByPattern,
}: {
  patterns: PatternCard[];
  actionsByPattern: Record<string, Array<{ id: string; status: string; created_at: string }>>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Active patterns ({patterns.length})</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {patterns.map((p) => {
          const linkedActions = actionsByPattern[p.id] ?? [];
          const pending = linkedActions.filter((a) => a.status === 'pending');
          const approved = linkedActions.filter((a) => a.status === 'executed' || a.status === 'approved');
          const dismissed = linkedActions.filter((a) => a.status === 'dismissed');

          return (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium leading-tight">{p.title}</h3>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {(p.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                <span className="font-mono text-[10px] uppercase tracking-wide">{p.pattern_type}</span>
                <span>·</span>
                <span>{p.source_breadcrumb_ids.length} sources</span>
                <span>·</span>
                <span>first seen {formatDate(p.first_observed_at)}</span>
              </div>
              {linkedActions.length > 0 && (
                <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2 text-xs">
                  {pending.length > 0 && (
                    <a href="/dashboard/actions" className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 hover:underline">
                      {pending.length} pending action{pending.length === 1 ? '' : 's'}
                    </a>
                  )}
                  {approved.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                      {approved.length} acted on
                    </span>
                  )}
                  {dismissed.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
                      {dismissed.length} dismissed
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BreadcrumbsSection({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Recent breadcrumbs</h2>
      <ol className="space-y-2">
        {breadcrumbs.map((b) => (
          <li key={b.id} className="rounded border border-border bg-card/50 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wide">{b.source_type}</span>
              <span>·</span>
              <span>{formatDate(b.occurred_at)}</span>
              {!b.consent_verified && (
                <>
                  <span>·</span>
                  <span className="text-amber-500">consent skipped</span>
                </>
              )}
            </div>
            <p>{b.summary}</p>
            {(b.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {b.tags!.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SourcesSection({ sources }: { sources: IngestionSource[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Ingestion sources</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Label</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Last synced</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{s.source_type}</td>
                <td className="px-4 py-2">{s.source_label ?? '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-mono ${
                      s.status === 'active' ? 'text-emerald-500' : s.status === 'error' ? 'text-red-500' : 'text-muted-foreground'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {s.last_synced_at ? formatDate(s.last_synced_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
