# AI Model Selection: Claude vs GPT-4o vs Smaller Models

**Category:** Patterns  
**Source:** Anthropic pricing docs, OpenAI pricing docs, Google AI pricing docs, model benchmarks (2024–2025)  
**Updated:** 2026-04-30

## Overview

Choosing the wrong model is one of the most expensive mistakes in a production AI workflow. Underpowered models hallucinate or produce unusable output; overpowered models drain budget on tasks that a $0.15/M token model handles perfectly. This page gives a decision framework, a cost/capability comparison table, and guidance on n8n integration patterns.

## Related Notes
[[ai-cost-optimization]]
[[ai-failure-handling]]
[[ai-prompt-engineering-n8n]]
[[ai-rag-vs-finetune]]

---

## Decision Framework by Task Type

| Task | Recommended Model | Reason |
|------|-------------------|--------|
| Long document analysis (>50k tokens) | Claude 3.5 Sonnet / Claude 3 Opus | 200k context, strong instruction-following over long span |
| Code generation (complex) | Claude 3.5 Sonnet or GPT-4o | Both competitive; Claude edges on multi-file refactors |
| Code generation (simple snippets) | GPT-4o-mini or Claude 3 Haiku | Cost-effective, fast |
| Structured JSON extraction | GPT-4o (Structured Outputs) or Claude 3.5 Sonnet (tool use) | Both >99% schema compliance with proper setup |
| Classification / intent detection | GPT-4o-mini or Claude 3 Haiku | Cheapest capable tier; overkill to use flagship |
| Real-time response (<500ms target) | GPT-4o-mini, Claude 3 Haiku, Gemini 1.5 Flash | Smaller = faster p50 latency |
| Multi-modal (image + text) | GPT-4o or Gemini 1.5 Pro | Native vision support |
| Long-context RAG retrieval-augmented tasks | Claude 3.5 Sonnet | Handles full document injection cleanly |
| Batch / async overnight processing | OpenAI Batch API (GPT-4o or 4o-mini) | 50% cost reduction, 24h SLA acceptable |
| On-premises / no data-egress | Ollama + Llama 3.1 70B or Mistral 7B | No API calls; data stays local |

---

## Model Comparison Table (2024–2025 Pricing)

| Model | Input ($/M tokens) | Output ($/M tokens) | Context Window | Notes |
|-------|-------------------|--------------------|--------------|----|
| Claude 3.5 Sonnet | $3.00 | $15.00 | 200k | Best-in-class for long docs; tool use excellent |
| Claude 3 Haiku | $0.25 | $1.25 | 200k | Fastest Claude; ideal for classification |
| Claude 3 Opus | $15.00 | $75.00 | 200k | Highest capability; use sparingly |
| GPT-4o (2024-11-20) | $2.50 | $10.00 | 128k | Strong all-rounder; Structured Outputs support |
| GPT-4o-mini | $0.15 | $0.60 | 128k | Cheapest capable model; great for high-volume tasks |
| Gemini 1.5 Flash | $0.075 | $0.30 | 1M | Cheapest per token with massive context; weaker reasoning |
| Gemini 1.5 Pro | $1.25 | $5.00 | 2M | Best context window; strong for doc-heavy pipelines |
| GPT-4o (Batch API) | $1.25 | $5.00 | 128k | 50% off via Batch API, 24h latency |
| GPT-4o-mini (Batch) | $0.075 | $0.30 | 128k | Extremely cheap for bulk async tasks |

*Prices as of late 2024 / early 2025. Verify current rates at platform pricing pages before budgeting.*

---

## Context Window Comparison

- **Claude 3.5 Sonnet / Haiku / Opus**: 200,000 tokens. Can process ~150,000 words in a single call. Essential for full document ingestion (60-page contracts, full ad account reports).
- **GPT-4o / GPT-4o-mini**: 128,000 tokens. Sufficient for most tasks; requires chunking for very long documents.
- **Gemini 1.5 Flash/Pro**: 1M / 2M tokens. Theoretically capable of ingesting entire codebases but retrieval quality degrades with extremely long contexts.

For agency use: if the task involves a full client brief, multi-month campaign report, or a lengthy PDF, Claude's 200k window avoids the complexity of chunking.

---

## Latency Comparison (Approximate p50)

