'use client';

// CP-15: simplified to a plain magic-link invite. Tool credentials now
// live in Nango (OAuth) — the customer connects them themselves at
// /dashboard/integrations after sign-in. No more n8n config provisioning.

import { useState } from 'react';
import { Button } from '<npm>/components/ui/button';
import { Input } from '<npm>/components/ui/input';
import { Label } from '<npm>/components/ui/label';

export default function OnboardCustomerPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { kind: 'success'; userId: string; email: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/onboard-customer', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: 'error', message: data.error ?? 'Failed' });
        return;
      }
      setResult({ kind: 'success', userId: data.userId, email: data.email });
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Admin / <span className="font-semibold text-[var(--color-fg)]">Onboard customer</span>
        </div>
      </div>

      <div>
        <h1 className="font-serif text-h2 tracking-[-0.02em] text-[var(--color-fg)]">
          Onboard customer
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Provision a new customer account and send their magic-link invite.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_360px] gap-8 items-start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-md">
          <div className="flex flex-col gap-3">
            <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider">Admin auth</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-password">Admin password</Label>
              <Input
                id="admin-password"
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider">Customer</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@agency.com"
              />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Sending…' : 'Send invite'}
          </Button>

          {result?.kind === 'success' && (
            <div className="rounded-[var(--radius)] border border-emerald-500/30 bg-emerald-950/20 p-3 text-[12.5px] text-emerald-300">
              ✓ Invite sent to <strong>{result.email}</strong> (user id: <code className="font-mono text-[11px]">{result.userId}</code>). They&apos;ll receive a magic-link email to set their password.
            </div>
          )}
          {result?.kind === 'error' && (
            <div className="rounded-[var(--radius)] border border-red-500/30 bg-red-950/20 p-3 text-[12.5px] text-red-300">
              ✗ {result.message}
            </div>
          )}
        </form>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[12.5px] text-[var(--color-fg-muted)]">
          <p className="mb-2 text-label uppercase tracking-wider text-[var(--color-fg-subtle)]">
            What happens
          </p>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>Creates a Supabase <code className="font-mono">auth.users</code> row for the email.</li>
            <li>Sends a magic-link email so the customer can set a password.</li>
            <li>On first sign-in, they land on <code className="font-mono">/dashboard/integrations</code> to connect their tools via Nango OAuth.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
