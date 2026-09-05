'use client'

import { useState, useEffect } from 'react'

type TocStep = { id: string; n: string; tag: string }

export function StepsTOC({ steps }: { steps: TocStep[] }) {
  const [active, setActive] = useState<string>(steps[0]?.id ?? '')

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    steps.forEach((step) => {
      const el = document.getElementById(step.id)
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(step.id)
        },
        { threshold: 0.25, rootMargin: '-80px 0px -50% 0px' },
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((obs) => obs.disconnect())
  }, [steps])

  return (
    <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
      <p className="text-label text-[var(--color-fg-subtle)] mb-6 tracking-[0.1em]">Steps</p>
      <nav>
        <ol className="relative border-l border-[var(--color-border)]">
          {steps.map((step) => {
            const isActive = active === step.id
            return (
              <li key={step.id} className="relative">
                {/* Active track indicator */}
                <span
                  className="absolute -left-px top-0 bottom-0 w-[2px] transition-all duration-300"
                  style={{
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                  }}
                />
                <a
                  href={`#${step.id}`}
                  className="group flex flex-col gap-0.5 pl-6 pr-2 py-4 no-underline transition-colors duration-[var(--duration-fast)]"
                >
                  <span
                    className={[
                      'font-mono text-[11px] tracking-[0.1em] transition-colors duration-[var(--duration-fast)]',
                      isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-fg-faint)] group-hover:text-[var(--color-fg-subtle)]',
                    ].join(' ')}
                  >
                    {step.n}
                  </span>
                  <span
                    className={[
                      'text-body font-medium leading-snug transition-colors duration-[var(--duration-fast)]',
                      isActive ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)]',
                    ].join(' ')}
                  >
                    {step.tag}
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </aside>
  )
}
