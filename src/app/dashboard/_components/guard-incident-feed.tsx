import { AlertTriangle, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { Card } from './card';

type Severity = 'critical' | 'warn' | 'info';
type Status = 'resolved' | 'auto-recovered' | 'action-needed' | 'investigating';

type Incident = {
  severity: Severity;
  title: string;
  detail: string;
  source: string;
  time: string;
  status: Status;
};

const incidents: Incident[] = [
  {
    severity: 'critical',
    title: 'Klaviyo OAuth expired',
    detail: "Token for Nova Tech's account needs re-auth. 3 workflows paused.",
    source: 'Klaviyo · nova-tech-revenue-sync',
    time: '1h ago',
    status: 'action-needed',
  },
  {
    severity: 'warn',
    title: 'Meta API schema drift',
    detail: 'Field renamed in Meta v22. GUARD auto-mapped, workflows running.',
    source: 'Meta · ad-spend-sync-hourly',
    time: '3h ago',
    status: 'auto-recovered',
  },
  {
    severity: 'warn',
    title: 'slack-recap-daily degraded',
    detail: 'Slack 429 rate limit hit 4× in 12h. Backoff increased.',
    source: 'Slack · client-status-recap',
    time: '12h ago',
    status: 'investigating',
  },
  {
    severity: 'info',
    title: 'Google Ads rate limit recovered',
    detail: 'Slowed 8 workflows during peak hour. All caught up.',
    source: 'Google Ads · multi-client-pull',
    time: '6h ago',
    status: 'resolved',
  },
];

const SEVERITY: Record<Severity, { icon: typeof AlertTriangle; wrap: string; iconColor: string; label: string }> = {
  critical: {
    icon: AlertCircle,
    wrap: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
    iconColor: 'text-[var(--color-danger)]',
    label: 'Critical',
  },
  warn: {
    icon: AlertTriangle,
    wrap: 'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)]',
    iconColor: 'text-[var(--color-warn)]',
    label: 'Warning',
  },
  info: {
    icon: CheckCircle2,
    wrap: 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]',
    iconColor: 'text-[var(--color-success)]',
    label: 'Recovered',
  },
};

const STATUS_BADGE: Record<Status, string> = {
  'resolved':       'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]',
  'auto-recovered': 'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]',
  'action-needed':  'bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]',
  'investigating':  'bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] text-[var(--color-warn)]',
};

const STATUS_LABEL: Record<Status, string> = {
  'resolved':       'Resolved',
  'auto-recovered': 'Auto-recovered',
  'action-needed':  'Action needed',
  'investigating':  'Investigating',
};

/**
 * GUARD — the system watching while you sleep.
 *
 * Surfaces silent failures, API drift, expired credentials, and degraded
 * workflows before they hit a client report. Each incident shows what
 * GUARD saw, what it did (auto-fixed / paused / escalated), and what
 * (if anything) the operator needs to do.
 *
 * Marketing positioning: "Meta breaks something at 3 a.m.; GUARD knows
 * by 3:01 and routes the fix before your Monday recap runs."
 */
export function GuardIncidentFeed() {
  const actionNeededCount = incidents.filter((i) => i.status === 'action-needed').length;

  return (
    <Card
      title="Incidents & alerts"
      action={
        <div className="flex items-center gap-3">
          {actionNeededCount > 0 && (
            <span className="text-caption font-medium text-[var(--color-danger)]">
              {actionNeededCount} need attention
            </span>
          )}
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-[var(--color-primary)] hover:underline"
          >
            View all
            <ArrowRight size={11} />
          </button>
        </div>
      }
      className="flex-1"
    >
      <ul className="divide-y divide-[var(--color-border)]">
        {incidents.map((incident, idx) => {
          const sev = SEVERITY[incident.severity];
          const Icon = sev.icon;
          return (
            <li key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className={cn('flex size-[34px] shrink-0 items-center justify-center rounded-full', sev.wrap)}>
                <Icon size={15} strokeWidth={1.8} className={sev.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-[var(--color-fg)]">{incident.title}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-[2px] text-[10.5px] font-semibold',
                        STATUS_BADGE[incident.status],
                      )}
                    >
                      {STATUS_LABEL[incident.status]}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--color-fg-subtle)]">{incident.time}</span>
                </div>
                <p className="mt-1 text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">{incident.detail}</p>
                <p className="mt-1 font-mono text-[10.5px] text-[var(--color-fg-subtle)] tracking-[0.02em]">
                  {incident.source}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
