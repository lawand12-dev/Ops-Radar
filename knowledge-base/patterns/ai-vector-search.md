# Vector Search Patterns

**Category:** Patterns
**Source:** https://platform.openai.com/docs/guides/structured-outputs, https://platform.openai.com/docs/guides/batch, https://openai.com/api/pricing/, https://platform.openai.com/docs/guides/embeddings
**Updated:** 2026-05-01

## Overview
Vector search supports semantic retrieval, deduplication, similar-client matching, and FAQ routing when thresholds are calibrated.

## Related Notes
[[ai-rag-vs-finetune]] · [[ai-cost-optimization]] · [[n8n-workflow-patterns]]

---


## Where It Fits
Vector search supports semantic retrieval, deduplication, similar-client matching, and FAQ routing when thresholds are calibrated. Use it where agency data contains free text, messy notes, subjective intent, or semantic matching that would be brittle with exact rules.

The production rule is to use AI where language, ambiguity, or judgment matters, and deterministic code where the input and output contract is already known. Treat model output as untrusted data until it passes schema, source, and business-rule validation.

## Pattern
Start with deterministic source gathering, then pass the smallest sufficient context into the model. Require JSON schema or tool output for anything consumed by later nodes. Store prompt version, model, input token estimate, output token estimate, confidence, and validation result.

| Control | Why it matters | Implementation |
| --- | --- | --- |
| Schema | Prevents missing keys and invalid enums | Structured Outputs or tool schema. |
| Grounding | Stops invented facts | Inject source rows and require citations to row IDs. |
| Cost cap | Prevents runaway loops | Per-client monthly budget table. |
| Review route | Contains uncertain outputs | IF confidence below threshold -> Wait node. |

## Failure Controls
- Model returns valid JSON with wrong business facts.
- Prompt variable resolves to `undefined` and the model fills the gap.
- Long context pushes important constraints out of the window.
- Cost spikes after a loop or backfill sends one model call per record.

## n8n Implementation
Keep prompts in Notion/Airtable/Supabase with a version field, fetch them at runtime, and render variables in Code where undefined values can be rejected before the model call.

```javascript
    const output = $json.model_output;
    if (!output || output.confidence < 0.8) {
      return [{ json: { route: "human_review", reason: "low_confidence", output } }];
    }
    return [{ json: { route: "continue", output } }];
```

## Metrics to Track
- Parse failure rate.
- Human override rate.
- Average and p95 latency.
- Cost per execution and per client.
- Confidence calibration: predicted confidence vs accepted output.

Review samples weekly. Confidence, latency, cost, and parse-failure rate drift as prompts, models, and client data change; without a small audit set, automation teams notice quality decline only after a client-facing mistake.

## Field Checklist
Before enabling this in production, confirm the credential owner, account or workspace identifier, rate-limit budget, retry policy, and dead-letter path are written into the workflow notes. Run one backfill with a deliberately small date range or batch size, record the expected count, and compare it with the destination count before widening scope. For client-facing or money-touching actions, keep the final node disabled until a human approves the sample payload and the rollback path.

In n8n, pin a representative success item and a representative error item. Validate the expressions that read nested webhook bodies, add null checks before every ID lookup, and store upstream request IDs in execution data so support can correlate incidents with vendor logs. Any workflow that mutates external state should emit an audit row with `workflow_id`, `execution_id`, source object ID, destination object ID, before/after summary, and the chosen retry count.

Keep a small operator runbook beside the workflow. It should name the owner, normal execution cadence, expected record counts, known vendor delay, escalation channel, and the exact switch that disables external side effects. That runbook is what lets an AM or engineer pause safely during a client incident instead of editing nodes under pressure.

The final launch check is a dry run with production-shaped data and harmless destinations. Compare the normalized output to the source system, then enable one external side effect at a time. This catches wrong IDs, stale credentials, hidden timezone conversions, and missing approval policy before the workflow has client-visible impact.
