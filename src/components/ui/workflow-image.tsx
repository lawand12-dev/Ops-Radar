"use client"

import { useState } from "react"
import Image from "next/image"

interface WorkflowImageProps {
  src: string
  alt: string
  sizes?: string
}

export default function WorkflowImage({ src, alt, sizes = "(max-width: 768px) 100vw, 896px" }: WorkflowImageProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.12)]"
      style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          width={1400}
          height={800}
          className="block w-full h-auto"
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-white/[0.03]"
          style={{ aspectRatio: '1400/800' }}
        >
          <span className="text-sm text-white/30 tracking-wide">Screenshot coming</span>
        </div>
      )}
    </div>
  )
}
