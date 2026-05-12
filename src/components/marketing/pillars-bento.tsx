import * as React from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

/**
 * The four AIOS pillars laid out as a bento grid with per-cell
 * product visualizations. Replaces the previous "Four cards" grid.
 *
 * Desktop grid (12 cols × 2 rows):
 *   OBSERVE (col 1-8, row 1) | BRAIN (col 9-12, row 1-2)
 *   OPERATE (col 1-4, row 2) | GUARD (col 5-8, row 2)
 *
 * Each cell mixes brand text (label, headline, body) with a small
 * embedded dark "screen" that hints at what the pillar looks like
 * inside the actual product.
 */
export function PillarsBento() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5">
      {/* OBSERVE — wide, with KPI grid + sparkline */}
      <Cell className="lg:col-span-8 lg:row-span-1">
        <ObserveCard />
      </Cell>

      {/* BRAIN — tall, with chat fragment */}
      <Cell className="lg:col-span-4 lg:row-span-2">
        <BrainCard />
      </Cell>

      {/* OPERATE — medium, with workflow rows */}
      <Cell className="lg:col-span-4 lg:row-span-1">
        <OperateCard />
      </Cell>

      {/* GUARD — medium, with alert toast */}
      <Cell className="lg:col-span-4 lg:row-span-1">
        <GuardCard />
      </Cell>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Cell shell                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] transition-colors duration-[var(--duration-base)] hover:border-[var(--color-border-strong)] " +
        className
      }
    >
      {children}
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  OBSERVE — text left, mini dashboard right                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function ObserveCard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] h-full">
      <div className="p-8 md:p-10 flex flex-col justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-primary)]">
            OBSERVE
          </p>
          <h3 className="mt-4 font-serif text-h3 leading-[1.12] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
            Every tool, one screen.
          </h3>
          <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
            Revenue, ad spend, leads, deliverables, workflow status, hours
            reclaimed — every tool you already pay for, surfaced in one
            dashboard. Your agency at a glance, every morning.
          </p>
        </div>
      </div>

      <ObserveViz />
    </div>
  );
}

/**
 * Quiet right-side panel for OBSERVE. Lists the agency's connected tools
 * with a live dot each — directly proves "every tool" without previewing
 * the dashboard (that gets the full reveal further down the page).
 */
function ObserveViz() {
  return (
    <div
      data-theme="dark"
      className="relative bg-[var(--color-surface)] border-t lg:border-t-0 lg:border-l border-[var(--color-border)] p-6 lg:p-8 flex flex-col justify-center"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
        Connected · live
      </p>
      <ul className="mt-3 divide-y divide-[var(--color-border)]">
        {OBSERVE_SOURCES.map((s) => (
          <li
            key={s}
            className="flex items-center justify-between py-2"
          >
            <span className="font-mono text-[11px] text-[var(--color-fg)]">
              {s}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-success)]">
              <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
              live
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
        6 tools · 1 screen
      </p>
    </div>
  );
}

const OBSERVE_SOURCES = [
  "Stripe",
  "HubSpot",
  "Slack",
  "Meta Ads",
  "Google Ads",
  "n8n",
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  BRAIN — tall, text top, chat fragment bottom                               */
/* ────────────────────────────────────────────────────────────────────────── */

function BrainCard() {
  return (
    <div className="flex h-full flex-col">
      <div className="p-8 md:p-10">
        <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-primary)]">
          BRAIN
        </p>
        <h3 className="mt-4 font-serif text-h3 leading-[1.12] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
          The AI that knows your business.
        </h3>
        <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
          An LLM lives inside your dashboard and answers questions in plain
          English. Your data, your history, your patterns. Gets sharper every
          week the system runs.
        </p>
      </div>

      <BrainViz />
    </div>
  );
}

