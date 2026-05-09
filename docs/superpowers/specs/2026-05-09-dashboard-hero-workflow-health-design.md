# Dashboard Hero ROI Block + Workflow Health Strip — Design Spec

**Date:** 2026-05-09
**Owner:** Lawand
**Status:** Approved — ready for implementation planning

---

## Goal

Add the marquee Hero ROI block and Workflow Health strip to `/dashboard`, sourced directly from the CTO's chat-branch backend (`https://opstest.atta.codes`). These are the dashboard's headline — they answer "are my automations working and what are they worth?" before the supporting cards.

## Audience

Same as the parent spec: agency operators ([2026-05-09-dashboard-live-data-design.md](2026-05-09-dashboard-live-data-design.md), v1 = agency role only).

## Position on the page

Above all existing content. Final order from top to bottom:

```
[Page Header]
[Hero ROI block]                ← NEW
[Workflow Health strip]         ← NEW
[5 static stat cards]           (still mock — replaced as Marketing/Delivery/Finance ship)
[Revenue chart] [Tasks chart]   (still mock)
[Sales card]                    (live, from previous plan)
[Projects table] [Activity feed] (still mock)
```

## Architecture (a deviation from the parent spec, intentional)

The parent live-data spec said "n8n owns ingestion, all widgets route through n8n webhooks." This widget breaks that pattern, on purpose: the CTO's backend at `opstest.atta.codes` is **internal infrastructure**, not a third-party tool. Routing through n8n would be a useless hop.

```
Browser
  ↓ fetch('/api/dashboard/automation-roi')
Next.js API route
  ├─ Check Upstash Redis cache (key: dash:automation-roi, TTL 180s)
  ├─ On miss: fetch CTO's GET https://opstest.atta.codes/analytics
  ├─ Map response to widget contract
  ├─ Cache + return
  └─ ~30 LOC; does NOT use the existing dashboard-fetch.ts helper
```

