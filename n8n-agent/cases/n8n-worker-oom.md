# Case: n8n worker out-of-memory

**Type:** Labeled failure case
**Diagnosis label:** `infra.worker-oom`
**Routes from:** `decision-trees/failure-diagnosis` (status=`crashed` or error message matching `/ENOMEM|JavaScript heap out of memory|Reached heap limit/`)
**Auto-handle safety:** `auto-cancel-replay` allowed only if workflow is idempotent **and** payload likely smaller next run; otherwise `notify-human`. Never silently increase memory limits — that masks the cause.
**Updated:** 2026-05-07

## Input — what the error looks like

In `execution_entity` the row appears as `status='crashed'` or `status='error'` with one of these in `data.resultData.error.message`:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
```
Error: ENOMEM: not enough memory, ...
```

In container logs (Kubernetes / Docker) you'll see one of:

```
OOMKilled — exit code 137
SIGKILL received from kernel oom_reaper
node: pages allocated 1234567 — heap size limit exceeded
```

In queue mode, the row often goes `running → crashed` with no `data.resultData.error` populated at all — the worker died before it could flush. The agent must combine the missing error with worker-restart signals to identify OOM vs other crash causes.

## Signals — what to check

1. **Process memory at time of crash.** From `process_resident_memory_bytes` (Prometheus), check if the suspected worker's RSS climbed sharply in the 60 s before the crash. A flat memory line followed by a hard cliff is OOM-killed; a slow climb to a steady ceiling is hitting V8's heap limit.
2. **Heap size limit configured.** Node.js V8 default is **~1.7 GB** on 64-bit despite the host having more RAM. If `--max-old-space-size` was not raised in `NODE_OPTIONS`, the worker hits V8's wall well before container limits. Check the worker's startup args.
3. **Last node executed.** Pull `data.resultData.lastNodeExecuted` (or, if missing, the highest-timestamp key in `runData`). The OOM-prone n8n nodes:
   - `HTTP Request` with large response (especially with `responseFormat: "file"` in memory mode)
   - `Code` node iterating over `$input.all()` when items contain binary data
   - `AI Agent` / `LLM` nodes accumulating long context
   - `Split In Batches` where items hold references to large parents (closures keep the parent alive)
   - `Read Binary File` / `Move Binary Data` in memory mode
4. **Binary data mode.** `N8N_DEFAULT_BINARY_DATA_MODE` controls storage backend: `default` (in-memory), `filesystem`, or `s3`. If `default` and the workflow handles files > 50 MB, OOM is expected, not surprising.
5. **Payload size on webhook triggers.** `N8N_PAYLOAD_SIZE_MAX` (MB, default 16). A larger inbound body that passes the limit but is then duplicated through `Set` / `Code` / `Merge` can multiply RSS by 5–10×.
6. **Concurrent executions on the worker.** A single worker default-runs 10 concurrent jobs (`N8N_CONCURRENCY_PRODUCTION_LIMIT` since 1.50+). If three of those each pull a 200 MB response, the worker is over budget regardless of any single job's behaviour.

## Correct diagnosis — what it actually is

Disambiguate before acting:

| Sub-diagnosis | Identifying signal | Recovery direction |
|---|---|---|
| **V8 heap limit hit** (not container limit) | Error mentions "heap out of memory"; container RSS well below limit | Raise `--max-old-space-size`; replay if idempotent |
| **Container OOM-killed** | Exit 137; container RSS at or above limit | Raise container limit OR fix workflow OR switch binary mode |
| **Binary mode in memory** | Workflow handles files; `N8N_DEFAULT_BINARY_DATA_MODE=default` | Switch to `filesystem` or `s3` — instance-wide fix |
| **HTTP response too large** | Last node is HTTP Request; response size > 50 MB | Use `responseFormat: "file"` with filesystem binary mode, or stream |
| **Concurrent saturation** | Multiple executions on the same worker peak together | Reduce `N8N_CONCURRENCY_PRODUCTION_LIMIT` or scale workers horizontally |
| **Memory leak in Code node** | RSS doesn't drop between executions on the same worker | Engineering: code-node review (closures, unbounded buffers) |

## Fix — exact steps to resolve

> **Safety:** Steps 1–3 are the agent's; steps 4+ require the agency engineer. The agent does not modify env vars or scale workers without authorization.

1. **Capture forensics.** Snapshot the failed execution row (incl. `lastNodeExecuted`), worker RSS curve from Prometheus for the past 15 min, and queue depth at crash time. Required for the engineer.
2. **Cancel any zombie row.** If `status='crashed'` is set, the row is terminal — no cancel needed. If `status='running'` past timeout but the worker died, `POST /api/v1/executions/:id/stop` to clean up.
3. **Decide replay.** Idempotency check (per `decision-trees/recovery-routing`). Replay only if the workflow is tagged idempotent **and** the engineer expects the next payload to fit. If a 200 MB response is the cause and the next payload will also be 200 MB, replay just OOMs again. In that case → notify-human, do not replay.
4. **Engineer action — V8 heap:** raise heap limit on workers via `NODE_OPTIONS=--max-old-space-size=4096` (or higher). Container limit must exceed `max-old-space-size + ~512 MB` overhead.
5. **Engineer action — binary mode:** set `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (or `s3` for multi-worker setups; in-memory binaries are not shared across workers in queue mode anyway). This alone resolves most file-handling OOMs.
6. **Engineer action — workflow refactor:** move large-response HTTP nodes to use `responseFormat: "file"`; in `Code` nodes, replace `$input.all()` iterations with explicit batches; in AI nodes, cap context size.
7. **Once fixed**, the agent confirms by replaying a known-failing payload. New `versionId` on the workflow → safe to replay; old version → still broken.

## Prevention — how to avoid next time

- **Set `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`** for any production instance touching files > 10 MB. The default in-memory mode is for dev only.
- **Set explicit Node heap.** `NODE_OPTIONS=--max-old-space-size=2048` is a sane production minimum; raise per workload. Never run a production worker on V8's stock 1.7 GB.
- **Cap `N8N_CONCURRENCY_PRODUCTION_LIMIT`** based on worker memory. Rule of thumb: `workers * concurrency * 200MB ≤ container limit * 0.7`.
- **Cap `N8N_PAYLOAD_SIZE_MAX`** to a value the workflows can actually process — don't accept a 100 MB webhook body if downstream nodes can't handle it.
- **Tag memory-heavy workflows** with `memory:high` so the agent applies tighter timeouts and faster escalation when they fail.
- **Monitor RSS per worker.** Alert when sustained RSS > 80% of container limit for > 10 min.
- **Avoid `Split In Batches` over binary data in memory mode.** Items in a batch retain references to their parent execution data, so memory doesn't drop between batches as expected.

## Cross-references

`decision-trees/failure-diagnosis` (label `infra.worker-oom`) · `decision-trees/recovery-routing` (`auto-cancel-replay` rules) · `models/n8n-execution-schema` · `cases/stuck-execution` · `reference/n8n-production/n8n-performance` · `reference/n8n-production/n8n-queue-mode`
