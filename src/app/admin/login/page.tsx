"use client"

import { Suspense } from 'react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeInternalRedirect } from '<npm>/lib/security'
import { Button } from '<npm>/components/ui/button'
import { Input } from '<npm>/components/ui/input'
import { Label } from '<npm>/components/ui/label'

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
          <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  )
}

function AdminLoginContent() {
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

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex flex-col">
      {/* Minimal auth header */}
      <div className="flex justify-center pt-10 pb-0 px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-fg)]"
          aria-label="OpsRadar home"
        >
          <Image
            src="/logo.png"
            alt="OpsRadar"
            width={22}
            height={22}
            className="h-[22px] w-auto rounded-[4px]"
          />
          <span className="font-serif text-[1.0625rem] tracking-[-0.01em]">OpsRadar</span>
        </Link>
      </div>

      {/* Form area */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="text-label text-[var(--color-fg-subtle)] mb-4">OpsRadar · Admin</p>
          <h1 className="font-serif text-h1 tracking-[-0.025em] text-[var(--color-fg)] text-balance">
            Operator sign-in.
          </h1>
          <p className="mt-2 text-body text-[var(--color-fg-muted)]">
            This is the operator console. Customers sign in at{' '}
            <Link
              href="/login"
              className="text-[var(--color-primary)] hover:underline underline-offset-4 transition-colors"
            >
              /login
            </Link>
            .
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-[var(--radius)] border border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5"
            >
              <p className="text-body-sm text-[var(--color-danger)]">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-1"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in.'}
            </Button>
          </form>
        </div>
      </main>

      {/* Minimal auth footer */}
      <footer className="flex justify-center pb-10 px-6">
        <p className="text-caption text-[var(--color-fg-subtle)]">
          © {year} OpsRadar&nbsp;&nbsp;·&nbsp;&nbsp;
          <Link
            href="/privacy"
            className="hover:text-[var(--color-fg)] transition-colors"
          >
            Privacy
          </Link>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <Link
            href="/terms"
            className="hover:text-[var(--color-fg)] transition-colors"
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  )
}
