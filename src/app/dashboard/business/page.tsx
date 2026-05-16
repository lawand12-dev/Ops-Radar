'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from '../_components/narrative-card';
import { EmptyStateConnect } from '../_components/empty-state-connect';

type StripeInvoiceRow = {
  id: string;
  customer_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
};

type StripeFinanceData = {
  invoiced: number;
  paid: number;
  overdue: number;
  sparkline: Array<{ date: string; amount: number }>;
  currency: 'USD';
  rows: StripeInvoiceRow[];
};

type HubspotDealRow = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  close_date: string | null;
};

type HubspotSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  new_leads: number;
  deals_won_this_month: number;
  sparkline: Array<{ date: string; deals_created: number }>;
  currency: 'USD';
  truncated: boolean;
  rows: HubspotDealRow[];
};

type ApolloSequence = {
  id: string;
  name: string;
  contacts_enrolled: number;
  emails_sent: number;
  open_rate_pct: number;
  reply_rate_pct: number;
};

type CalendlyUpcoming = {
  name: string;
  invitee_name: string;
  invitee_email: string;
  start_time: string;
};

type MarketingWidgetData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
  sequences: ApolloSequence[];
  upcoming: CalendlyUpcoming[];
};

type PipedriveDealRow = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  expected_close: string | null;
};
type PipedriveSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  deals_won_this_month: number;
  rows: PipedriveDealRow[];
  currency: string;
};

type DeliveryTask = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  overdue: boolean;
  project_name: string;
  source: 'clickup' | 'asana' | 'monday';
};

type DeliveryData = {
  active_projects: number;
  overdue_tasks: number;
  tasks: DeliveryTask[];
};

type TogglProjectRow = { project_name: string; hours: number; color: string };

type TogglTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: TogglProjectRow[];
  period_label: string;
};

type HarvestProjectRow = { project_name: string; hours: number; client_name: string | null };
type HarvestTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: HarvestProjectRow[];
  period_label: string;
};

type DashboardAlert = {
  id: string;
  severity: 'needs-you' | 'watch' | 'heads-up';
  label: string;
  message: string;
  href: string;
};

type AlertsResp = { status: string; alerts?: DashboardAlert[] };

export default function BusinessPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <Topbar />
      <Kpis />
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <NarrativeCard section="business" persona="ceo" title="This week's business pulse" />
        <BusinessAlerts />
      </div>
      <RevenueSection />
      <PipelineSection />
      <PipedriveSection />
      <ProspectsSection />
      <BookingsSection />
      <DeliverySection />
      <TimeSection />
      <HarvestSection />
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div className="text-body-sm text-[var(--color-fg-muted)]">
        Dashboard /{' '}
        <span className="font-semibold text-[var(--color-fg)]">Business</span>
      </div>
      <span className="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-subtle)]">
        <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
        Live
      </span>
    </div>
  );
}

function Kpis() {
  const [fin, setFin] = useState<{ status: string; data?: StripeFinanceData } | null>(null);
  const [sales, setSales] = useState<{ status: string; data?: HubspotSalesData } | null>(null);
  const [mkt, setMkt] = useState<{ status?: string; data?: MarketingWidgetData } | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/finance').then((r) => r.json()).then(setFin).catch(() => {});
    fetch('/api/dashboard/sales-live').then((r) => r.json()).then(setSales).catch(() => {});
    fetch('/api/dashboard/marketing').then((r) => r.json()).then(setMkt).catch(() => {});
  }, []);

  const paid = fin?.data?.paid;
  const pipeline = sales?.data?.pipeline_value;
  const calls = mkt?.data?.meetings_booked;
  const emails = mkt?.data?.emails_sent;

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <Kpi label="Revenue · MTD" value={typeof paid === 'number' ? fmtMoney(paid) : '—'} />
      <Kpi label="Active pipeline" value={typeof pipeline === 'number' ? fmtMoney(pipeline) : '—'} />
      <Kpi label="Emails sent" value={typeof emails === 'number' ? String(emails) : '—'} />
      <Kpi label="Booked calls · 7d" value={typeof calls === 'number' ? String(calls) : '—'} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-label text-[var(--color-fg-subtle)]">{label}</div>
      <div className="text-h3 font-serif leading-none text-[var(--color-fg)]">{value}</div>
    </div>
  );
}

