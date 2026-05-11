'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '<npm>/components/ui/button';
import { Input } from '<npm>/components/ui/input';
import { Label } from '<npm>/components/ui/label';
import { Badge } from '<npm>/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '<npm>/components/ui/card';

export default function OnboardCustomerPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [email, setEmail] = useState('');
  const [n8nBaseUrl, setN8nBaseUrl] = useState('');
  const [n8nWebhookSecret, setN8nWebhookSecret] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
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
        headers: {
          'content-type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ email, n8nBaseUrl, n8nWebhookSecret, n8nApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: 'error', message: data.error ?? 'Failed' });
        return;
      }
      setResult({ kind: 'success', userId: data.userId, email: data.email });
      // Clear sensitive fields, keep email visible
      setN8nWebhookSecret('');
      setN8nApiKey('');
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-6 pt-4">
        <div className="mx-auto max-w-[1100px] rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-2 shadow-[0_24px_90px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-1.5 text-caption text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)] transition-colors">
                <Image src="/logo.png" alt="OpsRadar" width={18} height={18} className="h-[18px] w-auto rounded-[4px]" />
                OpsRadar
              </Link>
              <span className="text-[var(--color-border-strong)]">/</span>
              <Link href="/admin" className="text-caption text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)] transition-colors">Admin</Link>
              <span className="text-[var(--color-border-strong)]">/</span>
              <span className="text-caption text-[var(--color-fg-muted)]">Onboard customer</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Page heading */}
          <div className="mb-6">
            <p className="text-label text-[var(--color-fg-subtle)] mb-2">Admin · Customer provisioning</p>
            <h1 className="font-serif text-h2 text-[var(--color-fg)] leading-tight tracking-[-0.02em]">
              Onboard customer
            </h1>
            <p className="mt-2 text-body-sm text-[var(--color-fg-muted)] leading-relaxed">
              Creates a Supabase user, inserts their automation config row,
              and sends a magic-link invite. Atomic&nbsp;&mdash; if either step fails, the user is rolled back.
            </p>
          </div>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-4">
              <CardTitle className="text-body font-medium">New customer details</CardTitle>
              <CardDescription>All fields required.</CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <form id="onboard-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-password">Admin password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer-email">Customer email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="agency@example.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="n8n-base-url">Automation base URL</Label>
                  <Input
                    id="n8n-base-url"
                    type="url"
                    required
                    value={n8nBaseUrl}
                    onChange={e => setN8nBaseUrl(e.target.value)}
                    placeholder="https://customer.example.com"
                    className="font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="n8n-webhook-secret">Webhook secret</Label>
                  <Input
                    id="n8n-webhook-secret"
                    type="password"
                    required
                    value={n8nWebhookSecret}
                    onChange={e => setN8nWebhookSecret(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="n8n-api-key">API key</Label>
                  <Input
                    id="n8n-api-key"
                    type="password"
                    required
                    value={n8nApiKey}
                    onChange={e => setN8nApiKey(e.target.value)}
                    className="font-mono"
                  />
                </div>

              </form>
            </CardContent>

            <CardFooter className="flex flex-col items-stretch gap-3 border-t border-[var(--color-border)] pt-4">
              <Button
                type="submit"
                form="onboard-form"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Onboarding…' : 'Onboard + send invite'}
              </Button>

              {result?.kind === 'success' && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-3.5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="success" dot>Onboarded</Badge>
                  </div>
                  <p className="text-body-sm text-[var(--color-success)] leading-relaxed">
                    {result.email} was provisioned successfully. Invite email sent.
                  </p>
                  <p className="text-caption text-[var(--color-fg-subtle)] mt-1 font-mono">{result.userId}</p>
                </div>
              )}

              {result?.kind === 'error' && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3.5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" dot>Error</Badge>
                  </div>
                  <p className="text-body-sm text-[var(--color-danger)] leading-relaxed">{result.message}</p>
                </div>
              )}
            </CardFooter>
          </Card>

        </div>
      </main>
    </div>
  );
}
