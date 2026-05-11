import { Plus, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Revenue MTD',      value: '$128,540', delta: '18.6%', trend: 'up'   as const },
  { label: 'Expenses MTD',     value: '$36,720',  delta: '4.2%',  trend: 'down' as const },
  { label: 'Net Profit',       value: '$91,820',  delta: '24.1%', trend: 'up'   as const },
  { label: 'Pending Invoices', value: '$32,110',  delta: '8',     trend: 'up'   as const },
];

const invoices = [
  { id: 'INV-0321', client: 'Acme Corp',     amount: '$18,250', due: 'Aug 14, 2024', status: 'Sent'    },
  { id: 'INV-0320', client: 'Crest Finance', amount: '$24,800', due: 'Aug 12, 2024', status: 'Paid'    },
  { id: 'INV-0319', client: 'Northwind',     amount: '$14,300', due: 'Aug 10, 2024', status: 'Paid'    },
  { id: 'INV-0318', client: 'BrightLab',     amount: '$9,800',  due: 'Aug 22, 2024', status: 'Sent'    },
  { id: 'INV-0317', client: 'Pulse Media',   amount: '$11,200', due: 'Aug 05, 2024', status: 'Overdue' },
  { id: 'INV-0316', client: 'GreenPlex',     amount: '$6,400',  due: 'Aug 28, 2024', status: 'Draft'   },
  { id: 'INV-0315', client: 'ScaleUp',       amount: '$7,650',  due: 'Aug 18, 2024', status: 'Sent'    },
];

const STATUS_BADGE: Record<string, string> = {
  Paid:    'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]',
  Sent:    'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]',
  Overdue: 'bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]',
  Draft:   'bg-[var(--color-surface-sunken)] text-[var(--color-fg-muted)]',
};

const expenseBreakdown = [
  { label: 'Salaries',          amount: 22400, color: '#818CF8' },
  { label: 'Software & Tools',  amount: 4820,  color: '#A5B4FC' },
  { label: 'Marketing',         amount: 5300,  color: '#A78BFA' },
  { label: 'Office',            amount: 2400,  color: '#34D399' },
  { label: 'Other',             amount: 1800,  color: '#FBBF24' },
];

export default function FinancialsPage() {
  const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Financials"
        subtitle="Revenue, spend, and margin — surfaced from your billing tools."
        actions={
          <>
            <SecondaryButton>
              <Download size={13} />
              Export
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New invoice
            </PrimaryButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="mb-4 flex gap-3.5">
        {/* Cash flow summary */}
        <Card title="Cash flow" style={{ flex: '0 0 60%' }}>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-4.5 py-4">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]">
                  <ArrowUpRight size={14} className="text-[var(--color-success)]" />
                </div>
                <span className="text-caption font-medium text-[var(--color-fg-muted)]">Inflow</span>
              </div>
              <div className="mb-1 text-[22px] font-bold text-[var(--color-fg)]">$128,540</div>
              <div className="text-[11px] text-[var(--color-fg-subtle)]">From 14 paid invoices</div>
            </div>
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-4.5 py-4">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]">
                  <ArrowDownRight size={14} className="text-[var(--color-danger)]" />
                </div>
                <span className="text-caption font-medium text-[var(--color-fg-muted)]">Outflow</span>
              </div>
              <div className="mb-1 text-[22px] font-bold text-[var(--color-fg)]">$36,720</div>
              <div className="text-[11px] text-[var(--color-fg-subtle)]">Across 28 expenses</div>
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <div className="mb-2.5 text-caption font-medium text-[var(--color-fg-muted)]">Profit margin</div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
              <div className="bg-gradient-to-r from-[var(--color-accent-500)] to-[var(--color-primary)]" style={{ width: '71%' }} />
              <div className="bg-[color-mix(in_srgb,var(--color-danger)_40%,transparent)]" style={{ width: '29%' }} />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-[11.5px] text-[var(--color-fg-muted)]">Profit: <span className="font-semibold text-[var(--color-fg)]">$91,820 (71%)</span></span>
              <span className="text-[11.5px] text-[var(--color-fg-muted)]">Costs: <span className="font-semibold text-[var(--color-fg)]">$36,720 (29%)</span></span>
            </div>
          </div>
        </Card>

        {/* Expense breakdown */}
        <Card title="Expense breakdown" className="flex-1">
          {expenseBreakdown.map((e) => {
            const pct = ((e.amount / totalExpenses) * 100).toFixed(1);
            return (
              <div key={e.label} className="mb-3.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: e.color }} />
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{e.label}</span>
                  </div>
                  <span className="text-[12.5px] font-semibold text-[var(--color-fg)]">${e.amount.toLocaleString()}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: e.color }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <Card
        title="Recent invoices"
        action={
          <button
            type="button"
            className="cursor-pointer text-[12.5px] font-medium text-[var(--color-primary)] hover:underline"
          >
            View all
          </button>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Invoice', 'Client', 'Amount', 'Due Date', 'Status'].map((h) => (
                <th
                  key={h}
                  className="border-b border-[var(--color-border)] pb-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => {
              const isLast = i === invoices.length - 1;
              const cellBorder = !isLast && 'border-b border-[var(--color-border)]';
              return (
                <tr key={inv.id}>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="font-mono text-body-sm font-semibold tabular-nums text-[var(--color-fg)]">{inv.id}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{inv.client}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] font-semibold text-[var(--color-fg)]">{inv.amount}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className="text-[12.5px] text-[var(--color-fg-muted)]">{inv.due}</span>
                  </td>
                  <td className={cn('py-2.5', cellBorder)}>
                    <span className={cn('inline-flex rounded-full px-2 py-[3px] text-[11px] font-semibold', STATUS_BADGE[inv.status] ?? STATUS_BADGE.Sent)}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