| Model | p50 Latency (TTFT) | Throughput |
|-------|--------------------|------------|
| Claude 3 Haiku | ~300ms | Very high |
| GPT-4o-mini | ~400ms | High |
| Gemini 1.5 Flash | ~400ms | High |
| GPT-4o | ~600ms | Moderate |
| Claude 3.5 Sonnet | ~700ms | Moderate |
| Gemini 1.5 Pro | ~800ms | Moderate |
| Claude 3 Opus | ~1200ms | Lower |

*TTFT = time to first token. Actual latency varies by prompt length, server load, and region.*

For n8n workflows where a human is waiting on the result (e.g., a Slack bot reply), target TTFT <800ms. Use Haiku or GPT-4o-mini. For async batch jobs, latency is irrelevant.

---

## Tool Use / Function Calling Comparison

Both Claude and GPT-4o have mature tool-use / function-calling implementations as of 2024:

- **Claude tool use**: Defined as a `tools` array in the API call. Claude is particularly reliable at parallel tool calls and complex multi-step tool plans. The `tool_use` content block pattern is clean and predictable.
- **GPT-4o function calling**: Well-established. The `functions` / `tools` parameter pattern. Supports parallel function calls. Structured Outputs (Nov 2024) makes schema adherence near-100%.
- **Gemini function calling**: Supported in 1.5 Pro/Flash. Slightly less battle-tested for complex multi-tool scenarios.

**Recommendation**: For n8n AI Agent nodes using tool use, both Claude and GPT-4o work well. Claude's explicit `tool_use` / `tool_result` content block pattern pairs well with the HTTP Request node; OpenAI's schema pairs well with the OpenAI node's built-in function support.

---

## n8n Integration Patterns

### OpenAI Node (built-in)
- Supports GPT-4o, GPT-4o-mini, and legacy GPT-4 models natively.
- Configure model, temperature, max_tokens, system message in node parameters.
- JSON mode: set `response_format: { type: "json_object" }` via additional fields.
- Structured Outputs: available via HTTP Request node since the n8n OpenAI node may lag the API.

### HTTP Request to Anthropic API
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {{ $credentials.anthropicApiKey }}
  anthropic-version: 2023-06-01
  content-type: application/json
Body:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "system": "{{ $json.systemPrompt }}",
  "messages": [{ "role": "user", "content": "{{ $json.userMessage }}" }]
}
```

### HTTP Request to Gemini API
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={{ $credentials.geminiApiKey }}
Body: { "contents": [{ "parts": [{ "text": "{{ $json.prompt }}" }] }] }
```

---

## Local / Open Source Alternatives

**When to use Ollama / local models:**
- Client data cannot leave on-premises (HIPAA, financial regulations, NDA).
- High-volume low-complexity tasks where per-token cost adds up significantly.
- Development / testing without API cost.

**Capable open-source models (2024–2025):**

| Model | Parameters | Typical Use |
|-------|-----------|-------------|
| Llama 3.1 8B | 8B | Classification, short generation; fast on consumer GPU |
| Llama 3.1 70B | 70B | Near-GPT-4o-mini quality; needs 48GB+ VRAM |
| Mistral 7B / Mixtral 8x7B | 7B / ~47B MoE | Strong instruction following; efficient on MoE architecture |
| Qwen 2.5 72B | 72B | Strong at code and structured output |
| Phi-3 Mini | 3.8B | Ultra-small; runs on CPU; limited reasoning |

**Ollama + n8n**: Use HTTP Request node pointed at `http://localhost:11434/api/generate`. No API key required. Ideal for internal agency tooling that processes client PII.

---

## Summary Decision Rules

1. Default to **GPT-4o-mini** or **Claude 3 Haiku** for any high-volume, simple task.
2. Use **Claude 3.5 Sonnet** when context exceeds 80k tokens or task requires nuanced instruction following.
3. Use **GPT-4o** when you need Structured Outputs schema enforcement or native multimodal vision.
4. Use **Gemini 1.5 Flash** for extreme cost sensitivity with acceptable quality loss.
5. Use **Ollama** when data sovereignty requirements prohibit cloud API calls.
6. Never use **Claude 3 Opus** or **GPT-4o** for classification, sentiment, or simple routing — that is 10–100x overspend.
