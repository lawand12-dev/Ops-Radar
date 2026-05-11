'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '<npm>/components/ui/button';
import { Input } from '<npm>/components/ui/input';
import { Label } from '<npm>/components/ui/label';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Anti-enumeration: ignore the result. ALWAYS redirect to check-email.
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    router.replace('/login/check-email');
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
            Reset your password.
          </h1>
          <p className="mt-2 text-body text-[var(--color-fg-muted)]">
            Enter your email and we&apos;ll send a reset link. It expires in 15 minutes.
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

            <Button
              type="submit"
              size="lg"
              className="w-full mt-1"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send reset link.'}
            </Button>
          </form>

          <p className="mt-6 text-center text-body-sm text-[var(--color-fg-muted)]">
            <Link
              href="/login"
              className="hover:text-[var(--color-fg)] transition-colors"
            >
              ← Back to sign in
            </Link>
          </p>
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
