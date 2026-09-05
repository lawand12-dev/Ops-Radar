// Retainer computation lib.
// Branch: main / Supabase. Pure computation — no DB calls, no I/O.

import type { HarvestMonthlyProjectData } from './integration-types';

export type RetainerConfig = {
  id: string;
  client_name_display: string;
  client_name_norm: string;
  monthly_amount_usd: number;
  included_hours: number;
};

export type RetainerStatus = 'on_track' | 'at_risk' | 'over_budget';

export type RetainerHealth = {
  config: RetainerConfig;
  logged_hours: number;
  overage_hours: number;
  burn_pct: number;
  status: RetainerStatus;
  implied_hourly_rate: number;
  overage_cost_usd: number;
  harvest_matched: boolean;
};

export type RetainerSummary = {
  retainers: RetainerHealth[];
  total_monthly_arr_usd: number;
  at_risk_count: number;
  over_budget_count: number;
};

export function normalizeClientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeRetainerHealth(
  configs: RetainerConfig[],
  harvest: HarvestMonthlyProjectData,
): RetainerSummary {
  const harvestMap = new Map<string, number>();
  for (const p of harvest.projects) {
    harvestMap.set(normalizeClientName(p.project_name), p.hours);
  }

  const retainers: RetainerHealth[] = configs.map((cfg) => {
    const loggedHours = harvestMap.get(cfg.client_name_norm) ?? 0;
    const overageHours = Math.max(0, loggedHours - cfg.included_hours);
    const burnPct =
      cfg.included_hours > 0
        ? Math.round((loggedHours / cfg.included_hours) * 1000) / 10
        : 0;
    const status: RetainerStatus =
      burnPct >= 100 ? 'over_budget' : burnPct >= 85 ? 'at_risk' : 'on_track';
    const impliedHourlyRate =
      cfg.included_hours > 0 ? cfg.monthly_amount_usd / cfg.included_hours : 0;
    const overageCostUsd = overageHours * impliedHourlyRate;

    return {
      config: cfg,
      logged_hours: Math.round(loggedHours * 10) / 10,
      overage_hours: Math.round(overageHours * 10) / 10,
      burn_pct: burnPct,
      status,
      implied_hourly_rate: Math.round(impliedHourlyRate),
      overage_cost_usd: Math.round(overageCostUsd),
      harvest_matched: harvestMap.has(cfg.client_name_norm),
    };
  });

  return {
    retainers: retainers.sort((a, b) => b.burn_pct - a.burn_pct),
    total_monthly_arr_usd: configs.reduce((s, c) => s + c.monthly_amount_usd, 0),
    at_risk_count: retainers.filter((r) => r.status === 'at_risk').length,
    over_budget_count: retainers.filter((r) => r.status === 'over_budget').length,
  };
}
