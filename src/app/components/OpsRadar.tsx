'use client';

import { useState } from 'react';

type Blip = {
  id: string;
  angle: number;      // 0 = top, clockwise
  distance: number;   // 0-1, fraction of radius
  label: string;
  detail: string;
  category: string;
};

const BLIPS: Blip[] = [
  {
    id: 'reporting',
    angle: 18,
    distance: 0.78,
    label: 'Manual reporting',
    detail: '14\u201320 hours/week stitching Meta, Google, and Klaviyo into client PDFs. Every single week.',
    category: 'Reporting',
  },
  {
    id: 'zapier',
    angle: 62,
    distance: 0.52,
    label: 'Zapier overrun',
    detail: '$500\u2013$2,000/mo once you scale past 10 clients. Per-task pricing doesn\u2019t.',
    category: 'Cost',
  },
  {
    id: 'onboarding',
    angle: 118,
    distance: 0.82,
    label: 'Onboarding drag',
    detail: 'BM access \u2192 first report typically takes 3 weeks. Should take 5 days.',
    category: 'Onboarding',
  },
  {
    id: 'leads',
    angle: 168,
    distance: 0.45,
    label: 'Lead scatter',
    detail: '4+ inboxes nobody reconciles: website form, DMs, email, platform ad forms.',
    category: 'Leads',
  },
  {
    id: 'mer',
    angle: 212,
    distance: 0.68,
    label: 'MER drift',
    detail: 'Last-click ROAS lies. MER tells the real story \u2014 if you track it.',
    category: 'Attribution',
  },
  {
    id: 'creative',
    angle: 258,
    distance: 0.38,
    label: 'Creative untagged',
    detail: 'Cross-platform creative performance with no hook, format, or offer tags.',
    category: 'Reporting',
  },
  {
    id: 'handoffs',
    angle: 302,
    distance: 0.72,
    label: 'Handoff failures',
    detail: 'AM \u2192 Strategist \u2192 Builder with data re-entered at every step.',
    category: 'Ops',
  },
  {
    id: 'hiring',
    angle: 340,
    distance: 0.52,
    label: 'Ops coordinator math',
    detail: 'Hire one at $5.5K/mo \u2014 or automate the role for $400/mo.',
    category: 'Cost',
  },
];

const ROTATION_S = 6;      // full radar sweep in seconds
const SIZE = 480;          // SVG viewBox size
const RADIUS = SIZE / 2;

function polarToCartesian(angleDeg: number, distance: number): { x: number; y: number } {
  // angle: 0 = top (12 o'clock), clockwise
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: RADIUS + RADIUS * distance * Math.cos(rad),
    y: RADIUS + RADIUS * distance * Math.sin(rad),
  };
}

const RADAR_CSS = `
@keyframes opsradar-sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes opsradar-blip-ping {
  0% { opacity: 1; }
  18% { opacity: 0.22; }
  100% { opacity: 0.22; }
}
@keyframes opsradar-halo-ping {
  0% { opacity: 0.55; r: 6; }
  18% { opacity: 0; r: 18; }
  100% { opacity: 0; r: 18; }
}
@keyframes opsradar-center-pulse {
  0% { r: 4; opacity: 0.5; }
  100% { r: 22; opacity: 0; }
}
@keyframes opsradar-panel-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.opsradar-sweep {
  animation: opsradar-sweep ${ROTATION_S}s linear infinite;
  transform-origin: ${RADIUS}px ${RADIUS}px;
}
.opsradar-blip-dot {
  animation: opsradar-blip-ping ${ROTATION_S}s linear infinite;
}
.opsradar-blip-halo {
  animation: opsradar-halo-ping ${ROTATION_S}s linear infinite;
}
.opsradar-center-halo {
  animation: opsradar-center-pulse 2.2s ease-out infinite;
}
.opsradar-panel {
  animation: opsradar-panel-in 0.25s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .opsradar-sweep { display: none; }
  .opsradar-blip-dot,
  .opsradar-blip-halo,
  .opsradar-center-halo {
    animation: none;
  }
  .opsradar-blip-dot { opacity: 0.85; }
  .opsradar-blip-halo { opacity: 0; }
}
`;

