'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '<npm>/components/ui/badge'
import { SiteNav } from '<npm>/components/marketing/site-nav'
import { SiteFooter } from '<npm>/components/marketing/site-footer'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const handleUnsubscribe = async () => {
      if (!token) {
        setState('error')
        return
      }

      try {
        const response = await fetch(`/api/unsubscribe?token=${token}`)
        const data = await response.json()
        if (data.success) {
          setState('success')
          setEmail(data.email ?? '')
        } else {
          setState('error')
        }
      } catch {
        setState('error')
      }
    }

    void handleUnsubscribe()
  }, [token])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex flex-col">
      <SiteNav />

      <main className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-md w-full">
          {state === 'loading' && (
            <div className="text-center">
              <p className="text-body text-[var(--color-fg-muted)]">Processing...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center space-y-6">
              <div>
                <Badge variant="success" className="mb-4">Unsubscribed</Badge>
                <h1 className="mt-4 font-serif text-h2 tracking-[-0.02em] text-[var(--color-fg)]">
                  You&apos;re unsubscribed
                </h1>
              </div>
              <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">
                {email} will no longer receive follow-up emails from OpsRadar.
                Thanks for giving the audit a try.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-[var(--radius-sm)] font-medium hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                Return to homepage
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-6">
              <div>
                <Badge variant="warn" className="mb-4">Failed</Badge>
                <h1 className="mt-4 font-serif text-h2 tracking-[-0.02em] text-[var(--color-fg)]">
                  Unsubscribe failed
                </h1>
              </div>
              <p className="text-body leading-[1.6] text-[var(--color-fg-muted)]">
                This unsubscribe link is invalid or expired. If you keep receiving
                emails you don&apos;t want, reply to any of them and we&apos;ll remove you manually.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-[var(--radius-sm)] font-medium hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                Return to homepage
              </Link>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
      <UnsubscribeContent />
    </Suspense>
  )
}
