'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { RetainerHealth, RetainerConfig } from '<npm>/lib/retainer';

const STATUS_STYLES = {
  on_track:    { dot: 'bg-[var(--color-success)]', text: 'On Track' },
  at_risk:     { dot: 'bg-[var(--color-warn)]',    text: 'At Risk' },
  over_budget: { dot: 'bg-[var(--color-danger)]',  text: 'Over Budget' },
} as const;

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function AddForm({
  onSave,
}: {
  onSave: (data: { client_name: string; monthly_amount_usd: number; included_hours: number }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount || !hours) return;
    setSaving(true);
    try {
      await onSave({
        client_name: name.trim(),
        monthly_amount_usd: Number(amount),
        included_hours: Number(hours),
      });
      setName('');
      setAmount('');
      setHours('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap gap-2 rounded-[var(--radius,6px)] border border-dashed border-[var(--color-border)] p-3"
    >
      <input
        className="h-8 min-w-[140px] flex-1 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        placeholder="Client name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="h-8 w-28 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        type="number"
        min="0"
        placeholder="$/month"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className="h-8 w-24 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        type="number"
        min="0"
        step="0.5"
        placeholder="hours"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={saving}
        className="h-8 rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-3 text-body-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add retainer'}
      </button>
    </form>
  );
}

export function RetainerTable({
  retainers,
  onAdd,
  onDelete,
}: {
  retainers: RetainerHealth[];
  onAdd: (data: { client_name: string; monthly_amount_usd: number; included_hours: number }) => Promise<void>;
  onDelete: (config: RetainerConfig) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <AddForm onSave={onAdd} />
      {retainers.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-muted)]">
          No retainer clients configured. Add one above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Client', 'Retainer', 'Included h', 'Logged h', 'Overage', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="py-2 pr-4 text-left font-medium text-[var(--color-fg-muted)] last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retainers.map((r) => {
                const s = STATUS_STYLES[r.status];
                return (
                  <tr key={r.config.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-[var(--color-fg)]">
                      {r.config.client_name_display}
                      {!r.harvest_matched && (
                        <span className="ml-2 text-label text-[var(--color-fg-subtle)]">(no Harvest match)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--color-fg-muted)]">
                      {fmtMoney(r.config.monthly_amount_usd)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--color-fg-muted)]">
                      {r.config.included_hours}h
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--color-fg-muted)]">
                      {r.logged_hours}h
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {r.overage_hours > 0 ? (
                        <span className="text-[var(--color-danger)]">
                          +{r.overage_hours}h ({fmtMoney(r.overage_cost_usd)})
                        </span>
                      ) : (
                        <span className="text-[var(--color-fg-subtle)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <span className="text-[var(--color-fg-muted)]">{s.text}</span>
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => onDelete(r.config)}
                        aria-label={`Remove ${r.config.client_name_display}`}
                        className="text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