function BrainViz() {
  return (
    <div
      data-theme="dark"
      className="mt-auto bg-[var(--color-surface)] border-t border-[var(--color-border)] p-6 lg:p-7 flex-1 flex flex-col justify-end"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-[var(--color-primary)]" />
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
          BRAIN · ask anything
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--color-fg-faint)]">
            you
          </p>
          <p className="mt-1 font-mono text-[12px] text-[var(--color-fg-muted)]">
            ↳ Which client lost the most margin this month?
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--color-fg-faint)]">
            BRAIN
          </p>
          <p className="mt-1 text-body-sm text-[var(--color-fg)] leading-[1.55]">
            <span className="text-[var(--color-primary)]">Aurora Beauty</span>{" "}
            — MER dropped from{" "}
            <span className="font-mono">5.2</span> to{" "}
            <span className="font-mono">3.4</span> after the Meta budget bump
            on the 14th. Retainer margin landed at{" "}
            <span className="font-mono">38%</span>, down from{" "}
            <span className="font-mono">51%</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  OPERATE — medium, text top, workflow rows bottom                           */
/* ────────────────────────────────────────────────────────────────────────── */

function OperateCard() {
  return (
    <div className="flex h-full flex-col">
      <div className="p-8 md:p-9">
        <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-primary)]">
          OPERATE
        </p>
        <h3 className="mt-4 font-serif text-h3 leading-[1.12] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
          The engine running your agency.
        </h3>
        <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
          Reporting, onboarding, lead routing, follow-ups, invoicing — running
          quietly on your accounts, under your control.
        </p>
      </div>
      <OperateViz />
    </div>
  );
}

function OperateViz() {
  return (
    <div
      data-theme="dark"
      className="mt-auto bg-[var(--color-surface)] border-t border-[var(--color-border)]"
    >
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--color-border)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
          Workflows
        </p>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          12 running
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {OPERATE_ROWS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[1fr_auto_auto] gap-3 px-6 py-2 items-center"
          >
            <p className="font-mono text-[11px] text-[var(--color-fg)] truncate">
              {r.name}
            </p>
            <p className="font-mono text-[10px] text-[var(--color-fg-faint)] tabular-nums">
              {r.runs}r
            </p>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
              <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
                {r.last}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const OPERATE_ROWS = [
  { name: "invoice-reminders", runs: "412", last: "2m" },
  { name: "lead-router-v2", runs: "87", last: "14m" },
  { name: "onboarding-emails", runs: "54", last: "4m" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  GUARD — medium, text top, alert toast bottom                               */
/* ────────────────────────────────────────────────────────────────────────── */

function GuardCard() {
  return (
    <div className="flex h-full flex-col">
      <div className="p-8 md:p-9">
        <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-primary)]">
          GUARD
        </p>
        <h3 className="mt-4 font-serif text-h3 leading-[1.12] tracking-[-0.02em] text-[var(--color-fg)] text-balance">
          Watching while you sleep.
        </h3>
        <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-muted)] max-w-prose">
          Silent failures caught before they cost you. An ad platform breaks
          something at 3 a.m.; GUARD knows by 3:01.
        </p>
      </div>
      <GuardViz />
    </div>
  );
}

function GuardViz() {
  return (
    <div
      data-theme="dark"
      className="mt-auto bg-[var(--color-surface)] border-t border-[var(--color-border)] p-6 flex flex-col gap-3"
    >
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-warn)]">
            <span className="size-1.5 rounded-full bg-[var(--color-warn)]" />
            Auto-patched
          </span>
          <span className="text-[10px] font-mono text-[var(--color-fg-faint)]">
            03:01
          </span>
        </div>
        <p className="mt-2 text-body-sm text-[var(--color-fg)] leading-[1.5]">
          Meta API spec changed — 14 workflows affected, fix pushed.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-fg-faint)]">
        <ShieldCheck className="size-3 text-[var(--color-success)]" />
        <span>Monday recap unaffected</span>
      </div>
    </div>
  );
}
