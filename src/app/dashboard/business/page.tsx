'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from '../_components/narrative-card';
import { EmptyStateConnect } from '../_components/empty-state-connect';

// Real shape from /api/dashboard/alerts (Task 12)
type DashboardAlert = {
  id: string;
  severity: 'needs-you' | 'watch' | 'heads-up';
  label: string;
  message: string;
  href: string;
};
type AlertsResp = { status: string; alerts?: DashboardAlert[] };

// Real shape from /api/dashboard/finance → StripeFinanceData
type StripeFinanceData = {
  invoiced: number;
  paid: number;
  overdue: number;
  sparkline: Array<{ date: string; amount: number }>;
  currency: 'USD';
};

// Real shape from /api/dashboard/sales-live → HubspotSalesData
type HubspotSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  new_leads: number;
  deals_won_this_month: number;
  sparkline: Array<{ date: string; deals_created: number }>;
  currency: 'USD';
  truncated: boolean;
};

// Real shape from /api/dashboard/marketing (flat — no nested apollo/calendly objects)
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
};

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
      <ProspectsSection />
      <BookingsSection />
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div className="text-[12.5px] text-[var(--color-fg-muted)]">
        Dashboard /{' '}
        <span className="font-semibold text-[var(--color-fg)]">Business</span>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-fg-subtle)]">
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
    fetch('/api/dashboard/finance')
      .then((r) => r.json())
      .then(setFin)
      .catch(() => {});
    fetch('/api/dashboard/sales-live')
      .then((r) => r.json())
      .then(setSales)
      .catch(() => {});
    fetch('/api/dashboard/marketing')
      .then((r) => r.json())
      .then(setMkt)
      .catch(() => {});
  }, []);

  // MRR: not available from Stripe — show paid MTD as closest proxy
  const paid = fin?.data?.paid;
  // Active pipeline: pipeline_value from HubSpot
  const pipeline = sales?.data?.pipeline_value;
  // New prospects: no per-metric count from Apollo in current upstream — show '—'
  // Booked calls: meetings_booked from marketing widget
  const calls = mkt?.data?.meetings_booked;

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <Kpi label="Revenue · MTD" value={typeof paid === 'number' ? fmtMoney(paid) : '—'} />
      <Kpi label="Active pipeline" value={typeof pipeline === 'number' ? fmtMoney(pipeline) : '—'} />
      <Kpi label="New prospects · 7d" value="—" />
      <Kpi label="Booked calls · 7d" value={typeof calls === 'number' ? String(calls) : '—'} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div className="text-[20px] font-bold leading-none tracking-[-0.02em] text-[var(--color-fg)]">
        {value}
      </div>
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

  // Filter to business-side alerts: hrefs pointing to /dashboard/business
  // or integration hrefs for the four business tools.
  const all = resp?.alerts ?? [];
  const items = all
    .filter(
      (a) =>
        a.href.startsWith('/dashboard/business') ||
        /tool=(stripe|hubspot|apollo|calendly)/.test(a.href),
    )
    .slice(0, 5);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
        Current alerts
      </h3>
      {resp === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">All clear.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="border-b border-[var(--color-border)] py-1.5 text-[12.5px] text-[var(--color-fg-muted)] last:border-b-0"
            >
              <span className="font-semibold text-[var(--color-fg)]">{a.label}:</span> {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// Per-tool sections. Each calls one upstream and degrades to
// EmptyStateConnect when not connected.
// ============================================================

function RevenueSection() {
  return (
    <ToolSection
      title="Revenue (Stripe)"
      endpoint="/api/dashboard/finance"
      tool="Stripe"
      toolSlug="stripe"
      renderConnected={(data) => {
        const d = data as { data?: StripeFinanceData };
        const fin = d.data;
        return (
          <>
            <div className="mb-3 grid grid-cols-4 gap-2">
              <StatMini label="Invoiced · MTD" value={fin?.invoiced != null ? fmtMoney(fin.invoiced) : '—'} />
              <StatMini label="Paid · MTD" value={fin?.paid != null ? fmtMoney(fin.paid) : '—'} />
              <StatMini label="Overdue" value={fin?.overdue != null ? fmtMoney(fin.overdue) : '—'} />
              <StatMini label="Top customer" value="—" />
            </div>
            {/* Upstream does not expose per-charge rows */}
            <p className="text-body-sm text-[var(--color-fg-subtle)]">No detailed rows yet.</p>
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
        const d = data as { data?: HubspotSalesData };
        const hs = d.data;
        return (
          <>
            <div className="mb-3 grid grid-cols-4 gap-2">
              <StatMini
                label="Open deals"
                value={hs?.open_deals_count != null ? String(hs.open_deals_count) : '—'}
              />
              <StatMini
                label="Pipeline $"
                value={hs?.pipeline_value != null ? fmtMoney(hs.pipeline_value) : '—'}
              />
              <StatMini
                label="New leads · 30d"
                value={hs?.new_leads != null ? String(hs.new_leads) : '—'}
              />
              <StatMini
                label="Won · MTD"
                value={hs?.deals_won_this_month != null ? String(hs.deals_won_this_month) : '—'}
              />
            </div>
            {/* Upstream does not expose per-deal rows */}
            <p className="text-body-sm text-[var(--color-fg-subtle)]">No detailed rows yet.</p>
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
        const d = data as { data?: MarketingWidgetData };
        const mkt = d.data;
        // Apollo fields in the current marketing widget: emails_sent, open_rate_pct, reply_rate_pct
        return (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <StatMini
                label="Emails sent"
                value={mkt?.emails_sent != null ? mkt.emails_sent.toLocaleString() : '—'}
              />
              <StatMini
                label="Open rate"
                value={mkt?.open_rate_pct != null ? `${mkt.open_rate_pct.toFixed(1)}%` : '—'}
              />
              <StatMini
                label="Reply rate"
                value={mkt?.reply_rate_pct != null ? `${mkt.reply_rate_pct.toFixed(1)}%` : '—'}
              />
            </div>
            {/* No per-prospect row data in current upstream */}
            <p className="text-body-sm text-[var(--color-fg-subtle)]">No detailed rows yet.</p>
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
        const d = data as { data?: MarketingWidgetData };
        const mkt = d.data;
        return (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <StatMini
                label="Booked · period"
                value={mkt?.meetings_booked != null ? String(mkt.meetings_booked) : '—'}
              />
              <StatMini
                label="Conversion"
                value={
                  mkt?.meeting_conversion_pct != null
                    ? `${mkt.meeting_conversion_pct.toFixed(1)}%`
                    : '—'
                }
              />
              <StatMini label="Period" value={mkt?.period_label ?? '—'} />
            </div>
            {/* No per-booking row data in current upstream */}
            <p className="text-body-sm text-[var(--color-fg-subtle)]">No detailed rows yet.</p>
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
  /**
   * For the unified marketing endpoint: if statusKey is 'apollo' or 'calendly',
   * check the flat `data.apollo_connected` / `data.calendly_connected` boolean
   * to determine whether the tool is connected.
   */
  statusKey?: 'apollo' | 'calendly';
  renderConnected: (data: unknown) => React.ReactNode;
};

function ToolSection({ title, endpoint, tool, toolSlug, statusKey, renderConnected }: ToolSectionProps) {
  const [state, setState] = useState<'loading' | 'connected' | 'not-connected' | 'error'>('loading');
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
        if (status === 'not_configured' || status === 'not_enrolled' || status === 'not_connected') {
          return setState('not-connected');
        }
        if (status === 'requires_reconnect') return setState('not-connected');
        if (status === 'error') return setState('error');
        if (statusKey) {
          // Flat boolean check on the marketing payload: data.apollo_connected / data.calendly_connected
          const connected = (j as { data?: Record<string, boolean> })?.data?.[`${statusKey}_connected`];
          if (!connected) return setState('not-connected');
        }
        setData(j);
        setState('connected');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, statusKey]);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
        {title}
      </h3>
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

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[15px] font-semibold text-[var(--color-fg)]">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{label}</div>
    </div>
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
