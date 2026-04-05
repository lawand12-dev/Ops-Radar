'use client'

import { useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

/**
 * Wraps any card with a mouse-tracking radial glow.
 * The glow overlay is pointer-events-none so it never blocks clicks.
 */
export default function GlowCard({
  children,
  className,
  glowColor = 'rgba(59, 130, 246, 0.12)',
}: {
  children: React.ReactNode
  className?: string
  glowColor?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(Infinity)
  const mouseY = useMotionValue(Infinity)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = cardRef.current?.getBoundingClientRect()
      if (!rect) return
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY],
  )

  const handleMouseLeave = useCallback(() => {
    mouseX.set(Infinity)
    mouseY.set(Infinity)
  }, [mouseX, mouseY])

  const background = useTransform([mouseX, mouseY], ([x, y]: number[]) =>
    x === Infinity
      ? 'none'
      : `radial-gradient(480px circle at ${x}px ${y}px, ${glowColor}, transparent 65%)`,
  )

  // Border brightens near cursor: we compute the border color based on distance
  // to center — simplest proxy is just a hover class enhancement.
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group ${className ?? ''}`}
    >
      {/* Glow overlay — sits on top of bg, below content */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-[1] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ background }}
        aria-hidden
      />
      {/* Content */}
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}
