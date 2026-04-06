'use client'

import { motion, useReducedMotion } from 'framer-motion'

// ─── Tool node definitions ─────────────────────────────────────────────────

type NodeDef = {
  key: string
  label: string
  sub: string
  color: string
  bg: string
  runs: string
  icon: React.ReactNode
}

function WebhookIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="9" cy="9" r="2.5" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.4"/>
    </svg>
  )
}
function OpenAIIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.4"/>
      <path d="M9 5.5c0 0 2.5 1.5 2.5 3.5S9 12.5 9 12.5M9 5.5C9 5.5 6.5 7 6.5 9S9 12.5 9 12.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="9" cy="9" r="1.5" fill={color}/>
    </svg>
  )
}
function HubSpotIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="13" cy="5.5" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.4"/>
      <path d="M10.5 5.5H5A3 3 0 0 0 5 11.5h5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="6" cy="14" r="2" fill={color}/>
    </svg>
  )
}
function SlackIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3"  y="7.5" width="3" height="7"   rx="1.5" fill={color}/>
      <rect x="3"  y="3.5" width="3" height="3"   rx="1.5" fill={color} fillOpacity="0.5"/>
      <rect x="7.5" y="3.5" width="7" height="3"  rx="1.5" fill={color}/>
      <rect x="12" y="3.5" width="3" height="7"   rx="1.5" fill={color}/>
      <rect x="12" y="11.5" width="3" height="3"  rx="1.5" fill={color} fillOpacity="0.5"/>
      <rect x="7.5" y="11.5" width="7" height="3" rx="1.5" fill={color}/>
    </svg>
  )
}
function GmailIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4.5" width="14" height="10" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M2 6l7 5 7-5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function SheetsIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="2.5" width="12" height="13" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M3 6.5h12M3 10.5h12M8 6.5v9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
function ClickUpIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 12L6.5 8l3 3 5-6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Workflow data ─────────────────────────────────────────────────────────

const WORKFLOW_1: NodeDef[] = [
  {
    key: 'w1-webhook', label: 'New Lead',      sub: 'Webhook Trigger',
    color: '#facc15', bg: 'rgba(250,204,21,0.1)', runs: '2,847',
    icon: <WebhookIcon color="#facc15" />,
  },
  {
    key: 'w1-openai',  label: 'Score & Filter', sub: 'OpenAI · GPT-4o',
    color: '#34d399', bg: 'rgba(52,211,153,0.1)', runs: '2,844',
    icon: <OpenAIIcon color="#34d399" />,
  },
  {
    key: 'w1-hubspot', label: 'Add to CRM',     sub: 'HubSpot',
    color: '#f97316', bg: 'rgba(249,115,22,0.1)', runs: '2,391',
    icon: <HubSpotIcon color="#f97316" />,
  },
  {
    key: 'w1-slack',   label: 'Notify Team',    sub: 'Slack',
    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', runs: '2,391',
    icon: <SlackIcon color="#38bdf8" />,
  },
  {
    key: 'w1-gmail',   label: 'Send Recap',     sub: 'Gmail',
    color: '#f87171', bg: 'rgba(248,113,113,0.1)', runs: '2,391',
    icon: <GmailIcon color="#f87171" />,
  },
]

const WORKFLOW_2: NodeDef[] = [
  {
    key: 'w2-sheets',  label: 'Form Submit',    sub: 'Google Sheets',
    color: '#4ade80', bg: 'rgba(74,222,128,0.1)', runs: '1,203',
    icon: <SheetsIcon color="#4ade80" />,
  },
  {
    key: 'w2-openai',  label: 'Summarise Data', sub: 'OpenAI · GPT-4o',
    color: '#34d399', bg: 'rgba(52,211,153,0.1)', runs: '1,203',
    icon: <OpenAIIcon color="#34d399" />,
  },
  {
    key: 'w2-hubspot', label: 'Update CRM',     sub: 'HubSpot',
    color: '#f97316', bg: 'rgba(249,115,22,0.1)', runs: '1,201',
    icon: <HubSpotIcon color="#f97316" />,
  },
  {
    key: 'w2-slack',   label: 'Ping Channel',   sub: 'Slack',
    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', runs: '1,201',
    icon: <SlackIcon color="#38bdf8" />,
  },
  {
    key: 'w2-clickup', label: 'Create Task',    sub: 'ClickUp',
    color: '#818cf8', bg: 'rgba(129,140,248,0.1)', runs: '1,201',
    icon: <ClickUpIcon color="#818cf8" />,
  },
]

// ─── Animated connector ────────────────────────────────────────────────────

