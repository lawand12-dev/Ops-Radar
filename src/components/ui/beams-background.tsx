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
  speed: 0.6,
  noiseIntensity: 1,
  scale: 0.2,
  rotation: 43,
} as const

// Gradient fallback — uses the same visual language as the beams
// (dark base with subtle blue / violet streaks) so the fade between
// fallback and canvas is invisible. Kept in sync with the copy in
// beams-background-lazy.tsx so that wrapper doesn't need a static
// import back into this module (which would defeat the code split).
const BEAMS_FALLBACK_BACKGROUND =
  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)," +
  "radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139,92,246,0.10) 0%, transparent 60%)," +
  "linear-gradient(180deg, #000000 0%, #050810 50%, #000000 100%)"

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
  // Home hero animates continuously; secondary pages render on
  // demand so the canvas doesn't burn CPU when the beams are purely
  // decorative.
  const frameloop: "always" | "demand" = isSubtle ? "demand" : "always"

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-0 z-0 overflow-hidden"
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
          transition: "opacity 700ms ease-out",
          background: BEAMS_FALLBACK_BACKGROUND,
        }}
      />

      {/* Three.js canvas — fades in once the first frame has rendered */}
      <div
        className="absolute inset-0"
        style={{
          opacity: canvasReady ? 1 : 0,
          transition: "opacity 700ms ease-out",
        }}
      >
        {isVisible && (
          <BeamsCanvas
            {...config}
            frameloop={frameloop}
            onReady={handleCanvasReady}
          />
        )}
      </div>
    </div>
  )
}
