'use client'

import { motion, useReducedMotion } from 'framer-motion'

// ─── Icon helpers ────────────────────────────────────────────────────────────

function getNodeIcon(step: string): { icon: string; color: string; bg: string } {
  const s = step.toLowerCase()
  if (s.includes('trigger') || s.includes('webhook') || s.includes('schedule'))
    return { icon: '⚡', color: '#facc15', bg: 'rgba(250,204,21,0.12)' }
  if (s.includes('if') || s.includes('filter') || s.includes('condition') || s.includes('branch'))
    return { icon: '◆', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' }
  if (s.includes('openai') || s.includes('ai') || s.includes('gpt') || s.includes('claude'))
    return { icon: '🧠', color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
  if (s.includes('slack'))
    return { icon: '💬', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' }
  if (s.includes('sheet') || s.includes('excel') || s.includes('airtable'))
    return { icon: '⊞', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' }
  if (s.includes('email') || s.includes('gmail') || s.includes('mailchimp'))
    return { icon: '✉', color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  if (s.includes('crm') || s.includes('hubspot') || s.includes('salesforce') || s.includes('client'))
    return { icon: '👥', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' }
  if (s.includes('notion') || s.includes('asana') || s.includes('monday') || s.includes('clickup'))
    return { icon: '📋', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' }
  return { icon: '⚙', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
}

// ─── Animated connector dot ──────────────────────────────────────────────────

function TravelingDot({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400"
      style={{ left: 0, boxShadow: '0 0 6px 2px rgba(96,165,250,0.6)' }}
      animate={{ left: ['0%', '100%'] }}
      transition={{
        duration: 1.8,
        delay,
        repeat: Infinity,
        repeatDelay: 2.5,
        ease: 'easeInOut',
      }}
    />
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface WorkflowDiagramProps {
  technicalFlow: string
  className?: string
}

export default function WorkflowDiagram({ technicalFlow, className = '' }: WorkflowDiagramProps) {
  const reduced = useReducedMotion()

  const steps = technicalFlow
    .split(/→|->/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (steps.length < 2) return null

  return (
    <div className={`overflow-x-auto pb-2 ${className}`}>
      <div
        className="flex items-center gap-0"
        style={{ minWidth: `${steps.length * 160}px` }}
        role="img"
        aria-label={`Workflow: ${steps.join(' → ')}`}
      >
        {steps.map((step, i) => {
          const { icon, color, bg } = getNodeIcon(step)
          const isLast = i === steps.length - 1

          return (
            <div key={i} className="flex items-center" style={{ flex: isLast ? '0 0 auto' : 1 }}>
              {/* Node */}
              <motion.div
                className="flex flex-col items-center gap-2 shrink-0"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
              >
                {/* Icon badge */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border"
                  style={{
                    background: bg,
                    borderColor: `${color}40`,
                    boxShadow: `0 0 12px ${color}20`,
                  }}
                >
                  {icon}
                </div>

                {/* Step label */}
                <div
                  className="text-center rounded-lg border px-3 py-2"
                  style={{
                    background: 'rgba(15,23,42,0.8)',
                    borderColor: `${color}30`,
                    boxShadow: `0 0 10px ${color}10`,
                    maxWidth: '120px',
                  }}
                >
                  <p
                    className="text-[11px] font-medium leading-tight"
                    style={{ color }}
                  >
                    {step}
                  </p>
                </div>
              </motion.div>

              {/* Connector */}
              {!isLast && (
                <div className="relative flex-1 mx-1" style={{ height: '2px', minWidth: '32px' }}>
                  {/* Line */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.4), rgba(99,102,241,0.4))', originX: 0 }}
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.1 + 0.2 }}
                  />
                  {/* Traveling dot */}
                  {!reduced && (
                    <TravelingDot delay={i * 0.35 + 0.5} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
