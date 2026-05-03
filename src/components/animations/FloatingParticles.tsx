'use client'

import { useReducedMotion } from 'framer-motion'

const PARTICLES = [
  { x: '7%',   y: '18%', size: 3, delay: '0s',    dur: '3.6s', opacity: 0.35 },
  { x: '18%',  y: '58%', size: 4, delay: '-1.2s', dur: '4.4s', opacity: 0.30 },
  { x: '33%',  y: '28%', size: 3, delay: '-0.4s', dur: '3.9s', opacity: 0.40 },
  { x: '50%',  y: '70%', size: 5, delay: '-2.1s', dur: '5.2s', opacity: 0.25 },
  { x: '66%',  y: '20%', size: 3, delay: '-0.9s', dur: '3.5s', opacity: 0.35 },
  { x: '80%',  y: '52%', size: 4, delay: '-1.7s', dur: '4.6s', opacity: 0.30 },
  { x: '91%',  y: '75%', size: 3, delay: '-0.2s', dur: '4.0s', opacity: 0.28 },
  { x: '14%',  y: '82%', size: 4, delay: '-1.0s', dur: '4.8s', opacity: 0.32 },
  { x: '44%',  y: '44%', size: 3, delay: '-2.5s', dur: '3.2s', opacity: 0.38 },
  { x: '74%',  y: '88%', size: 5, delay: '-0.6s', dur: '5.6s', opacity: 0.22 },
  { x: '58%',  y: '10%', size: 3, delay: '-1.4s', dur: '3.7s', opacity: 0.30 },
  { x: '26%',  y: '40%', size: 4, delay: '-3.0s', dur: '4.2s', opacity: 0.28 },
]

/** Renders subtle floating dots in the background. Returns null for reduced-motion users. */
export default function FloatingParticles({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) return null

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}
      aria-hidden
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? 'rgba(76,215,246,0.6)' : i % 3 === 1 ? 'rgba(173,198,255,0.6)' : 'rgba(139,92,246,0.5)',
            opacity: p.opacity,
            animation: `float-dot ${p.dur} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
