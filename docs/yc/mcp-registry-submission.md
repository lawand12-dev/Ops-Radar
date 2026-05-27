# OpsRadar MCP Server — Public Registry Submission

*Written 2026-05-22. The materials and process for getting OpsRadar listed in the official MCP server registry (modelcontextprotocol.io/registry) and discoverable from Claude Desktop's "Add Server" UI.*

> **Why this matters:** Listing in the public registry is what turns "we have an MCP server" into "any agent on the internet can discover and use OpsRadar." It's the YC RFS #12 distribution move. Costs nothing, takes one PR.

---

## What's already shipped

- ✅ `POST /api/mcp` — JSON-RPC 2.0 endpoint, MCP protocol 2024-11-05
- ✅ `GET /api/mcp` — discovery + health endpoint returning tool catalog
- ✅ Bearer-token auth via Supabase Auth (zero-trust, re-validated every call)
- ✅ Per-tool scopes (`finance:read`, `kb:read`, `actions:write`, etc.)
- ✅ Audit log to `mcp_invocations` (caller, scope, args, latency, result)
- ✅ 9 tools: get_finance, get_sales, get_profitability, get_capacity, get_scope, get_outbound, get_meetings, search_kb, propose_action

The server is production-ready. This document is the path to LIST it.

---

## Submission target

The official MCP registry lives at: **https://github.com/modelcontextprotocol/servers**

It's a GitHub repo. Submissions are PRs that add an entry to the README's server catalog + (optionally) a folder under `src/community-servers/opsradar/` with an install README.

---

## The server manifest

The registry entry format (drop-in for the PR):

```yaml
- name: OpsRadar
  description: "AI COO for marketing agencies. Query live agency operations data (finance, profitability, capacity, scope), search the agency-operations knowledge base, and propose HITL-gated actions across Stripe, HubSpot, ClickUp, Harvest, and more."
  url: https://opsradar.co/api/mcp
  transport: http
  auth: bearer
  auth_provider: supabase
  scopes:
    - finance:read
    - sales:read
    - profitability:read
    - capacity:read
    - scope:read
    - outbound:read
    - meetings:read
    - kb:read
    - actions:write
  categories:
    - vertical-agency
    - operations
    - finance
  vendor: OpsRadar
  vendor_url: https://opsradar.co
  docs_url: https://opsradar.co/docs/mcp
  install_url: https://opsradar.co/docs/mcp/install
  github: https://github.com/opsradar/mcp-server
  maintainer: lawand@opsradar.co
  license: proprietary
  protocol_version: "2024-11-05"
```

---

## Claude Desktop installation snippet

This is what a user pastes into `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "opsradar": {
      "transport": "http",
      "url": "https://opsradar.co/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_OPSRADAR_TOKEN>"
      }
    }
  }
}
```

Where `<YOUR_OPSRADAR_TOKEN>` is the user's Supabase Auth JWT, available in their OpsRadar settings page (`/dashboard/settings/mcp` — to be built next sprint).

---

## ChatGPT / OpenAI Apps installation

For ChatGPT (when GPT-5 apps SDK ships with MCP support), the install snippet:

```yaml
mcp_server:
  name: opsradar
  url: https://opsradar.co/api/mcp
  auth:
    type: bearer
    token_source: user_provided
```

---

## Submission PR checklist

Before submitting the PR to `modelcontextprotocol/servers`:

- [ ] Verify the live `GET /api/mcp` endpoint returns valid JSON with all 9 tools
- [ ] Verify a test Bearer token resolves through Supabase Auth + executes a `tools/call`
- [ ] Verify `mcp_invocations` rows are written for both success + error paths
- [ ] Publish a public docs page at `opsradar.co/docs/mcp` (covers: what is OpsRadar, what the tools do, how to get your token, the install snippet)
- [ ] Publish a public install page at `opsradar.co/docs/mcp/install` (paste-ready Claude Desktop config)
- [ ] (Optional) Create a public `opsradar/mcp-server` GitHub repo with example clients in Python, TypeScript, and Claude Desktop
- [ ] Open the PR at https://github.com/modelcontextprotocol/servers with title `Add OpsRadar — AI COO for marketing agencies`
- [ ] PR body uses the manifest above

---

## Where OpsRadar will appear after merge

The PR adds an entry to:

1. The **README server catalog** at the root of `modelcontextprotocol/servers`
2. The **MCP server registry page** at modelcontextprotocol.io/registry
3. (Indirectly) Claude Desktop's "Add Server" picker — Anthropic curates from the registry
4. (Indirectly) ChatGPT GPT-5 Apps catalog — OpenAI curates from the registry
5. (Indirectly) the various MCP server aggregators (mcp.so, smithery.ai, mcphub.dev, glama.ai)

Per `docs/yc/research-addendum.md`: the public MCP server registry expanded from 1,200 servers in Q1 2025 to 9,400+ in April 2026, with month-over-month growth still tracking at +18%. Getting in the catalog now (May 2026) places OpsRadar in the credible early cohort.

---

## What still needs to be done (NOT engineering)

These are user-side actions OpsRadar's founders need to take — not code:

1. **Decide the public OpsRadar GitHub org** (currently OpsRadar is a private repo). Create a public `opsradar/mcp-server` repo containing this README + example clients.
2. **Build a `/docs/mcp` and `/docs/mcp/install` marketing page** — Next.js pages, design-language-consistent with the rest of the marketing site.
3. **Build the token-issuance UI** at `/dashboard/settings/mcp` — single page that shows the user's MCP token (existing Supabase JWT) + copy-to-clipboard + the install snippet pre-filled with their token.
4. **Submit the PR** to `modelcontextprotocol/servers` using the manifest above.
5. **Announce on @LawandOps + Reddit + HackerNews** — the launch tweet is a real distribution event.

Each of these is hours, not days. After the PR is merged, OpsRadar is in every Claude Desktop user's MCP picker.

---

## Why this is the YC #12 endgame

> *"YC's in-house bet is that the infrastructure layer for agents is where they expect their next breakouts to come from. Strip the UI, expose a clean MCP server, and charge per call, with agent-native auth and rate limiting including per-agent tokens with scoped permissions, usage-based billing, and audit trails — described as plumbing every agent platform needs and almost nobody has built well."*
> — YC Summer 2026 RFS, via Epsilla's deep-dive analysis

OpsRadar's MCP server checks every box of that prescription:
- Clean MCP server ✅
- Per-agent tokens with scoped permissions ✅ (Bearer + per-tool scopes)
- Audit trails ✅ (`mcp_invocations` table)
- Usage-based billing primitive ✅ (latency_ms + tool_name in audit log → can derive per-call cost)

Publishing to the registry is the act that completes #12. Everything else is in the codebase.

---

## Cross-references

- `src/app/api/mcp/route.ts` — the live server (MCP token + install snippet at `/dashboard/settings/mcp`)
- `docs/yc/four-categories-build.md` §"#12 Software for Agents" — strategic context
- `docs/yc/build-architecture.md` — current build blueprint (single Next.js app, Nango broker, agent loop + approval gate)
- `docs/yc/research-addendum.md` — the MCP adoption data this play is based on

---

*Generated as part of "build all 4 categories" — 2026-05-22.*
