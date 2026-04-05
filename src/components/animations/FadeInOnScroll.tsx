'use client'

import { motion, useReducedMotion } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right'

const OFFSET: Record<Direction, { x?: number; y?: number }> = {
  up:    { y: 28 },
  down:  { y: -28 },
  left:  { x: 28 },
  right: { x: -28 },
}

export default function FadeInOnScroll({
  children,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  className,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  direction?: Direction
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, ...OFFSET[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration, delay, ease: [0.16, 1, 0.3, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}
