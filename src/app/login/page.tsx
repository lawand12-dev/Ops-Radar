'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { safeInternalRedirect } from '<npm>/lib/security';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#E0F0FF' }}>Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');
  const redirectTo = safeInternalRedirect(searchParams.get('redirectTo'), '/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === 'invalid_or_expired_link'
      ? 'That link expired or is invalid. Sign in below.'
      : initialError === 'missing_code'
      ? 'Sign-in link was malformed. Try again.'
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    router.replace(redirectTo);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 6 }}>Sign in to OpsRadar</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22 }}>Welcome back.</p>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#FF4D4D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ fontSize: 12.5, color: '#00C2FF', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
