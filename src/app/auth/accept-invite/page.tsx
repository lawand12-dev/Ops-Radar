'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type State =
  | { kind: 'idle' }
  | { kind: 'accepting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error', message: 'Missing invitation token.' });
    }
  }, [token]);

  async function accept() {
    if (!token) return;
    setState({ kind: 'accepting' });
    try {
      const r = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string; message?: string };
      if (r.ok && data.ok) {
        setState({ kind: 'success' });
        // Brief pause so the user reads the confirmation, then go to dashboard
        setTimeout(() => router.push('/dashboard'), 1500);
      } else if (r.status === 401) {
        // Not signed in — redirect to login with return path
        const next = encodeURIComponent(`/auth/accept-invite?token=${token}`);
        router.push(`/login?next=${next}`);
      } else {
        setState({ kind: 'error', message: data.message ?? data.error ?? `Accept failed (${r.status})` });
      }
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Network error.' });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-md rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-sm">
        <h1 className="font-serif text-[24px] tracking-[-0.02em] text-[var(--color-fg)]">
          Join the team
        </h1>
        <p className="mt-2 text-body-sm text-[var(--color-fg-muted)]">
          You&apos;ve been invited to an OpsRadar team. Click below to accept.
        </p>

        {state.kind === 'idle' && (
          <button
            onClick={accept}
            disabled={!token}
            className="mt-6 inline-block rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-5 py-2.5 text-body-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Accept invitation
          </button>
        )}

        {state.kind === 'accepting' && (
          <p className="mt-6 text-body-sm text-[var(--color-fg-muted)]">Accepting…</p>
        )}

        {state.kind === 'success' && (
          <>
            <p className="mt-6 text-body-sm text-[var(--color-success)]">Joined. Redirecting to the dashboard…</p>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <p className="mt-6 text-body-sm text-[var(--color-danger)]">{state.message}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-body-sm text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Sign in →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
