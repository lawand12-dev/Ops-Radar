import { Plus, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { C } from '../_lib/theme';
import { PageHeader } from '../_components/page-header';
import { StatCard } from '../_components/stat-card';
import { Card } from '../_components/card';
import { PrimaryButton, SecondaryButton } from '../_components/buttons';

const stats = [
  { label: 'Revenue MTD',     value: '$128,540', delta: '18.6%', trend: 'up' as const   },
  { label: 'Expenses MTD',    value: '$36,720',  delta: '4.2%',  trend: 'down' as const },
  { label: 'Net Profit',      value: '$91,820',  delta: '24.1%', trend: 'up' as const   },
  { label: 'Pending Invoices', value: '$32,110', delta: '8',     trend: 'up' as const   },
];

const invoices = [
  { id: 'INV-0321', client: 'Acme Corp',     amount: '$18,250', due: 'Aug 14, 2024', status: 'Sent'      },
  { id: 'INV-0320', client: 'Crest Finance', amount: '$24,800', due: 'Aug 12, 2024', status: 'Paid'      },
  { id: 'INV-0319', client: 'Northwind',     amount: '$14,300', due: 'Aug 10, 2024', status: 'Paid'      },
  { id: 'INV-0318', client: 'BrightLab',     amount: '$9,800',  due: 'Aug 22, 2024', status: 'Sent'      },
  { id: 'INV-0317', client: 'Pulse Media',   amount: '$11,200', due: 'Aug 05, 2024', status: 'Overdue'   },
  { id: 'INV-0316', client: 'GreenPlex',     amount: '$6,400',  due: 'Aug 28, 2024', status: 'Draft'     },
  { id: 'INV-0315', client: 'ScaleUp',       amount: '$7,650',  due: 'Aug 18, 2024', status: 'Sent'      },
];

const statusColors: Record<string, { color: string; bg: string }> = {
  Paid:    { color: '#4ADE80', bg: 'rgba(34,197,94,0.12)' },
  Sent:    { color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
  Overdue: { color: '#F87171', bg: 'rgba(239,68,68,0.12)'  },
  Draft:   { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

const expenseBreakdown = [
  { label: 'Salaries',          amount: 22400, color: '#3B82F6' },
  { label: 'Software & Tools',  amount: 4820,  color: '#818CF8' },
  { label: 'Marketing',         amount: 5300,  color: '#A78BFA' },
  { label: 'Office',            amount: 2400,  color: '#22C55E' },
  { label: 'Other',             amount: 1800,  color: '#F59E0B' },
];

export default function FinancialsPage() {
  const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Financials"
        subtitle="Track revenue, expenses, and outstanding invoices."
        actions={
          <>
            <SecondaryButton>
              <Download size={13} />
              Export
            </SecondaryButton>
            <PrimaryButton>
              <Plus size={14} />
              New Invoice
            </PrimaryButton>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        {/* Cash flow summary */}
        <Card title="Cash Flow" style={{ flex: '0 0 60%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <div style={{ background: C.bg, borderRadius: 10, padding: '16px 18px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowUpRight size={14} color={C.green} />
                </div>
                <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>Inflow</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>$128,540</div>
              <div style={{ fontSize: 11, color: C.muted }}>From 14 paid invoices</div>
            </div>
            <div style={{ background: C.bg, borderRadius: 10, padding: '16px 18px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowDownRight size={14} color={C.red} />
                </div>
                <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>Outflow</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>$36,720</div>
              <div style={{ fontSize: 11, color: C.muted }}>Across 28 expenses</div>
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 10, fontWeight: 500 }}>Profit margin</div>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '71%', background: 'linear-gradient(90deg, #2563EB, #3B82F6)' }} />
              <div style={{ width: '29%', background: 'rgba(239,68,68,0.4)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11.5, color: C.sub }}>Profit: <span style={{ color: C.text, fontWeight: 600 }}>$91,820 (71%)</span></span>
              <span style={{ fontSize: 11.5, color: C.sub }}>Costs: <span style={{ color: C.text, fontWeight: 600 }}>$36,720 (29%)</span></span>
            </div>
          </div>
        </Card>

        {/* Expense breakdown */}
        <Card title="Expense Breakdown" style={{ flex: 1 }}>
          {expenseBreakdown.map((e) => {
            const pct = ((e.amount / totalExpenses) * 100).toFixed(1);
            return (
              <div key={e.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
                    <span style={{ fontSize: 12.5, color: C.sub }}>{e.label}</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>${e.amount.toLocaleString()}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: e.color, borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <Card title="Recent Invoices" action={<span style={{ fontSize: 12.5, color: C.accent, cursor: 'pointer', fontWeight: 500 }}>View all</span>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Invoice', 'Client', 'Amount', 'Due Date', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    fontSize: 11,
                    color: C.muted,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    paddingBottom: 10,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => {
              const isLast = i === invoices.length - 1;
              const border = isLast ? 'none' : `1px solid ${C.border}`;
              const sc = statusColors[inv.status] ?? statusColors.Sent;
              return (
                <tr key={inv.id}>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{inv.id}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>{inv.client}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{inv.amount}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>{inv.due}</span>
                  </td>
                  <td style={{ padding: '11px 0', borderBottom: border }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: '3px 8px', borderRadius: 20 }}>
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
