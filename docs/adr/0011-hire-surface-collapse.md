# ADR 0011 — The dashboard collapses into a single "Hire" surface (2026-05-27)

> **Status**: accepted. **Relates to**: [`0005-control-first-approval-gate.md`](./0005-control-first-approval-gate.md) (the approval gate survives unchanged), [`0006-orchestrator-worker-pattern.md`](./0006-orchestrator-worker-pattern.md) (the agent model the surfaces exposed), [`0010-nango-broker.md`](./0010-nango-broker.md) (the same 2026-05-26 pivot).
> **Source of truth in code**: `src/app/dashboard/`, `src/app/dashboard/hire/_components/`.

---

## The decision

**Collapse the three separate agent surfaces — `/dashboard/coo` (Ask COO chat), `/dashboard/agents` (28-agent status grid), `/dashboard/automations` (customer-built automations) — into one surface: [`/dashboard/hire`](../../src/app/dashboard/hire/).** The customer has exactly one top-level concept: a chat where they *hire and direct* AI workers. Those three routes are gone.

## Why

The pre-pivot product split one mental model across three doorways. Research and our own usage said this fragments the customer:

- **One doorway beats three.** Lindy/Devin/BOND-style products converge on a single conversational entry point, not a console of separate panels. "Ask COO" vs "see Agents" vs "build Automations" forced the customer to learn our internal architecture.
- **"Hire" is the verb that matches the value prop.** You don't "open the COO chat" — you hire a worker, tell it what to do, and it either answers, acts (through the approval gate), or becomes a standing automation. Same engine, one surface.
- **The pivot made it cheap.** The Composio rip-out ([`0010`](./0010-nango-broker.md)) already tore down the 28-agent stack, so re-fragmenting it across three surfaces during the rebuild made no sense.

## What the surfaces became

| Old surface | Fate |
|---|---|
| `/dashboard/coo` (Ask COO chat) | → folded into `/dashboard/hire` (the chat *is* the COO) |
| `/dashboard/agents` (28-agent grid) | → removed as a standalone surface; the built-in workers live behind Hire + `/dashboard/employees` |
| `/dashboard/automations` (+ `/automations/[id]`) | → automations are created/managed through the Hire chat; the standing-automation concept survives, the separate registry surface does not |

## Current dashboard routes (live on disk, 2026-05-27)

```
/dashboard            overview cockpit
/dashboard/hire       THE primary surface — chat to hire + direct AI workers
/dashboard/actions    agentic action queue (approval gate landing)
/dashboard/employees  custom AI employees (hireable, scoped, org-chart)
/dashboard/runs       every agent run + drawer detail
/dashboard/brain      customer-owned Notion brain entry
/dashboard/integrations  connect tools via OAuth (Nango)
/dashboard/fo         Fractional Operator multi-client aggregate
/dashboard/settings   account / tool-autonomy / usage / team / mcp
/dashboard/webhooks   outgoing webhooks (power-user, no sidebar entry)
```

Hire is implemented as a full-bleed chat: `hire/page.tsx` → `HireShell` → `hire-chat.tsx` + `sessions-sidebar.tsx` (`src/app/dashboard/hire/_components/`).

## Consequences

- **The agent stack is mid-rebuild behind Hire.** `src/lib/agents/registry.ts` holds one agent (Gmail) today; the other 27 are restored one at a time on Nango ("one `git restore` of the spec + one registry line"). So "28 agents" in older docs is the pre-pivot/target state, not what Hire exposes today.
- **The approval gate is untouched.** Hire routes every write through the same gate (Ask / Auto / Off) → `/dashboard/actions`. ADR 0005 stands.
- **Older docs referencing `/dashboard/coo`, `/dashboard/agents`, `/dashboard/automations` are stale** — they describe the pre-collapse layout. The marketing copy still uses "COO chat / Hire chat" language; treat both as naming the same single surface.

## When we'd revisit

- If power users demand a non-chat console for managing many standing automations at scale, a read-only registry view could return as a *secondary* surface — but never as a competing doorway.
