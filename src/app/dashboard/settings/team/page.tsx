'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

type Member = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  joined_at: string;
  is_you: boolean;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

type ApiResp = {
  org_id: string;
  you_are_owner: boolean;
  plan: string;
  seats_included: number;
  member_count: number;
  seats_remaining: number;
  members: Member[];
  pending_invitations: Invitation[];
};

type PageState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: ApiResp }
  | { kind: 'error'; message: string };

export default function TeamSettingsPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const r = await fetch('/api/dashboard/team');
      const data = (await r.json()) as ApiResp | { error: string };
      if ('error' in data) {
        setState({ kind: 'error', message: data.error });
      } else {
        setState({ kind: 'ok', data });
      }
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'load_failed' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setBanner(null);
    try {
      const r = await fetch('/api/dashboard/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && data.ok) {
        setInviteEmail('');
        setBanner({ kind: 'ok', text: `Invitation sent to ${inviteEmail.trim()}` });
        await load();
      } else if (r.status === 402) {
        setBanner({ kind: 'err', text: 'Seat limit reached — upgrade your plan to invite more team members.' });
      } else {
        setBanner({ kind: 'err', text: data.error ?? `Invite failed (${r.status})` });
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remove this team member? They will immediately lose access.')) return;
    await fetch(`/api/dashboard/team?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    await load();
  }

  async function handleCancelInvite(inviteId: string) {
    await fetch(`/api/dashboard/team?invitation_id=${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        <Link href="/dashboard/settings" className="hover:text-[var(--color-fg)]">Settings</Link>
        {' / '}
        <span className="font-semibold text-[var(--color-fg)]">Team</span>
      </div>

      <div>
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Team
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Invite team members to view the dashboard. Everyone you add sees the same data.
        </p>
      </div>

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load team: {state.message}</p>
      )}

      {state.kind === 'ok' && (
        <>
          <div className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div className="flex items-baseline justify-between">
              <p className="text-label text-[var(--color-fg-muted)]">
                Seats on {state.data.plan} plan
              </p>
              <p className="text-body-sm tabular-nums text-[var(--color-fg)]">
                <span className="font-semibold">{state.data.member_count}</span>
                <span className="text-[var(--color-fg-subtle)]"> of {state.data.seats_included} used</span>
              </p>
            </div>
          </div>

          {state.data.you_are_owner && (
            <form
              onSubmit={handleInvite}
              className="flex flex-wrap items-end gap-2 rounded-[var(--radius-lg,8px)] border border-dashed border-[var(--color-border)] p-3"
            >
              <div className="min-w-[200px] flex-1">
                <label className="block text-label text-[var(--color-fg-muted)]">Invite by email</label>
                <input
                  type="email"
                  required
                  placeholder="team@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-label text-[var(--color-fg-muted)]">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                  className="mt-1 h-9 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)]"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting || state.data.seats_remaining === 0}
                className="h-9 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-3 text-body-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          )}

          {banner && (
            <p className={`text-body-sm ${banner.kind === 'ok' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {banner.text}
            </p>
          )}

          <div>
            <p className="mb-2 text-label uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
              Members ({state.data.members.length})
            </p>
            <div className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              {state.data.members.map((m, i) => (
                <div
                  key={m.user_id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-[var(--color-border)]' : ''}`}
                >
                  <div className="flex-1">
                    <p className="text-body-sm font-medium text-[var(--color-fg)]">
                      {m.full_name || m.email}
                      {m.is_you && <span className="ml-2 text-label text-[var(--color-fg-subtle)]">(you)</span>}
                    </p>
                    <p className="text-label text-[var(--color-fg-subtle)]">{m.email}</p>
                  </div>
                  <span className="rounded bg-[var(--color-surface-sunken)] px-2 py-0.5 text-label text-[var(--color-fg-muted)] capitalize">
                    {m.role}
                  </span>
                  {state.data.you_are_owner && !m.is_you && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      aria-label={`Remove ${m.email}`}
                      className="text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {state.data.pending_invitations.length > 0 && (
            <div>
              <p className="mb-2 text-label uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
                Pending invitations ({state.data.pending_invitations.length})
              </p>
              <div className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                {state.data.pending_invitations.map((inv, i) => (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-[var(--color-border)]' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="text-body-sm text-[var(--color-fg)]">{inv.email}</p>
                      <p className="text-label text-[var(--color-fg-subtle)]">
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded bg-[var(--color-surface-sunken)] px-2 py-0.5 text-label text-[var(--color-fg-muted)] capitalize">
                      {inv.role}
                    </span>
                    {state.data.you_are_owner && (
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        aria-label={`Cancel invitation to ${inv.email}`}
                        className="text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
