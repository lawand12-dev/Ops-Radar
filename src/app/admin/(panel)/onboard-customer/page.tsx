'use client';

import { useState } from 'react';
import { Button } from '<npm>/components/ui/button';
import { Input } from '<npm>/components/ui/input';
import { Label } from '<npm>/components/ui/label';
import { Badge } from '<npm>/components/ui/badge';

export default function OnboardCustomerPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [email, setEmail] = useState('');
  const [n8nBaseUrl, setN8nBaseUrl] = useState('');
  const [n8nWebhookSecret, setN8nWebhookSecret] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [chatv2ProjectId, setChatv2ProjectId] = useState('');
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
        body: JSON.stringify({ email, n8nBaseUrl, n8nWebhookSecret, n8nApiKey, chatv2ProjectId }),
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
      setChatv2ProjectId('');
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Admin /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Onboard customer</span>
        </div>
      </div>

      {/* Page heading */}
      <div>
        <h1 className="font-serif text-h2 tracking-[-0.02em] text-[var(--color-fg)]">
          Onboard customer
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Provision a new customer account and send their magic-link invite.
        </p>
      </div>

        {/* Two-column layout: form left, context right */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_300px] gap-8 items-start">

          {/* ── Form column ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-md">

            {/* Section 1: Admin auth */}
            <div className="flex flex-col gap-3">
              <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider">Admin auth</p>
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
            </div>

            {/* Section 2: Customer */}
            <div className="flex flex-col gap-3">
              <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider">Customer</p>
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
            </div>

            {/* Section 3: Automation config */}
            <div className="flex flex-col gap-3">
              <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider">Automation config from chatv2</p>
              <div className="flex flex-col gap-4">
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="chatv2-project-id">chatv2 project ID</Label>
                  <Input
                    id="chatv2-project-id"
                    type="text"
                    value={chatv2ProjectId}
                    onChange={e => setChatv2ProjectId(e.target.value)}
                    placeholder="proj_abc123"
                    className="font-mono"
                  />
                  <p className="text-caption text-[var(--color-fg-subtle)]">
                    Leave blank if this customer has no chatv2 project yet. Can be added later.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit + result */}
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Onboarding…' : 'Onboard + send invite'}
              </Button>

              {result?.kind === 'success' && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-4 py-3.5">
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
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" dot>Error</Badge>
                  </div>
                  <p className="text-body-sm text-[var(--color-danger)] leading-relaxed">{result.message}</p>
                </div>
              )}
            </div>

          </form>

          {/* ── Context panel (right column) ── */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider mb-4">
              What happens when you submit
            </p>

            <ol className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] text-[var(--color-primary)] flex items-center justify-center text-caption font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-fg)]">Create Supabase user</p>
                  <p className="text-body-sm text-[var(--color-fg-muted)] mt-0.5">
                    A new account is created with the customer&apos;s email.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] text-[var(--color-primary)] flex items-center justify-center text-caption font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-fg)]">Link automation config</p>
                  <p className="text-body-sm text-[var(--color-fg-muted)] mt-0.5">
                    Their n8n base URL, webhook secret, API key, and chatv2 project ID are saved to <code className="text-caption font-mono">client_n8n_config</code>.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] text-[var(--color-primary)] flex items-center justify-center text-caption font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-fg)]">Send magic-link invite</p>
                  <p className="text-body-sm text-[var(--color-fg-muted)] mt-0.5">
                    Resend delivers a passwordless login email. They click it &rarr; land on <code className="text-caption font-mono">/dashboard</code>.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex items-start gap-2">
              <Badge variant="outline">Atomic</Badge>
              <p className="text-caption text-[var(--color-fg-subtle)]">
                If any step fails, the whole onboard rolls back. Nothing partial.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
}
