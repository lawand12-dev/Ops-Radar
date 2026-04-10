"use client"

import { useRef, useState, useEffect } from "react"
import dynamic from "next/dynamic"

const BeamsCanvas = dynamic(() => import("./beams-canvas"), {
  ssr: false,
  loading: () => null,
})

const FULL_CONFIG = {
  beamWidth: 2.5,
  beamHeight: 18,
  beamNumber: 15,
  lightColor: "#ffffff",
  speed: 2.5,
  noiseIntensity: 2,
  scale: 0.15,
  rotation: 43,
} as const

const SUBTLE_CONFIG = {
  beamWidth: 2,
  beamHeight: 15,
  beamNumber: 6,
  lightColor: "#ffffff",
  speed: 1.5,
  noiseIntensity: 1,
  scale: 0.2,
  rotation: 43,
} as const

interface BeamsBackgroundProps {
  intensity: "full" | "subtle"
}

export default function BeamsBackground({ intensity }: BeamsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const config = intensity === "full" ? FULL_CONFIG : SUBTLE_CONFIG
  const isSubtle = intensity === "subtle"

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-0 z-0"
      style={
        isSubtle
          ? {
              height: 600,
              opacity: 0.5,
              maskImage:
                "linear-gradient(180deg, black 50%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, black 50%, transparent 100%)",
            }
          : { position: "absolute", inset: 0 }
      }
    >
      {/* CSS gradient fallback while canvas loads */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      {isVisible && <BeamsCanvas {...config} />}
    </div>
  )
}
