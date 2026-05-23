# n8n Workflow Execution Lifecycle

**Type:** Mechanistic model
**Audience:** n8n monitoring agent
**n8n target:** 1.50+ (queue mode behavior stable since 1.30)
**Source:** `packages/core/src/WorkflowExecute.ts`, `packages/cli/src/scaling/`
**Updated:** 2026-05-07

## Purpose

The agent must know exactly which lifecycle state an execution is in to decide whether silence means progress, stall, or crash. This page defines every state, every legal transition, every component that writes to which row, and the difference between **main mode** and **queue mode** — they fail differently.

## Components

| Component | Role | Failure mode the agent sees |
|---|---|---|
| **Trigger** (Webhook / Schedule / Polling) | Creates an execution row | Webhook returns 5xx; polling missed an interval; schedule skipped |
| **Main process** | Owns webhooks, schedule, REST API; in queue mode it does **not** execute workflows | OOM, port unbound, DB disconnected |
| **Worker process** (queue mode only) | Pulls jobs from Redis, executes the workflow | Worker crash → execution stays `running` forever ("zombie") |
| **Bull / Redis queue** (queue mode only) | The job queue between main and workers | Redis disconnect = no execution, no error row |
| **Postgres** | Source of truth for state | Lock contention, prune lag |

## State machine

```
                           ┌──────────────────────────────┐
                           ▼                              │
   trigger fires ──► (new) ──pick-up──► (running) ──► (success)
                              │             │              ▲
                              │             ├──Wait node──►(waiting) ──resume──┘
                              │             ├──node throws──►(error)
                              │             └──worker dies──►(crashed)*
                              └──canceled by user──►(canceled)

   * (crashed) is set by main on worker-liveness loss in queue mode.
     In main mode, a process crash leaves the row as (running) forever
     until detected and reconciled — see playbook detect-stuck-execution.
```

Legal transitions:

| From | To | Trigger |
|---|---|---|
| (none) | `new` | Trigger creates an `execution_entity` row |
| `new` | `running` | Worker (queue mode) or main (main mode) picks up the job |
| `running` | `waiting` | Workflow hits a `Wait` / interval / `Wait for Webhook` node |
| `waiting` | `running` | `waitTill` reached, or webhook callback received |
| `running` | `success` | Final node completes without error |
| `running` | `error` | Any node throws and no error branch handles it |
| `running` | `crashed` | Worker liveness lost (queue mode) |
| `running` | `canceled` | User clicks cancel in UI or API |
| `new` / `running` | (deleted) | Pruner sweeps; soft delete via `deletedAt` |

`finished` boolean flips with `status ∈ {success, error, crashed, canceled}`. Agents should rely on `status`, never on `finished` alone — `finished` can lag.

## What writes to what, and when

| Event | Writes to | Notes |
|---|---|---|
| Trigger fires | `execution_entity` (status=`new`), `execution_data` (initial blob) | One transaction |
| Node start | (in-memory only) | Not flushed per-node by default |
| Node success | (in-memory only) | Same |
| Node error (terminal) | `execution_entity.status = 'error'`, `execution_data.data.resultData.error` | Single flush at end |
| Wait node hit | `status = 'waiting'`, `waitTill` set, `execution_data` flushed | Persisted |
| Workflow end | `stoppedAt`, final `status`, `finished=true`, `execution_data.data` | One transaction |
| Worker crash | (no DB write from the dead worker) | Main reconciler updates `status='crashed'` after liveness timeout |

**The key implication:** for a long-running workflow that crashes mid-execution, **`execution_data` may not contain anything past the last `Wait` node.** The agent must combine DB state with logs / Redis to know how far it actually got.

## Main mode vs queue mode — divergent failures

| Aspect | Main mode | Queue mode |
|---|---|---|
| Where workflows execute | Main process | Worker processes (separate) |
| Memory pressure | All in main | Distributed across workers |
| Crash blast radius | Main crash = no triggers, no API, no executions | Worker crash = one execution lost; main still up |
| `crashed` status | Rare (set only by reconciler scripts) | Set automatically on worker-liveness loss |
| Webhook latency | Bound to workflow runtime | Decoupled (main responds, worker runs) |
| Health probe | `/healthz` covers everything | `/healthz` covers main; queue depth + worker count must be checked separately |

Queue mode is the production default. Most agent diagnostics assume queue mode.

## Hooks & events the agent can subscribe to

n8n emits internal hooks the agent can hook into via custom workflows or the event-bus (`N8N_EVENTBUS_ENABLED=true`):

- `workflow.started`
- `workflow.success`
- `workflow.failed`
- `node.started` / `node.finished` / `node.failed`
- `worker.started` / `worker.stopped`

For external monitoring, prefer **polling Postgres** + **Prometheus `/metrics`** — eventbus webhooks have at-most-once delivery and can be lost on main restart.

## What "silent" means in each state

- `new` for > 5 minutes → likely Redis disconnected or no live workers
- `running` for > workflow timeout (env `EXECUTIONS_TIMEOUT`, default 0 / disabled) → likely zombie worker
- `waiting` for > `waitTill + 5 min` → resumer broken
- `error` with no `resultData.error` → unusual, often a worker OOM with partial flush

## Cross-references

`models/n8n-execution-schema` · `models/n8n-api-reference` · `playbooks/detect-stuck-execution` · `playbooks/diagnose-workflow-failure`
