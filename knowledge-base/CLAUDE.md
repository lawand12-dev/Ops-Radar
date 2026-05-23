# OpsRadar Knowledge Base

> **Status (2026-05-23): NOT WIRED.** All consumers were disconnected in CP-16.
> The audit funnel was retired (Path B — `/audit` is now a "Coming soon" placeholder)
> and `search_kb` was removed from the COO chat + MCP server. This folder is
> preserved as raw material for the reframe pending in CP-17 (n8n-reference +
> n8n-playbooks → agent-context). After reframe, the cleaned subset will be
> re-wired into the cron agents and/or COO chat.

---

## What's still here

```
knowledge-base/
  agency-profiles/     20 files — how agencies operate by type and size
  benchmarks/          11 files — hours, costs, ROI, margin benchmarks
  patterns/            50 files — operational pain patterns
  failures/            18 files — failure modes and fixes
  integrations/        10 files — agency-specific deep dives per tool
  playbooks/            7 files — exact scripts and frameworks
  tools/               50 files — API behaviour per tool
  n8n-reference/      114 files — node + API reference (REFRAME CANDIDATE)
  n8n-playbooks/       50 files — workflow build/fix playbooks (REFRAME CANDIDATE)
```

## What was removed in CP-16

- `n8n-core/` (12 files) — pure n8n platform reference
- `n8n-workflows/` (5 files) — workflow templates
- `n8n-troubleshooting/` (40 files) — mostly n8n-specific failure cases

## What was removed from code

- `src/lib/knowledge-retrieval.ts` — file-based KB reader
- `src/lib/coo/semantic-retrieval.ts` — pgvector hybrid retriever
- `runSearchKb` in `src/lib/coo/executor.ts`
- `search_kb` tool definition in `src/lib/coo/tools.ts`
- `opsradar.search_kb` tool definition in `src/app/api/mcp/route.ts`
- `/admin/kb-gaps` admin page
- All audit-funnel consumers (`/api/generate-audit`, `src/lib/prompts.ts`, etc.)

## What still exists in the database

- `kb_embeddings` table — pgvector embeddings for the KB files. Dormant.
- `coo_kb_gaps` table — admin backlog of unanswered queries. Dormant.
- `embed-kb.ts` script — still works; regenerates embeddings on demand. Not run automatically.

These are kept so the re-wire in CP-17 can be a single-commit feature flip
rather than a fresh provisioning.

## Reframe plan (CP-17)

Per `docs/strategy/composio-vs-n8n-decision-2026.md`, the 164 remaining n8n-* files
are 80% underlying API knowledge (HubSpot/Stripe/Gmail/Slack/etc. behavior).
The reframe job:

1. Auto-rewrite the 30 highest-value `n8n-reference/` files via a one-shot
   gpt-5.4 prompt — strip n8n framing, keep API behavior + gotchas. Output
   to a new `agent-context/` folder.
2. Auto-rewrite the 20 highest-value `n8n-playbooks/` files similarly —
   reframe "n8n workflow" as "operational sequence the agent can recommend."
3. Founder reviews + augments with proprietary insight.
4. Re-wire to agents via a new `getAgentContext(toolkit, scenario)` helper.

Until then: the model answers industry-benchmark and tool-behavior questions
from parametric knowledge only.
