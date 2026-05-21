# Dashboard Reliability Fixes

> Written 2026-05-21. **All 6 fixes shipped 2026-05-21.**

---

## What this is

Six specific bugs found in the dashboard API layer. All are reliability or data-quality issues — none are feature additions. The goal is: every dashboard load shows real data (or gracefully serves stale data) instead of crashes or empty states.

---

## Fix 1 — `workflow-health` has no Redis cache

**File:** `src/app/api/dashboard/workflow-health/route.ts`

**Problem:** Every call hits the CTO's chatv2 server directly. This endpoint is called by 4 separate dashboard components on every page load. If chatv2 is slow, the whole dashboard stalls.

**Fix:** Add a fresh (3-min) + stale (24h) Redis cache using the same safe get/set pattern as `automation-roi/route.ts`. On chatv2 failure, serve stale data silently instead of showing an error.

**Risk:** Low. Pure addition — no type changes, no breaking behavior.

---

## Fix 2 — `alerts` crashes if Redis env vars are missing

**File:** `src/app/api/dashboard/alerts/route.ts`  
**Line:** 37 — `const redis = Redis.fromEnv();`

**Problem:** `Redis.fromEnv()` throws an exception if `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are not set. The `finance` and `sales-live` routes wrap this in `try { return Redis.fromEnv(); } catch { return null; }` — but `alerts` does not. If Redis is unconfigured (e.g., in a staging environment), the entire alerts endpoint crashes with a 500.

**Fix:** Wrap in try-catch identical to `finance/route.ts` line 56–58. If Redis is null, skip caching gracefully.

**Risk:** Trivial. Two-line change.

---

## Fix 3 — `activity` crashes if Redis env vars are missing

**File:** `src/app/api/dashboard/activity/route.ts`  
**Line:** 95 — `const redis = Redis.fromEnv();`

**Problem:** Same crash as Fix 2.

**Fix:** Same fix — wrap in try-catch.

**Risk:** Trivial. Two-line change.

---

## Fix 4 — `finance` returns an error immediately when Stripe is slow/down

**File:** `src/app/api/dashboard/finance/route.ts`

**Problem:** When the Stripe API is slow or temporarily unavailable, the route catches the error and immediately returns `{ status: 'unavailable' }`. The KPI card goes blank. There is no stale fallback.

`automation-roi` has a proper stale cache (24h TTL). `finance` does not.

**Fix:** After a successful Stripe fetch, write the result to a second Redis key with a 24h TTL. On any Stripe fetch failure, read that stale key and return the cached data with `from_cache: true`. The KPI card stays populated.

**Risk:** Low. Pattern is already proven in `automation-roi/route.ts`.

---

## Fix 5 — Activity feed is always empty for Stripe

**File:** `src/lib/integrations/stripe/adapter.ts` + `src/app/api/dashboard/activity/route.ts`

**Problem:** `adaptStripe()` in `activity/route.ts` always returns `[]`. The Stripe adapter already fetches the last 100 charges from the Stripe API (it uses them to build the sparkline) — but it throws them away and doesn't expose them in the response.

**Fix:**
1. Add `recent_charges: StripeRecentCharge[]` field to `StripeFinanceData` type.
2. In `fetchStripeFinanceData`, populate it with the last 5 succeeded charges (name, amount, ISO timestamp).
3. Update `adaptStripe()` to read `data.recent_charges` and emit `stripe_charge` activity events.

**Result:** Real payment events appear in the activity feed whenever Stripe is connected.

**Risk:** Low. Additive type change — no existing consumers break. The charges are already being fetched; this just exposes them.

---

## Fix 6 — Activity feed is always empty for HubSpot

**File:** `src/lib/integrations/hubspot/adapter.ts` + `src/app/api/dashboard/activity/route.ts`

**Problem:** `adaptHubspot()` always returns `[]`. The HubSpot adapter already iterates all deals and tracks `isClosedWon` — but it only counts them, doesn't return the individual deals.

**Fix:**
1. Add `recent_deals_won: HubspotWonDeal[]` field to `HubspotSalesData` type.
2. In `fetchHubspotSalesData`, collect deals where `hs_is_closed_won = true` and `closedate >= 30 days ago`, return up to 5 sorted newest-first.
3. Update `adaptHubspot()` to read `data.recent_deals_won` and emit `hubspot_deal` activity events.

**Result:** Real won-deal events appear in the activity feed whenever HubSpot is connected.

**Risk:** Low. Same pattern as Fix 5.

---

## Summary table

| # | Fix | Files changed | Risk |
|---|-----|---------------|------|
| 1 | Add cache to workflow-health | 1 route file | Low |
| 2 | Fix alerts Redis crash | 1 route file | Trivial |
| 3 | Fix activity Redis crash | 1 route file | Trivial |
| 4 | Finance stale fallback | 1 route file | Low |
| 5 | Stripe activity events | 1 adapter + 1 route | Low |
| 6 | HubSpot activity events | 1 adapter + 1 route | Low |

**Total: 6 files changed. No DB migrations. No new env vars. No breaking changes.**

---

## What this does NOT include

- No new dashboard sections
- No sidebar changes
- No KPI snapshot table (that's a separate larger decision)
- No changes to the narrative/briefing quality issue (requires separate design)
- No chatv2 changes (those need the CTO)
