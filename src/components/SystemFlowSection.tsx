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
  category: string
  metric: string
  color: string
  glow: string
  icon: React.ReactNode
  delay: number
}

type Connector = {
  id: string
  path: string
  color: string
  pulses: Position[]
  delay: number
}

function TriggerIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="4.5" width="12" height="11" rx="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M7 8h6M7 11.5h4.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="15.2" cy="5.2" r="2.2" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.1" />
    </svg>
  )
}

function OpenAIIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M9.9 3.6c1.5-.8 3.4-.2 4.2 1.3l.3.6c1.6.1 2.9 1.4 2.9 3.1 0 .5-.1 1-.3 1.4.8 1.5.2 3.4-1.4 4.2l-.5.3c-.1 1.7-1.5 3-3.2 3-.5 0-1-.1-1.4-.3-1.4.8-3.3.3-4.1-1.1l-.3-.6c-1.7 0-3.1-1.4-3.1-3.1 0-.5.1-.9.3-1.3-.8-1.5-.2-3.4 1.3-4.2l.6-.3c.1-1.7 1.5-3.1 3.2-3.1.5 0 .9.1 1.3.2Z"
        stroke={color}
        strokeWidth="1.25"
      />
      <circle cx="10" cy="10" r="2.2" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

function HubSpotIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.5" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.2" />
      <path d="M10 3.8v3.3M6 12.3 3.8 14.5M14 12.3l2.2 2.2" stroke={color} strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="10" cy="3.8" r="1.4" fill={color} />
      <circle cx="3.8" cy="14.5" r="1.4" fill={color} />
      <circle cx="16.2" cy="14.5" r="1.4" fill={color} />
    </svg>
  )
}

function SlackIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4.2" y="8.2" width="3.2" height="7.1" rx="1.6" fill={color} />
      <rect x="4.2" y="4.5" width="3.2" height="3.2" rx="1.6" fill={color} fillOpacity="0.5" />
      <rect x="8.3" y="4.5" width="7.3" height="3.2" rx="1.6" fill={color} />
      <rect x="12.6" y="4.5" width="3.2" height="7.3" rx="1.6" fill={color} />
      <rect x="12.6" y="12.3" width="3.2" height="3.2" rx="1.6" fill={color} fillOpacity="0.5" />
      <rect x="8.3" y="12.3" width="7.3" height="3.2" rx="1.6" fill={color} />
    </svg>
  )
}

const DESKTOP_NODES: FlowNode[] = [
  {
    id: 'trigger',
    title: 'Form Submit',
    subtitle: 'Lead trigger',
    category: 'Trigger',
    metric: 'Payload captured',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
    icon: <TriggerIcon color="#93c5fd" />,
    left: '16%',
    top: '50%',
    delay: 0.1,
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'Summarize + score',
    category: 'Inference',
    metric: 'Intent classified',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
    icon: <OpenAIIcon color="#6ee7b7" />,
    left: '48%',
    top: '50%',
    delay: 0.6,
  },
  {
    id: 'hubspot',
    title: 'HubSpot',
    subtitle: 'Create / update lead',
    category: 'Action',
    metric: 'CRM synced',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.2)',
    icon: <HubSpotIcon color="#67e8f9" />,
    left: '81%',
    top: '32%',
    delay: 1.1,
  },
  {
    id: 'slack',
    title: 'Slack',
    subtitle: 'Notify the team',
    category: 'Action',
    metric: 'Alert delivered',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
    icon: <SlackIcon color="#c4b5fd" />,
    left: '81%',
    top: '68%',
    delay: 1.35,
  },
]

const MOBILE_NODES: FlowNode[] = [
  {
    id: 'trigger',
    title: 'Form Submit',
    subtitle: 'Lead trigger',
    category: 'Trigger',
    metric: 'Payload captured',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
    icon: <TriggerIcon color="#93c5fd" />,
    left: '50%',
    top: '18%',
    delay: 0.1,
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'Summarize + score',
    category: 'Inference',
    metric: 'Intent classified',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
    icon: <OpenAIIcon color="#6ee7b7" />,
    left: '50%',
    top: '42%',
    delay: 0.6,
  },
  {
    id: 'hubspot',
    title: 'HubSpot',
    subtitle: 'Create / update lead',
    category: 'Action',
    metric: 'CRM synced',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.2)',
    icon: <HubSpotIcon color="#67e8f9" />,
    left: '27%',
    top: '74%',
    delay: 1.1,
  },
  {
    id: 'slack',
    title: 'Slack',
    subtitle: 'Notify the team',
    category: 'Action',
    metric: 'Alert delivered',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
    icon: <SlackIcon color="#c4b5fd" />,
    left: '73%',
    top: '74%',
    delay: 1.35,
  },
]