function BusinessAlerts() {
  const [resp, setResp] = useState<AlertsResp | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/alerts')
      .then((r) => r.json())
      .then(setResp)
      .catch(() => setResp({ status: 'unavailable' }));
  }, []);

  const all = resp?.alerts ?? [];
  const items = all
    .filter(
      (a) =>
        a.href.startsWith('/dashboard/business') ||
        /tool=(stripe|hubspot|apollo|calendly|clickup|asana|toggl|pipedrive|monday|harvest)/.test(a.href),
    )
    .slice(0, 5);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="mb-3 text-label text-[var(--color-fg-muted)]">Current alerts</h3>
      {resp === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">All clear.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="border-b border-[var(--color-border)] py-1.5 text-body-sm text-[var(--color-fg-muted)] last:border-b-0"
            >
              <span className="font-semibold text-[var(--color-fg)]">{a.label}:</span>{' '}
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RevenueSection() {
  return (
    <ToolSection
      title="Revenue (Stripe)"
      endpoint="/api/dashboard/finance"
      tool="Stripe"
      toolSlug="stripe"
      renderConnected={(data) => {
        const fin = (data as { data?: StripeFinanceData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatMini label="Invoiced · MTD" value={fin?.invoiced != null ? fmtMoney(fin.invoiced) : '—'} />
              <StatMini label="Paid · MTD" value={fin?.paid != null ? fmtMoney(fin.paid) : '—'} />
              <StatMini label="Overdue" value={fin?.overdue != null ? fmtMoney(fin.overdue) : '—'} />
            </div>
            {fin?.rows && fin.rows.length > 0 ? (
              <RowTable
                headers={['Customer', 'Amount', 'Due date', 'Days overdue']}
                rows={fin.rows.map((r) => [
                  r.customer_name,
                  fmtMoney(r.amount),
                  r.due_date,
                  `${r.days_overdue}d`,
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No overdue invoices.</p>
            )}
          </>
        );
      }}
    />
  );
}

function PipelineSection() {
  return (
    <ToolSection
      title="Sales pipeline (HubSpot)"
      endpoint="/api/dashboard/sales-live"
      tool="HubSpot"
      toolSlug="hubspot"
      renderConnected={(data) => {
        const hs = (data as { data?: HubspotSalesData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-4 gap-2">
              <StatMini label="Open deals" value={hs?.open_deals_count != null ? String(hs.open_deals_count) : '—'} />
              <StatMini label="Pipeline $" value={hs?.pipeline_value != null ? fmtMoney(hs.pipeline_value) : '—'} />
              <StatMini label="New leads · 30d" value={hs?.new_leads != null ? String(hs.new_leads) : '—'} />
              <StatMini label="Won · MTD" value={hs?.deals_won_this_month != null ? String(hs.deals_won_this_month) : '—'} />
            </div>
            {hs?.rows && hs.rows.length > 0 ? (
              <RowTable
                headers={['Deal', 'Value', 'Stage', 'Close date']}
                rows={hs.rows.map((r) => [
                  r.name,
                  fmtMoney(r.amount),
                  r.stage,
                  r.close_date ?? '—',
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No open deals.</p>
            )}
          </>
        );
      }}
    />
  );
}

function ProspectsSection() {
  return (
    <ToolSection
      title="Prospects (Apollo)"
      endpoint="/api/dashboard/marketing"
      tool="Apollo"
      toolSlug="apollo"
      statusKey="apollo"
      renderConnected={(data) => {
        const mkt = (data as { data?: MarketingWidgetData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatMini label="Emails sent" value={mkt?.emails_sent != null ? mkt.emails_sent.toLocaleString() : '—'} />
              <StatMini label="Open rate" value={mkt?.open_rate_pct != null ? `${mkt.open_rate_pct.toFixed(1)}%` : '—'} />
              <StatMini label="Reply rate" value={mkt?.reply_rate_pct != null ? `${mkt.reply_rate_pct.toFixed(1)}%` : '—'} />
            </div>
            {mkt?.sequences && mkt.sequences.length > 0 ? (
              <RowTable
                headers={['Sequence', 'Enrolled', 'Sent', 'Open %', 'Reply %']}
                rows={mkt.sequences.map((s) => [
                  s.name,
                  String(s.contacts_enrolled),
                  String(s.emails_sent),
                  `${s.open_rate_pct.toFixed(1)}%`,
                  `${s.reply_rate_pct.toFixed(1)}%`,
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No active sequences.</p>
            )}
          </>
        );
      }}
    />
  );
}

function BookingsSection() {
  return (
    <ToolSection
      title="Bookings (Calendly)"
      endpoint="/api/dashboard/marketing"
      tool="Calendly"
      toolSlug="calendly"
      statusKey="calendly"
      renderConnected={(data) => {
        const mkt = (data as { data?: MarketingWidgetData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Booked · last 7d" value={mkt?.meetings_booked != null ? String(mkt.meetings_booked) : '—'} />
              <StatMini label="Conversion" value={mkt?.meeting_conversion_pct != null ? `${mkt.meeting_conversion_pct.toFixed(1)}%` : '—'} />
            </div>
            {mkt?.upcoming && mkt.upcoming.length > 0 ? (
              <RowTable
                headers={['Event', 'Invitee', 'Date / Time']}
                rows={mkt.upcoming.map((u) => [
                  u.name,
                  u.invitee_name,
                  new Date(u.start_time).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  }),
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No upcoming bookings.</p>
            )}
          </>
        );
      }}
    />
  );
}

function DeliverySection() {
  return (
    <ToolSection
      title="Delivery (ClickUp / Asana)"
      endpoint="/api/dashboard/delivery"
      tool="ClickUp or Asana"
      toolSlug="clickup"
      renderConnected={(data) => {
        const delivery = (data as { data?: DeliveryData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Active projects" value={delivery?.active_projects != null ? String(delivery.active_projects) : '—'} />
              <StatMini label="Overdue tasks" value={delivery?.overdue_tasks != null ? String(delivery.overdue_tasks) : '—'} />
            </div>
            {delivery?.tasks && delivery.tasks.length > 0 ? (
              <RowTable
                headers={['Task', 'Project', 'Due', 'Status']}
                rows={delivery.tasks.slice(0, 10).map((t) => [
                  t.name,
                  `${t.project_name} (${t.source})`,
                  t.due_date ?? '—',
                  t.overdue ? 'Overdue' : t.status,
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No open tasks.</p>
            )}
          </>
        );
      }}
    />
  );
}

function TimeSection() {
  return (
    <ToolSection
      title="Time tracking (Toggl)"
      endpoint="/api/dashboard/time-tracking"
      tool="Toggl"
      toolSlug="toggl"
      renderConnected={(data) => {
        const time = (data as { data?: TogglTimeData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Hours · this week" value={time?.hours_tracked != null ? `${time.hours_tracked}h` : '—'} />
              <StatMini label="Utilization" value={time?.utilization_pct != null ? `${time.utilization_pct.toFixed(1)}%` : '—'} />
            </div>
            {time?.by_project && time.by_project.length > 0 ? (
              <RowTable
                headers={['Project', 'Hours']}
                rows={time.by_project.map((p) => [p.project_name, `${p.hours}h`])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No time entries this week.</p>
            )}
          </>
        );
      }}
    />
  );
}

function PipedriveSection() {
  return (
    <ToolSection
      title="Sales pipeline (Pipedrive)"
      endpoint="/api/dashboard/sales-pipedrive"
      tool="Pipedrive"
      toolSlug="pipedrive"
      renderConnected={(data) => {
        const pd = (data as { data?: PipedriveSalesData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatMini label="Open deals" value={pd?.open_deals_count != null ? String(pd.open_deals_count) : '—'} />
              <StatMini label="Pipeline $" value={pd?.pipeline_value != null ? fmtMoney(pd.pipeline_value) : '—'} />
              <StatMini label="Won · MTD" value={pd?.deals_won_this_month != null ? String(pd.deals_won_this_month) : '—'} />
            </div>
            {pd?.rows && pd.rows.length > 0 ? (
              <RowTable
                headers={['Deal', 'Value', 'Stage', 'Expected close']}
                rows={pd.rows.map((r) => [
                  r.title,
                  fmtMoney(r.value),
                  r.stage,
                  r.expected_close ?? '—',
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No open deals.</p>
            )}
          </>
        );
      }}
    />
  );
}

function HarvestSection() {
  return (
    <ToolSection
      title="Time tracking (Harvest)"
      endpoint="/api/dashboard/time-harvest"
      tool="Harvest"
      toolSlug="harvest"
      renderConnected={(data) => {
        const time = (data as { data?: HarvestTimeData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Hours · this week" value={time?.hours_tracked != null ? `${time.hours_tracked}h` : '—'} />
              <StatMini label="Utilization" value={time?.utilization_pct != null ? `${time.utilization_pct.toFixed(1)}%` : '—'} />
            </div>
            {time?.by_project && time.by_project.length > 0 ? (
              <RowTable
                headers={['Project', 'Client', 'Hours']}
                rows={time.by_project.map((p) => [p.project_name, p.client_name ?? '—', `${p.hours}h`])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No time entries this week.</p>
            )}
          </>
        );
      }}
    />
  );
}

type ToolSectionProps = {
  title: string;
  endpoint: string;
  tool: string;
  toolSlug: string;
  statusKey?: 'apollo' | 'calendly';
  renderConnected: (data: unknown) => React.ReactNode;
};

function ToolSection({
  title,
  endpoint,
  tool,
  toolSlug,
  statusKey,
  renderConnected,
}: ToolSectionProps) {
  const [state, setState] = useState<'loading' | 'connected' | 'not-connected' | 'error'>(
    'loading',
  );
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint)
      .then((res) => {
        if (res.status === 503) {
          if (!cancelled) setState('not-connected');
          return null;
        }
        return res.json();
      })
      .then((j) => {
        if (cancelled || j === null) return;
        const status = (j as { status?: string })?.status;
        if (
          status === 'not_configured' ||
          status === 'not_enrolled' ||
          status === 'not_connected' ||
          status === 'requires_reconnect'
        ) {
          return setState('not-connected');
        }
        if (status === 'error') return setState('error');
        if (statusKey) {
          const connected = (j as { data?: Record<string, boolean> })?.data?.[
            `${statusKey}_connected`
          ];
          if (!connected) return setState('not-connected');
        }
        setData(j);
        setState('connected');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => { cancelled = true; };
  }, [endpoint, statusKey]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="mb-4 text-label text-[var(--color-fg-muted)]">{title}</h3>
      {state === 'loading' ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : state === 'not-connected' ? (
        <EmptyStateConnect tool={tool} toolSlug={toolSlug} />
      ) : state === 'error' ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          Couldn&apos;t reach {tool}. We&apos;ll retry shortly.
        </p>
      ) : (
        renderConnected(data)
      )}
    </div>
  );
}

function RowTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {headers.map((h) => (
              <th
                key={h}
                className="pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)] last:pr-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-2.5 pr-4 text-[var(--color-fg-muted)] last:pr-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-h4 font-medium text-[var(--color-fg)]">{value}</div>
      <div className="text-label text-[var(--color-fg-subtle)]">{label}</div>
    </div>
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
