"use client"

import dynamic from "next/dynamic"

// Gradient fallback — must visually match the one inside
// beams-background.tsx so the hand-off between loading state and
// the real beams is invisible. Kept inline (rather than imported)
// so next/dynamic can actually split the Three.js bundle out.
const BEAMS_FALLBACK_BACKGROUND =
  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)," +
  "radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139,92,246,0.10) 0%, transparent 60%)," +
  "linear-gradient(180deg, #000000 0%, #050810 50%, #000000 100%)"

// Client-only wrapper that defers the ~600KB Three.js bundle until
// after the page content has loaded. The loading fallback renders
// an instant CSS gradient that visually matches the subtle beams,
// so there is never a flash of empty/wrong background on secondary
// pages (services / pricing / about / workflows).
const BeamsBackground = dynamic(() => import("./beams-background"), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-x-0 top-0 z-0 overflow-hidden"
      style={{
        height: 600,
        opacity: 0.5,
        maskImage:
          "linear-gradient(180deg, black 50%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, black 50%, transparent 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: BEAMS_FALLBACK_BACKGROUND }}
      />
    </div>
  ),
})

export default BeamsBackground
