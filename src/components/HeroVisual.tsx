'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'

type Position = {
  left: string
  top: string
}

type FlowNode = Position & {
  id: string
  title: string
  subtitle: string
  detail: string
  metric: string
  tag: string
  color: string
  glow: string
  icon: React.ReactNode
  delay: number
}

type FlowConnector = {
  id: string
  path: string
  pulses: Position[]
  color: string
  delay: number
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

const DESKTOP_NODES: FlowNode[] = [
  {
    id: 'lead',
    title: 'Lead',
    subtitle: 'Form submit',
    detail: 'Inbound payload lands cleanly.',
    metric: 'Trigger captured',
    tag: 'Input',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
    icon: <LeadIcon color="#93c5fd" />,
    left: '17%',
    top: '49%',
    delay: 0.12,
  },
  {
    id: 'ai',
    title: 'AI Router',
    subtitle: 'Score + decide',
    detail: 'Intent is classified and assigned.',
    metric: 'Fit scored',
    tag: 'Decision',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
    icon: <AIIcon color="#6ee7b7" />,
    left: '50%',
    top: '49%',
    delay: 0.58,
  },
  {
    id: 'crm',
    title: 'CRM Sync',
    subtitle: 'Writeback',
    detail: 'The record updates instantly.',
    metric: 'Lead written',
    tag: 'Output',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
    icon: <CRMIcon color="#67e8f9" />,
    left: '83%',
    top: '49%',
    delay: 1.04,
  },
]

const MOBILE_NODES: FlowNode[] = [
  {
    id: 'lead',
    title: 'Lead',
    subtitle: 'Form submit',
    detail: 'Inbound payload lands cleanly.',
    metric: 'Trigger captured',
    tag: 'Input',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
    icon: <LeadIcon color="#93c5fd" />,
    left: '50%',
    top: '20%',
    delay: 0.12,
  },
  {
    id: 'ai',
    title: 'AI Router',
    subtitle: 'Score + decide',
    detail: 'Intent is classified and assigned.',
    metric: 'Fit scored',
    tag: 'Decision',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
    icon: <AIIcon color="#6ee7b7" />,
    left: '50%',
    top: '48%',
    delay: 0.58,
  },
  {
    id: 'crm',
    title: 'CRM Sync',
    subtitle: 'Writeback',
    detail: 'The record updates instantly.',
    metric: 'Lead written',
    tag: 'Output',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
    icon: <CRMIcon color="#67e8f9" />,
    left: '50%',
    top: '76%',
    delay: 1.04,
  },
]

const DESKTOP_CONNECTORS: FlowConnector[] = [
  {
    id: 'lead-to-ai',
    path: 'M 25 49 C 31 49, 38 49, 44 49',
    pulses: [
      { left: '25%', top: '49%' },
      { left: '31%', top: '49%' },
      { left: '38%', top: '49%' },
      { left: '44%', top: '49%' },
    ],
    color: '#60a5fa',
    delay: 0.24,
  },
  {
    id: 'ai-to-crm',
    path: 'M 56 49 C 62 49, 69 49, 75 49',
    pulses: [
      { left: '56%', top: '49%' },
      { left: '62%', top: '49%' },
      { left: '69%', top: '49%' },
      { left: '75%', top: '49%' },
    ],
    color: '#22d3ee',
    delay: 0.96,
  },
]

const MOBILE_CONNECTORS: FlowConnector[] = [
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
    path: 'M 50 55 C 50 61, 50 67, 50 71',
    pulses: [
      { left: '50%', top: '55%' },
      { left: '50%', top: '60%' },
      { left: '50%', top: '65%' },
      { left: '50%', top: '71%' },
    ],
    color: '#22d3ee',
    delay: 0.96,
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
        boxShadow: `0 0 0 4px ${color}16, 0 0 16px 4px ${color}42, 0 0 34px ${color}24`,
      }}
      animate={{
        left: points.map((point) => point.left),
        top: points.map((point) => point.top),
        opacity: [0, 1, 1, 0],
        scale: [0.76, 1, 1, 0.86],
      }}
      transition={{
        duration: 1,
        delay,
        repeat: Infinity,
        repeatDelay: 2.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      aria-hidden
    />
  )
}

