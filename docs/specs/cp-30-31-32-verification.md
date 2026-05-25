# CP-30 / CP-31 / CP-32 — verification status (May 2026)

What's testable in isolation, what needs real customer data, and what to verify before the first paying customer.

## CP-30 — Per-agent brain-path hints

**What shipped:**
- `src/lib/brain/agent-hints.ts` — `getBrainPathHints(agentSlug)` + `buildAgentBrainHintsBlock(agentSlug)`
- Per-agent hints for all 10 domain agents + tool agents (shared pattern) + evaluator
- Wired into `src/lib/agents/loop.ts` system prompt enrichment

**Verifiable WITHOUT real customer data:**
- ✅ Build passes (TypeScript + webpack)
- ✅ `buildAgentBrainHintsBlock('revenue')` returns a non-empty string with kpi-snapshots / pattern-cards paths
- ✅ Snapshot test: every agent slug returns the right hint set

**Needs real customer data:**
- Does the agent actually USE the hinted paths? Or does it invent new ones?
- Does the consistency of paths produce a cleaner Notion mirror?

**To verify after first run:**
```sql
-- See what paths agents are actually writing to
select agent_slug, source, path, count(*)
from agent_runs ar
join brain_document_versions v on v.commit_id in (
  select id from brain_commits where author_type = concat('agent:', ar.agent_slug)
)
group by 1,2,3 order by count(*) desc limit 50;
```

## CP-31 — 12-month historical backfill

**What shipped:**
- `src/lib/warehouse/backfill.ts` — `backfillHistory(userId)` orchestrator
- Per-source backfills: Stripe, HubSpot, Harvest, ClickUp, Pipedrive
- Wired into `src/app/api/composio/webhook/route.ts` — fires on Notion connect
- Manual trigger endpoint: `POST /api/dashboard/backfill/trigger`

**Verifiable WITHOUT real customer data:**
- ✅ Build passes
- ✅ Composio action slugs are correct (cross-checked against `docs/superpowers/specs/composio-verified-actions.md`)
- ✅ Endpoint routes exist (`/api/dashboard/backfill/trigger`, webhook wired)
- ✅ Pagination loops bound correctly (`maxPages` caps)

**Needs real customer data:**
- Does Stripe BALANCE_TRANSACTIONS pagination actually work with the `starting_after` cursor for 12mo?
- Does HubSpot SEARCH_DEALS return more than 100 results across pages?
- Does the 300s Vercel function timeout hold for the largest customers?
- Does dedupe via `(user_id, source, external_id)` actually prevent double-inserts?

**To verify after first connect:**
```bash
# Manually trigger
curl -X POST https://opsradar.co/api/dashboard/backfill/trigger \
  -H "Cookie: <auth>"

# Then check
select source, count(*), min(occurred_at), max(occurred_at)
from external_events
where user_id = '<uuid>'
group by source;
```

Expected results for a typical agency:
- stripe: ~5,000-15,000 rows (12 months of transactions)
- hubspot: ~1,000-5,000 rows (deal changes)
- harvest: ~10,000-50,000 rows (time entries)
- clickup: ~2,000-10,000 rows (tasks)
- Total wall-clock: 3-5 minutes

## CP-32 — End-to-end verification

**The honest list of what's untested with real data:**

| Component | Built | Tested locally | Tested with real data |
|---|---|---|---|
| Notion connect → Brain provision (CP-24) | ✅ | Partial (mock token) | ❌ |
| Notion connect → backfill auto-trigger (CP-31) | ✅ | ❌ | ❌ |
| Agent writes to brain (CP-28) | ✅ | ❌ | ❌ |
| Brain → Notion sync engine (CP-29) | ✅ | ❌ | ❌ |
| Weekly export cron (CP-26) | ✅ | ❌ | ❌ |
| Manual backfill trigger | ✅ | ❌ | ❌ |
| Customer download zip | ✅ | ❌ | ❌ |
| query_historical AI tool | ✅ | ❌ | ❌ |
| query_historical → real warehouse data | ✅ | ❌ | ❌ (warehouse empty until backfill runs) |

**Manual smoke-test sequence for the first real customer:**

1. **Connect Notion** (OAuth flow). Verify:
   - composio_connections row created with `is_active = true`
   - notion_workspaces row created with `parent_page_id`
   - The 20 Notion DBs exist in the customer's workspace
   - Brain Home page renders

2. **Wait 3-5 min for backfill**. Verify:
   ```sql
   select source, count(*) from external_events
   where user_id = '<uuid>' group by source;
   ```
   Should see populated counts for each connected toolkit.

3. **Run a domain agent manually**:
   ```bash
   curl -X POST https://opsradar.co/api/cron/agents/revenue \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   Verify:
   - agent_runs row created with status='success'
   - brain_document_versions rows created (agent wrote to brain)
   - Notion has new content (the agent also dual-wrote, OR the daily sync hasn't run yet)

4. **Trigger Notion sync manually**:
   ```bash
   curl https://opsradar.co/api/cron/brain-sync \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   Verify a "OpsRadar Brain (synced)" page appeared in Notion with sections.

5. **Download the brain**:
   - Open https://opsradar.co/api/dashboard/brain/download
   - A zip should download with README.md + the agent-written markdown files

6. **Ask the COO chat**: "Show me MRR for the last 3 months."
   Verify the COO calls `query_historical` and returns real data.

7. **Approve a queued action**:
   - Check /dashboard/actions
   - Approve one
   - Verify it executes against Composio

## What MUST be set in production for any of this to work

| Env var | Where | Why |
|---|---|---|
| `CRON_SECRET` | Vercel project | All cron routes (brain-export, brain-sync, agents) reject without it |
| `COMPOSIO_WEBHOOK_SECRET` | Vercel + Composio | Webhook signature verification (CP-20 + CP-31 ingress) |
| `RESEND_API_KEY` | Vercel | Email sends (brain-export, brain-ready, briefings) |
| `TAVILY_API_KEY` | Vercel | Web search / competitor research (CP-22) |
| `COMPOSIO_API_KEY` | Vercel (already set) | All Composio operations |

## What's NOT yet built (next CPs)

- **CP-33: Admin debug endpoints** — view per-customer brain document tree, force-resync, view agent_runs detail
- **CP-34: Customer onboarding wizard** — guided "connect Notion → see your brain in 5 min" flow
- **CP-35: Pro-tier sync to customer's own GitHub** — for engineering-team customers who want true git ownership
- **CP-36: Privacy Policy + DPA + data deletion** — legal compliance for first paying customers
- **CP-37: Real-time blocker alerts** (BOND-killer) — push/Slack/email when scope creep crosses threshold, Stripe charge fails, etc.

## Honest production-readiness assessment

The architecture is complete and pushed to GitHub. **Zero verification has happened with real customer data.** Build passes, migrations applied, routes respond — but nothing has been driven end-to-end yet.

The single biggest blocker to confidence is **#2 of the smoke-test sequence** — does the Stripe/HubSpot/Harvest backfill actually work against real toolkits in the 300s window? Until one customer runs through it, we don't know if our Composio action slugs + pagination logic are correct.

**Recommended next step**: recruit one friendly customer (or use the founder's own agency tools), run the full smoke-test sequence, fix whatever breaks. That's CP-32 in practice.
