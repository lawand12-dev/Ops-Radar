// src/lib/actions/evaluators/capacity-drift.ts
//
// Watches team utilization via Harvest and proposes an advisory when
// utilization crosses risk thresholds in either direction.
//
// Trigger logic:
//   over_capacity:  utilization_pct >= 95  → team is about to burn out
//   under_capacity: utilization_pct <= 50  → bench / new business signal

import { openai } from '<npm>/lib/openai';
import { fetchHarvestTimeData } from '<npm>/lib/integrations/harvest/adapter';
import { isDuplicate } from '../dedup';
import type { NewAction, CapacityDriftPayload, UserContext } from '../types';

const OVER_CAPACITY_THRESHOLD = 95;
const UNDER_CAPACITY_THRESHOLD = 50;

async function draftCapacityAdvisory(
  ctx: UserContext,
  utilization: number,
  direction: 'over_capacity' | 'under_capacity',
  hoursLogged: number,
  hoursCapacity: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a COO advisor for a marketing agency. Output strict JSON only.' },
      {
        role: 'user',
        content: `Draft an internal capacity advisory for the agency owner. This is NOT sent externally.

Agency: ${ctx.companyName || 'the agency'}
Utilization (this week): ${utilization.toFixed(1)}%
Hours logged: ${hoursLogged}
Hours capacity: ${hoursCapacity}
Direction: ${direction === 'over_capacity' ? 'OVER (≥95%)' : 'UNDER (≤50%)'}

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: tight, dollar-anchored if possible, no panic
- body: 3 short paragraphs — (1) the situation, (2) the specific risk
  (burnout / underutilization), (3) the 2-3 concrete moves to make this week
  ${direction === 'over_capacity'
    ? '(over_capacity: hire / contract / delay new client kickoff / push back on a deliverable)'
    : '(under_capacity: which warm leads to push, which retainer to expand, internal investment to make)'}
- No fluff. Founder-to-founder tone.`,
      },
    ],
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject:
      parsed.subject ??
      (direction === 'over_capacity'
        ? `Team at ${utilization.toFixed(0)}% capacity — burnout risk`
        : `Team at ${utilization.toFixed(0)}% capacity — bench underused`),
    body: parsed.body ?? `Utilization is ${utilization.toFixed(0)}% (${hoursLogged}/${hoursCapacity}h). Take action this week.`,
  };
}

export async function evalCapacityDrift(
  ctx: UserContext,
  harvestApiKey: string,
): Promise<NewAction[]> {
  let data;
  try {
    data = await fetchHarvestTimeData(harvestApiKey);
  } catch (err) {
    console.warn('[evalCapacityDrift] data fetch failed:', err);
    return [];
  }

  if (data.utilization_pct == null) return [];
  const util = data.utilization_pct;

  let direction: 'over_capacity' | 'under_capacity' | null = null;
  let threshold = '';
  if (util >= OVER_CAPACITY_THRESHOLD) {
    direction = 'over_capacity';
    threshold = `>=${OVER_CAPACITY_THRESHOLD}%`;
  } else if (util <= UNDER_CAPACITY_THRESHOLD) {
    direction = 'under_capacity';
    threshold = `<=${UNDER_CAPACITY_THRESHOLD}%`;
  }
  if (!direction) return [];

  // Dedup: one alert per direction per week
  const weekKey = `${new Date().toISOString().slice(0, 10)}:${direction}`;
  const dup = await isDuplicate(ctx.userId, 'capacity_drift', 'week_direction', weekKey);
  if (dup) return [];

  // Derive a rough hours_capacity: hours_tracked / (utilization/100)
  // Falls back to 40h * 1 person if division blows up.
  const hoursCapacity =
    util > 0 ? Math.round((data.hours_tracked / (util / 100)) * 10) / 10 : 40;

  let draft: { subject: string; body: string };
  try {
    draft = await draftCapacityAdvisory(ctx, util, direction, data.hours_tracked, hoursCapacity);
  } catch {
    draft = {
      subject:
        direction === 'over_capacity'
          ? `Team at ${util.toFixed(0)}% capacity — burnout risk`
          : `Team at ${util.toFixed(0)}% capacity — bench underused`,
      body: `Utilization is ${util.toFixed(0)}% (${data.hours_tracked}/${hoursCapacity}h).`,
    };
  }

  const payload: CapacityDriftPayload = {
    utilization_pct: util,
    utilization_prior_pct: null, // could be wired later via snapshots
    direction,
    threshold_crossed: threshold,
    hours_logged_mtd: data.hours_tracked,
    hours_capacity_mtd: hoursCapacity,
    draft_subject: draft.subject,
    draft_body: draft.body,
  };

  return [{ action_type: 'capacity_drift', payload }];
}
