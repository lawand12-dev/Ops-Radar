'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'

type Position = {
  left: string
  top: string
}

type SystemNode = Position & {
  id: string
  label: string
  subtitle: string
  detail: string
  tag: string
  metric: string
  color: string
  glow: string
  icon: React.ReactNode
  delay: number
}

type Connector = {
  id: string
  path: string
  pulses: Position[]
  color: string
  delay: number
}

type TelemetryRow = {
  label: string
  value: string
}

function LeadIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="6.2" r="3.1" stroke={color} strokeWidth="1.5" />
      <path
        d="M4.5 16.2c1.2-2.7 3.1-4 5.5-4s4.3 1.3 5.5 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15.8 4.5h2.7M17.15 3.15v2.7"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AIIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="4" width="12" height="12" rx="3" stroke={color} strokeWidth="1.5" />
      <path d="M7.25 10h5.5M10 7.25v5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.9" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

function CRMIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="4.2" width="12" height="11.6" rx="2.4" stroke={color} strokeWidth="1.5" />
      <path d="M7 8h6M7 11h4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13.9 4.2v11.6" stroke={color} strokeWidth="1.2" strokeOpacity="0.45" />
    </svg>
  )
}

const DESKTOP_NODES: SystemNode[] = [
  {
    id: 'lead',
    label: 'Lead Intake',
    subtitle: 'Inbound trigger',
    detail: 'Meta form + landing page payload received',
    tag: 'Trigger',
    metric: '842ms ingest',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.22)',
    icon: <LeadIcon color="#93c5fd" />,
    left: '17%',
    top: '58%',
    delay: 0.12,
  },
  {
    id: 'ai',
    label: 'AI Router',
    subtitle: 'Intent + fit scoring',
    detail: 'Summarizes demand, priority, and routing owner',
    tag: 'Inference',
    metric: 'ICP 92 / 100',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
    icon: <AIIcon color="#6ee7b7" />,
    left: '50%',
    top: '38%',
    delay: 0.68,
  },
  {
    id: 'crm',
    label: 'CRM Sync',
    subtitle: 'Pipeline writeback',
    detail: 'Creates record, updates stage, and attaches summary',
    tag: 'Writeback',
    metric: '2.1s total',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.24)',
    icon: <CRMIcon color="#67e8f9" />,
    left: '83%',
    top: '58%',
    delay: 1.26,
  },
]

const MOBILE_NODES: SystemNode[] = [
  {
    id: 'lead',
    label: 'Lead Intake',
    subtitle: 'Inbound trigger',
    detail: 'Meta form + landing page payload received',
    tag: 'Trigger',
    metric: '842ms ingest',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.22)',
    icon: <LeadIcon color="#93c5fd" />,
    left: '50%',
    top: '20%',
    delay: 0.12,
  },
  {
    id: 'ai',
    label: 'AI Router',
    subtitle: 'Intent + fit scoring',
    detail: 'Summarizes demand, priority, and routing owner',
    tag: 'Inference',
    metric: 'ICP 92 / 100',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
    icon: <AIIcon color="#6ee7b7" />,
    left: '50%',
    top: '47%',
    delay: 0.68,
  },
  {
    id: 'crm',
    label: 'CRM Sync',
    subtitle: 'Pipeline writeback',
    detail: 'Creates record, updates stage, and attaches summary',
    tag: 'Writeback',
    metric: '2.1s total',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.24)',
    icon: <CRMIcon color="#67e8f9" />,
    left: '50%',
    top: '74%',
    delay: 1.26,
  },
]

const DESKTOP_CONNECTORS: Connector[] = [
  {
    id: 'lead-to-ai',
    path: 'M 24 57 C 33 57, 40 48, 46 40',
    pulses: [
      { left: '24%', top: '57%' },
      { left: '31%', top: '56%' },
      { left: '38%', top: '50%' },
      { left: '46%', top: '40%' },
    ],
    color: '#60a5fa',
    delay: 0.24,
  },
  {
    id: 'ai-to-crm',
    path: 'M 54 40 C 62 47, 69 56, 76 57',
    pulses: [
      { left: '54%', top: '40%' },
      { left: '61%', top: '46%' },
      { left: '68%', top: '54%' },
      { left: '76%', top: '57%' },
    ],
    color: '#22d3ee',
    delay: 0.98,
  },
]

const MOBILE_CONNECTORS: Connector[] = [
  {
    id: 'lead-to-ai',
    path: 'M 50 27 C 50 33, 50 39, 50 43',
    pulses: [
      { left: '50%', top: '27%' },
      { left: '50%', top: '32%' },
      { left: '50%', top: '37%' },
      { left: '50%', top: '43%' },
    ],
    color: '#60a5fa',
    delay: 0.24,
  },
  {
    id: 'ai-to-crm',
    path: 'M 50 54 C 50 60, 50 66, 50 70',
    pulses: [
      { left: '50%', top: '54%' },
      { left: '50%', top: '59%' },
      { left: '50%', top: '64%' },
      { left: '50%', top: '70%' },
    ],
    color: '#22d3ee',
    delay: 0.98,
  },
]

