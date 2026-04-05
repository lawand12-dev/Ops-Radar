'use client'

import { useEffect, useRef } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export default function CountUp({
  target,
  duration = 1.5,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatter,
}: {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  /** Override the number formatting entirely. */
  formatter?: (n: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = useReducedMotion()
  const started = useRef(false)

  useEffect(() => {
    if (!isInView || started.current) return
    started.current = true

    if (reduced) {
      if (ref.current) {
        const display = formatter ? formatter(target) : target.toFixed(decimals)
        ref.current.textContent = `${prefix}${display}${suffix}`
      }
      return
    }

    const durationMs = duration * 1000
    const startTime = performance.now()
    let raf: number

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1)
      const val = easeOutCubic(t) * target
      if (ref.current) {
        const display = formatter ? formatter(val) : val.toFixed(decimals)
        ref.current.textContent = `${prefix}${display}${suffix}`
      }
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isInView, target, duration, prefix, suffix, decimals, formatter, reduced])

  const initial = formatter ? formatter(0) : (0).toFixed(decimals)

  return <span ref={ref}>{prefix}{initial}{suffix}</span>
}
