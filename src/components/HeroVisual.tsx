'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'

type Position = {
  left: string
  top: string
}

type CanvasNode = Position & {
  id: string
  label: string
  subtitle: string
  tag: string
  metric: string
  color: string
  glow: string
  icon: React.ReactNode
  activityDelay: number
}

type Connector = {
  id: string
  path: string
  pulse: Position[]
  color: string
  delay: number
}

function LeadIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="6.2" r="3.1" stroke={color} strokeWidth="1.5" />
      <path d="M4.5 16.3c1.2-2.7 3.1-4 5.5-4s4.3 1.3 5.5 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.8 4.5h2.7M17.15 3.15v2.7" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
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

function SlackIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="8" width="3.2" height="7.4" rx="1.6" fill={color} />
      <rect x="4" y="4.4" width="3.2" height="3.2" rx="1.6" fill={color} fillOpacity="0.55" />
      <rect x="8.2" y="4.4" width="7.4" height="3.2" rx="1.6" fill={color} />
      <rect x="12.8" y="4.4" width="3.2" height="7.4" rx="1.6" fill={color} />
      <rect x="12.8" y="12.4" width="3.2" height="3.2" rx="1.6" fill={color} fillOpacity="0.55" />
      <rect x="8.2" y="12.4" width="7.4" height="3.2" rx="1.6" fill={color} />
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

const DESKTOP_NODES: CanvasNode[] = [
  {
    id: 'lead',
    label: 'Lead',
    subtitle: 'Webhook trigger',
    tag: 'Trigger',
    metric: 'New form submit',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.24)',
    icon: <LeadIcon color="#93c5fd" />,
    left: '18%',
    top: '52%',
    activityDelay: 0.12,
  },
  {
    id: 'ai',
    label: 'AI Scoring',
    subtitle: 'Intent + fit analysis',
    tag: 'AI',
    metric: 'Score: 92 / 100',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.24)',
    icon: <AIIcon color="#6ee7b7" />,
    left: '49%',
    top: '52%',
    activityDelay: 0.72,
  },
  {
    id: 'slack',
    label: 'Slack',
    subtitle: 'Team notification',
    tag: 'Action',
    metric: 'Alert delivered',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
    icon: <SlackIcon color="#67e8f9" />,
    left: '81%',
    top: '30%',
    activityDelay: 1.35,
  },
  {
    id: 'crm',
    label: 'CRM',
    subtitle: 'Pipeline sync',
    tag: 'Action',
    metric: 'Record updated',
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.22)',
    icon: <CRMIcon color="#fdba74" />,
    left: '81%',
    top: '72%',
    activityDelay: 1.55,
  },
]

const MOBILE_NODES: CanvasNode[] = [
  {
    id: 'lead',
    label: 'Lead',
    subtitle: 'Webhook trigger',
    tag: 'Trigger',
    metric: 'New form submit',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.24)',
    icon: <LeadIcon color="#93c5fd" />,
    left: '50%',
    top: '18%',
    activityDelay: 0.12,
  },
  {
    id: 'ai',
    label: 'AI Scoring',
    subtitle: 'Intent + fit analysis',
    tag: 'AI',
    metric: 'Score: 92 / 100',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.24)',
    icon: <AIIcon color="#6ee7b7" />,
    left: '50%',
    top: '45%',
    activityDelay: 0.72,
  },
  {
    id: 'slack',
    label: 'Slack',
    subtitle: 'Team notification',
    tag: 'Action',
    metric: 'Alert delivered',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
    icon: <SlackIcon color="#67e8f9" />,
    left: '27%',
    top: '77%',
    activityDelay: 1.35,
  },
  {
    id: 'crm',
    label: 'CRM',
    subtitle: 'Pipeline sync',
    tag: 'Action',
    metric: 'Record updated',
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.22)',
    icon: <CRMIcon color="#fdba74" />,
    left: '73%',
    top: '77%',
    activityDelay: 1.55,
  },
]