function DataPulse({
  points,
  color,
  delay,
  active,
}: {
  points: Position[]
  color: string
  delay: number
  active: boolean
}) {
  if (!active) return null

  return (
    <motion.div
      className="absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60"
      style={{
        left: points[0].left,
        top: points[0].top,
        background: color,
        boxShadow: `0 0 0 4px ${color}16, 0 0 18px 4px ${color}48, 0 0 38px ${color}2a`,
      }}
      animate={{
        left: points.map((point) => point.left),
        top: points.map((point) => point.top),
        opacity: [0, 1, 1, 0],
        scale: [0.75, 1, 1, 0.85],
      }}
      transition={{
        duration: 1.15,
        delay,
        repeat: Infinity,
        repeatDelay: 1.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      aria-hidden
    />
  )
}

function SystemNodeCard({
  node,
  index,
  active,
}: {
  node: SystemNode
  index: number
  active: boolean
}) {
  return (
    <motion.div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: node.left, top: node.top }}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: 0.14 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="relative w-[138px] overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.95),rgba(6,10,20,0.93))] shadow-[0_18px_50px_rgba(2,6,23,0.42)] backdrop-blur-2xl min-[420px]:w-[152px] lg:w-[176px]"
        style={{ boxShadow: `0 18px 50px rgba(2,6,23,0.42), 0 0 0 1px ${node.color}10` }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${node.color}, transparent)` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(circle at top left, ${node.glow}, transparent 58%)`,
          }}
          aria-hidden
        />

        {node.id === 'ai' && (
          <motion.div
            className="pointer-events-none absolute inset-[-16%] rounded-[28px] border border-emerald-300/18"
            animate={
              active
                ? {
                    opacity: [0.2, 0.55, 0.2],
                    scale: [0.92, 1.02, 0.92],
                  }
                : undefined
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        )}

        <div className="relative z-10 p-3.5 lg:p-4">
          <div className="flex items-start justify-between gap-2">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              animate={
                active
                  ? {
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        `0 0 0 0 ${node.color}00`,
                        `0 0 24px 2px ${node.color}42`,
                        `0 0 0 0 ${node.color}00`,
                      ],
                    }
                  : undefined
              }
              transition={{
                duration: 0.65,
                delay: node.delay,
                repeat: Infinity,
                repeatDelay: 2.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {node.icon}
            </motion.div>
            <span
              className="rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.22em] text-white/72 lg:text-[9px]"
              style={{ borderColor: `${node.color}26`, background: `${node.color}12` }}
            >
              {node.tag}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold tracking-tight text-white lg:text-[15px]">{node.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/46 lg:text-[11px] lg:leading-5">
              {node.subtitle}
            </p>
          </div>

          <div className="mt-3 rounded-[16px] border border-white/8 bg-white/[0.03] p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Latest Event
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-white/72">{node.detail}</p>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] font-medium lg:text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: node.color, boxShadow: `0 0 10px ${node.color}` }}
            />
            <span style={{ color: `${node.color}dd` }}>{node.metric}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TelemetryPanel({
  eyebrow,
  title,
  rows,
  className,
  accent,
  delay,
  active,
}: {
  eyebrow: string
  title: string
  rows: TelemetryRow[]
  className: string
  accent: string
  delay: number
  active: boolean
}) {
  return (
    <motion.div
      className={`absolute rounded-[20px] border border-white/10 bg-slate-950/42 px-4 py-3 shadow-[0_14px_40px_rgba(2,6,23,0.3)] backdrop-blur-xl ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ boxShadow: `0 14px 40px rgba(2,6,23,0.3), 0 0 0 1px ${accent}12` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
        aria-hidden
      />
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>
          {eyebrow}
        </p>
        <p className="mt-2 text-sm font-semibold tracking-tight text-white">{title}</p>
        <div className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-white/6 pb-2 last:border-b-0 last:pb-0"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/34">{row.label}</span>
              <motion.span
                className="text-[11px] font-medium text-white/74"
                animate={
                  active
                    ? {
                        opacity: index === 0 ? [0.6, 1, 0.6] : [1, 1, 1],
                      }
                    : undefined
                }
                transition={{ duration: 1.8, repeat: Infinity, delay: delay + index * 0.12 }}
              >
                {row.value}
              </motion.span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function CommandChip({
  step,
  label,
  accent,
}: {
  step: string
  label: string
  accent: string
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">
      <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
        {step}
      </span>
      <span className="text-xs text-white/74 sm:text-[13px]">{label}</span>
    </div>
  )
}

function CanvasGraph({
  className,
  nodes,
  connectors,
  active,
}: {
  className: string
  nodes: SystemNode[]
  connectors: Connector[]
  active: boolean
}) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {connectors.map((connector) => (
          <g key={connector.id}>
            <path
              d={connector.path}
              fill="none"
              stroke={`${connector.color}18`}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <motion.path
              d={connector.path}
              fill="none"
              stroke={`${connector.color}c8`}
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </g>
        ))}
      </svg>

      {connectors.flatMap((connector) => [
        <DataPulse
          key={`${connector.id}-pulse-a`}
          points={connector.pulses}
          color={connector.color}
          delay={connector.delay}
          active={active}
        />,
        <DataPulse
          key={`${connector.id}-pulse-b`}
          points={connector.pulses}
          color={connector.color}
          delay={connector.delay + 0.7}
          active={active}
        />,
      ])}

      {nodes.map((node, index) => (
        <SystemNodeCard key={node.id} node={node} index={index} active={active} />
      ))}
    </div>
  )
}

export default function HeroVisual() {
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const isInView = useInView(panelRef, { margin: '0px 0px -120px 0px', once: false })
  const active = !reducedMotion && isInView

  return (
    <motion.div
      ref={panelRef}
      animate={active ? { y: [0, -5, 0] } : undefined}
      transition={{ duration: 7.5, ease: 'easeInOut', repeat: Infinity }}
      className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-surface-container-low/80 shadow-[0_30px_120px_rgba(2,6,23,0.58),0_0_0_1px_rgba(173,198,255,0.05),0_0_70px_rgba(37,99,235,0.08)] backdrop-blur-2xl"
    >
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, rgba(96,165,250,0), rgba(96,165,250,0.92), rgba(34,211,238,0.84), rgba(52,211,153,0.58), rgba(52,211,153,0))',
        }}
      />

      <div className="flex items-center justify-between border-b border-white/6 bg-white/[0.02] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/78">
              System Visual
            </p>
            <p className="mt-0.5 hidden text-[11px] text-white/30 sm:block">
              Lead → AI → CRM orchestration trace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-1.5">
          <motion.div
            className="h-2 w-2 rounded-full bg-emerald-400"
            animate={active ? { opacity: [1, 0.35, 1] } : undefined}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
            Live Flow
          </span>
        </div>
      </div>

      <div className="relative h-[420px] overflow-hidden sm:h-[500px] lg:h-[560px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(96,165,250,0.16), transparent 24%), radial-gradient(circle at 52% 30%, rgba(52,211,153,0.12), transparent 20%), radial-gradient(circle at 80% 22%, rgba(34,211,238,0.12), transparent 24%), linear-gradient(180deg, rgba(5,8,22,0.98), rgba(8,12,24,0.94))',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(rgba(173,198,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.05) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 82% 74% at 50% 48%, black 24%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 82% 74% at 50% 48%, black 24%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-3xl" />

        <motion.div
          className="pointer-events-none absolute inset-x-[12%] h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
          animate={active ? { top: ['18%', '76%', '18%'], opacity: [0.15, 0.65, 0.15] } : undefined}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />

        <TelemetryPanel
          eyebrow="Inbound Payload"
          title="Lead data lands cleanly"
          rows={[
            { label: 'Source', value: 'Meta Lead Form' },
            { label: 'Need', value: 'CRM handoff cleanup' },
            { label: 'Owner', value: 'Revenue Ops' },
          ]}
          className="left-4 top-4 hidden max-w-[250px] sm:block"
          accent="#93c5fd"
          delay={0.2}
          active={active}
        />

        <TelemetryPanel
          eyebrow="Inference Layer"
          title="AI compresses the decision"
          rows={[
            { label: 'Intent', value: 'High' },
            { label: 'Route', value: 'AE + Ops' },
            { label: 'Summary', value: 'Qualified in 2.1s' },
          ]}
          className="bottom-24 left-4 hidden max-w-[250px] md:block"
          accent="#6ee7b7"
          delay={0.34}
          active={active}
        />

        <TelemetryPanel
          eyebrow="Writeback Log"
          title="CRM record updates instantly"
          rows={[
            { label: 'Stage', value: 'Qualified Lead' },
            { label: 'Owner', value: 'Assigned' },
            { label: 'Notes', value: 'AI summary attached' },
          ]}
          className="right-4 top-4 hidden max-w-[255px] lg:block"
          accent="#67e8f9"
          delay={0.48}
          active={active}
        />

        <CanvasGraph className="md:hidden" nodes={MOBILE_NODES} connectors={MOBILE_CONNECTORS} active={active} />
        <CanvasGraph className="hidden md:block" nodes={DESKTOP_NODES} connectors={DESKTOP_CONNECTORS} active={active} />

        <div className="absolute inset-x-4 bottom-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
          <CommandChip step="01" label="Lead captured" accent="#93c5fd" />
          <CommandChip step="02" label="AI scores + routes" accent="#6ee7b7" />
          <CommandChip step="03" label="CRM synced" accent="#67e8f9" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 bg-white/[0.02] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-[11px] text-white/42">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(173,198,255,0.8)]" />
          <span>Lead qualification canvas</span>
          <span className="text-white/20">·</span>
          <span>deterministic ops logic + AI scoring</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-primary">842ms ingest</span>
          <span className="text-white/18">|</span>
          <span className="text-secondary">2.1s full sync</span>
        </div>
      </div>
    </motion.div>
  )
}