function Connector({ color, delay }: { color: string; delay: number }) {
  const reduced = useReducedMotion()
  return (
    <div className="relative flex items-center" style={{ flex: 1, minWidth: 24, height: 2 }}>
      {/* Dashed base line */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${color}40, ${color}20)`,
          maskImage: 'repeating-linear-gradient(90deg, black 0px, black 5px, transparent 5px, transparent 10px)',
          WebkitMaskImage: 'repeating-linear-gradient(90deg, black 0px, black 5px, transparent 5px, transparent 10px)',
        }}
      />
      {/* Traveling dot */}
      {!reduced && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 6, height: 6,
            background: color,
            boxShadow: `0 0 8px 2px ${color}80`,
          }}
          animate={{ left: ['-4px', 'calc(100% + 4px)'] }}
          transition={{
            duration: 1.6,
            delay,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: 'easeInOut',
          }}
        />
      )}
      {/* Arrow tip */}
      <svg
        className="absolute right-0 shrink-0"
        width="8" height="8" viewBox="0 0 8 8" fill="none"
        style={{ color: `${color}60` }}
      >
        <path d="M1 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

// ─── Single node card ──────────────────────────────────────────────────────

function NodeCard({ node, index, pulseDelay }: { node: NodeDef; index: number; pulseDelay: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 + index * 0.08 }}
      className="shrink-0 flex flex-col gap-1 rounded-[10px] px-3 py-2.5"
      style={{
        background: node.bg,
        border: `1px solid ${node.color}30`,
        minWidth: 110,
      }}
    >
      {/* Icon + label row */}
      <div className="flex items-center gap-2">
        {/* Pulsing icon wrapper */}
        <motion.div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0"
          style={{ background: `${node.color}18`, border: `1px solid ${node.color}35` }}
          animate={reduced ? undefined : {
            boxShadow: [
              `0 0 0px 0px ${node.color}00`,
              `0 0 10px 3px ${node.color}50`,
              `0 0 0px 0px ${node.color}00`,
            ],
          }}
          transition={{ duration: 2.4, delay: pulseDelay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {node.icon}
        </motion.div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight text-white/90 truncate">{node.label}</p>
          <p className="text-[9px] text-white/35 truncate">{node.sub}</p>
        </div>
      </div>
      {/* Run count */}
      <div className="flex items-center gap-1 mt-0.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: node.color, boxShadow: `0 0 4px ${node.color}` }} />
        <span className="text-[9px] font-semibold" style={{ color: `${node.color}cc` }}>{node.runs} runs</span>
      </div>
    </motion.div>
  )
}

// ─── Workflow row ──────────────────────────────────────────────────────────

function WorkflowRow({
  nodes, label, tag, delay,
}: {
  nodes: NodeDef[]
  label: string
  tag: string
  delay: number
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-[12px] p-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(173,198,255,0.08)', border: '1px solid rgba(173,198,255,0.15)', color: '#adc6ff' }}
        >
          {tag}
        </span>
        <span className="text-[10px] font-semibold text-white/40">{label}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-emerald-400">99.8%</span>
          <span className="text-[9px] text-white/25">success</span>
        </div>
      </div>
      {/* Node chain */}
      <div className="flex items-center gap-0">
        {nodes.map((node, i) => (
          <div key={node.key} className="flex items-center" style={{ flex: i < nodes.length - 1 ? '0 0 auto' : '0 0 auto' }}>
            <NodeCard node={node} index={i} pulseDelay={delay + i * 0.4} />
            {i < nodes.length - 1 && (
              <Connector color={nodes[i + 1].color} delay={delay + i * 0.3} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Metric pill ──────────────────────────────────────────────────────────

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-headline font-extrabold text-[13px] tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] text-white/35">{label}</span>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────

export default function HeroVisual() {
  const reduced = useReducedMotion()

  return (
    <motion.div
      animate={reduced ? undefined : { y: [0, -7, 0] }}
      transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
      className="w-full rounded-[18px] overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(15,22,40,0.98) 0%, rgba(8,14,28,0.99) 100%)',
        border: '1px solid rgba(173,198,255,0.12)',
        boxShadow: '0 0 0 1px rgba(173,198,255,0.06), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(59,130,246,0.08)',
      }}
    >
      {/* Gradient top edge */}
      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4 40%, #8b5cf6 75%, transparent)' }} />

      {/* Window chrome */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <span className="ml-2 text-[10px] font-mono text-white/25 hidden sm:block">
            opsradar · automation-engine
          </span>
        </div>

        {/* LIVE badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={reduced ? undefined : { opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Live</span>
        </div>
      </div>

      {/* Metrics bar */}
      <div
        className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 py-2.5 border-b"
        style={{ background: 'rgba(59,130,246,0.03)', borderColor: 'rgba(255,255,255,0.04)' }}
      >
        <MetricPill value="2,847" label="executions today"  color="#60a5fa" />
        <div className="w-px h-3 bg-white/8" />
        <MetricPill value="99.8%" label="success rate"      color="#34d399" />
        <div className="w-px h-3 bg-white/8" />
        <MetricPill value="47h"   label="time saved today"  color="#f59e0b" />
        <div className="hidden sm:block w-px h-3 bg-white/8" />
        <MetricPill value="12ms"  label="avg latency"       color="#a78bfa" />
      </div>

      {/* Workflow rows */}
      <div className="p-4 space-y-3 overflow-x-auto">
        <WorkflowRow
          nodes={WORKFLOW_1}
          label="lead-qualification.workflow"
          tag="Sales Ops"
          delay={0.1}
        />
        <WorkflowRow
          nodes={WORKFLOW_2}
          label="client-onboarding.workflow"
          tag="Retention"
          delay={0.25}
        />
      </div>

      {/* Bottom status bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t"
        style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={reduced ? undefined : { opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[9px] text-white/25">All systems operational · Last run 3s ago</span>
        </div>
        <span className="text-[9px] text-white/15 hidden sm:block">Powered by OpsRadar · n8n</span>
      </div>
    </motion.div>
  )
}
