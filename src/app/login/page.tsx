'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { safeInternalRedirect } from '<npm>/lib/security';
import { Button } from '<npm>/components/ui/button';
import { Input } from '<npm>/components/ui/input';
import { Label } from '<npm>/components/ui/label';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
          <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
        </div>
      }
    >
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
      setError("Email or password didn’t match. Try again.");
      setLoading(false);
      return;
    }

    router.replace(redirectTo);
  }

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Minimal auth header */}
      <div className="flex justify-center pt-10 pb-0 px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-fg)]"
          aria-label="OpsRadar home"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden="true"
            className="text-[var(--color-primary)]"
          >
            <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
            <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
            <circle cx="11" cy="11" r="1.4" fill="currentColor" />
          </svg>
          <span className="font-serif text-[1.0625rem] tracking-[-0.01em]">OpsRadar</span>
        </Link>
      </div>

      {/* Form area */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-h1 tracking-[-0.025em] text-[var(--color-fg)] text-balance">
            Welcome back.
          </h1>
          <p className="mt-2 text-body text-[var(--color-fg-muted)]">
            Sign in to your OpsRadar account.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-[var(--radius)] border border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5"
            >
              <p className="text-body-sm text-[var(--color-danger)]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
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
  );
}
