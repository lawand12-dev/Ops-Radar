'use client'

import { useReducedMotion } from 'framer-motion'

/**
 * Renders children with a slowly shifting blue → cyan → purple gradient.
 * Falls back to a static gradient when prefers-reduced-motion is set.
 */
export default function AnimatedGradientText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <span
      className={`${reduced ? 'text-blue-gradient' : 'text-gradient-animated'} ${className ?? ''}`}
    >
      {children}
    </span>
  )
}
