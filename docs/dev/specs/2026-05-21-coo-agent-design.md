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

---

## Addendum — Server-Side Chat Persistence (2026-05-23)

The original spec relied on localStorage for chat history. That broke
cross-device sync and capped users to one active conversation per
browser. This addendum replaces it with a Supabase-backed store and a
ChatGPT-style sidebar of saved chats.

### Why

- Paying customers expect cross-device sync. A founder opens the COO
  on their laptop in the morning and their phone in the afternoon and
  expects the same conversation to be there.
- One active chat per browser is a regression vs. every modern AI chat
  product. Customers want to keep separate threads ("payroll forecast"
  vs. "which client to fire") without losing context.
- Persisted tool steps + action cards give us a real audit trail of
  what the COO recommended and when — useful for the outcomes loop
  ([[coo-outcomes]]) and for support when a customer asks "what did
  it tell me last week?"

### Tables (`supabase/migrations/20260523_coo_chat_sessions.sql`)

```
coo_chat_sessions
  id              uuid pk
  user_id         uuid → auth.users (RLS: auth.uid() = user_id)
  title           text  default 'New chat'
  message_count   int   default 0    -- bumped by trigger
  last_message_at timestamptz        -- bumped by trigger
  created_at, updated_at

coo_chat_messages
  id          uuid pk
  session_id  uuid → coo_chat_sessions (ON DELETE CASCADE)
  user_id     uuid → auth.users (RLS: auth.uid() = user_id)
  role        text  CHECK IN ('user', 'assistant')
  content     text  default ''
  tool_steps  jsonb           -- [{ name, label, done }]
  action_card jsonb           -- { action_id, action_type, label }
  created_at  timestamptz
```

A trigger (`coo_chat_messages_after_insert`) bumps
`last_message_at`, `updated_at`, and `message_count` on the parent
session after every insert. This keeps the sidebar order and count
correct without bookkeeping in the API layer.

Indexes: `(user_id, last_message_at DESC)` for sidebar listing and
`(session_id, created_at)` for message loading.

### New API routes

- `GET /api/dashboard/coo/sessions` — user's sessions, sorted by
  `last_message_at` desc, capped at 50.
- `POST /api/dashboard/coo/sessions` — creates an empty session
  (title defaults to "New chat"). Currently unused by the UI because
  the agent creates the session on first message instead.
- `GET /api/dashboard/coo/sessions/[id]` — session metadata + ordered
  messages.
- `PATCH /api/dashboard/coo/sessions/[id]` — rename (max 120 chars).
- `DELETE /api/dashboard/coo/sessions/[id]` — cascades to messages.

### `/api/dashboard/coo` changes

- POST body now accepts `session_id?: string` alongside `messages`.
- On receipt, validates the session id belongs to the user. If absent
  or tampered, creates a new session with the first user message
  (sliced to 60 chars) as the title.
- Persists the user message immediately so it survives if the
  assistant stream is aborted mid-flight.
- Emits a new SSE event as the **first** frame:

  ```json
  { "type": "session", "session_id": "<uuid>", "title": "<resolved title>" }
  ```

  This lets the client (which may not have a session id yet) learn
  which row this conversation is being written to.
- Accumulates the final assistant message (content + toolSteps +
  actionCard) during streaming.
- Calls `persistAssistant()` before emitting `done`, on MAX_ITER
  exhaustion, on unexpected `finish_reason`, and in the catch block.
  An aborted client connection therefore leaves a complete record on
  the server.

### UI architecture

```
/dashboard/coo/page.tsx
  └── <CooShell>                            owns active session id,
                                            persists it to localStorage
                                            so refresh returns to the
                                            same chat
       ├── <SessionsSidebar>                lists past chats, "+ New
       │                                    chat" (sets active=null),
       │                                    hover-reveal two-click
       │                                    delete
       └── <CooChat sessionId=...>          controlled — loads server
                                            messages on session change,
                                            forwards session_id with
                                            each POST, listens for the
                                            `session` SSE event so
                                            brand-new chats get
                                            assigned an id mid-stream
```

`CooChat` no longer owns localStorage history. The only client-side
state that survives a refresh is the active session id; everything
else is hydrated from Supabase.

### Files changed

| File | Change |
|------|--------|
| `supabase/migrations/20260523_coo_chat_sessions.sql` | New — two tables + RLS + trigger |
| `src/lib/database.types.ts` | Add Row/Insert/Update types for both tables |
| `src/app/api/dashboard/coo/sessions/route.ts` | New — list + create |
| `src/app/api/dashboard/coo/sessions/[id]/route.ts` | New — get + rename + delete |
| `src/app/api/dashboard/coo/route.ts` | Accept `session_id`, persist messages, emit `session` event |
| `src/app/dashboard/coo/_components/coo-shell.tsx` | New — sidebar + chat layout, owns active session |
| `src/app/dashboard/coo/_components/sessions-sidebar.tsx` | New — sidebar list, new chat, delete |
| `src/app/dashboard/coo/_components/coo-chat.tsx` | Refactor to controlled component (server-loaded messages, session id forwarded) |
| `src/app/dashboard/coo/page.tsx` | Render `<CooShell>` instead of `<CooChat>` directly |
