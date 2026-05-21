import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

type GapRow = {
  id: number;
  user_question: string;
  kb_query: string | null;
  created_at: string;
};

type TopicCluster = {
  key: string;
  tokens: string[];
  count: number;
  example: GapRow;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'and', 'what', 'how', 'is', 'are', 'my', 'your', 'for', 'of',
  'to', 'in', 'on', 'with',
]);

function extractTokens(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
}

function clusterKey(tokens: string[]): string {
  return [...tokens].sort().join('+');
}

function groupByTopic(gaps: GapRow[]): TopicCluster[] {
  const clusters = new Map<string, TopicCluster>();

  for (const gap of gaps) {
    const tokens = extractTokens(gap.user_question);
    if (tokens.length === 0) continue;
    const key = clusterKey(tokens);

    const existing = clusters.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      clusters.set(key, { key, tokens, count: 1, example: gap });
    }
  }

  return Array.from(clusters.values()).sort((a, b) => b.count - a.count);
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const seconds = Math.max(0, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminKbGapsPage() {
  const supabase = getServerSupabaseClient();

  const { data: gapsData, error } = await supabase
    .from('coo_kb_gaps')
    .select('id, user_question, kb_query, created_at')
    .eq('found_results', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[admin/kb-gaps] supabase query failed:', error);
  }

  const gaps: GapRow[] = (gapsData ?? []) as GapRow[];
  const clusters = groupByTopic(gaps);
  const topClusters = clusters.slice(0, 15);

  return (
    <div className="flex flex-col gap-5">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Admin /{' '}
          <span className="font-semibold text-[var(--color-fg)]">KB Gaps</span>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <p className="text-label text-[var(--color-fg-subtle)]">Unanswered</p>
            <p className="font-mono text-h4 font-bold leading-tight tabular-nums text-[var(--color-primary)]">
              {gaps.length}
            </p>
          </div>
          {clusters.length > 0 && (
            <>
              <div className="h-8 w-px bg-[var(--color-border)]" />
              <div>
                <p className="text-label text-[var(--color-fg-subtle)]">Topics</p>
                <p className="font-mono text-h4 font-bold leading-tight tabular-nums text-[var(--color-fg)]">
                  {clusters.length}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Page heading */}
      <div>
        <h1 className="font-serif text-h2 tracking-[-0.02em] text-[var(--color-fg)]">
          KB Content Gaps
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Top questions the COO couldn&apos;t answer well — your content-creation backlog.
        </p>
      </div>

      {/* Empty state */}
      {gaps.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-body text-[var(--color-fg-muted)]">
            No gaps captured yet.
          </p>
          <p className="mt-1 text-body-sm text-[var(--color-fg-subtle)]">
            The COO will log questions here when its <code className="font-mono text-[var(--color-fg-muted)]">search_kb</code> tool returns nothing.
          </p>
        </div>
      ) : (
        <>
          {/* ── Top topics ──────────────────────────────────────────────────── */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h2 className="text-h4 text-[var(--color-fg)]">Top topics</h2>
                <p className="text-body-sm text-[var(--color-fg-subtle)] mt-0.5">
                  Clustered by shared keywords — write content for the highest-frequency topics first.
                </p>
              </div>
              <span className="font-mono text-caption text-[var(--color-fg-subtle)] tabular-nums shrink-0">
                {topClusters.length} of {clusters.length}
              </span>
            </div>

            {topClusters.length === 0 ? (
              <p className="px-5 py-6 text-body-sm text-[var(--color-fg-faint)]">
                No clusters could be formed from the current questions.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {topClusters.map((cluster) => (
                  <li key={cluster.key} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <span
                        className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-2 font-mono text-body-sm font-bold tabular-nums text-[var(--color-primary)] shrink-0"
                        aria-label={`${cluster.count} questions in this topic`}
                      >
                        ×{cluster.count}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {cluster.tokens.map((token) => (
                            <span
                              key={token}
                              className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-[1px] font-mono text-caption text-[var(--color-fg-muted)]"
                            >
                              {token}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-body-sm text-[var(--color-fg)] leading-relaxed">
                          <span className="text-[var(--color-fg-subtle)]">Example: </span>
                          {cluster.example.user_question}
                        </p>
                        <p className="mt-1 text-caption font-mono text-[var(--color-fg-faint)] tabular-nums">
                          {relativeTime(cluster.example.created_at)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── All recent questions ────────────────────────────────────────── */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h2 className="text-h4 text-[var(--color-fg)]">All recent questions</h2>
                <p className="text-body-sm text-[var(--color-fg-subtle)] mt-0.5">
                  Newest first — last {gaps.length} unanswered question{gaps.length !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>

            <ul className="divide-y divide-[var(--color-border)]">
              {gaps.map((gap) => (
                <li key={gap.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-[var(--color-fg)] leading-relaxed">
                        {gap.user_question}
                      </p>
                      {gap.kb_query && (
                        <p className="mt-1 text-caption text-[var(--color-fg-subtle)]">
                          <span className="text-[var(--color-fg-faint)]">kb_query: </span>
                          <code className="font-mono text-[var(--color-fg-muted)]">{gap.kb_query}</code>
                        </p>
                      )}
                    </div>
                    <p className="font-mono text-caption text-[var(--color-fg-faint)] tabular-nums shrink-0 pt-0.5">
                      {relativeTime(gap.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
