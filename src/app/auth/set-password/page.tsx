'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? 'Failed to set password.');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 6 }}>Set your password</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22 }}>Welcome to OpsRadar. Choose a password (at least 8 characters).</p>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#FF4D4D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
