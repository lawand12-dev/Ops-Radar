export const dynamic = 'force-dynamic'

'use client'

import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase' 

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '<npm>/components/ui/input'
import { Button } from '<npm>/components/ui/button'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requiresAuth = searchParams.get('auth') === 'required'

  async function handleLogin() {
    if (!password) {
      setError('Enter the admin password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({}),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Login failed.')
      }

      router.replace('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
      <div className="bg-surface-container-low p-8 rounded-[14px] shadow-lg w-full max-w-sm border border-outline-variant/10">
        <h1 className="font-headline font-bold text-[22px] tracking-[-0.02em] text-on-surface mb-6 text-center">Admin Login</h1>
        {requiresAuth && (
          <p className="text-[13px] text-on-surface-variant text-center mb-4">
            Sign in to access the admin dashboard.
          </p>
        )}
        <Input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
          className="px-4 py-2.5 h-auto rounded-[10px] text-[14px] bg-surface-container border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus-visible:border-primary/40 focus-visible:ring-primary/20"
        />
        <Button
          onClick={handleLogin}
          disabled={loading}
          variant="outline"
          className="mt-4 w-full h-auto bg-primary/8 border-primary/20 text-primary hover:bg-primary/15 hover:text-primary px-4 py-2.5 rounded-[10px] text-[14px] font-semibold disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Login'}
        </Button>
        {error && (
          <p className="mt-4 text-[13px] text-red-400 text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
