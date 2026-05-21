# COO Agent — Design Spec

*Written 2026-05-21. Approved by founder.*

---

## What This Is

Upgrade the COO chat from a context-injected LLM into a true GPT-4o tool-use agent. The agent dynamically decides which data tools to call based on the user's question, streams visible tool call steps to the UI, and can queue actions for inline confirmation.

This makes OpsRadar a defensible YC #4 (Company Brain) + #15 (AI OS) product.

---

## Decisions Made

| Decision | Choice |
|----------|--------|
| Approach | Full tool use — GPT-4o function calling, not context injection |
| Tool call visibility | Visible steps streamed to UI ("⚙ Fetching profitability data...") |
| Agent actions | Queue + inline confirmation card in chat |
| Model | GPT-4o (stay current — o1/o3 too slow for chat) |
| Phase 1 scope | 6 tools: all data sources + queue_action |
| Phase 2 scope | + search_web() with business context |

---

## Architecture

### Agent Loop

```
User message
    ↓
POST /api/dashboard/coo
    ↓
GPT-4o receives: system prompt + message history + tool definitions
    ↓
GPT-4o decides which tool(s) to call
    ↓
Server executes tool → streams "tool_call" event to client
    ↓
Tool result returned to GPT-4o
    ↓
Repeat until GPT-4o has enough data to answer
    ↓
GPT-4o generates final text answer
    ↓
If queue_action was called → stream "action_proposed" event
    ↓
Client renders answer + inline confirmation card
```

Max 5 tool call iterations to prevent runaway loops.

### Streaming Protocol (SSE)

The route switches from `NextResponse.json()` to a `ReadableStream` (SSE). Events emitted:

```jsonl
{"type":"tool_call","name":"get_profitability","label":"Fetching profitability data..."}
{"type":"tool_done","name":"get_profitability"}
{"type":"text_delta","delta":"Client B is your least profitable..."}
{"type":"action_proposed","action_id":"xxx","action_type":"reprice_client","payload":{...},"label":"Reprice Client B — raise retainer $3K → $4.5K"}
{"type":"done"}
```

---

## Phase 1 Tools

### Data Tools (read-only)

| Tool | Source | Returns |
|------|--------|---------|
| `get_finance()` | Stripe | MRR, paid MTD, overdue invoices, cash flow |
| `get_sales()` | HubSpot | Pipeline value, open deals, won MTD |
| `get_profitability()` | Stripe + Harvest | Per-client margin, hours, revenue |
| `get_capacity()` | Harvest | Utilization %, available hours, team capacity |
| `get_scope()` | ClickUp + Harvest | Scope creep signals per client |

Each tool returns `{ success: true, data: {...} }` or `{ success: false, reason: "not_connected" | "fetch_failed" }`. The model is instructed to report missing data rather than guess.

### Action Tool

| Tool | Effect |
|------|--------|
| `queue_action(type, payload, label)` | Creates row in `agent_actions` with `status: 'pending'`, returns `action_id` |

When `queue_action` is called, the server streams an `action_proposed` event. The chat UI renders an inline card with **Confirm** / **Cancel** buttons. Confirm calls `POST /api/dashboard/actions/:id/approve`.

---

## Hallucination Guards

- System prompt: *"Base your answer ONLY on tool results. If a tool returns `success: false`, tell the user what data is missing — never estimate or invent numbers."*
- Temperature: 0.2 (down from 0.4)
- Every tool returns explicit `success: false` on failure — no silent empty responses
- Max 5 tool call iterations

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/dashboard/coo/route.ts` | Rewrite — agent loop, SSE streaming, tool execution |
| `src/lib/coo/tools.ts` | New — GPT-4o tool definitions (JSON schema) |
| `src/lib/coo/executor.ts` | New — executes tool calls, returns structured results |
| `src/lib/coo/context.ts` | Refactor — break `buildCooContext` into discrete tool functions |
| `src/app/dashboard/coo/_components/CooChat.tsx` | Update — handle SSE stream, render tool steps + action cards |

---

## Phase 2 (Later)

Add `search_web(query)` tool using Tavily or Perplexity API. The agent uses business context (team size, service mix, revenue) to form a relevant search query, then reasons over results + internal data together.

Example: "Who are my top 3 competitors?" → agent knows the customer is a 12-person paid media agency doing $800K/year → search query is specific, answer is relevant.

New env var required: `TAVILY_API_KEY` or `PERPLEXITY_API_KEY`.

---

## What This Does NOT Include

- No changes to the Actions page UI
- No changes to other dashboard routes
- No new Supabase tables (uses existing `agent_actions`)
- No Phase 2 web search (separate spec)
