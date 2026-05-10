"use client"

import { Suspense } from 'react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeInternalRedirect } from '<npm>/lib/security'

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: {
          'x-admin-password': password,
        },
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Login failed')
      }

      const redirectTo = safeInternalRedirect(searchParams.get('redirectTo'), '/admin')
      router.replace(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">
      <div className="px-6 pt-4">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-white/12 bg-slate-950/72 p-2 shadow-[0_24px_90px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-3 py-1">
            <Link href="/" className="flex items-center gap-3 rounded-full px-2 py-1 text-white transition-opacity hover:opacity-90">
              <Image src="/logo.png" alt="OpsRadar" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-400 bg-clip-text font-headline text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                OpsRadar
              </span>
            </Link>
            <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold text-white/82">
              Admin
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-surface-container p-8 shadow-[0_30px_90px_rgba(2,6,23,0.24)]">
          <h1 className="mb-2 text-2xl font-bold text-on-surface">Admin Login</h1>
          <p className="mb-6 text-sm text-on-surface-variant">Secure access to the internal dashboard.</p>
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin Password"
            className="mb-6 w-full rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-2 text-on-surface"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
