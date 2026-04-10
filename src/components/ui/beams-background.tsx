"use client"

import { useRef, useState, useEffect, useCallback } from "react"
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
  const [canvasReady, setCanvasReady] = useState(false)

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

  const handleCanvasReady = useCallback(() => {
    setCanvasReady(true)
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
      {/* CSS gradient fallback — renders instantly while Three.js initializes */}
      <div
        className="absolute inset-0"
        style={{
          opacity: canvasReady ? 0 : 1,
          transition: "opacity 400ms ease-out",
          background: "linear-gradient(43deg, #000000 0%, #000000 100%)",
        }}
      >
        {/* Animated faint beam streaks via pure CSS */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(" +
              "43deg, " +
              "transparent, " +
              "transparent 8%, " +
              "rgba(255,255,255,0.015) 8.5%, " +
              "transparent 9%, " +
              "transparent 14%, " +
              "rgba(255,255,255,0.025) 14.5%, " +
              "transparent 15%, " +
              "transparent 22%, " +
              "rgba(255,255,255,0.01) 22.5%, " +
              "transparent 23%, " +
              "transparent 35%, " +
              "rgba(255,255,255,0.02) 35.5%, " +
              "transparent 36%" +
              ")",
            animation: "beamsFallbackShift 8s linear infinite",
          }}
        />
        {/* Soft glow spot */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(255,255,255,0.04), transparent 70%)",
          }}
        />
      </div>
      {isVisible && <BeamsCanvas {...config} onReady={handleCanvasReady} />}
    </div>
  )
}
