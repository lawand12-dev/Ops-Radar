'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  target: number
  prefix?: string
  suffix?: string
  duration?: number
  formatter?: (n: number) => string
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export default function AnimatedNumber({
  target,
  prefix = '',
  suffix = '',
  duration = 1400,
  formatter,
}: AnimatedNumberProps) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number | null>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true
        io.disconnect()

        const startTime = performance.now()
        const tick = (now: number) => {
          const elapsed = now - startTime
          const t = Math.min(elapsed / duration, 1)
          setValue(easeOutCubic(t) * target)
          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick)
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      },
      { threshold: 0.3 }
    )

    io.observe(el)
    return () => {
      io.disconnect()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  const display = formatter
    ? formatter(value)
    : Math.round(value).toLocaleString()

  const finalDisplay = formatter
    ? formatter(target)
    : Math.round(target).toLocaleString()

  return (
    <span ref={ref} data-animated-number data-target-value={`${prefix}${finalDisplay}${suffix}`}>
      {prefix}{display}{suffix}
    </span>
  )
}
