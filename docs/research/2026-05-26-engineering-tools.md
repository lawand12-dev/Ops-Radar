# Engineering research — Tools + integrations (Composio vs Pica/Arcade, MCP, OAuth, scoping)

> **Research run date**: 2026-05-26
> **Question**: Is OpsRadar's tools/integrations layer still aligned with 2026 consensus? 10 questions.
> **Status**: raw research output — informs the engineering verdict at `docs/adr/0009-engineering-stack-2026.md`.
> **Subagent run id**: `a6d71127a83a1cc67` (preserved for audit).

---

I have enough evidence. Let me synthesize the response.

---

# 2026 Tools/Integrations Layer — Stress-Test of OpsRadar

## 1. Composio vs Pica vs Arcade vs Pipedream Connect
**Consensus**: Composio = breadth (500+, agent-native), Pica = 200+ integrations / 25k+ actions (Pica is `picaos.com`, an integration platform — the "$30M @ $100M val" claim could not be verified in 2026 funding databases), Arcade = MCP runtime specialist (~112 integrations, OAuth-focused, ex-Okta founders), Pipedream Connect = 2,800+ apps + workflow builder.
**OpsRadar status**: HOLDS for breadth, but Composio is **no longer obviously the leader on auth posture** after May 2026 incident (see #8). [Nango — Composio alternatives](https://nango.dev/blog/composio-alternatives/), [Pica docs](https://docs.picaos.com/get-started), [Arcade](https://www.arcade.dev/)

## 2. "Broker holds OAuth" vs customer holds OAuth
**Consensus**: Brokered Credentials is the recommended pattern — LLM never sees the token, broker calls API on agent's behalf. **But** vendor-lock-in protection requires "fully white-label flows where you can always access your user's credentials," migration readiness, and ownership of OAuth apps + callback URLs.
**OpsRadar status**: DRIFTED. Composio owns the OAuth apps today. **Change**: register OpsRadar-owned OAuth apps with each provider (Stripe, HubSpot, etc.) and configure Composio to use them — preserves the "we don't store keys" posture but eliminates re-consent risk on a broker switch. [WorkOS — OAuth multi-hop](https://workos.com/blog/oauth-multi-hop-delegation-ai-agents), [Nango — agent auth](https://nango.dev/blog/best-ai-agent-authentication/)

## 3. MCP everywhere?
**Consensus**: MCP is now mandated by Anthropic / OpenAI Responses API + Apps SDK / Google / AWS, with OAuth 2.1 + Dynamic Client Registration. The pattern is **expose your own product as MCP**, not necessarily wrap every upstream tool again.
**OpsRadar status**: PARTIALLY ALIGNED — `/dashboard/settings/mcp` exposes OpsRadar's brain as MCP. **Change**: keep Composio internal-only for OpsRadar's agents (don't re-MCP every integration). Prioritize OpsRadar-brain MCP and ensure OAuth 2.1 + DCR compliance for ChatGPT compatibility. [WorkOS — MCP 2026](https://workos.com/blog/everything-your-team-needs-to-know-about-mcp-in-2026), [Aembit — MCP OAuth 2.1](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/)

## 4. Tool scoping per agent
**Consensus**: Anthropic Agent Skills `allowed-tools` is the de-facto standard (32 tools adopted as of Dec 2025), with explicit security-sandbox semantics — though the field is still "experimental / under-specified."
**OpsRadar status**: ALIGNED with planned CP-39. **Mirror Anthropic Skills' `allowed-tools`** (you already use SKILL.md), not Microsoft Copilot Studio's `actions`. [Anthropic Skills repo](https://github.com/anthropics/skills), [Paperclipped — Agent Skills standard](https://www.paperclipped.de/en/blog/agent-skills-open-standard-interoperability/)

## 5. Approval-gate-as-middleware
**Consensus**: Sierra ships "Agent OS" with policy enforcement + validator agents; Cresta's "Agent Operations Center" treats policy as a first-class command layer. The pattern is **policy engine that runs pre-action**, not just a write classifier.
**OpsRadar status**: ALIGNED in shape (you wrap every tool call), but `wrapToolsWithApprovalGate` is a write-classifier, not a true policy engine. **Change**: extend to per-action policy rules (cost cap, time window, customer-tier gate), keep the middleware shape. [Sierra Agent SDK](https://sierra.ai/product/develop-your-agent), [Cresta AOC](https://cresta.com/blog/introducing-crestas-agent-operations-center-a-unified-command-center-for-human-and-ai-agents)

## 6. Cross-tool transaction safety
**Consensus**: SagaLLM (arXiv 2503.11951) — compensating transactions per step, orchestrator-driven, no ACID guarantees but rollback coherence.
**OpsRadar status**: WRONG (no rollback today). **Change**: in `actions/executor.ts` and `automations/execute.ts`, record a `compensating_action` per write; on failure, run reverse-order compensations (`hubspot.delete_note` for the note we just created, `slack.delete_message`, etc.). Trigger.dev orchestration fits this naturally. [SagaLLM arXiv](https://arxiv.org/pdf/2503.11951), [Temporal — compensating actions](https://temporal.io/blog/compensating-actions-part-of-a-complete-breakfast-with-sagas)

## 7. Tool catalog injection
**Consensus**: Lazy tool loading is the winning 2026 pattern — full catalog injection burns 33%+ of context; two-pass injection (name+description first, schema on-demand) yields 85–90% reduction. Mirrors how you already do skills.
**OpsRadar status**: WRONG. **Change**: inject Composio tool *names + descriptions* only; add a `load_tool_schema(slug)` tool the agent calls on demand — same progressive-disclosure pattern as `load_skill`. [Anthropic Claude Code issue #11364 — lazy MCP](https://github.com/anthropics/claude-code/issues/11364), [Lazy Skills — Substack](https://boliv.substack.com/p/lazy-skills-a-token-efficient-approach)

## 8. Composio reliability
**Consensus**: Composio had a **material security incident May 21–23, 2026** — unauthorized internal access, all pre-22 May API keys deleted, GitHub tokens compromised for a subset, ~100 toolkits' access tokens revoked. Plus auth dashboard / CLI / MCP outages May 24–25.
**OpsRadar status**: EXPOSED. **Change**: (a) add circuit-breaker around `composio.tools.execute` with graceful "broker down — re-queue" UX, (b) keep a Composio-independent fallback for the 3–4 highest-volume integrations (direct OAuth + raw API to Stripe / HubSpot / Slack), (c) subscribe to `status.composio.dev` webhook → auto-pause automations. [Composio May 2026 incident post-mortem](https://composio.dev/blog/composio-may-2026-security-incident), [Composio status history](https://status.composio.dev/history/1)

## 9. Customer-data privacy through broker
**Consensus**: Brokered Credentials is fine *for credentials*, but BYOK + customer-controlled key trends are rising in regulated SaaS. Broker seeing API responses is acceptable if encrypted-in-transit + zero-retention contractual.
**OpsRadar status**: HOLDS *if* Composio's DPA confirms zero-retention on response bodies. **Change**: publish a one-pager confirming Composio doesn't persist customer business data; add it to the trust page. [Security Magazine — BYOK SaaS](https://www.securitymagazine.com/articles/99802-take-control-over-data-in-a-saas-environment-with-byok)

## 10. 25 → 500 connectors growth
**Consensus**: Pin API versions, monitor vendor changelogs, abstract behind internal interface, sandbox-test against real APIs. **AI-generated integrations** are the biggest 2026 shift (was: engineering-bottlenecked).
**OpsRadar status**: ALIGNED — Composio already absorbs upstream-API breakage for you. **Change**: add a nightly smoke test per active toolkit (one `tools.execute` against a known-safe read) that pages on failure. [Composio — 5 integration patterns](https://composio.dev/content/apis-ai-agents-integration-patterns), [Knit — integration challenges](https://www.getknit.dev/blog/overcoming-the-hurdles-common-challenges-in-ai-agent-integration-solutions)

---

## Synthesis

**OpsRadar's tools + integrations layer is ~70% aligned with 2026 consensus.**

Top 3 changes by impact:

1. **Lazy tool-schema loading (Q7)** — single biggest token/cost win. Mirror your `load_skill` pattern with `load_tool_schema`. Unlocks "every agent sees every tool" without exploding prompts. *High impact, low effort.*
2. **Composio resilience + own-the-OAuth-apps (Q2 + Q8)** — May 2026 incident proved single-broker risk is real. Register OpsRadar-owned OAuth apps and add a circuit-breaker + direct-API fallback for Stripe/HubSpot/Slack. *High impact, medium effort.*
3. **Compensating-action rollback (Q6)** — cross-tool writes silently corrupting state is a churn time-bomb. Add `compensating_action` to action specs + saga executor in Trigger.dev. *Medium impact, medium effort.*

Composio is still defensibly the right choice on breadth + Skills-friendly ergonomics, but the May 2026 incident has flipped the calculus from "obvious default" to "fine if you own the OAuth apps + have a fallback."

Sources (additional):
- [Composio MCP vulnerabilities guide](https://composio.dev/content/mcp-vulnerabilities-every-developer-should-know)
- [Truto — Truto vs Arcade.dev 2026](https://truto.one/blog/truto-vs-arcadedev-which-mcp-server-platform-is-best-for-enterprise-ai-agents-2026/)
- [Composio Feb 9, 2026 incident report](https://composio.dev/blog/incident-report-february-9-2026)
- [Membrane — Composio alternatives 2026](https://getmembrane.com/articles/comparisons/composio-alternatives)
- [Composio — AI integration platforms 2026](https://composio.dev/content/ai-agent-integration-platforms)
- [Scalekit — OAuth for AI agents](https://www.scalekit.com/blog/oauth-ai-agents-architecture)
- [a2a-mcp.org — MCP 2026 roadmap](https://a2a-mcp.org/blog/mcp-2026-roadmap)
- [Anthropic — advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Composio status page](https://status.composio.dev/)
- [Zylos Research — MCP/A2A convergence](https://zylos.ai/research/2026-03-26-agent-interoperability-protocols-mcp-a2a-acp-convergence)
