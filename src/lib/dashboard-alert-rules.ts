/**
 * Deterministic rule-based alert generation for the dashboard cockpit
 * and pillar pages. NOT AI-generated — alerts must be predictable and
 * actionable. AI narrative happens separately in /api/dashboard/narrative.
 *
 * Each rule reads from Layer-2 API outputs (already fetched by the
 * caller) and may emit zero or one alert. The caller deduplicates and
 * sorts by severity.
 */

export type AlertSeverity = 'needs-you' | 'watch' | 'heads-up';

export type DashboardAlert = {
  id: string;            // stable id for keying / dedup
  severity: AlertSeverity;
  label: string;         // short uppercase tag, e.g. "Needs you"
  message: string;       // single sentence, names a real entity
  href: string;          // deep-link to action
};

/** Operator hourly rate used to convert hours-saved → $-saved. */
export const OPERATOR_RATE_USD_PER_HOUR = 50;

/** Stuck-deal threshold: deals in same stage longer than this AND
 * worth more than STUCK_DEAL_MIN_VALUE_USD fire an alert. */
export const STUCK_DEAL_DAYS = 14;
export const STUCK_DEAL_MIN_VALUE_USD = 5000;

/** Max alerts surfaced on the cockpit ribbon. */
export const MAX_COCKPIT_ALERTS = 3;

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  'needs-you': 3,
  'watch': 2,
  'heads-up': 1,
};

export function sortAlertsBySeverity(alerts: DashboardAlert[]): DashboardAlert[] {
  return [...alerts].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

export function severityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case 'needs-you': return 'Needs you';
    case 'watch':     return 'Watch';
    case 'heads-up':  return 'Heads-up';
  }
}

// ============================================================
// Rules — each function takes a narrow input and returns 0 or 1 alert.
// Keep these pure: no fetching, no logging, no side effects.
// ============================================================

/** Stripe integration returned an auth/permission error. */
export function stripeAuthErrorRule(input: {
  hasError: boolean;
  errorCode?: string | null;
}): DashboardAlert | null {
  if (!input.hasError) return null;
  const isAuthError = !input.errorCode
    || ['unauthorized', 'permission_denied', 'api_key_invalid'].includes(input.errorCode);
  if (!isAuthError) return null;
  return {
    id: 'stripe-auth',
    severity: 'needs-you',
    label: severityLabel('needs-you'),
    message: 'Stripe re-auth required — your API key was rejected.',
    href: '/dashboard/integrations?tool=stripe',
  };
}

/** Any integration with elevated error rate (>5 errors in 24h). */
export function elevatedErrorRateRule(input: {
  tool: string;
  errors24h: number;
}): DashboardAlert | null {
  if (input.errors24h <= 5) return null;
  return {
    id: `errors-${input.tool}`,
    severity: 'watch',
    label: severityLabel('watch'),
    message: `${input.tool} elevated error rate — ${input.errors24h} errors in 24h.`,
    href: '/dashboard/runs',
  };
}

/** HubSpot deal stuck in same stage longer than threshold. */
export function stuckDealRule(input: {
  dealName: string;
  daysInStage: number;
  valueUsd: number;
}): DashboardAlert | null {
  if (input.daysInStage < STUCK_DEAL_DAYS) return null;
  if (input.valueUsd < STUCK_DEAL_MIN_VALUE_USD) return null;
  return {
    id: `stuck-${input.dealName}`,
    severity: 'heads-up',
    label: severityLabel('heads-up'),
    message: `Deal "${input.dealName}" stuck ${input.daysInStage} days in stage.`,
    href: '/dashboard/actions',
  };
}

/** n8n workflow failed and did not auto-recover within 30 minutes. */
export function failingWorkflowRule(input: {
  workflowName: string;
  failedAt: Date;
  recoveredAt: Date | null;
  now: Date;
}): DashboardAlert | null {
  if (input.recoveredAt) return null;
  const elapsedMin = (input.now.getTime() - input.failedAt.getTime()) / 60_000;
  if (elapsedMin < 30) return null;
  return {
    id: `failing-${input.workflowName}`,
    severity: 'needs-you',
    label: severityLabel('needs-you'),
    message: `Workflow "${input.workflowName}" failing for ${Math.round(elapsedMin)}m — not auto-recovered.`,
    href: '/dashboard/runs',
  };
}

/** No Calendly bookings this week despite open pipeline. */
export function emptyCalendarRule(input: {
  bookings7d: number;
  pipelineValueUsd: number;
}): DashboardAlert | null {
  if (input.bookings7d > 0) return null;
  if (input.pipelineValueUsd <= 0) return null;
  return {
    id: 'empty-calendar',
    severity: 'heads-up',
    label: severityLabel('heads-up'),
    message: 'No calls booked this week despite active pipeline.',
    href: '/dashboard/actions',
  };
}

/** Scope creep: a project has logged >= threshold% of its ClickUp time estimate. */
export function scopeCreepRule(input: {
  projectName: string;
  burnPct: number;
  threshold?: number;
}): DashboardAlert | null {
  const threshold = input.threshold ?? 80;
  if (input.burnPct < threshold) return null;
  const statusText = input.burnPct >= 100 ? 'over budget' : `${Math.round(input.burnPct)}% burned`;
  return {
    id: `scope-${input.projectName.replace(/\W+/g, '-').toLowerCase().slice(0, 40)}`,
    severity: input.burnPct >= 100 ? 'needs-you' : 'watch',
    label: severityLabel(input.burnPct >= 100 ? 'needs-you' : 'watch'),
    message: `"${input.projectName}" is ${statusText} — review scope or bill overage.`,
    href: '/dashboard/actions',
  };
}
