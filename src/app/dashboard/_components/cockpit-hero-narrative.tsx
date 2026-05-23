'use client';

import { NarrativeCard } from './narrative-card';

// Cockpit hero — single-column narrative card now that the n8n savings tile
// is gone (CP-15 chatv2 sever). If we want to re-add a hero metric later,
// the right source is agent_runs / agent_actions, not workflow ROI.
export function CockpitHeroNarrative() {
  return <NarrativeCard section="hero" title="This week's briefing" />;
}
