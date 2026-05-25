# Engineering research — Runtime + orchestration (Vercel AI SDK, Trigger.dev, Vercel Cron, Fluid Compute)

> **Research run date**: 2026-05-26
> **Question**: Is OpsRadar's runtime + orchestration layer still aligned with 2026 consensus? 6 questions.
> **Status**: raw research output — informs the engineering verdict at `docs/adr/0009-engineering-stack-2026.md`.
> **Subagent run id**: `a830009ad8753ab0d` (preserved for audit).

---

I have sufficient evidence to synthesize. The TodoWrite reminder isn't relevant — this is a single research task. Here's the report:

---

# OpsRadar runtime + orchestration: 2026 consensus stress-test

## 1. Vercel AI SDK v6 vs Anthropic / OpenAI / LangGraph / Mastra

**Consensus (mid-2026):** Vercel AI SDK 6 is the dominant choice for **TypeScript web apps that stream agent UIs from Next.js** — multi-provider, framework-native `useChat` hooks, the new `Agent` abstraction ([vercel.com/blog/ai-sdk-6](https://vercel.com/blog/ai-sdk-6)). Claude Agent SDK (TS v0.2.71, Python v0.1.48) wins when you want Claude-specific primitives — extended thinking, prompt caching, memory, computer use ([code.claude.com/docs/en/agent-sdk/overview](https://code.claude.com/docs/en/agent-sdk/overview)). OpenAI Agents SDK leads on **production multi-agent handoffs + guardrails** ([docs.bswen.com/blog/2026-04-29-agent-sdk-comparison-anthropic-openai-vercel](https://docs.bswen.com/blog/2026-04-29-agent-sdk-comparison-anthropic-openai-vercel/)).

**OpsRadar verdict:** Aligned. Streaming chat in Next.js + multi-provider (OpenAI primary, Anthropic via `load_skill` future) is the exact Vercel AI SDK sweet spot. **Hold.**

## 2. `stopWhen: stepCountIs(N)`

**Consensus:** `stopWhen` is the canonical stop primitive. `stepCountIs(N)` is recommended at **5 for chat, 10–20 for autonomous agents, 1 for "one tool, then answer"**. Default safety cap is `stepCountIs(20)` if tools are passed without `stopWhen` ([ai-sdk.dev/docs/agents/loop-control](https://ai-sdk.dev/docs/agents/loop-control)). Composable arrays (`stopWhen: [stepCountIs(20), hasToolCall('finalAnswer')]`) are the 2026 best practice — terminate on first match ([ai-sdk.dev/docs/reference/ai-sdk-core/step-count-is](https://ai-sdk.dev/docs/reference/ai-sdk-core/step-count-is)).

**OpsRadar verdict:** Aligned but **drifted on composition**. Pure step caps without `hasToolCall('finish')`/`hasToolCall('queue_action')` sentinels means agents burn the full budget even when done. **Change:** add a `finish` tool and combine `stopWhen: [stepCountIs(N), hasToolCall('finish')]` in `src/lib/agents/loop.ts` and COO.

## 3. Trigger.dev v3 vs Vercel Queues / Inngest

**Consensus:** Vercel Queues went **public beta May 2026** — durable event streaming on Fluid Compute, powering Vercel Workflow ([vercel.com/changelog/vercel-queues-now-in-public-beta](https://vercel.com/changelog/vercel-queues-now-in-public-beta), [vercel.com/blog/a-new-programming-model-for-durable-execution](https://vercel.com/blog/a-new-programming-model-for-durable-execution)). Inngest is event-richer, explicit-call model, $30→$300/mo ([inngest.com/blog/explicit-apis-vs-magic-directives](https://www.inngest.com/blog/explicit-apis-vs-magic-directives)). Trigger.dev v3 runs on **dedicated long-lived Bun workers, no serverless timeout**, $20–$50/mo, OSS self-host ([trigger.dev/pricing](https://trigger.dev/pricing), [pkgpulse.com/blog/hatchet-vs-trigger-dev-v3-vs-inngest-durable-workflows-2026](https://www.pkgpulse.com/blog/hatchet-vs-trigger-dev-v3-vs-inngest-durable-workflows-2026)). `triggerAndWait` checkpoints the parent so it doesn't bill compute while waiting ([trigger.dev/docs/how-to-reduce-your-spend](https://trigger.dev/docs/how-to-reduce-your-spend)).

**OpsRadar verdict:** Aligned. Trigger.dev's no-timeout long workers fit `run-custom-employee` better than Queues (Queues still inherits Fluid's 15-min Pro cap). `triggerAndWait` delegation in CP-37 is canonical. **Hold — but watch Vercel Workflow** as it matures past beta.

## 4. Vercel Cron + Trigger.dev cron together

**Consensus:** Vercel Cron Pro = **down to 1-minute frequency, 300s execution, no retries** ([vercel.com/docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)). Mixing two cron systems is fine for simple cases but creates two retry/observability/timezone surfaces.

**OpsRadar verdict:** Drifted. With Trigger.dev already paid for, run **all** crons there — single dashboard, retries, longer durations. **Change:** migrate the 28 Vercel crons to Trigger.dev `schedules.task`. Keep Vercel Cron only if you stay on Hobby.

## 5. Cold starts on Fluid Compute

**Consensus:** Fluid eliminates cold starts via **in-function concurrency + bytecode caching + production pre-warming**; bills CPU time only, not wall-clock ([vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts), [vercel.com/docs/fluid-compute](https://vercel.com/docs/fluid-compute)). Default 300s, **up to 15 min on Pro** ([vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute](https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute)).

**OpsRadar verdict:** Aligned. Anything >15 min (rare for COO chat, real for cron-style agent loops) belongs in Trigger.dev. **Hold.**

## 6. Edge vs Node runtime

**Consensus:** **Edge Runtime is deprecated for AI workloads.** Vercel actively recommends migrating Edge → Node.js for AI agents — Edge lacks full Node compat, breaks heavy deps, and Fluid Node now matches Edge on streaming/concurrency ([vercel.com/docs/functions/runtimes/edge/edge-functions.rsc](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc), [vercel.com/blog/streaming-for-serverless-node-js-and-edge-runtimes-with-vercel-functions](https://vercel.com/blog/streaming-for-serverless-node-js-and-edge-runtimes-with-vercel-functions)).

**OpsRadar verdict:** Aligned (Node 24 LTS on Fluid). **Hold.**

---

## Synthesis

**OpsRadar's runtime + orchestration is ~85% aligned with 2026 consensus.**

Top 3 changes by impact:

1. **Consolidate all crons onto Trigger.dev** — single retry/observability/scheduling surface, removes the Vercel Hobby daily-cap workaround as architectural debt. (High impact, ~1 day.)
2. **Add composable stop conditions** (`stopWhen: [stepCountIs(N), hasToolCall('finish')]` + a `finish` tool) in `src/lib/agents/loop.ts` and COO. Cuts wasted steps + token spend on every agent run. (High impact, ~half day.)
3. **Track Vercel Workflow GA** as the eventual Trigger.dev replacement — Queues + Workflow on Fluid will likely be the boring default by late 2026; revisit when 15-min cap lifts on Pro. (Low urgency, watch-only.)

Relevant files:
- `/home/lawand/Desktop/my-startup/opsradar/src/lib/agents/loop.ts`
- `/home/lawand/Desktop/my-startup/opsradar/src/trigger/run-custom-employee.ts`
- `/home/lawand/Desktop/my-startup/opsradar/src/app/dashboard/coo/_components/coo-chat.tsx`
- `/home/lawand/Desktop/my-startup/opsradar/vercel.json` (cron schedules to migrate)
