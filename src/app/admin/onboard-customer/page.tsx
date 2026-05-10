'use client';

import { useState } from 'react';

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
    <div style={{ minHeight: '100vh', background: '#080C14', padding: 32, color: '#E0F0FF' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Onboard customer</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22, lineHeight: 1.5 }}>
          Creates a Supabase user, inserts their <code>client_n8n_config</code> row,
          and sends them a magic-link invite. Atomic &mdash; if either step fails, the user is rolled back.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Admin password" type="password" value={adminPassword} onChange={setAdminPassword} required />
          <Field label="Customer email" type="email" value={email} onChange={setEmail} required />
          <Field label="n8n base URL" type="url" placeholder="https://customer.n8n.cloud" value={n8nBaseUrl} onChange={setN8nBaseUrl} required />
          <Field label="n8n webhook secret" type="password" value={n8nWebhookSecret} onChange={setN8nWebhookSecret} required />
          <Field label="n8n API key" type="password" value={n8nApiKey} onChange={setN8nApiKey} required />

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {submitting ? 'Onboarding…' : 'Onboard + send invite'}
          </button>
        </form>

        {result?.kind === 'success' && (
          <div style={{ marginTop: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#4ADE80' }}>
            Onboarded {result.email} (user id: <code>{result.userId}</code>). Invite email sent.
          </div>
        )}

        {result?.kind === 'error' && (
          <div style={{ marginTop: 16, background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#FF4D4D' }}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none', fontFamily: 'monospace' }}
      />
    </label>
  );
}