const DESKTOP_CONNECTORS: Connector[] = [
  {
    id: 'trigger-openai',
    path: 'M 23 50 C 30 50, 36 50, 43 50',
    color: '#60a5fa',
    pulses: [
      { left: '23%', top: '50%' },
      { left: '30%', top: '50%' },
      { left: '36%', top: '50%' },
      { left: '43%', top: '50%' },
    ],
    delay: 0.18,
  },
  {
    id: 'openai-hubspot',
    path: 'M 53 48 C 61 46, 68 38, 75 32',
    color: '#22d3ee',
    pulses: [
      { left: '53%', top: '48%' },
      { left: '61%', top: '45%' },
      { left: '68%', top: '38%' },
      { left: '75%', top: '32%' },
    ],
    delay: 0.92,
  },
  {
    id: 'openai-slack',
    path: 'M 53 52 C 61 54, 68 62, 75 68',
    color: '#a78bfa',
    pulses: [
      { left: '53%', top: '52%' },
      { left: '61%', top: '55%' },
      { left: '68%', top: '62%' },
      { left: '75%', top: '68%' },
    ],
    delay: 1.14,
  },
]

const MOBILE_CONNECTORS: Connector[] = [
  {
    id: 'trigger-openai',
    path: 'M 50 24 C 50 29, 50 34, 50 38',
    color: '#60a5fa',
    pulses: [
      { left: '50%', top: '24%' },
      { left: '50%', top: '29%' },
      { left: '50%', top: '34%' },
      { left: '50%', top: '38%' },
    ],
    delay: 0.18,
  },
  {
    id: 'openai-hubspot',
    path: 'M 46 49 C 39 57, 33 65, 29 70',
    color: '#22d3ee',
    pulses: [
      { left: '46%', top: '49%' },
      { left: '40%', top: '57%' },
      { left: '34%', top: '64%' },
      { left: '29%', top: '70%' },
    ],
    delay: 0.92,
  },
  {
    id: 'openai-slack',
    path: 'M 54 49 C 61 57, 67 65, 71 70',
    color: '#a78bfa',
    pulses: [
      { left: '54%', top: '49%' },
      { left: '60%', top: '57%' },
      { left: '66%', top: '64%' },
      { left: '71%', top: '70%' },
    ],
    delay: 1.14,
  },
]

function Pulse({
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
        boxShadow: `0 0 0 4px ${color}16, 0 0 20px 4px ${color}42, 0 0 40px ${color}24`,
      }}
      animate={{
        left: points.map((point) => point.left),
        top: points.map((point) => point.top),
        opacity: [0, 1, 1, 0],
        scale: [0.78, 1, 1, 0.84],
      }}
      transition={{
        duration: 1.1,
        delay,
        repeat: Infinity,
        repeatDelay: 2.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      aria-hidden
    />
  )
}

function Node({
  node,
  active,
  index,
}: {
  node: FlowNode
  active: boolean
  index: number
}) {
  return (
    <motion.div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: node.left, top: node.top }}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: 0.14 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="relative w-[138px] overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,20,34,0.82),rgba(8,11,20,0.86))] shadow-[0_18px_50px_rgba(2,6,23,0.45)] backdrop-blur-2xl min-[420px]:w-[152px] md:w-[170px]"
        style={{ boxShadow: `0 18px 50px rgba(2,6,23,0.45), 0 0 0 1px ${node.color}10` }}
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

        <motion.div
          className="pointer-events-none absolute inset-[-12%] rounded-[26px] border"
          style={{ borderColor: `${node.color}18` }}
          animate={
            active
              ? {
                  opacity: [0.16, 0.44, 0.16],
                  scale: [0.94, 1.02, 0.94],
                }
              : undefined
          }
          transition={{ duration: 2.6, repeat: Infinity, delay: node.delay, ease: 'easeInOut' }}
          aria-hidden
        />

        <div className="relative z-10 p-3.5 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              animate={
                active
                  ? {
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        `0 0 0 0 ${node.color}00`,
                        `0 0 24px 3px ${node.color}3a`,
                        `0 0 0 0 ${node.color}00`,
                      ],
                    }
                  : undefined
              }
              transition={{
                duration: 0.7,
                repeat: Infinity,
                repeatDelay: 2.2,
                delay: node.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {node.icon}
            </motion.div>
            <span
              className="rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.22em] text-white/72"
              style={{ borderColor: `${node.color}26`, background: `${node.color}12` }}
            >
              {node.category}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold tracking-tight text-white md:text-[15px]">{node.title}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/48 md:text-[11px] md:leading-5">
              {node.subtitle}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] font-medium md:text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: node.color, boxShadow: `0 0 10px ${node.color}` }}
            />
            <span style={{ color: `${node.color}d8` }}>{node.metric}</span>
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
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </g>
        ))}
      </svg>

      {connectors.flatMap((connector) => [
        <Pulse
          key={`${connector.id}-pulse-a`}
          points={connector.pulses}
          color={connector.color}
          delay={connector.delay}
          active={active}
        />,
        <Pulse
          key={`${connector.id}-pulse-b`}
          points={connector.pulses}
          color={connector.color}
          delay={connector.delay + 0.75}
          active={active}
        />,
      ])}

      {nodes.map((node, index) => (
        <Node key={node.id} node={node} active={active} index={index} />
      ))}
    </div>
  )
}

