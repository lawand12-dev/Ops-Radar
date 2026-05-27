# Nango broker + model-fallback best practices — post-Composio-breach snapshot

> **Research run date**: 2026-05-27
> **Question**: Now that OpsRadar has migrated its integration broker from Composio to Nango (2026-05-26, after Composio's 2026-05-21 breach), is the Nango setup + the OpenAI→Groq→DigitalOcean model-fallback chain aligned with 2026 production consensus? Four areas.
> **Status**: raw research output (web search + synthesis). Evidence document; cite before acting.

---

## What this answers

1. Nango architecture + security best practices (Connect Sessions, token lifecycle, cloud vs self-host, webhooks/sync/proxy, rate limits, tenant isolation) — what Nango itself recommends.
2. The post-breach broker landscape (2026): Nango vs Composio vs Pica vs Arcade vs Paragon vs Merge, and the 2026 consensus on "should a broker hold customer OAuth tokens."
3. Migrating off a breached broker: re-consent, token rotation, blast-radius containment, customer comms.
4. Model-fallback patterns: OpenAI→open-model (Groq, DigitalOcean Gradient) fallback, tool-calling reliability across providers, the known open-model json_schema/tool-loop failure, and hand-rolled vs gateway (Vercel AI Gateway / OpenRouter).

---

## 1. Nango architecture + security best practices

**Connect Sessions are short-lived and the correct primary pattern.** Nango deprecated the long-lived public key + HMAC signature in favour of a **Connect session token fetched from your backend and passed to the frontend** — secure-by-default. The session token has a **~30-minute lifetime**. This matches OpsRadar's current flow (backend mints session → frontend opens Connect UI). [Public key deprecation](https://docs.nango.dev/guides/api-authorization/public-key-deprecation), [Nango security docs](https://nango.dev/docs/guides/platform/security)

**Connection IDs are randomly generated and webhook-attributed.** Because Nango now generates random connection IDs (no longer inferable from your user ID), you **must pass `user_id` (and optional `organization_id`) when minting the session token** so the post-auth webhook can be attributed back to the right tenant. Credentials are delivered via webhook, **not** the frontend SDK. OpsRadar's `userId → connectionId` Supabase map is exactly the table this webhook should populate. [Nango security docs](https://nango.dev/docs/guides/platform/security)

**Token lifecycle:** access + refresh tokens are stored **encrypted (AES-256-GCM, TLS 1.2+ in transit)**; expired sessions/tokens are auto-cleaned; you own the connection lifecycle (create on authorize, handle refresh/revocation). Nango handles concurrency on refresh (a real foot-gun — concurrent calls racing a token refresh is a documented failure mode Nango solves internally). [Nango security docs](https://nango.dev/docs/guides/platform/security), [Concurrency with OAuth token refreshes](https://nango.dev/blog/concurrency-with-oauth-token-refreshes/)

**Three call patterns — pick deliberately:**
- **Proxy** — 1:1 authenticated request to the upstream API, response returned unmodified, with **automatic retries + rate-limit (429/`Retry-After`) handling injected for you**. This is the right default for OpsRadar's live dashboard fetches and agent tool calls. [Proxy docs](https://nango.dev/docs/guides/use-cases/proxy)
- **Syncs** — scheduled/incremental data pull with checkpointing, caching, deletion detection, resumable executions. Use only if OpsRadar wants a warehouse copy (Tier-2 `external_events`); otherwise proxy keeps the "no client data at rest" posture cleaner.
- **Actions / webhooks** — high-concurrency real-time ingestion for provider events (the automations trigger path). [Node SDK](https://docs.nango.dev/reference/sdks/node)

**Rate limits:** don't hand-roll backoff on top of the proxy — Nango already honours `429` + `Retry-After` and retries. Hand-rolled retry on top double-counts and amplifies. [Proxy docs](https://nango.dev/docs/guides/use-cases/proxy)

**Multi-tenant isolation:** each Nango **environment** is fully isolated (separate credentials/integrations/secret keys, server-side enforced). Per-tenant separation in OpsRadar is the `user_id`-scoped connection map, not separate environments — keep environments for **prod vs staging**, not per-customer. Use **scoped API keys** (least privilege) for production and a read-only Support role for monitoring; enable SSO + IP allowlisting. [Nango security docs](https://nango.dev/docs/guides/platform/security)

**For OpsRadar:** the migration is architecturally sound. Confirm webhooks (not frontend) populate the connection map, lean on proxy retry/rate-limit handling rather than re-implementing it, and keep environments = prod/staging only.

---

## 2. Post-breach broker landscape (2026)

**The 2026 consensus is now explicit: a third-party broker holding your customers' OAuth tokens is a supply-chain blast-radius you should minimize or eliminate.** The pattern was validated the hard way: the **Salesloft–Drift breach (late 2025)** saw attackers harvest OAuth tokens from one integration provider and pivot into **700+ customer Salesforce/Google Workspace orgs** from a single compromise. OAuth tokens "function independently of SSO/MFA" — a stolen token bypasses your auth controls entirely. [Unit42 — third-party token management](https://unit42.paloaltonetworks.com/third-party-supply-chain-token-management/), [Security Boulevard — OAuth risk in SaaS](https://securityboulevard.com/2026/05/oauth-risk-explained-hidden-threats-in-saas/), [AppOmni — OAuth token risks](https://appomni.com/learn/saas-security-fundamentals/oauth-token-security-risks/)

**The Composio breach is the proximate case.** Composio confirmed unauthorized internal access; an attacker achieved **arbitrary code execution in the sandbox**, having first compromised a Composio employee's Gmail OAuth token via magic-link sign-in on staging. ~5,242 connections compromised (**~0.3% of active**, GitHub the largest at ~5,001, many internal test accounts). Remediation: **all API keys created before 2026-05-22 deleted**, mandatory developer key rotation, OAuth tokens revoked across ~100 toolkits. [Composio May 2026 incident](https://composio.dev/blog/composio-may-2026-security-incident), [Nango — Composio vs Nango](https://nango.dev/blog/composio-vs-nango/)

**Landscape positioning (2026):**

| Broker | Token custody | Self-host | Webhooks/syncs | Auth screen | Notes |
|---|---|---|---|---|---|
| **Nango** | Cloud or **self-host (creds stay in your VPC, your encryption keys)** | **Yes** | Syncs + webhooks + proxy + actions | **White-label (your brand)** | OSS, SOC 2 Type II + GDPR + HIPAA, 800+ APIs [1][2] |
| **Composio** | Cloud only | No | **Tool calls only — no webhook ingestion/sync** | **Shows "Composio" on consent screen** | 1,000+ toolkits, agent-native; SOC 2 + ISO 27001; breached May 2026 [1] |
| **Paragon** | Cloud (embedded iPaaS) | Limited | Yes (ActionKit + visual builder) | White-label | Dual low-code + pro-code SDK [3] |
| **Merge** | Cloud (unified API) | No | Managed sync, unified models | White-label | Best for HRIS/ATS/accounting normalization [3] |
| **Pica / Arcade** | Cloud | Arcade OAuth-focused MCP runtime | varies | — | Niche/MCP-runtime players |

[1] [Composio vs Nango](https://nango.dev/blog/composio-vs-nango/) · [2] [Nango self-hosting](https://nango.dev/docs/guides/platform/self-hosting) · [3] [Best AI agent integration platforms 2026](https://nango.dev/blog/best-ai-agent-integration-platforms/)

**The key Nango-vs-Composio differences that matter for OpsRadar:**
- **White-label consent** — Nango shows OpsRadar's brand on the OAuth screen; Composio showed "Composio," which is wrong for a customer-facing product. [Composio vs Nango](https://nango.dev/blog/composio-vs-nango/)
- **Self-host escape hatch** — Nango can run entirely in OpsRadar's own infra with OpsRadar-supplied encryption keys, so **no customer credential ever transits Nango's cloud**. This is the regulated-procurement answer ("no creds leave our VPC") and the cleanest blast-radius story. Composio has no equivalent. [Nango self-hosting](https://nango.dev/docs/guides/platform/self-hosting), [Truto — Nango alternatives 2026](https://truto.one/blog/top-5-nango-alternatives-for-b2b-saas-integrations-2026/)
- **Webhooks/syncs** — Nango ingests provider events; Composio is tool-calls-only. This directly enables OpsRadar's Composio-webhook-based automations trigger path to be rebuilt on Nango natively rather than polled. [Composio vs Nango](https://nango.dev/blog/composio-vs-nango/)

**Verdict for OpsRadar:** Nango cloud is a defensible default and a strict security improvement over Composio (white-label + self-host option + token auto-cleanup). The single largest residual risk — broker custody of tokens — is fully closable on Nango via **self-hosting**, which Composio never offered. If OpsRadar ever sells into regulated buyers, self-hosted Nango is the lever.

---

## 3. Migrating off a breached broker

**Re-consent is unavoidable when the old broker owned the OAuth apps.** When the breached broker held the OAuth client registration (Composio's default "managed auth"), its revoked tokens cannot be ported — every customer connection must be **re-authorized from scratch** on the new broker. Plan the migration as a forced reconnect, not a token copy. Known forcing events for re-auth in the wild (Google's MFA rollout): reinstall, account migration, **agency/broker rotation**, offboarding, revocation. [Google Ads API reconnect](https://seresa.io/blog/marketing-pixels-tags/google-ads-api-now-requires-mfa-your-plugin-will-reconnect)

**Containment steps (consensus):**
- **Treat all old-broker tokens as compromised and assume-revoked.** Composio already revoked tokens across ~100 toolkits and deleted pre-22-May keys, so OpsRadar's old connections are dead anyway — there is no "rotate in place," only "re-consent fresh." [Composio May 2026 incident](https://composio.dev/blog/composio-may-2026-security-incident)
- **Own the OAuth app registrations going forward.** Register OpsRadar-branded OAuth apps per provider and configure Nango to use them (white-label) so a future broker switch never requires customer re-consent again. [Composio vs Nango](https://nango.dev/blog/composio-vs-nango/)
- **Refresh-token rotation with a grace window** is the steady-state hygiene: each refresh issues a new token and invalidates the old; issue-new-before-invalidate atomically to avoid logging customers out on a retried request; honour a short grace period for in-flight double-sends. (Nango handles refresh internally; this is the behaviour to expect/verify, not re-implement.) [Okta — refresh token rotation](https://developer.okta.com/docs/guides/refresh-tokens/main/), [Auth0 — refresh token rotation](https://auth0.com/docs/tokens/guides/use-refresh-token-rotation)

**Customer comms:** be direct that a reconnect is required, scope it ("your data was not stored by us; tokens lived at the broker and have been revoked; one-click reconnect restores access"), and stage it per-tool so a customer isn't blocked on all integrations at once. The blast-radius reassurance OpsRadar can truthfully give: **OpsRadar only ever stored a userId→connectionId map, never tokens or business data** — so the OpsRadar database was never the at-risk surface.

---

## 4. Model-fallback patterns

**Portfolio design is the 2026 production pattern:** a closed model tier for high-risk/customer-facing reasoning, an open model tier for high-volume repeatable work, with cross-provider failover. OpsRadar's OpenAI(gpt-5.4/5.5)→Groq→DigitalOcean Gradient chain is squarely on-pattern. [StackSpend — closed vs open 2026](https://www.stackspend.app/resources/blog/closed-vs-open-models-2026), [Maxim — AI gateways with failover 2026](https://www.getmaxim.ai/articles/top-ai-gateway-platforms-with-automatic-failover-in-2026/)

**The open-model tool-calling / json_schema failure is real and well-documented — OpsRadar's split is the correct mitigation.** Multiple 2026 reports: `gpt-oss-120b` **returns 500s / silently ignores `response_format: json_schema` strict mode**; open models "frequently fail to produce strict JSON or schema-compliant output" (extra commentary, incomplete objects); agents get **stuck in infinite retry loops on malformed tool-call fields**; llama-server "fails open" — logs a grammar-parse error but keeps generating *unconstrained*, silently dropping schema enforcement. [Groq community — structured outputs ignored by gpt-oss-120b](https://community.groq.com/t/structured-outputs-ignored-by-openai-gpt-oss-120b/687), [llama.cpp #20344 — gpt-oss-120b json_schema 500](https://github.com/ggml-org/llama.cpp/issues/20344), [llama.cpp #19051 — fails open on grammar parse](https://github.com/ggml-org/llama.cpp/issues/19051), [Ollama gpt-oss structured output issues](https://www.glukhov.org/post/2025/10/ollama-gpt-oss-structured-output-issues/)

This is exactly why OpsRadar's recent commits split the Groq backup **by call kind** — `llama-4-scout` for chat tool-calling, `gpt-oss-120b` for structured output — and hard-stop the stream on a produced card. The research validates that decision: **do not route strict-json_schema work to an open model that can't honour it, and do not assume schema enforcement happened just because no error was thrown** (the silent fail-open case). Validate the parsed object before acting on it.

**Hand-rolled vs gateway:** both are accepted 2026 practice. Gateways (Vercel AI Gateway, OpenRouter) give one OpenAI-compatible key, usage/budgets, and built-in fallback at **zero token markup** (Vercel AI Gateway, incl. BYOK). But the standing warning is **"silent fallback can change output style, latency, cost, and feature support — add fallbacks only when continuity matters and the fallback path has been tested."** That caveat is precisely the open-model json_schema trap above. [Vercel AI Gateway docs](https://vercel.com/docs/ai-gateway), [TrueFoundry — Vercel AI Gateway vs OpenRouter](https://www.truefoundry.com/blog/vercel-ai-gateway-vs-openrouter), [Pinggy — best LLM routers 2026](https://pinggy.io/blog/best_ai_llm_routers_openrouter_alternatives/)

**Recommendation for OpsRadar:** the **hand-rolled, capability-aware chain is currently the safer choice** *because* it routes by call kind — a generic gateway's "silent fallback" would happily send a strict-json_schema request to a model that fails open, the exact bug the recent commits fixed. If OpsRadar later wants gateway ergonomics (one key, spend tracking), **Vercel AI Gateway** is the natural fit (already on Vercel + AI SDK, zero markup, BYOK) — but only if the per-call-kind routing logic is preserved on top, not replaced by blind failover. DigitalOcean Gradient is a legitimate third tier: OpenAI-compatible endpoint, 70+ open + frontier models incl. `gpt-oss-120b/20b`, one key, pay-per-token — a drop-in backup that "just works" with the OpenAI SDK. [DigitalOcean — gpt-oss on Gradient](https://www.digitalocean.com/blog/gpt-oss-models-on-gradient-ai-platform), [DigitalOcean — serverless inference with OpenAI SDK](https://www.digitalocean.com/community/tutorials/serverless-inference-openai-sdk)

Reliability context: OpenAI ~99.76% uptime (Dec 2025–Mar 2026, ~16h/yr down); Anthropic had 30 major incidents in a 90-day early-2026 window — i.e. a fallback chain is justified, not paranoia. [BuildMVPFast — LLM error handling 2026](https://www.buildmvpfast.com/blog/building-with-unreliable-ai-error-handling-fallback-strategies-2026)

---

## So what for OpsRadar

1. **Nango migration is a net security upgrade, not a lateral move.** White-label consent + auto token cleanup + self-host escape hatch all beat Composio's posture. *Confirmed-good.*
2. **Close the one residual risk if/when regulated buyers appear: self-host Nango** so no customer credential transits a third-party cloud. This is the lever Composio never had. *Optional, high-trust payoff.*
3. **Own the OAuth app registrations now.** Register OpsRadar-branded apps per provider behind Nango so the *next* broker switch (or a Nango incident) never forces customer re-consent again. *High impact, do during migration.*
4. **Lean on Nango's proxy** for retry + rate-limit + refresh-concurrency handling; don't re-implement backoff on top. Webhooks (not the frontend) populate the conn, map. *Implementation hygiene.*
5. **The model-fallback chain is correctly built.** Keep the capability-aware routing (open models only for what they can reliably do) and **validate parsed structured output before acting** — open models "fail open" on json_schema. A generic gateway would reintroduce that bug via silent fallback; only adopt Vercel AI Gateway if the per-call-kind routing survives on top. *Confirmed-good; one guardrail to keep.*
6. **Customer comms truth to lead with:** OpsRadar stored only a userId→connectionId map — never tokens, never business data — so the breach surface was the broker's, not OpsRadar's; reconnect is one click. *Messaging.*

---

## Sources

- [Nango — Security docs](https://nango.dev/docs/guides/platform/security)
- [Nango — Public key deprecation](https://docs.nango.dev/guides/api-authorization/public-key-deprecation)
- [Nango — Proxy docs](https://nango.dev/docs/guides/use-cases/proxy)
- [Nango — Node SDK reference](https://docs.nango.dev/reference/sdks/node)
- [Nango — Self-hosting](https://nango.dev/docs/guides/platform/self-hosting)
- [Nango — Concurrency with OAuth token refreshes](https://nango.dev/blog/concurrency-with-oauth-token-refreshes/)
- [Nango — Composio vs Nango (2026)](https://nango.dev/blog/composio-vs-nango/)
- [Nango — Best AI agent integration platforms 2026](https://nango.dev/blog/best-ai-agent-integration-platforms/)
- [Nango — Best AI agent authentication platforms 2026](https://nango.dev/blog/best-ai-agent-authentication/)
- [Truto — Top 5 Nango alternatives for B2B SaaS 2026](https://truto.one/blog/top-5-nango-alternatives-for-b2b-saas-integrations-2026/)
- [Composio — May 2026 security incident](https://composio.dev/blog/composio-may-2026-security-incident)
- [Unit42 — Third-party supply-chain token management](https://unit42.paloaltonetworks.com/third-party-supply-chain-token-management/)
- [Security Boulevard — OAuth risk in SaaS (May 2026)](https://securityboulevard.com/2026/05/oauth-risk-explained-hidden-threats-in-saas/)
- [AppOmni — OAuth token security risks](https://appomni.com/learn/saas-security-fundamentals/oauth-token-security-risks/)
- [Okta — Refresh token rotation](https://developer.okta.com/docs/guides/refresh-tokens/main/)
- [Auth0 — Use refresh token rotation](https://auth0.com/docs/tokens/guides/use-refresh-token-rotation)
- [Seresa — Google Ads API reconnect (re-auth forcing events)](https://seresa.io/blog/marketing-pixels-tags/google-ads-api-now-requires-mfa-your-plugin-will-reconnect)
- [StackSpend — Closed vs open models 2026](https://www.stackspend.app/resources/blog/closed-vs-open-models-2026)
- [Maxim — Top AI gateways with automatic failover 2026](https://www.getmaxim.ai/articles/top-ai-gateway-platforms-with-automatic-failover-in-2026/)
- [Groq community — Structured outputs ignored by gpt-oss-120b](https://community.groq.com/t/structured-outputs-ignored-by-openai-gpt-oss-120b/687)
- [llama.cpp #20344 — gpt-oss-120b json_schema 500](https://github.com/ggml-org/llama.cpp/issues/20344)
- [llama.cpp #19051 — fails open on grammar parse](https://github.com/ggml-org/llama.cpp/issues/19051)
- [Ollama gpt-oss structured output issues](https://www.glukhov.org/post/2025/10/ollama-gpt-oss-structured-output-issues/)
- [Vercel — AI Gateway docs](https://vercel.com/docs/ai-gateway)
- [TrueFoundry — Vercel AI Gateway vs OpenRouter](https://www.truefoundry.com/blog/vercel-ai-gateway-vs-openrouter)
- [Pinggy — Best LLM routers / OpenRouter alternatives 2026](https://pinggy.io/blog/best_ai_llm_routers_openrouter_alternatives/)
- [DigitalOcean — gpt-oss models on Gradient AI Platform](https://www.digitalocean.com/blog/gpt-oss-models-on-gradient-ai-platform)
- [DigitalOcean — Serverless inference with the OpenAI SDK](https://www.digitalocean.com/community/tutorials/serverless-inference-openai-sdk)
- [BuildMVPFast — LLM error handling & fallback strategies 2026](https://www.buildmvpfast.com/blog/building-with-unreliable-ai-error-handling-fallback-strategies-2026)
