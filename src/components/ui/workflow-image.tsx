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
    <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.12)]">
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          style={{ objectPosition: 'center 60%' }}
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
          <span className="text-sm text-white/30 tracking-wide">Screenshot coming</span>
        </div>
      )}
    </div>
  )
}
