// src/lib/scope-creep.ts
import type { ClickupScopeData } from './integrations/clickup/scope-adapter';
import type { HarvestMonthlyProjectData } from './integrations/harvest/adapter';

export type ScopeStatus = 'on_track' | 'at_risk' | 'over_budget';

export type ScopeProject = {
  project_name: string;
  estimated_hours: number;
  logged_hours: number;
  burn_pct: number;
  status: ScopeStatus;
  matched: boolean;
};

export type ScopeCreepResult = {
  projects: ScopeProject[];
  unmatched_clickup: string[];
  unmatched_harvest: string[];
};

function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeScopeCreep(
  clickup: ClickupScopeData,
  harvest: HarvestMonthlyProjectData,
): ScopeCreepResult {
  const harvestMap = new Map<string, number>();
  for (const p of harvest.projects) {
    harvestMap.set(normalizeProjectName(p.project_name), p.hours);
  }

  const matchedHarvestNorms = new Set<string>();
  const projects: ScopeProject[] = [];

  for (const cp of clickup.projects) {
    const norm = normalizeProjectName(cp.project_name);
    const loggedHours = harvestMap.get(norm) ?? 0;
    const isMatched = harvestMap.has(norm);
    if (isMatched) matchedHarvestNorms.add(norm);

    const burn_pct =
      cp.estimated_hours > 0
        ? Math.round((loggedHours / cp.estimated_hours) * 1000) / 10
        : 0;

    projects.push({
      project_name: cp.project_name,
      estimated_hours: cp.estimated_hours,
      logged_hours: Math.round(loggedHours * 10) / 10,
      burn_pct,
      status: burn_pct >= 100 ? 'over_budget' : burn_pct >= 80 ? 'at_risk' : 'on_track',
      matched: isMatched,
    });
  }

  return {
    projects: projects.sort((a, b) => b.burn_pct - a.burn_pct),
    unmatched_clickup: clickup.projects
      .filter((cp) => !harvestMap.has(normalizeProjectName(cp.project_name)))
      .map((cp) => cp.project_name),
    unmatched_harvest: harvest.projects
      .filter((hp) => !matchedHarvestNorms.has(normalizeProjectName(hp.project_name)))
      .map((hp) => hp.project_name),
  };
}
