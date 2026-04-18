'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function WasteCalculator() {
  const [teamSize, setTeamSize] = useState(8)
  const [hoursPerWeek, setHoursPerWeek] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(85)

  const annualWaste = useMemo(
    () => hoursPerWeek * 52 * hourlyRate,
    [hoursPerWeek, hourlyRate],
  )
  const monthlyWaste = Math.round(annualWaste / 12)

  const formattedAnnual = annualWaste.toLocaleString()
  const formattedMonthly = monthlyWaste.toLocaleString()

  return (
    <section className="relative px-6 py-24 md:py-32 border-t border-white/[0.06]">
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Eyebrow */}
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4 text-center">
          Run the math
        </p>

        {/* Headline */}
        <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white mb-4 text-center leading-[1.1]">
          See what your agency is losing.
        </h2>

        {/* Subheadline */}
        <p className="text-white/55 text-center mb-16 text-base md:text-lg max-w-xl mx-auto">
          30 seconds. No sign-up. Move the sliders to match your operation.
        </p>

        {/* Big number */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
            Your annual waste
          </p>
          <p className="font-headline text-[clamp(52px,10vw,120px)] font-black text-white tracking-[-0.04em] tabular-nums leading-none mb-5">
            ${formattedAnnual}
          </p>
          <p className="text-white/55 text-sm md:text-base max-w-md mx-auto leading-relaxed">
            ≈ ${formattedMonthly} burned every month on work a workflow could do
          </p>
        </div>

        {/* Sliders */}
        <div className="space-y-9 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-10 backdrop-blur-sm">
          {/* Team size */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <label htmlFor="team-size-slider" className="text-white/70 text-sm font-medium">
                Team size
              </label>
              <span className="text-white font-semibold tabular-nums text-base">
                {teamSize} {teamSize === 1 ? 'person' : 'people'}
              </span>
            </div>
            <input
              id="team-size-slider"
              type="range"
              min="1"
              max="30"
              step="1"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="waste-slider w-full"
              aria-label="Team size"
            />
          </div>

          {/* Hours/week */}
          <div>
            <div className="flex items-baseline justify-between mb-4 gap-4">
              <label htmlFor="hours-slider" className="text-white/70 text-sm font-medium">
                Hours/week your team spends on manual work
              </label>
              <span className="text-white font-semibold tabular-nums text-base shrink-0">
                {hoursPerWeek}h
              </span>
            </div>
            <input
              id="hours-slider"
              type="range"
              min="1"
              max="60"
              step="1"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="waste-slider w-full"
              aria-label="Hours per week on manual work"
            />
          </div>

          {/* Hourly rate */}
          <div>
            <div className="flex items-baseline justify-between mb-4 gap-4">
              <label htmlFor="rate-slider" className="text-white/70 text-sm font-medium">
                Average blended hourly rate
              </label>
              <span className="text-white font-semibold tabular-nums text-base shrink-0">
                ${hourlyRate}/hr
              </span>
            </div>
            <input
              id="rate-slider"
              type="range"
              min="40"
              max="200"
              step="5"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="waste-slider w-full"
              aria-label="Average hourly rate"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/audit"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-black font-semibold text-base hover:bg-white/90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:shadow-[0_0_60px_rgba(255,255,255,0.35)]"
          >
            See exactly which workflows burn this money
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="text-white/40 text-sm mt-5">
            3-minute audit · real workflow recommendations · no credit card
          </p>
        </div>
      </div>
    </section>
  )
}
