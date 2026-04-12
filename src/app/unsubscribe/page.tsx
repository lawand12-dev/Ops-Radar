"use client"
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }

    fetch(`/api/unsubscribe?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setState('success')
          setEmail(data.email ?? '')
        } else {
          setState('error')
        }
      })
      .catch(() => setState('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        {state === 'loading' && <p className="text-white/60">Processing...</p>}

        {state === 'success' && (
          <>
            <h1 className="text-3xl font-bold mb-4">You're unsubscribed</h1>
            <p className="text-white/70 mb-6">
              {email} will no longer receive follow-up emails from OpsRadar.
              Thanks for giving the audit a try.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-white/90"
            >
              Return to homepage
            </a>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-3xl font-bold mb-4">Unsubscribe failed</h1>
            <p className="text-white/70 mb-6">
              This unsubscribe link is invalid or expired. If you keep receiving
              emails you don't want, reply to any of them and I'll remove you manually.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-white/90"
            >
              Return to homepage
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <UnsubscribeContent />
    </Suspense>
  )
}
