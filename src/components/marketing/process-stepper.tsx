"use client";

import * as React from "react";
import { ChevronRight, Phone, Sparkles } from "lucide-react";

/**
 * Sticky-scroll process stepper for the "How AIOS gets built" section.
 *
 * Desktop (lg+):
 *   - Left column pins to viewport (sticky)
 *   - Right column scrolls through 4 step blocks
 *   - As each step enters the active band, the pinned visualization crossfades
 *
 * Mobile / tablet:
 *   - Single column stack
 *   - Each step renders its own visualization inline above the text
 */
export function ProcessStepper() {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const refs = React.useRef<Array<HTMLLIElement | null>>([]);

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            top: e.boundingClientRect.top,
            idx: refs.current.indexOf(e.target as HTMLLIElement),
          }))
          .filter((x) => x.idx !== -1)
          .sort((a, b) => a.top - b.top);

        if (visible.length > 0) {
          setActiveIdx(visible[0].idx);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );

    refs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
      {/* Desktop: pinned visualization column */}
      <div className="hidden lg:block lg:sticky lg:top-32 lg:self-start">
        <VizFrame activeIdx={activeIdx} />
      </div>

      {/* Steps */}
      <ol className="space-y-14 lg:space-y-0">
        {STEPS.map((s, i) => (
          <li
            key={s.n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="lg:min-h-[72vh] lg:flex lg:flex-col lg:justify-center"
          >
            {/* Mobile: inline visualization for this specific step */}
            <div className="lg:hidden mb-6">
              <VizFrame activeIdx={i} />
            </div>

            <div>
              <p className="font-mono text-caption text-[var(--color-fg-subtle)] tracking-[0.08em]">
                — {s.n}
              </p>
              <p className="mt-2 text-label text-[var(--color-primary)]">
                {s.tag}
              </p>
              <h3 className="mt-3 font-serif text-h2 text-[var(--color-fg)] leading-[1.12] tracking-[-0.02em] text-balance">
                {s.title}
              </h3>
              <p className="mt-4 text-body-lg leading-[1.55] text-[var(--color-fg-muted)] max-w-2xl">
                {s.body}
              </p>
              <p className="mt-3 text-body-sm leading-[1.6] text-[var(--color-fg-subtle)] max-w-2xl italic">
                {s.side}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Steps fixture                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    tag: "Call",
    title: "We talk. No pitch.",
    body: "A 30-minute conversation. You explain how your agency runs. We listen and ask the questions only operators would ask. By the end of the call, both sides know if AIOS belongs at your agency.",
    side: "What you walk away with: a clear yes-or-no on fit. If we are not the right system for you, we say so on the call.",
  },
  {
    n: "02",
    tag: "Discovery",
    title: "We go deep on the business.",
    body: "If the call confirms a fit, we move into discovery — your tools, your clients, your team, your patterns, the workflows that live in someone's head. This is the part we will not skip. We do not build AIOS for agencies we do not understand.",
    side: "Format: structured forms, working sessions, and access to the tools you already pay for. Length: about a week of evaluation on our side.",
  },
  {
    n: "03",
    tag: "Blueprint",
    title: "A written plan for your AIOS.",
    body: "You receive a PDF that names what is actually happening to your operations today, why this matters now, what the system will do about it, what gets built first, and what the build will cost.",
    side: "What you walk away with: a buy-or-don't decision with full visibility. No surprises, no nine-page MSAs.",
  },
  {
    n: "04",
    tag: "Build",
    title: "Your AIOS goes live.",
    body: "OPERATE runs the manual work in the background. OBSERVE surfaces every tool in one dashboard. BRAIN learns your business. GUARD watches it overnight. We can run the platform for you, or hand it to your team.",
    side: "What stays with you: every workflow, every credential, every log — in your accounts, under your control, from day one.",
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Crossfading visualization frame                                            */
/* ────────────────────────────────────────────────────────────────────────── */

const VIZ = [CallViz, DiscoveryViz, BlueprintViz, BuildViz];

function VizFrame({ activeIdx }: { activeIdx: number }) {
  return (
    <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
      {VIZ.map((Viz, i) => {
        const visible = i === activeIdx;
        return (
          <div
            key={i}
            aria-hidden={!visible}
            className={
              "absolute inset-0 transition-opacity duration-500 " +
              (visible ? "opacity-100" : "opacity-0 pointer-events-none")
            }
          >
            <Viz />
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  01 · Call — internal "call prep" page (Notion-style working doc)           */
/* ────────────────────────────────────────────────────────────────────────── */

function CallViz() {
  return (
    <div
      data-theme="dark"
      className="absolute inset-0 bg-[var(--color-bg)] flex flex-col overflow-hidden"
    >
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[var(--color-border)] text-[10px] font-mono text-[var(--color-fg-faint)]">
        <span>Internal</span>
        <ChevronRight className="size-2.5" />
        <span>Calls</span>
        <ChevronRight className="size-2.5" />
        <span>May · 2026</span>
        <ChevronRight className="size-2.5" />
        <span className="text-[var(--color-fg-muted)]">Acme Agency</span>
      </div>

      <div className="flex-1 px-5 md:px-6 py-5 overflow-hidden flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-[var(--color-accent-800)] text-[var(--color-accent-200)]">
            <Phone className="size-3.5" />
          </span>
          <h4 className="font-serif text-h4 tracking-[-0.01em] text-[var(--color-fg)]">
            Call Prep · Acme Agency
          </h4>
        </div>

        {/* Properties row */}
        <div className="grid grid-cols-3 gap-3">
          <Property label="Date" value="Mon · 14 May · 14:00" />
          <Property label="Owner" value="Dom · founders" />
          <Property label="Status" value="Researched" tone="success" />
        </div>

        {/* Researched section */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
            Researched
          </p>
          <ul className="mt-2 space-y-1.5">
            {RESEARCH_ITEMS.map((item) => (
              <li
                key={item.text}
                className="grid grid-cols-[14px_1fr] gap-2 items-start"
              >
                <Checkbox checked={item.checked} />
                <span
                  className={
                    "text-[11.5px] leading-[1.45] " +
                    (item.checked
                      ? "text-[var(--color-fg)]"
                      : "text-[var(--color-fg-subtle)]")
                  }
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Questions section */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
            Operator questions
          </p>
          <ol className="mt-2 space-y-2">
            {OPERATOR_QUESTIONS.map((q, i) => (
              <li
                key={q}
                className="grid grid-cols-[16px_1fr] gap-2 items-start"
              >
                <span className="font-mono text-[10px] text-[var(--color-fg-faint)] tabular-nums pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-serif text-[13px] leading-[1.35] tracking-[-0.005em] text-[var(--color-fg)]">
                  {q}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Footer meta */}
      <div className="px-5 py-2.5 border-t border-[var(--color-border)] flex items-center justify-between">
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          Last edited 11 min ago · Dom
        </p>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          /call-prep/acme
        </p>
      </div>
    </div>
  );
}

function Property({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
        {label}
      </p>
      {tone === "success" ? (
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-success)]/15 px-2 py-0.5 text-[11px] text-[var(--color-success)]">
          <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
          {value}
        </span>
      ) : (
        <p className="mt-1 text-[11px] text-[var(--color-fg)] truncate">
          {value}
        </p>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={
        "mt-[2px] inline-flex size-3.5 items-center justify-center rounded-[3px] border transition-colors " +
        (checked
          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
          : "bg-transparent border-[var(--color-border-strong)]")
      }
      aria-hidden="true"
    >
      {checked && (
        <svg viewBox="0 0 10 10" className="size-2.5" fill="none">
          <path
            d="M1.8 5.3 L3.8 7.3 L8 2.7"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

const RESEARCH_ITEMS: Array<{ text: string; checked: boolean }> = [
  { text: "Team: 14 people · 4 ops · 6 delivery · 4 leadership", checked: true },
  { text: "Clients: 38 retainer · 12 project · paid-media-heavy", checked: true },
  { text: "Stack: HubSpot · Stripe · Slack · Meta · Google · Notion", checked: true },
  { text: "Signal: hired 2nd ops in Q1 (LinkedIn)", checked: true },
  { text: "Open: monthly reporting volume / cadence", checked: false },
];

const OPERATOR_QUESTIONS = [
  "Where does the work live in someone's head?",
  "Which workflow, if it never failed, would change your week?",
  "What's your ops-to-delivery ratio today?",
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  02 · Discovery — structured form                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function DiscoveryViz() {
  return (
    <div
      data-theme="dark"
      className="absolute inset-0 bg-[var(--color-surface)] p-6 md:p-7 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <p className="text-label text-[var(--color-fg-subtle)]">Discovery</p>
        <p className="text-caption font-mono text-[var(--color-fg-faint)]">
          Acme Agency · v1
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {DISCOVERY_FIELDS.map((f) => (
          <div key={f.label}>
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
              {f.label}
            </p>
            <div className="mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
              <p className="text-body-sm text-[var(--color-fg)] truncate">
                {f.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISCOVERY_FIELDS = [
  { label: "Tools you use", value: "HubSpot · Stripe · Slack · Meta · Google" },
  { label: "Team size", value: "14 people · 4 ops, 6 delivery, 4 leadership" },
  { label: "Top friction", value: "Monthly client reporting takes 3 days" },
  { label: "Active clients", value: "38 retainer · 12 project" },
  { label: "Goal · Q3", value: "Reclaim 40 hours/week from reporting" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  03 · Blueprint — exec-summary cover page of the written plan PDF           */
/* ────────────────────────────────────────────────────────────────────────── */

function BlueprintViz() {
  return (
    <div
      data-theme="dark"
      className="absolute inset-0 bg-[var(--color-bg)] flex items-center justify-center p-3 md:p-4"
    >
      {/* Light PDF document over dark surface */}
      <div
        data-theme="light"
        className="relative w-full h-full max-w-[460px] flex flex-col overflow-hidden rounded-[2px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_25px_60px_-25px_rgba(2,6,23,0.7)]"
      >
        {/* Document header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--color-primary)]">
              AIOS Blueprint · v1.0
            </p>
            <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-subtle)] truncate">
              18 pages · confidential
            </p>
          </div>
          <h4 className="mt-3 font-serif text-h4 leading-tight tracking-[-0.01em] text-[var(--color-fg)]">
            For: Acme Agency
          </h4>
          <p className="mt-1 text-[10px] font-mono text-[var(--color-fg-subtle)]">
            Prepared by Dom · OpsRadar · 04 May 2026
          </p>
        </div>

        {/* Body — exec summary, all 4 sections of the plan */}
        <div className="flex-1 px-6 py-4 overflow-hidden">
          <BlueprintRow
            n="01"
            label="Diagnosis"
            body="Acme runs 38 retainer clients across 6 tools. Monthly reporting takes 3.2 FTE-days. The system that runs the agency lives in one person's memory."
          />
          <BlueprintRow
            n="02"
            label="System we'll build"
            list={[
              ["OPERATE", "recaps · routing · pacing alerts"],
              ["OBSERVE", "revenue · spend · pipeline · one screen"],
              ["BRAIN", "plain-English over your data"],
              ["GUARD", "catches ad-platform breaks"],
            ]}
          />
          <BlueprintRow
            n="03"
            label="Order of build"
            body="First: onboarding emails, monthly recap, pacing alerts. Then BRAIN over historical data. Then GUARD across Meta + Google."
          />
          <BlueprintRow
            n="04"
            label="Decision"
            body="Two-page summary at page 17 — buy or don't. No nine-page MSA."
            italic
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-[var(--color-border)] flex items-center justify-between">
          <p className="text-[9px] font-mono text-[var(--color-fg-faint)] truncate">
            opsradar.co/blueprint/acme.pdf
          </p>
          <p className="text-[9px] font-mono text-[var(--color-fg-faint)] tabular-nums">
            01 / 18
          </p>
        </div>
      </div>
    </div>
  );
}

function BlueprintRow({
  n,
  label,
  body,
  list,
  italic = false,
}: {
  n: string;
  label: string;
  body?: string;
  list?: Array<[string, string]>;
  italic?: boolean;
}) {
  return (
    <div className="mb-3 last:mb-0 grid grid-cols-[22px_1fr] gap-3">
      <p className="font-mono text-[10px] text-[var(--color-fg-faint)] tabular-nums pt-0.5">
        {n}
      </p>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-primary)]">
          {label}
        </p>
        {body && (
          <p
            className={
              "mt-1 font-serif text-[11.5px] leading-[1.5] text-[var(--color-fg)] tracking-[-0.005em] " +
              (italic ? "italic text-[var(--color-fg-muted)]" : "")
            }
          >
            {body}
          </p>
        )}
        {list && (
          <ul className="mt-1.5 space-y-0.5">
            {list.map(([k, v]) => (
              <li
                key={k}
                className="grid grid-cols-[68px_1fr] gap-2 text-[11px]"
              >
                <span className="font-mono text-[var(--color-fg)]">{k}</span>
                <span className="font-serif text-[var(--color-fg-muted)] leading-[1.4]">
                  {v}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  04 · Build — Business Overview dashboard (the daily-driver view)           */
/* ────────────────────────────────────────────────────────────────────────── */

function BuildViz() {
  return (
    <div
      data-theme="dark"
      className="absolute inset-0 bg-[var(--color-bg)] flex flex-col"
    >
      {/* Status header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-success)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          </span>
          <p className="text-label text-[var(--color-fg-subtle)]">
            Business overview
          </p>
        </div>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)] truncate">
          live · synced 14s ago
        </p>
      </div>

      {/* KPI grid 2×2 */}
      <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
        {BUILD_KPIS.map((k) => (
          <div key={k.label} className="bg-[var(--color-surface)] px-4 py-3">
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
                {k.label}
              </p>
              <span className="text-[8px] font-mono text-[var(--color-fg-faint)]">
                {k.source}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <p className="font-mono text-h4 font-medium tabular-nums text-[var(--color-fg)]">
                {k.value}
              </p>
              <p
                className={
                  k.kind === "up"
                    ? "text-[10px] font-mono text-[var(--color-success)]"
                    : "text-[10px] font-mono text-[var(--color-fg-subtle)]"
                }
              >
                {k.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* BRAIN ask box */}
      <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3 text-[var(--color-primary)]" />
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
            BRAIN · ask anything
          </p>
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-[var(--color-fg-muted)]">
          ↳ Which client lost the most margin this month?
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-fg)] leading-[1.45]">
          <span className="text-[var(--color-primary)]">Aurora Beauty</span> —
          MER <span className="font-mono">5.2</span> →{" "}
          <span className="font-mono">3.4</span> after the Meta budget bump.
        </p>
      </div>

      {/* OPERATE · workflows */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--color-border)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
          OPERATE · workflows
        </p>
        <p className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          12 running · 1 degraded
        </p>
      </div>
      <ul className="flex-1 divide-y divide-[var(--color-border)] overflow-hidden">
        {BUILD_ROWS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2 items-center"
          >
            <p className="font-mono text-[11px] text-[var(--color-fg)] truncate">
              {r.name}
            </p>
            <span className="flex items-center gap-1.5">
              <span
                className={
                  "size-1.5 rounded-full " +
                  (r.flag === "warn"
                    ? "bg-[var(--color-warn)]"
                    : "bg-[var(--color-success)]")
                }
              />
              <span
                className={
                  "font-mono text-[10px] " +
                  (r.flag === "warn"
                    ? "text-[var(--color-warn)]"
                    : "text-[var(--color-success)]")
                }
              >
                {r.status}
              </span>
            </span>
            <p className="font-mono text-[10px] text-[var(--color-fg-faint)] tabular-nums">
              {r.last}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BUILD_KPIS: Array<{
  label: string;
  source: string;
  value: string;
  trend: string;
  kind: "up" | "flat";
}> = [
  { label: "Revenue · 30d", source: "Stripe", value: "$240k", trend: "+12%", kind: "up" },
  { label: "Ad spend · 30d", source: "Meta+G", value: "$48k", trend: "MER 5.0", kind: "flat" },
  { label: "Leads · 7d", source: "HubSpot", value: "162", trend: "+24", kind: "up" },
  { label: "Hours · 30d", source: "OPERATE", value: "2,431", trend: "+18%", kind: "up" },
];

const BUILD_ROWS: Array<{
  name: string;
  status: string;
  last: string;
  flag: "success" | "warn";
}> = [
  { name: "invoice-reminders", status: "running", last: "2m", flag: "success" },
  { name: "lead-router-v2", status: "running", last: "14m", flag: "success" },
  { name: "slack-recap-daily", status: "degraded", last: "1h", flag: "warn" },
];