function NodeCard({
  node,
  index,
  active,
}: {
  node: FlowNode
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
        className="relative w-[136px] overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.95),rgba(7,10,18,0.94))] px-4 py-4 shadow-[0_18px_44px_rgba(2,6,23,0.42)] backdrop-blur-2xl min-[420px]:w-[148px] lg:w-[166px]"
        style={{ boxShadow: `0 18px 44px rgba(2,6,23,0.42), 0 0 0 1px ${node.color}12` }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${node.color}, transparent)` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ background: `radial-gradient(circle at top left, ${node.glow}, transparent 58%)` }}
          aria-hidden
        />

        {node.id === 'ai' && (
          <motion.div
            className="pointer-events-none absolute inset-[-12%] rounded-[26px] border border-emerald-300/18"
            animate={
              active
                ? {
                    opacity: [0.16, 0.42, 0.16],
                    scale: [0.95, 1.01, 0.95],
                  }
                : undefined
            }
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        )}

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              animate={
                active
                  ? {
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        `0 0 0 0 ${node.color}00`,
                        `0 0 22px 2px ${node.color}34`,
                        `0 0 0 0 ${node.color}00`,
                      ],
                    }
                  : undefined
              }
              transition={{
                duration: 0.65,
                delay: node.delay,
                repeat: Infinity,
                repeatDelay: 2.25,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {node.icon}
            </motion.div>
            <span
              className="rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white/72"
              style={{ borderColor: `${node.color}26`, background: `${node.color}12` }}
            >
              {node.tag}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold tracking-tight text-white lg:text-[15px]">{node.title}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/38">{node.subtitle}</p>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-white/68 lg:text-[12px]">
            {node.detail}
          </p>

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

function FlowCanvas({
  className,
  nodes,
  connectors,
  active,
}: {
  className: string
  nodes: FlowNode[]
  connectors: FlowConnector[]
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
              stroke={`${connector.color}16`}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <motion.path
              d={connector.path}
              fill="none"
              stroke={`${connector.color}c6`}
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
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
          delay={connector.delay + 0.72}
          active={active}
        />,
      ])}

      {nodes.map((node, index) => (
        <NodeCard key={node.id} node={node} index={index} active={active} />
      ))}
    </div>
  )
}

function StepChip({
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

export default function HeroVisual() {
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const isInView = useInView(panelRef, { margin: '0px 0px -120px 0px', once: false })
  const active = !reducedMotion && isInView

  return (
    <motion.div
      ref={panelRef}
      animate={active ? { y: [0, -4, 0] } : undefined}
      transition={{ duration: 7.2, ease: 'easeInOut', repeat: Infinity }}
      className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-surface-container-low/80 shadow-[0_30px_120px_rgba(2,6,23,0.56),0_0_0_1px_rgba(173,198,255,0.05),0_0_60px_rgba(37,99,235,0.08)] backdrop-blur-2xl"
    >
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, rgba(96,165,250,0), rgba(96,165,250,0.92), rgba(34,211,238,0.84), rgba(34,211,238,0))',
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
            <p className="mt-0.5 hidden text-[11px] text-white/34 sm:block">
              One clean path: Lead -&gt; AI -&gt; CRM
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

      <div className="relative h-[360px] overflow-hidden sm:h-[390px] lg:h-[430px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 24%, rgba(96,165,250,0.15), transparent 24%), radial-gradient(circle at 50% 22%, rgba(52,211,153,0.12), transparent 20%), radial-gradient(circle at 82% 24%, rgba(34,211,238,0.12), transparent 24%), linear-gradient(180deg, rgba(5,8,22,0.98), rgba(8,12,24,0.94))',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(rgba(173,198,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.045) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(ellipse 84% 76% at 50% 46%, black 24%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 84% 76% at 50% 46%, black 24%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-3xl" />

        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/38 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/56 backdrop-blur-xl sm:left-5 sm:top-5">
          Trigger -&gt; Decide -&gt; Sync
        </div>

        <FlowCanvas className="md:hidden" nodes={MOBILE_NODES} connectors={MOBILE_CONNECTORS} active={active} />
        <FlowCanvas className="hidden md:block" nodes={DESKTOP_NODES} connectors={DESKTOP_CONNECTORS} active={active} />

        <div className="absolute inset-x-4 bottom-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
          <StepChip step="01" label="Lead captured" accent="#93c5fd" />
          <StepChip step="02" label="AI decides route" accent="#6ee7b7" />
          <StepChip step="03" label="CRM updated" accent="#67e8f9" />
        </div>
      </div>
    </motion.div>
  )
}
