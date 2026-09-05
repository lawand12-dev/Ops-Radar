"use client";

import * as React from "react";
import { Phone, Sparkles } from "lucide-react";

/**
 * Hero-right composition: four artifacts of the AI COO funnel cascading
 * diagonally — Call · Discovery · Blueprint · Dashboard. Each card is a
 * recognizable miniature of one step's deliverable. The dashboard sits
 * at the bottom-right, frontmost and most prominent — it's the
 * destination of the journey.
 *
 * Each card has a very subtle Y-float (different phase per card) so the
 * composition feels alive without being distracting.
 */
// Entrance choreography: each card cascades in with a staggered delay.
// Total opening sequence ~1.2s. After each card lands, its float starts.
const ENTRANCE_MS = 750;
const STAGGER_MS = 150;
const FLOAT_DURATION_MS = 5500;

export function FunnelPreview() {
  return (
    <div className="relative w-full h-[460px] sm:h-[500px] lg:h-[560px]">
      <style>{`
        @keyframes funnel-enter {
          0%   { opacity: 0; transform: translateY(48px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes funnel-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>

      {/* Ambient glow underneath the composition */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 rounded-[40px] opacity-50"
        style={{
          background:
            "radial-gradient(50% 60% at 60% 60%, var(--color-accent-300) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Card 1 · Call — top-left, smallest, furthest back */}
      <FloatCard
        rotation={-3}
        position="top-[0px] left-[0px] sm:left-[8px]"
        width="w-[210px] sm:w-[230px]"
        zIndex={10}
        entranceIdx={0}
      >
        <CallMini />
      </FloatCard>

      {/* Card 2 · Discovery — upper-right offset */}
      <FloatCard
        rotation={-1}
        position="top-[88px] left-[180px] sm:left-[200px] lg:left-[230px]"
        width="w-[220px] sm:w-[240px]"
        zIndex={20}
        entranceIdx={1}
      >
        <DiscoveryMini />
      </FloatCard>

      {/* Card 3 · Blueprint — back to left, lower */}
      <FloatCard
        rotation={2}
        position="top-[200px] left-[30px] sm:left-[60px] lg:left-[90px]"
        width="w-[230px] sm:w-[250px]"
        zIndex={30}
        entranceIdx={2}
      >
        <BlueprintMini />
      </FloatCard>

      {/* Card 4 · Dashboard — bottom-right, biggest, frontmost (the destination) */}
      <FloatCard
        rotation={0}
        position="top-[300px] left-[160px] sm:left-[200px] lg:left-[240px]"
        width="w-[260px] sm:w-[290px]"
        zIndex={40}
        entranceIdx={3}
        prominent
      >
        <DashboardMini />
      </FloatCard>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Card shell                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function FloatCard({
  rotation,
  position,
  width,
  zIndex,
  entranceIdx,
  prominent = false,
  children,
}: {
  rotation: number;
  position: string;
  width: string;
  zIndex: number;
  entranceIdx: number;
  prominent?: boolean;
  children: React.ReactNode;
}) {
  const entranceDelay = 100 + entranceIdx * STAGGER_MS;
  // Float starts after this card's entrance has fully landed, with a tiny
  // pause + per-card phase offset so the four cards don't all bob in sync.
  const floatDelay = entranceDelay + ENTRANCE_MS + entranceIdx * 200;

  return (
    <div
      className={`absolute ${position} ${width}`}
      style={{ transform: `rotate(${rotation}deg)`, zIndex }}
    >
      {/* Entrance layer — runs once on mount, lands the card from below */}
      <div
        style={{
          animation: `funnel-enter ${ENTRANCE_MS}ms cubic-bezier(0.22,0.8,0.22,1) ${entranceDelay}ms both`,
        }}
      >
        {/* Float layer — gentle perpetual hover after entrance completes */}
        <div
          style={{
            animation: `funnel-float ${FLOAT_DURATION_MS}ms ease-in-out infinite`,
            animationDelay: `${floatDelay}ms`,
          }}
          className={
            "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] " +
            (prominent
              ? "shadow-[0_40px_80px_-30px_rgba(15,23,42,0.45),0_15px_30px_-15px_rgba(79,70,229,0.35)]"
              : "shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35),0_8px_16px_-8px_rgba(79,70,229,0.20)]")
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  01 · Call mini — Notion-style call-prep card                               */
/* ────────────────────────────────────────────────────────────────────────── */

function CallMini() {
  return (
    <div data-theme="dark" className="bg-[var(--color-bg)]">
      <div className="px-3.5 py-2 border-b border-[var(--color-border)] flex items-center gap-1.5">
        <Phone className="size-2.5 text-[var(--color-accent-300)]" />
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          Call Prep · Acme
        </span>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-[8px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
          Researched
        </p>
        <ul className="mt-1.5 space-y-1">
          {CALL_ITEMS.map((t) => (
            <li key={t} className="grid grid-cols-[10px_1fr] gap-1.5 items-start">
              <span className="mt-[3px] inline-flex size-2.5 items-center justify-center rounded-[2px] bg-[var(--color-primary)]">
                <svg viewBox="0 0 8 8" className="size-1.5" fill="none">
                  <path
                    d="M1.5 4 L3 5.5 L6.5 2"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[10px] text-[var(--color-fg)] leading-[1.3]">
                {t}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const CALL_ITEMS = [
  "Team: 14 · 4 ops · 6 delivery",
  "Stack: HubSpot · Stripe · Meta",
  "Signal: hired 2nd ops in Q1",
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  02 · Discovery mini — filled form                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function DiscoveryMini() {
  return (
    <div data-theme="dark" className="bg-[var(--color-surface)]">
      <div className="px-3.5 py-2 border-b border-[var(--color-border)]">
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          Discovery · Acme · v1
        </span>
      </div>
      <div className="px-3.5 py-3 space-y-2">
        {DISCOVERY_FIELDS_MINI.map(([label, value]) => (
          <div key={label}>
            <p className="text-[8px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
              {label}
            </p>
            <div className="mt-0.5 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1">
              <p className="text-[10px] text-[var(--color-fg)] truncate">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISCOVERY_FIELDS_MINI: Array<[string, string]> = [
  ["Tools you use", "HubSpot · Stripe · Slack · Meta"],
  ["Team size", "14 people"],
  ["Top friction", "Reporting takes 3 days"],
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  03 · Blueprint mini — light PDF cover                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function BlueprintMini() {
  return (
    <div data-theme="light" className="bg-[var(--color-surface)]">
      <div className="px-3.5 py-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--color-primary)] truncate">
          AI COO Blueprint · v1.0
        </span>
        <span className="text-[8px] font-mono text-[var(--color-fg-faint)] whitespace-nowrap">
          18 pp
        </span>
      </div>
      <div className="px-3.5 py-3">
        <p className="font-serif text-[13px] tracking-[-0.01em] text-[var(--color-fg)] leading-tight">
          For: Acme Agency
        </p>
        <p className="mt-0.5 text-[8px] font-mono text-[var(--color-fg-subtle)]">
          Prepared by Dom · 04 May
        </p>
        <ul className="mt-2.5 space-y-1">
          {BLUEPRINT_TOC_MINI.map((s, i) => (
            <li
              key={s}
              className="grid grid-cols-[14px_1fr] gap-1.5 text-[10px] items-baseline"
            >
              <span className="font-mono text-[var(--color-fg-faint)] tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[var(--color-fg)] truncate">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const BLUEPRINT_TOC_MINI = [
  "Diagnosis",
  "System we'll build",
  "Order of build",
  "Decision",
];

/* ────────────────────────────────────────────────────────────────────────── */
/*  04 · Dashboard mini — KPI grid + BRAIN excerpt (the destination)           */
/* ────────────────────────────────────────────────────────────────────────── */

function DashboardMini() {
  return (
    <div data-theme="dark" className="bg-[var(--color-bg)]">
      {/* Status header */}
      <div className="px-3.5 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-1 w-1 rounded-full bg-[var(--color-success)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-1 w-1 rounded-full bg-[var(--color-success)]" />
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
            Business overview · live
          </span>
        </div>
      </div>

      {/* KPI grid 2×2 */}
      <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
        {DASHBOARD_KPIS_MINI.map((k) => (
          <div key={k.label} className="bg-[var(--color-surface)] px-3 py-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-[8px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
                {k.label}
              </p>
              <span className="text-[7px] font-mono text-[var(--color-fg-faint)]">
                {k.source}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <p className="font-mono text-[12px] font-medium tabular-nums text-[var(--color-fg)]">
                {k.value}
              </p>
              <p
                className={
                  k.kind === "up"
                    ? "text-[8px] font-mono text-[var(--color-success)]"
                    : "text-[8px] font-mono text-[var(--color-fg-subtle)]"
                }
              >
                {k.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* BRAIN excerpt */}
      <div className="px-3.5 py-2.5 bg-[var(--color-surface-sunken)]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-2.5 text-[var(--color-primary)]" />
          <span className="text-[8px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
            BRAIN
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-[var(--color-fg-muted)] truncate">
          ↳ Which client lost margin this month?
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--color-fg)] leading-[1.4]">
          <span className="text-[var(--color-primary)]">Aurora</span> — MER{" "}
          <span className="font-mono">5.2</span> →{" "}
          <span className="font-mono">3.4</span>
        </p>
      </div>
    </div>
  );
}

const DASHBOARD_KPIS_MINI: Array<{
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
