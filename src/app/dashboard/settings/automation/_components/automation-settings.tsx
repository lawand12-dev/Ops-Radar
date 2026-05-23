'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';

type Policy = 'ask' | 'auto' | 'off';

type ToolRow = {
  tool_slug: string;
  display_name: string;
  connected: boolean;
  policy: Policy;
};

type Connection = { tool_slug: string; is_active: boolean };
type StoredPolicy = { tool_slug: string; policy: string };

// Display labels — mirrors COMPOSIO_TOOLS keys in src/lib/composio.ts.
const TOOLKITS: Array<{ slug: string; display: string }> = [
  { slug: 'stripe',            display: 'Stripe' },
  { slug: 'quickbooks',        display: 'QuickBooks' },
  { slug: 'xero',              display: 'Xero' },
  { slug: 'hubspot',           display: 'HubSpot' },
  { slug: 'pipedrive',         display: 'Pipedrive' },
  { slug: 'apollo',            display: 'Apollo' },
  { slug: 'clickup',           display: 'ClickUp' },
  { slug: 'asana',             display: 'Asana' },
  { slug: 'monday',            display: 'Monday.com' },
  { slug: 'harvest',           display: 'Harvest' },
  { slug: 'toggl',             display: 'Toggl' },
  { slug: 'gmail',             display: 'Gmail' },
  { slug: 'slack',             display: 'Slack' },
  { slug: 'google_calendar',   display: 'Google Calendar' },
  { slug: 'calendly',          display: 'Calendly' },
  { slug: 'google_analytics',  display: 'Google Analytics' },
  { slug: 'google_ads',        display: 'Google Ads' },
  { slug: 'facebook_ads',      display: 'Facebook Ads' },
  { slug: 'linkedin',          display: 'LinkedIn' },
  { slug: 'bamboo_hr',         display: 'BambooHR' },
  { slug: 'gusto',             display: 'Gusto' },
  { slug: 'docusign',          display: 'DocuSign' },
  { slug: 'typeform',          display: 'Typeform' },
  { slug: 'intercom',          display: 'Intercom' },
  { slug: 'zendesk',           display: 'Zendesk' },
];

const POLICY_OPTIONS: Array<{ value: Policy; label: string; icon: typeof ShieldCheck; help: string }> = [
  { value: 'ask',  label: 'Ask every time', icon: ShieldAlert, help: 'Write actions queue for your approval (recommended for new tools).' },
  { value: 'auto', label: 'Auto-approve',   icon: ShieldCheck, help: 'Write actions execute immediately — still logged for audit.' },
  { value: 'off',  label: 'Disabled',       icon: ShieldOff,   help: 'Write actions return an error to the model — useful while you evaluate.' },
];

export function AutomationSettings() {
  const [rows, setRows] = useState<ToolRow[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [connRes, polRes] = await Promise.all([
          fetch('/api/composio/connections'),
          fetch('/api/dashboard/tool-policies'),
        ]);
        const connectionsResp = connRes.ok
          ? ((await connRes.json()) as { connections?: Connection[] })
          : { connections: [] as Connection[] };
        const policiesResp = polRes.ok
          ? ((await polRes.json()) as { policies?: StoredPolicy[] })
          : { policies: [] as StoredPolicy[] };

        if (cancelled) return;

        const connectedSet = new Set<string>(
          (connectionsResp.connections ?? []).filter((c) => c.is_active).map((c) => c.tool_slug),
        );
        const policyMap = new Map<string, Policy>();
        for (const p of policiesResp.policies ?? []) {
          if (p.policy === 'ask' || p.policy === 'auto' || p.policy === 'off') {
            policyMap.set(p.tool_slug, p.policy);
          }
        }

        const built: ToolRow[] = TOOLKITS.map((t) => ({
          tool_slug: t.slug,
          display_name: t.display,
          connected: connectedSet.has(t.slug),
          policy: policyMap.get(t.slug) ?? 'ask',
        }));
        // Connected toolkits first so the customer sees what's actionable.
        built.sort((a, b) => {
          if (a.connected !== b.connected) return a.connected ? -1 : 1;
          return a.display_name.localeCompare(b.display_name);
        });
        setRows(built);
      } catch (err) {
        console.error('[automation-settings] load failed:', err);
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function setPolicy(toolSlug: string, policy: Policy) {
    setSaving(toolSlug);
    try {
      const res = await fetch('/api/dashboard/tool-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_slug: toolSlug, policy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((prev) => prev?.map((r) => (r.tool_slug === toolSlug ? { ...r, policy } : r)) ?? null);
      setSavedFlash(toolSlug);
      setTimeout(() => setSavedFlash((cur) => (cur === toolSlug ? null : cur)), 1200);
    } catch (err) {
      console.error('[automation-settings] save failed:', err);
    } finally {
      setSaving(null);
    }
  }

  if (rows === null) {
    return (
      <div className="flex items-center text-[12.5px] text-[var(--color-fg-muted)]">
        <Loader2 size={14} className="mr-2 animate-spin" /> Loading tools…
      </div>
    );
  }

  const connectedRows = rows.filter((r) => r.connected);
  const otherRows = rows.filter((r) => !r.connected);

  return (
    <div className="space-y-7">
      <section>
        <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Connected ({connectedRows.length})
        </h2>
        {connectedRows.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-[12.5px] text-[var(--color-fg-muted)]">
            No tools connected yet. Connect one at <a href="/dashboard/integrations" className="text-[var(--color-primary)] hover:underline">/dashboard/integrations</a>.
          </div>
        ) : (
          <ul className="space-y-2">
            {connectedRows.map((row) => (
              <PolicyRow
                key={row.tool_slug}
                row={row}
                saving={saving === row.tool_slug}
                savedFlash={savedFlash === row.tool_slug}
                onChange={(p) => void setPolicy(row.tool_slug, p)}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Not connected
        </h2>
        <ul className="space-y-2">
          {otherRows.map((row) => (
            <PolicyRow
              key={row.tool_slug}
              row={row}
              saving={saving === row.tool_slug}
              savedFlash={savedFlash === row.tool_slug}
              onChange={(p) => void setPolicy(row.tool_slug, p)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function PolicyRow({
  row,
  saving,
  savedFlash,
  onChange,
}: {
  row: ToolRow;
  saving: boolean;
  savedFlash: boolean;
  onChange: (p: Policy) => void;
}) {
  return (
    <li
      className={`rounded-[var(--radius)] border bg-[var(--color-surface)] p-3 ${
        row.connected ? 'border-[var(--color-border)]' : 'border-[var(--color-border)]/50 opacity-70'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--color-fg)]">{row.display_name}</span>
          {!row.connected && (
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-[1px] text-[10.5px] text-[var(--color-fg-subtle)]">
              not connected
            </span>
          )}
        </div>
        {savedFlash && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 size={12} /> saved
          </span>
        )}
        {saving && <Loader2 size={12} className="animate-spin text-[var(--color-fg-muted)]" />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {POLICY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = row.policy === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={!row.connected || saving}
              title={opt.help}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icon size={11.5} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </li>
  );
}
