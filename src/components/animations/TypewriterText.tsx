'use client'

import { useState, useEffect, useRef } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

export default function TypewriterText({
  text,
  speed = 35,
  delay = 0,
  cursor = true,
  className,
}: {
  text: string
  /** Milliseconds between characters. */
  speed?: number
  /** Milliseconds before typing starts (after entering view). */
  delay?: number
  cursor?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const reduced = useReducedMotion()

  const [displayed, setDisplayed] = useState(reduced ? text : '')
  const [done, setDone] = useState(reduced)

  useEffect(() => {
    if (reduced || !isInView) return

    let timeout: ReturnType<typeof setTimeout>
    let interval: ReturnType<typeof setInterval>

    timeout = setTimeout(() => {
      let i = 0
      interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)
    }, delay)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [isInView, text, speed, delay, reduced])

  return (
    <span ref={ref} className={className}>
      {displayed}
      {cursor && !done && (
        <span
          className="inline-block w-[2px] h-[0.9em] bg-current align-middle ml-[2px] badge-blink"
          aria-hidden
        />
      )}
    </span>
  )
}
