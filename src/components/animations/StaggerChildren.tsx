'use client'

import { motion, useReducedMotion } from 'framer-motion'

const itemVariants = {
  hidden:  { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
}

/** Wrap a list of siblings — each child in StaggerItem will animate in sequence. */
export default function StaggerChildren({
  children,
  staggerDelay = 0.1,
  className,
}: {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-8% 0px' }}
      variants={{
        hidden:  {},
        visible: { transition: { staggerChildren: reduced ? 0 : staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Each direct child inside StaggerChildren. */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