const DESKTOP_CONNECTORS: Connector[] = [
  {
    id: 'lead-to-ai',
    path: 'M 26 52 C 33 52, 39 52, 44 52',
    pulse: [
      { left: '26%', top: '52%' },
      { left: '32%', top: '52%' },
      { left: '38%', top: '52%' },
      { left: '44%', top: '52%' },
    ],
    color: '#60a5fa',
    delay: 0.2,
  },
  {
    id: 'ai-to-slack',
    path: 'M 54 50 C 63 49, 69 36, 74 30',
    pulse: [
      { left: '54%', top: '50%' },
      { left: '61%', top: '47%' },
      { left: '68%', top: '38%' },
      { left: '74%', top: '30%' },
    ],
    color: '#22d3ee',
    delay: 0.92,
  },
  {
    id: 'ai-to-crm',
    path: 'M 54 54 C 63 55, 69 66, 74 72',
    pulse: [
      { left: '54%', top: '54%' },
      { left: '61%', top: '57%' },
      { left: '68%', top: '64%' },
      { left: '74%', top: '72%' },
    ],
    color: '#fb923c',
    delay: 1.08,
  },
]

const MOBILE_CONNECTORS: Connector[] = [
  {
    id: 'lead-to-ai',
    path: 'M 50 24 C 50 29, 50 35, 50 40',
    pulse: [
      { left: '50%', top: '24%' },
      { left: '50%', top: '29%' },
      { left: '50%', top: '34%' },
      { left: '50%', top: '40%' },
    ],
    color: '#60a5fa',
    delay: 0.2,
  },
  {
    id: 'ai-to-slack',
    path: 'M 46 53 C 40 60, 33 68, 28 72',
    pulse: [
      { left: '46%', top: '53%' },
      { left: '40%', top: '60%' },
      { left: '34%', top: '67%' },
      { left: '28%', top: '72%' },
    ],
    color: '#22d3ee',
    delay: 0.92,
  },
  {
    id: 'ai-to-crm',
    path: 'M 54 53 C 60 60, 67 68, 72 72',
    pulse: [
      { left: '54%', top: '53%' },
      { left: '60%', top: '60%' },
      { left: '66%', top: '67%' },
      { left: '72%', top: '72%' },
    ],
    color: '#fb923c',
    delay: 1.08,
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
      className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60"
      style={{
        left: points[0].left,
        top: points[0].top,
        background: color,
        boxShadow: `0 0 0 3px ${color}1f, 0 0 18px 4px ${color}55, 0 0 36px ${color}38`,
      }}
      animate={{
        left: points.map((point) => point.left),
        top: points.map((point) => point.top),
        opacity: [0, 1, 1, 0],
        scale: [0.72, 1, 1, 0.82],
      }}
      transition={{
        duration: 1,
        delay,
        repeat: Infinity,
        repeatDelay: 2,
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
  node: CanvasNode
  index: number
  active: boolean
}) {
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: node.left, top: node.top }}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.15 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(9,15,28,0.9))] shadow-[0_18px_40px_rgba(2,6,23,0.35)] backdrop-blur-xl w-[104px] min-[380px]:w-[118px] sm:w-[138px] lg:w-[166px]"
        style={{
          boxShadow: `0 18px 40px rgba(2,6,23,0.35), 0 0 0 1px ${node.color}12`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(circle at top left, ${node.glow}, transparent 60%)`,
          }}
          aria-hidden
        />
        <div className="relative z-10 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-10 sm:w-10"
              animate={
                active
                  ? {
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        `0 0 0 0 ${node.color}00`,
                        `0 0 18px 2px ${node.color}55`,
                        `0 0 0 0 ${node.color}00`,
                      ],
                    }
                  : undefined
              }
              transition={{
                duration: 0.6,
                delay: node.activityDelay,
                repeat: Infinity,
                repeatDelay: 2.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {node.icon}
            </motion.div>
            <span
              className="rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.22em] text-white/70 sm:text-[9px]"
              style={{ borderColor: `${node.color}26`, background: `${node.color}12` }}
            >
              {node.tag}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">{node.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/52 sm:text-[11px] sm:leading-5">
              {node.subtitle}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] font-medium sm:text-[11px]">
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

function CanvasGraph({
  className,
  nodes,
  connectors,
  active,
}: {
  className: string
  nodes: CanvasNode[]
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
              stroke={`${connector.color}1f`}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <motion.path
              d={connector.path}
              fill="none"
              stroke={`${connector.color}b3`}
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </g>
        ))}
      </svg>

      {connectors.map((connector) => (
        <DataPulse
          key={connector.id}
          points={connector.pulse}
          color={connector.color}
          delay={connector.delay}
          active={active}
        />
      ))}

      {nodes.map((node, index) => (
        <NodeCard key={node.id} node={node} index={index} active={active} />
      ))}
    </div>
  )
}

function StepPill({
  step,
  label,
}: {
  step: string
  label: string
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">
      <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{step}</span>
      <span className="text-xs text-white/72 sm:text-[13px]">{label}</span>
    </div>
  )
}

export default function HeroVisual() {
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(panelRef, { margin: '0px 0px -120px 0px', once: false })
  const shouldAnimate = !reduced && isInView

  return (
    <motion.div
      ref={panelRef}
      animate={shouldAnimate ? { y: [0, -6, 0] } : undefined}
      transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
      className="w-full overflow-hidden rounded-[28px] border border-primary/14 bg-surface-container-low/75 shadow-[0_30px_120px_rgba(2,6,23,0.56),0_0_0_1px_rgba(173,198,255,0.06),0_0_60px_rgba(59,130,246,0.1)] backdrop-blur-2xl"
    >
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, rgba(96,165,250,0), rgba(96,165,250,0.9), rgba(34,211,238,0.9), rgba(251,146,60,0.5), rgba(251,146,60,0))',
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/78">Live Simulation</p>
            <p className="mt-0.5 hidden text-[11px] text-white/32 sm:block">
              Lead enrichment canvas running every 3 seconds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
          <motion.div
            className="h-2 w-2 rounded-full bg-emerald-400"
            animate={shouldAnimate ? { opacity: [1, 0.35, 1] } : undefined}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
            Live
          </span>
        </div>
      </div>

      <div className="relative h-[390px] overflow-hidden sm:h-[450px] md:h-[520px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(96,165,250,0.16), transparent 26%), radial-gradient(circle at 78% 28%, rgba(34,211,238,0.14), transparent 24%), radial-gradient(circle at 72% 74%, rgba(251,146,60,0.12), transparent 22%), linear-gradient(180deg, rgba(7,11,22,0.96), rgba(9,14,25,0.88))',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-75"
          style={{
            backgroundImage:
              'linear-gradient(rgba(173,198,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 78% 70% at 50% 46%, black 28%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 78% 70% at 50% 46%, black 28%, transparent 100%)',
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/8 bg-primary/5 blur-3xl" />

        <div className="absolute left-4 top-4 hidden max-w-[280px] rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3 shadow-[0_12px_30px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Workflow Logic</p>
          <p className="mt-2 text-sm font-semibold tracking-tight text-white">
            New leads are scored by AI, then routed to the team and synced to the CRM instantly.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/52">
            This is the visual proof inside the hero: capture, qualify, notify, update.
          </p>
        </div>

        <div className="absolute right-4 top-4 hidden rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3 text-right shadow-[0_12px_30px_rgba(2,6,23,0.28)] backdrop-blur-xl md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">Avg Runtime</p>
          <p className="mt-2 bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-3xl font-black tracking-[-0.06em] text-transparent">
            2.4s
          </p>
          <p className="mt-1 text-xs text-white/50">from inbound lead to qualified handoff</p>
        </div>

        <CanvasGraph className="md:hidden" nodes={MOBILE_NODES} connectors={MOBILE_CONNECTORS} active={shouldAnimate} />
        <CanvasGraph className="hidden md:block" nodes={DESKTOP_NODES} connectors={DESKTOP_CONNECTORS} active={shouldAnimate} />

        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 sm:gap-3">
          <StepPill step="01" label="Lead captured" />
          <StepPill step="02" label="AI scores intent" />
          <StepPill step="03" label="Slack + CRM updated" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 bg-white/[0.02] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(173,198,255,0.9)]" />
          <span>Lead qualification canvas</span>
          <span className="text-white/20">·</span>
          <span>n8n / Zapier style orchestration</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-primary">92/100 intent score</span>
          <span className="text-white/18">|</span>
          <span className="text-secondary">20hrs/week saved</span>
        </div>
      </div>
    </motion.div>
  )
}
