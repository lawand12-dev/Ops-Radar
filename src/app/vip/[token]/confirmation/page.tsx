'use client'

import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function VipConfirmation() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 text-center">
      <Image src="/logo.png" alt="OpsRadar" width={44} height={44} className="mb-6 rounded-xl" />
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/40 bg-blue-950/40">
        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-white">You&#39;re all set</h1>
      <p className="mt-3 max-w-sm text-sm text-gray-400">
        Your answers have been saved. Your consultant will review them before your strategy call.
        Look forward to seeing you soon!
      </p>
      <p className="mt-8 text-xs text-gray-600">OpsRadar — AI Operations Intelligence for Agencies</p>
    </div>
  )
}
