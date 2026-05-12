import * as React from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";

/**
 * Three horizontal "segment showcase" rows replacing the previous identical-
 * card grid. Each row is a 2-column layout: brand copy on the left, a per-
 * segment mini-visualization on the right showing what that agency type
 * actually sees inside their AIOS.
 *
 *   - Paid Media → morning pacing alert toast
 *   - SEO → weekly rank-change tracker
 *   - Full-service → team-utilization grid (with overload flag)
 *
 * Each row is wrapped in a Link to the segment's deep-dive page.
 */
export function SegmentsBento() {
  return (
    <div className="grid gap-px bg-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
      <SegmentRow
        tag="Paid media"
        href="/for/paid-media"
        headline="Sunday-night reporting goes away. Pacing alerts find you first."
        bullets={[
          "Monthly client reports that build themselves",
          "Pacing alerts tied to MER, not last-click ROAS",
          "BM-access-to-first-report from 3 weeks to 5 days",
        ]}
        viz={<PaidMediaViz />}
      />
      <SegmentRow
        tag="SEO"
        href="/for/seo"
        headline="Track what matters in 2026 — AI Overviews, LLM mentions, rank."
        bullets={[
          "Weekly rank digests from Ahrefs + GSC + Semrush",
          "AIO presence tracking across ChatGPT, Perplexity, Google AIO",
          "Technical audit alerts before Google notices",
        ]}
        viz={<SeoViz />}
      />
      <SegmentRow
        tag="Full-service"
        href="/for/full-service"
        headline="Hold your margin as you scale across ad ops, SEO, and content."
        bullets={[
          "Unified reporting across ad, organic, and content",
          "Utilization alerts before scope creep eats margin",
          "Cross-channel attribution your clients actually believe",
        ]}
        viz={<FullServiceViz />}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Row shell                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function SegmentRow({
  tag,
  href,
  headline,
  bullets,
  viz,
}: {
  tag: string;
  href: string;
  headline: string;
  bullets: string[];
  viz: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group grid lg:grid-cols-[1fr_1.05fr] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] transition-colors duration-[var(--duration-base)]"
    >
      {/* Brand copy */}
      <div className="p-8 md:p-10 lg:p-12 flex flex-col">
        <p className="font-mono text-caption text-[var(--color-primary)] tracking-[0.18em]">
          {tag}
        </p>
        <h3 className="mt-4 font-serif text-h3 leading-[1.15] tracking-[-0.015em] text-[var(--color-fg)] text-balance">
          {headline}
        </h3>
        <ul className="mt-5 space-y-2 flex-1">
          {bullets.map((b) => (
            <li
              key={b}
              className="grid grid-cols-[12px_1fr] gap-2 text-body-sm leading-[1.55] text-[var(--color-fg-muted)]"
            >
              <span className="text-[var(--color-fg-faint)] mt-1">—</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-7 inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] transition-colors">
          See AIOS for {tag.toLowerCase()}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </p>
      </div>

      {/* Mini-viz panel */}
      <div className="border-t lg:border-t-0 lg:border-l border-[var(--color-border)] p-5 md:p-6 lg:p-8 flex items-center justify-center bg-[var(--color-surface)]">
        <div className="w-full max-w-[420px]">{viz}</div>
      </div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Paid Media · morning pacing alert                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function PaidMediaViz() {
  return (
    <div
      data-theme="dark"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden shadow-[0_20px_50px_-25px_rgba(15,23,42,0.4)]"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <div className="inline-flex items-center gap-1.5">
          <AlertTriangle className="size-3 text-[var(--color-warn)]" />
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-warn)]">
            Pacing alert · MER
          </p>
        </div>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)] tabular-nums">
          06:14
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
            Aurora Beauty · Meta camp #3
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-px bg-[var(--color-border)] rounded-md overflow-hidden border border-[var(--color-border)]">
            <div className="bg-[var(--color-surface)] px-3 py-2">
              <p className="text-[8px] font-mono uppercase text-[var(--color-fg-faint)]">
                Yesterday
              </p>
              <p className="font-mono text-h4 font-medium tabular-nums text-[var(--color-fg)]">
                5.2
              </p>
            </div>
            <div className="bg-[var(--color-surface)] px-3 py-2">
              <p className="text-[8px] font-mono uppercase text-[var(--color-fg-faint)]">
                Today
              </p>
              <div className="flex items-baseline gap-1">
                <p className="font-mono text-h4 font-medium tabular-nums text-[var(--color-fg)]">
                  3.4
                </p>
                <span className="text-[9px] font-mono text-[var(--color-danger)]">
                  ▼ 34%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
            Budget · last 24h
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-warn)]"
              style={{ width: "160%" }}
            />
          </div>
          <p className="mt-1 text-[10px] font-mono text-[var(--color-fg-muted)] tabular-nums">
            $4,800 spent · $3,000 pacing target · over by $1,800
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
            Auto-queued
          </p>
          <p className="text-[11px] text-[var(--color-fg)]">
            <span className="text-[var(--color-success)]">✓</span> Pause Meta
            camp #3 · daily budget −60%
          </p>
          <p className="text-[11px] text-[var(--color-fg-muted)]">
            <span className="text-[var(--color-fg-faint)]">○</span> Slack
            #aurora-paid · awaiting review
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SEO · weekly rank tracker                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function SeoViz() {
  return (
    <div
      data-theme="dark"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden shadow-[0_20px_50px_-25px_rgba(15,23,42,0.4)]"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
          Rank changes · last 7d
        </p>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          Ahrefs · GSC · Semrush
        </p>
      </div>

      <div className="px-4 py-3">
        {/* Column header */}
        <div className="grid grid-cols-[1fr_38px_38px_28px] gap-2 pb-2 border-b border-[var(--color-border)]">
          <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
            Keyword
          </p>
          <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)] text-right">
            Rank
          </p>
          <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)] text-right">
            Δ 7d
          </p>
          <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)] text-center">
            AIO
          </p>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {SEO_ROWS.map((row) => (
            <li
              key={row.keyword}
              className="grid grid-cols-[1fr_38px_38px_28px] gap-2 items-center py-2"
            >
              <span className="font-mono text-[11px] text-[var(--color-fg)] truncate">
                {row.keyword}
              </span>
              <span className="font-mono text-[11px] text-[var(--color-fg)] tabular-nums text-right">
                #{row.rank}
              </span>
              <span
                className={
                  "font-mono text-[11px] tabular-nums text-right " +
                  (row.delta > 0
                    ? "text-[var(--color-success)]"
                    : row.delta < 0
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-fg-subtle)]")
                }
              >
                {row.delta > 0
                  ? `▲${row.delta}`
                  : row.delta < 0
                  ? `▼${Math.abs(row.delta)}`
                  : "▬"}
              </span>
              <span className="text-center">
                {row.aio ? (
                  <span className="font-mono text-[11px] text-[var(--color-primary)]">
                    ✓
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-[var(--color-fg-faint)]">
                    —
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 pt-2 border-t border-[var(--color-border)] text-[10px] font-mono text-[var(--color-fg-faint)]">
          AIO presence checked across ChatGPT · Perplexity · Google AIO
        </p>
      </div>
    </div>
  );
}

const SEO_ROWS: Array<{
  keyword: string;
  rank: number;
  delta: number;
  aio: boolean;
}> = [
  { keyword: "agency operating system", rank: 3, delta: 2, aio: true },
  { keyword: "agency automation", rank: 7, delta: 0, aio: false },
  { keyword: "ai for agencies", rank: 12, delta: -1, aio: true },
  { keyword: "client reporting tool", rank: 5, delta: 3, aio: true },
  { keyword: "agency ops audit", rank: 9, delta: 5, aio: false },
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Full-service · team utilization grid                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function FullServiceViz() {
  return (
    <div
      data-theme="dark"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden shadow-[0_20px_50px_-25px_rgba(15,23,42,0.4)]"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
          Team utilization · this week
        </p>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          14 people
        </p>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {UTILIZATION_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
              {group.label}
            </p>
            <ul className="mt-1 space-y-1">
              {group.members.map((m) => (
                <li
                  key={m.name}
                  className="grid grid-cols-[60px_1fr_44px] gap-2 items-center"
                >
                  <p className="font-mono text-[11px] text-[var(--color-fg)] truncate">
                    {m.name}
                  </p>
                  <div className="h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
                    <div
                      className={
                        "h-full " +
                        (m.pct >= 95
                          ? "bg-[var(--color-warn)]"
                          : "bg-[var(--color-primary)]")
                      }
                      style={{ width: `${Math.min(m.pct, 100)}%` }}
                    />
                  </div>
                  <p
                    className={
                      "font-mono text-[10px] tabular-nums text-right " +
                      (m.pct >= 95
                        ? "text-[var(--color-warn)]"
                        : "text-[var(--color-fg-muted)]")
                    }
                  >
                    {m.pct}%
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="pt-2 border-t border-[var(--color-border)] text-[10px] font-mono text-[var(--color-warn)]">
          ⚠ Sam at 96% · scope-creep risk on Aurora retainer
        </p>
      </div>
    </div>
  );
}

const UTILIZATION_GROUPS: Array<{
  label: string;
  members: Array<{ name: string; pct: number }>;
}> = [
  {
    label: "Ops",
    members: [{ name: "Lily", pct: 82 }],
  },
  {
    label: "Delivery",
    members: [
      { name: "Sam", pct: 96 },
      { name: "Chris", pct: 88 },
      { name: "Maya", pct: 74 },
    ],
  },
  {
    label: "Leadership",
    members: [{ name: "Dom", pct: 52 }],
  },
];