export default function SystemFlowSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const inView = useInView(containerRef, { margin: '0px 0px -120px 0px', once: false })
  const active = !reducedMotion && inView

  return (
    <section id="how" className="overflow-hidden py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">
            System Flow
          </span>
          <h2 className="mt-4 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-5xl">
            The operating logic, visualized like an engineering blueprint.
          </h2>
        </div>

        <motion.div
          ref={containerRef}
          animate={active ? { y: [0, -4, 0] } : undefined}
          transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
          className="overflow-hidden rounded-[30px] border border-white/10 bg-surface-container-low/75 shadow-[0_30px_120px_rgba(2,6,23,0.55),0_0_0_1px_rgba(173,198,255,0.05),0_0_70px_rgba(59,130,246,0.08)] backdrop-blur-2xl"
        >
          <div
            className="h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, rgba(96,165,250,0), rgba(96,165,250,0.9), rgba(34,211,238,0.82), rgba(167,139,250,0.7), rgba(167,139,250,0))',
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
                  How It Works
                </p>
                <p className="mt-0.5 hidden text-[11px] text-white/32 sm:block">
                  Trigger and action graph with live pulse simulation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-primary/18 bg-primary/10 px-3 py-1.5">
              <motion.div
                className="h-2 w-2 rounded-full bg-primary"
                animate={active ? { opacity: [1, 0.35, 1] } : undefined}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                Active Blueprint
              </span>
            </div>
          </div>

          <div className="relative h-[430px] overflow-hidden sm:h-[520px] lg:h-[560px]">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 16% 22%, rgba(96,165,250,0.14), transparent 24%), radial-gradient(circle at 50% 26%, rgba(52,211,153,0.12), transparent 18%), radial-gradient(circle at 84% 62%, rgba(167,139,250,0.12), transparent 24%), linear-gradient(180deg, rgba(5,8,18,0.98), rgba(7,10,18,0.96))',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(173,198,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(173,198,255,0.045) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
                maskImage: 'radial-gradient(ellipse 84% 76% at 50% 50%, black 24%, transparent 100%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 84% 76% at 50% 50%, black 24%, transparent 100%)',
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-3xl" />

            <div className="pointer-events-none absolute left-5 top-5 hidden rounded-[18px] border border-white/10 bg-slate-950/36 px-4 py-3 text-[11px] text-white/58 shadow-[0_12px_36px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:block">
              <p className="font-bold uppercase tracking-[0.22em] text-primary">Trigger Layer</p>
              <p className="mt-2 max-w-[210px] leading-5">
                Every flow starts from a deterministic event: form submit, pipeline stage change, or webhook.
              </p>
            </div>

            <div className="pointer-events-none absolute right-5 top-5 hidden rounded-[18px] border border-white/10 bg-slate-950/36 px-4 py-3 text-right text-[11px] text-white/58 shadow-[0_12px_36px_rgba(2,6,23,0.28)] backdrop-blur-xl lg:block">
              <p className="font-bold uppercase tracking-[0.22em] text-secondary">Action Layer</p>
              <p className="mt-2 max-w-[220px] leading-5">
                Once the AI has context, the system writes to your CRM and notifies the team instantly.
              </p>
            </div>

            <FlowCanvas
              className="md:hidden"
              nodes={MOBILE_NODES}
              connectors={MOBILE_CONNECTORS}
              active={active}
            />
            <FlowCanvas
              className="hidden md:block"
              nodes={DESKTOP_NODES}
              connectors={DESKTOP_CONNECTORS}
              active={active}
            />

            <div className="absolute inset-x-4 bottom-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
              {[
                { step: '01', label: 'Trigger event lands', color: '#93c5fd' },
                { step: '02', label: 'OpenAI decides routing', color: '#6ee7b7' },
                { step: '03', label: 'HubSpot + Slack execute', color: '#c4b5fd' },
              ].map((chip) => (
                <div
                  key={chip.step}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl"
                >
                  <span
                    className="mr-2 text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: chip.color }}
                  >
                    {chip.step}
                  </span>
                  <span className="text-xs text-white/74 sm:text-[13px]">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
