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
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_360px] gap-8 items-start">

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

          {/* ── Operator playbook (right column) ── */}
          <div className="sticky top-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 max-h-[calc(100vh-3.5rem)] overflow-y-auto">

            {/* ─ Section 1: Have these ready ─────────────────────────────── */}
            <section>
              <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider mb-3">
                Before you submit — have these ready
              </p>
              <ul className="space-y-3">
                <PrepItem
                  source="you"
                  label="Admin password"
                  hint={<>Same password you use to sign in at <code className="font-mono">/admin/login</code>. Configured via the <code className="font-mono">ADMIN_PASSWORD</code> env var on Vercel.</>}
                />
                <PrepItem
                  source="customer"
                  label="Customer email"
                  hint={<>A real inbox the customer can open — they receive the magic-link invite at this address, and it becomes their login. Lowercased server-side.</>}
                />
                <PrepItem
                  source="cto"
                  label="n8n base URL"
                  hint={<>HTTPS URL of their dedicated n8n instance, e.g. <code className="font-mono">https://acme.n8n.cloud</code>. Provisioned by the CTO during automation setup. <code className="font-mono">localhost</code> only allowed in dev.</>}
                />
                <PrepItem
                  source="cto"
                  label="Webhook secret"
                  hint={<>Shared random string that signs webhooks between n8n and OpsRadar. CTO generates this — the same value lives inside the customer&apos;s n8n credentials. Treat it like a password (long, random, no spaces).</>}
                />
                <PrepItem
                  source="cto"
                  label="n8n API key"
                  hint={<>Personal API key from the customer&apos;s n8n. In n8n: <span className="text-[var(--color-fg-muted)]">Settings → API → Create an API Key</span>. Used to fetch workflow executions live for the dashboard.</>}
                />
                <PrepItem
                  source="cto"
                  label={<>chatv2 project ID <span className="text-[var(--color-fg-faint)] font-normal">(optional)</span></>}
                  hint={<>Project slug from chatv2 admin at <code className="font-mono">opstest.atta.codes</code>. Drives the per-customer Automation ROI widget. Leave blank if not set up yet — you can add it later by editing the row in <code className="font-mono">client_n8n_config</code>.</>}
                />
              </ul>
            </section>

            {/* ─ Section 2: What happens ──────────────────────────────────── */}
            <section className="mt-6 border-t border-[var(--color-border)] pt-5">
              <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider mb-3">
                What happens when you submit
              </p>
              <ol className="space-y-3">
                <StepItem
                  n={1}
                  title="Validate"
                  body={<>Admin password is checked. The n8n URL must parse as a valid URL and use HTTPS (or be localhost). Email + URL + secret + API key are all required.</>}
                />
                <StepItem
                  n={2}
                  title="Create user + send magic link"
                  body={<>One Supabase call — <code className="font-mono">auth.admin.inviteUserByEmail</code> — both inserts the row into <code className="font-mono">auth.users</code> AND fires the invite email through Resend.</>}
                />
                <StepItem
                  n={3}
                  title="Link automation config"
                  body={<>Inserts a row into <code className="font-mono">client_n8n_config</code> keyed by the new user&apos;s id, storing the n8n base URL, webhook secret, API key, and (optional) chatv2 project ID.</>}
                />
              </ol>
            </section>

            {/* ─ Section 3: After it succeeds ─────────────────────────────── */}
            <section className="mt-6 border-t border-[var(--color-border)] pt-5">
              <p className="text-label text-[var(--color-fg-subtle)] uppercase tracking-wider mb-3">
                After it succeeds
              </p>
              <ul className="space-y-2 pl-5 list-disc marker:text-[var(--color-fg-faint)]">
                <li className="text-caption text-[var(--color-fg-muted)] leading-relaxed">
                  Customer receives an OpsRadar invite email from Resend within ~30 seconds.
                </li>
                <li className="text-caption text-[var(--color-fg-muted)] leading-relaxed">
                  They click the link → <code className="font-mono">/auth/callback</code> → <code className="font-mono">/dashboard</code>.
                </li>
                <li className="text-caption text-[var(--color-fg-muted)] leading-relaxed">
                  The dashboard immediately starts reading live data from their n8n via the config row you just created.
                </li>
                <li className="text-caption text-[var(--color-fg-muted)] leading-relaxed">
                  You can verify the row landed by opening <code className="font-mono">/admin/data</code> → <span className="text-[var(--color-fg-muted)]">client_n8n_config</span> table.
                </li>
              </ul>
            </section>

            {/* ─ Footer: Atomic guarantee ─────────────────────────────────── */}
            <div className="mt-6 border-t border-[var(--color-border)] pt-4 flex items-start gap-2">
              <Badge variant="outline">Atomic</Badge>
              <p className="text-caption text-[var(--color-fg-subtle)] leading-relaxed">
                If the invite succeeds but the config insert fails, the new user is automatically deleted — no orphaned accounts left behind.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Playbook helpers
// ────────────────────────────────────────────────────────────────────────────

type Source = 'you' | 'cto' | 'customer';

const SOURCE_META: Record<Source, { label: string; className: string }> = {
  you: {
    label: 'You',
    className: 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] border-[color-mix(in_srgb,var(--color-primary)_28%,transparent)] text-[var(--color-primary)]',
  },
  cto: {
    label: 'CTO',
    className: 'bg-[color-mix(in_srgb,var(--color-warn,#FBBF24)_12%,transparent)] border-[color-mix(in_srgb,var(--color-warn,#FBBF24)_28%,transparent)] text-[var(--color-warn,#FBBF24)]',
  },
  customer: {
    label: 'Customer',
    className: 'bg-[color-mix(in_srgb,var(--color-success,#34D399)_12%,transparent)] border-[color-mix(in_srgb,var(--color-success,#34D399)_28%,transparent)] text-[var(--color-success,#34D399)]',
  },
};

function PrepItem({
  source,
  label,
  hint,
}: {
  source: Source;
  label: React.ReactNode;
  hint: React.ReactNode;
}) {
  const meta = SOURCE_META[source];
  return (
    <li>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-body-sm font-medium text-[var(--color-fg)]">{label}</p>
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-[1px] text-[9.5px] font-mono uppercase tracking-[0.08em] ${meta.className}`}
        >
          {meta.label}
        </span>
      </div>
      <p className="text-caption text-[var(--color-fg-muted)] leading-relaxed">{hint}</p>
    </li>
  );
}

function StepItem({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] text-[var(--color-primary)] flex items-center justify-center text-caption font-bold shrink-0 mt-0.5">
        {n}
      </span>
      <div>
        <p className="text-body-sm font-medium text-[var(--color-fg)]">{title}</p>
        <p className="text-caption text-[var(--color-fg-muted)] leading-relaxed mt-0.5">{body}</p>
      </div>
    </li>
  );
}
