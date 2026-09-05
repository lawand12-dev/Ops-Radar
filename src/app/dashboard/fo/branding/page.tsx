'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlanGate } from '../../_components/plan-gate';

type Branding = {
  brand_name: string | null;
  logo_url: string | null;
  accent_color: string | null;
  email_from_name: string | null;
};

type ApiResp =
  | { branding: Branding }
  | { status: 'upgrade_required'; required_plan: string }
  | { error: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'upgrade_required' }
  | { kind: 'ok'; branding: Branding }
  | { kind: 'error' };

export default function FoBrandingPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/fo/branding');
        const resp = (await r.json()) as ApiResp;
        if ('branding' in resp) {
          setBrandName(resp.branding.brand_name ?? '');
          setLogoUrl(resp.branding.logo_url ?? '');
          setAccentColor(resp.branding.accent_color ?? '');
          setEmailFromName(resp.branding.email_from_name ?? '');
          setState({ kind: 'ok', branding: resp.branding });
        } else if ('status' in resp && resp.status === 'upgrade_required') {
          setState({ kind: 'upgrade_required' });
        } else {
          setState({ kind: 'error' });
        }
      } catch {
        setState({ kind: 'error' });
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const r = await fetch('/api/fo/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName.trim() || null,
          logo_url: logoUrl.trim() || null,
          accent_color: accentColor.trim() || null,
          email_from_name: emailFromName.trim() || null,
        }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string; branding?: Branding };
      if (r.ok && data.branding) {
        setState({ kind: 'ok', branding: data.branding });
        setBanner({ kind: 'ok', text: 'Branding saved. Refresh the dashboard to see your logo.' });
      } else {
        setBanner({ kind: 'err', text: data.error ?? `Save failed (${r.status}).` });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        <Link href="/dashboard/fo" className="hover:text-[var(--color-fg)]">My Agencies</Link>
        {' / '}
        <span className="font-semibold text-[var(--color-fg)]">Branding</span>
      </div>

      <div>
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          White-Label Branding
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Present OpsRadar as your firm. Your logo and accent color replace the OpsRadar header when you (or your team) view the dashboard.
        </p>
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="White-label branding" requiredPlan="fo" />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load branding.</p>
      )}

      {state.kind === 'ok' && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div>
            <label className="mb-1 block text-label text-[var(--color-fg-muted)]">Brand name</label>
            <input
              type="text"
              maxLength={80}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Acme Operations"
              className="w-full rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              Displayed next to your logo in the dashboard header.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-label text-[var(--color-fg-muted)]">Logo URL (https only)</label>
            <input
              type="url"
              maxLength={500}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://acmeops.com/logo.png"
              className="w-full rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              We&apos;ll display the image at the URL you provide. Recommended: 200x200 PNG with transparent background.
            </p>
            {logoUrl.startsWith('https://') && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 w-12 rounded border border-[var(--color-border)] object-contain" />
            )}
          </div>

          <div>
            <label className="mb-1 block text-label text-[var(--color-fg-muted)]">Accent color (#rrggbb)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                pattern="^#[0-9a-fA-F]{6}$"
                maxLength={7}
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {accentColor.match(/^#[0-9a-fA-F]{6}$/) && (
                <div
                  className="h-9 w-9 rounded border border-[var(--color-border)]"
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-label text-[var(--color-fg-muted)]">Email &ldquo;From&rdquo; name</label>
            <input
              type="text"
              maxLength={60}
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              placeholder="Acme Operations"
              className="w-full rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              Used as the sender name on alert + briefing emails (sender address stays opsradar.co).
            </p>
          </div>

          {banner && (
            <p className={`text-body-sm ${banner.kind === 'ok' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {banner.text}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save branding'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
