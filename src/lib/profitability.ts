import type { StripePerClientData } from './integrations/stripe/profitability-adapter';
import type { HarvestPerClientData } from './integrations/harvest/profitability-adapter';

export type ClientProfitability = {
  id: string;
  name: string;
  revenue_mtd: number;
  revenue_prior: number;
  hours_mtd: number;
  hours_prior: number;
  blended_rate_usd: number;
  cost_mtd: number;
  margin_pct: number;
  margin_prior_pct: number | null;
  // up: margin improved >5pp vs prior; down: dropped >5pp; flat: within ±5pp
  trend: 'up' | 'down' | 'flat';
  health_score: number;
  payment_status: 'on_time' | 'overdue' | 'unknown';
  days_overdue: number | null;
  stripe_customer_id: string | null;
  matched: boolean;
};

export type ProfitabilityResult = {
  clients: ClientProfitability[];
  unmatched_stripe: Array<{ id: string; name: string; revenue_mtd: number }>;
  unmatched_harvest: Array<{ name: string; hours_mtd: number }>;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|llc|inc|co|corp|limited|pty|gmbh|bv|srl|sarl|ag)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeTrend(current: number, prior: number | null): 'up' | 'down' | 'flat' {
  if (prior === null) return 'flat';
  const diff = current - prior;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'flat';
}

function computeHealthScore(
  paymentStatus: 'on_time' | 'overdue' | 'unknown',
  daysOverdue: number | null,
  marginPct: number,
  trend: 'up' | 'down' | 'flat',
): number {
  // Payment component (40 pts)
  let payment = 40;
  if (paymentStatus === 'overdue') {
    const days = daysOverdue ?? 0;
    payment = days > 30 ? 0 : days > 14 ? 10 : 25;
  } else if (paymentStatus === 'unknown') {
    payment = 30;
  }

  // Margin component (35 pts)
  let margin = 0;
  if (marginPct >= 30) margin = 35;
  else if (marginPct >= 20) margin = 28;
  else if (marginPct >= 10) margin = 18;
  else if (marginPct >= 0) margin = 8;

  // Trend component (25 pts)
  const trendScore = trend === 'up' ? 25 : trend === 'flat' ? 15 : 5;

  return payment + margin + trendScore;
}

export function computeClientProfitability(
  stripeData: StripePerClientData,
  harvestData: HarvestPerClientData,
  blendedRateUsd: number,
): ProfitabilityResult {
  const harvestMap = new Map<string, (typeof harvestData.clients)[0]>();
  for (const hc of harvestData.clients) {
    harvestMap.set(normalizeName(hc.name), hc);
  }

  const matchedHarvestNames = new Set<string>();
  const clients: ClientProfitability[] = [];

  for (const sc of stripeData.clients) {
    const key = normalizeName(sc.name);
    const hc = harvestMap.get(key) ?? null;
    if (hc) matchedHarvestNames.add(normalizeName(hc.name));

    const hoursCurrent = hc?.hours_current ?? 0;
    const hoursPrior = hc?.hours_prior ?? 0;
    const costMtd = hoursCurrent * blendedRateUsd;
    const marginPct = sc.revenue_current > 0
      ? ((sc.revenue_current - costMtd) / sc.revenue_current) * 100
      : costMtd > 0 ? -100 : 0;

    const priorCost = hoursPrior * blendedRateUsd;
    const marginPriorPct = sc.revenue_prior > 0
      ? ((sc.revenue_prior - priorCost) / sc.revenue_prior) * 100
      : null;
    const trend = computeTrend(marginPct, marginPriorPct);
    const paymentStatus = sc.payment_status;
    const daysOverdue = sc.days_overdue;

    clients.push({
      id: sc.id,
      name: sc.name,
      revenue_mtd: sc.revenue_current,
      revenue_prior: sc.revenue_prior,
      hours_mtd: hoursCurrent,
      hours_prior: hoursPrior,
      blended_rate_usd: blendedRateUsd,
      cost_mtd: costMtd,
      margin_pct: marginPct,
      margin_prior_pct: marginPriorPct,
      trend,
      health_score: computeHealthScore(paymentStatus, daysOverdue, marginPct, trend),
      payment_status: paymentStatus,
      days_overdue: daysOverdue,
      stripe_customer_id: sc.id,
      matched: hc !== null,
    });
  }

  clients.sort((a, b) => a.margin_pct - b.margin_pct);

  const unmatched_harvest = harvestData.clients
    .filter((hc) => !matchedHarvestNames.has(normalizeName(hc.name)))
    .map((hc) => ({ name: hc.name, hours_mtd: hc.hours_current }));

  const unmatched_stripe = stripeData.clients
    .filter((sc) => !harvestMap.has(normalizeName(sc.name)))
    .map((sc) => ({ id: sc.id, name: sc.name, revenue_mtd: sc.revenue_current }));

  return { clients, unmatched_stripe, unmatched_harvest };
}