**Rule established:** External tools (HubSpot, Stripe, etc.) route through n8n. **Internal sibling services** (CTO's backend, future OpsRadar microservices) call directly. If we get a third "direct call" widget, extract a `fetchDirect()` helper. YAGNI for now.

**Auth:** None at the application layer. CTO's backend relies on network-level controls (per his API summary). `POST /event` is the only token-gated endpoint and we don't use it.

**Cache:** No per-tenant key for v1 — CTO's backend currently aggregates globally. When customer scoping arrives (his API exposes per-tenant `/analytics`), the cache key becomes `dash:automation-roi:<client_id>`.

## Data flow

The CTO's `GET /analytics` returns this exact shape (verified with a live probe):

```ts
{
  overview: {
    total_projects: number,
    total_workflows: number,
    total_runs: number,
    failed_runs: number,
    success_rate: number,           // already a percentage 0-100
    average_duration_ms: number,
    unresolved_alerts: number,
    healthy_workflows: number,
    unhealthy_workflows: number,
  },
  workflows_health: Array<{
    workflow_id: string,
    project_id: string,
    project_name: string,
    is_working: boolean,
    last_run_status: 'success' | 'failure' | 'unknown',
    failed_runs: number,
    total_runs: number,
    unresolved_alerts: number,
  }>,
}
```

Our API route maps it to the widget contract:

```ts
type AutomationRoiWidget = {
  // Hero block
  dollars_saved: number;
  hours_saved: number;
  actions_automated: number;
  success_rate_pct: number;
  total_workflows: number;
  open_alerts: number;

  // Workflow Health strip
  healthy_count: number;
  failing_count: number;

  // For "Open monitor →" link
  monitor_url: string;
}
```

### Field-by-field mapping

| Output field | From | Logic |
|---|---|---|
| `dollars_saved` | `overview.total_runs - overview.failed_runs` (i.e. successful runs) × `DEFAULT_MINUTES_PER_EXECUTION` / 60 × `DEFAULT_HOURLY_RATE_USD` | derived |
| `hours_saved` | same numerator × `DEFAULT_MINUTES_PER_EXECUTION` / 60 | derived |
| `actions_automated` | `overview.total_runs - overview.failed_runs` | direct |
| `success_rate_pct` | `overview.success_rate` | direct (already 0-100) |
| `total_workflows` | `overview.total_workflows` | direct |
| `open_alerts` | `overview.unresolved_alerts` | direct |
| `healthy_count` | `overview.healthy_workflows` | direct |
| `failing_count` | `overview.unhealthy_workflows` | direct |
| `monitor_url` | env `WORKFLOW_MONITOR_URL` | static |

### Why successful-runs-only for ROI

Failed runs don't save anyone's time — they often *cost* time (someone has to investigate). Counting only successful runs gives an honest "actions completed by automations." Errors are surfaced separately as `open_alerts`.

## UI: Hero block

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│           $1,250 saved                                   │  ← 56pt, white
│                                                          │
│   based on 600 actions automated this month              │  ← muted
│                                                          │
│   [3.0h saved] [3 workflows] [5 alerts open]             │  ← chip row
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Hero number is `dollars_saved` formatted as USD currency.
- Subtitle uses `actions_automated`.
- Chip row uses `hours_saved`, `total_workflows`, `open_alerts`. Alerts chip is amber/red when > 0; green/muted when 0.
- Loading state: skeleton bars matching this layout.
- Error state: red banner "Automation system temporarily unreachable. Last good fetch: Xm ago" + show stale data if available.
- Empty state: "Connect your first automation to see ROI here." with link to CTO's tool.

## UI: Workflow Health strip

```
┌──────────────────────────────────────────────────────────┐
│  ●1 healthy   ●2 failing   ●5 alerts        Open monitor →│
└──────────────────────────────────────────────────────────┘
```

- Compact horizontal strip, ~48px tall.
- Each pill uses the relevant count from the widget contract.
- "Open monitor →" is an anchor to `monitor_url` (target=_blank).
- If `failing_count > 0`, the strip background gains a subtle red wash.
- Same loading/error/empty states as the Hero block.

## File map

### New files

```
src/app/api/dashboard/automation-roi/route.ts     — API endpoint
src/components/dashboard/hero-roi-block.tsx       — Hero UI
src/components/dashboard/workflow-health-strip.tsx — Strip UI
```

### Modified files

```
src/app/dashboard/page.tsx                        — Add Hero + Strip above stat cards
.env.local (gitignored)                            — Add 4 new env vars
```

### Reuses

- Upstash Redis client (already in stack)
- Theme tokens at `src/app/dashboard/_lib/theme.ts`
- Widget UI state pattern proven by `SalesCard`

## New env vars

```
CTO_BACKEND_URL=https://opstest.atta.codes
DEFAULT_MINUTES_PER_EXECUTION=5
DEFAULT_HOURLY_RATE_USD=25
WORKFLOW_MONITOR_URL=https://opstest.atta.codes/#/projects
```

## Error handling

| Scenario | Behavior |
|---|---|
| CTO backend returns 5xx or unreachable | API route returns `{status: 'error', message, staleData?}`. Cache key has a 24h "stale backup" sibling for fallback rendering. |
| CTO backend returns 200 with unexpected shape | Treat as error. Log, return error status. Do not crash. |
| `total_workflows === 0` (genuinely empty) | Render empty state, not zeros. |
| Cache hit | Return immediately, mark `fromCache: true`. |
| Forced refresh (`?fresh=1`) | Bypass cache, write fresh result back. |

## Non-goals

- Building per-workflow drill-in within `/dashboard` — "Open monitor →" link covers it.
- Month-over-month delta on the hero — his API is cumulative; defer until snapshotting is needed.
- A new `dashboard-fetch.ts` abstraction for direct calls — extract only when a third widget needs it.
- Multi-tenant scoping of CTO's `/analytics` — defer until the CTO's backend supports it.
- Authentication to CTO's backend — currently network-level; revisit if the architecture changes.

## v1 / v2 / v3 scope cut

### v1 (this spec)
- Hero block + Workflow Health strip both pulling from CTO's `/analytics`
- Cumulative metrics (lifetime since automations started running)
- Default ROI inputs from env vars (no per-workflow override yet)
- "Open monitor →" external link to CTO's UI

### v2
- Per-workflow ROI config UI (override `minutes_saved` and `hourly_rate` per workflow)
- Month-over-month delta (requires snapshotting)
- Per-tenant scoping when CTO's backend exposes it

### v3 (deferred)
- In-dashboard workflow drill-in (so users don't have to leave OpsRadar)
- Real-time push (websockets or SSE) for live alert badges

## Open questions for plan-time

- Exact CSS for the Hero number font (the project uses `NotoSerifDisplay` for headings — confirm fits the cockpit feel)
- Whether the strip should collapse into the Hero on mobile (mobile-optimized layout is non-goal in v1, but worth a one-line note in the implementation)
