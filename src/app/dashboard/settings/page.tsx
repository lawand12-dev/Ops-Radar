'use client';

import { useEffect, useState } from 'react';

type Profile = {
  email: string;
  full_name: string;
  company_name: string;
  timezone: string;
  role: string;
  blended_hourly_rate_usd: number;
};

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

function initialsFrom(name: string, emailFallback: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    return trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase();
  }
  return emailFallback.slice(0, 2).toUpperCase() || '·';
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [blendedRate, setBlendedRate] = useState<number>(85);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { profile?: Profile; error?: string }) => {
        if (cancelled) return;
        if (j.profile) {
          setProfile(j.profile);
          setFullName(j.profile.full_name);
          setCompanyName(j.profile.company_name);
          setTimezone(j.profile.timezone || 'UTC');
          setBlendedRate(j.profile.blended_hourly_rate_usd ?? 85);
        } else {
          setBanner({ kind: 'err', text: j.error ?? 'Failed to load profile.' });
        }
      })
      .catch((err) => {
        if (!cancelled) setBanner({ kind: 'err', text: err instanceof Error ? err.message : 'Network error.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          company_name: companyName,
          timezone,
          blended_hourly_rate_usd: blendedRate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ kind: 'err', text: data.error ?? `Save failed (${res.status}).` });
        return;
      }
      setBanner({ kind: 'ok', text: 'Profile saved.' });
      // Refresh to update sidebar initials/name (which read from session metadata server-side)
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setBanner({ kind: 'err', text: err instanceof Error ? err.message : 'Network error.' });
    } finally {
      setSaving(false);
    }
  }

  const initials = initialsFrom(fullName, profile?.email ?? '');

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Profile
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          How you appear inside OpsRadar. These details only affect your own dashboard.
        </p>
      </div>

      {banner && (
        <div
          className={
            banner.kind === 'ok'
              ? 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-success)]'
              : 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]'
          }
        >
          {banner.text}
        </div>
      )}

      {loading ? (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      ) : (
        <form onSubmit={save} className="max-w-[520px]">
          <div className="mb-6 flex items-center gap-3.5">
            <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-[18px] font-bold tracking-[0.5px] text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-body-sm font-semibold text-[var(--color-fg)]">
                {profile?.email}
              </div>
              <div className="text-caption text-[var(--color-fg-subtle)]">
                Avatar derived from your name
              </div>
            </div>
          </div>

          <Field label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              placeholder="Jane Doe"
              autoComplete="name"
              className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            />
          </Field>

          <Field label="Company">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={80}
              placeholder="Acme Co."
              autoComplete="organization"
              className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            />
          </Field>

          <Field label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>

          <Field label="Blended hourly rate (USD)">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-[var(--color-fg-subtle)]">$</span>
              <input
                type="number"
                min={1}
                max={10000}
                step={1}
                value={blendedRate}
                onChange={(e) => setBlendedRate(Number(e.target.value))}
                className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-6 pr-3 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              Average cost per hour of team work delivered — used to calculate client margins.
            </p>
          </Field>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1 block text-[11.5px] font-medium text-[var(--color-fg)]">{label}</span>
      {children}
    </label>
  );
}