export default function OpsRadar() {
  const [activeBlipId, setActiveBlipId] = useState<string | null>(null);
  const activeBlip = BLIPS.find((b) => b.id === activeBlipId);

  return (
    <section className="relative px-6 py-24 sm:py-32">
      <style dangerouslySetInnerHTML={{ __html: RADAR_CSS }} />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400/70 mb-4">
            What&apos;s on your radar
          </p>
          <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white mb-5 leading-[1.08]">
            The ops debt hiding in every marketing agency.
          </h2>
          <p className="text-base md:text-lg text-white/[0.65] leading-relaxed">
            Patterns I see across the agencies I audit. Click any blip to see what it costs.
          </p>
        </div>

        {/* Radar + side panel */}
        <div className="grid md:grid-cols-[1fr_340px] gap-10 md:gap-16 items-center">
          <div className="relative aspect-square max-w-[480px] mx-auto w-full">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="w-full h-full"
              role="img"
              aria-label="Ops radar visualization of 8 common operational pain points for marketing agencies"
            >
              <defs>
                <radialGradient id="opsradar-bg">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.10)" />
                  <stop offset="70%" stopColor="rgba(6, 182, 212, 0.02)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                </radialGradient>
                <linearGradient id="opsradar-sweep-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
                  <stop offset="70%" stopColor="rgba(6, 182, 212, 0.18)" />
                  <stop offset="100%" stopColor="rgba(34, 211, 238, 0.6)" />
                </linearGradient>
              </defs>

              {/* Background glow */}
              <circle cx={RADIUS} cy={RADIUS} r={RADIUS - 1} fill="url(#opsradar-bg)" />

              {/* Concentric rings */}
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <circle
                  key={scale}
                  cx={RADIUS}
                  cy={RADIUS}
                  r={RADIUS * scale - 1}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.13)"
                  strokeWidth="1"
                />
              ))}

              {/* Crosshair lines */}
              <line x1={RADIUS} y1="2" x2={RADIUS} y2={SIZE - 2} stroke="rgba(6, 182, 212, 0.08)" strokeWidth="1" />
              <line x1="2" y1={RADIUS} x2={SIZE - 2} y2={RADIUS} stroke="rgba(6, 182, 212, 0.08)" strokeWidth="1" />

              {/* Rotating sweep beam */}
              <g className="opsradar-sweep">
                {/* Cone (60 degree arc trailing behind leading edge) */}
                <polygon
                  points={`${RADIUS},${RADIUS} ${SIZE},${RADIUS} ${RADIUS + RADIUS * 0.866},${RADIUS - RADIUS * 0.5}`}
                  fill="url(#opsradar-sweep-gradient)"
                  opacity="0.75"
                />
                {/* Leading edge bright line */}
                <line
                  x1={RADIUS}
                  y1={RADIUS}
                  x2={SIZE - 2}
                  y2={RADIUS}
                  stroke="rgba(34, 211, 238, 0.75)"
                  strokeWidth="1.5"
                />
              </g>

              {/* Center pulse (matches logo motion) */}
              <circle cx={RADIUS} cy={RADIUS} r="4" fill="none" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="1.2" className="opsradar-center-halo" />
              <circle cx={RADIUS} cy={RADIUS} r="3.5" fill="rgb(34, 211, 238)" />

              {/* Blips */}
              {BLIPS.map((blip) => {
                const pos = polarToCartesian(blip.angle, blip.distance);
                const delay = -(blip.angle / 360) * ROTATION_S;
                const isActive = activeBlipId === blip.id;

                return (
                  <g key={blip.id}>
                    {/* Halo (synced pulse with sweep arrival) */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="6"
                      fill="rgba(34, 211, 238, 0.35)"
                      className="opsradar-blip-halo"
                      style={{ animationDelay: `${delay}s` }}
                    />
                    {/* Active outer ring (only when selected) */}
                    {isActive && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="14"
                        fill="none"
                        stroke="rgba(34, 211, 238, 0.6)"
                        strokeWidth="1"
                      />
                    )}
                    {/* Core dot */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isActive ? 6 : 4.5}
                      fill={isActive ? 'rgb(34, 211, 238)' : 'rgb(6, 182, 212)'}
                      stroke={isActive ? 'rgba(255, 255, 255, 0.9)' : 'none'}
                      strokeWidth={isActive ? 1.5 : 0}
                      className={isActive ? '' : 'opsradar-blip-dot'}
                      style={isActive ? undefined : { animationDelay: `${delay}s` }}
                    />
                    {/* Invisible hit target */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="22"
                      fill="transparent"
                      className="cursor-pointer focus:outline-none"
                      onClick={() => setActiveBlipId(isActive ? null : blip.id)}
                      onMouseEnter={() => setActiveBlipId(blip.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${blip.label}: ${blip.detail}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveBlipId(isActive ? null : blip.id);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Side panel */}
          <div className="min-h-[220px]">
            {activeBlip ? (
              <div
                key={activeBlip.id}
                className="opsradar-panel rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-6 backdrop-blur-xl"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-400/70 mb-3">
                  {activeBlip.category}
                </p>
                <h3 className="font-headline text-xl md:text-2xl font-bold text-white mb-3 tracking-[-0.01em]">
                  {activeBlip.label}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/[0.75] mb-5">
                  {activeBlip.detail}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveBlipId(null)}
                  className="text-[11px] uppercase tracking-[0.2em] text-white/40 hover:text-white/70 transition-colors"
                >
                  {'\u2190 Clear'}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40 mb-3">
                  Hover any blip
                </p>
                <h3 className="font-headline text-xl md:text-2xl font-bold text-white/90 mb-3 tracking-[-0.01em]">
                  {BLIPS.length} patterns. One playbook.
                </h3>
                <p className="text-[15px] leading-relaxed text-white/[0.6]">
                  Every agency I audit has some version of these. Most have four or more at once. Each one has a specific workflow that ends it.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile list (radar is tap-only on mobile, this gives them a list view) */}
        <div className="md:hidden mt-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 mb-4">
            All patterns
          </p>
          <ul className="space-y-2">
            {BLIPS.map((blip) => {
              const isActive = activeBlipId === blip.id;
              return (
                <li key={blip.id}>
                  <button
                    type="button"
                    onClick={() => setActiveBlipId(isActive ? null : blip.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-cyan-400/30 bg-cyan-400/[0.04]'
                        : 'border-white/[0.06] hover:border-cyan-400/20'
                    }`}
                  >
                    <span className="text-sm font-semibold text-white/85">{blip.label}</span>
                    <span className="block text-[11px] uppercase tracking-[0.18em] text-cyan-400/60 mt-0.5">
                      {blip.category}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
