# n8n Tooling Map

**Purpose:** Teach the n8n agent where to look for tool, node, workflow, expression, validation, and MCP behavior without loading the full sibling repositories.

Use this file when the task involves building, validating, modifying, deploying, or deeply debugging n8n workflows or runtime tool implementations.

For reviewing whether new cases, evals, policies, or workflow-generation changes are strong enough, use `reference/tooling/n8n-agent-quality-gates.md`.

---

## Source Priority

Use these sources in this order:

1. `tools/agent-tools.md` and `tools/safety-rules.md` for OpsRadar runtime tools and customer-safety gates.
2. `models/`, `decision-trees/`, `cases/`, and `playbooks/` for monitoring diagnosis and recovery.
3. `reference/n8n-nodes/`, `reference/n8n-production/`, and `reference/api/` for local n8n and external API reference.
4. `../n8n-skills-main/skills/<matching-skill>/` for authoring-specific n8n guidance.
5. `../n8n-mcp-main/` for MCP server behavior, workflow validation internals, node metadata, and n8n API implementation patterns.
6. `../n8n-workflows-main/workflows/<ServiceName>/` for real-world workflow JSON examples organized by service (Airtable, Stripe, Shopify, Slack, etc.). Use as template source before building from scratch.

Do not copy the full sibling repositories into `n8n-agent/`. Load only the specific file needed.

---

## Two Tool Surfaces

There are two separate tool concepts:

| Surface | Purpose | Source of truth |
|---|---|---|
| OpsRadar runtime tools | Safe customer monitoring actions such as reading executions, querying read-only DB, stopping/replaying, writing incidents, and posting alerts | `tools/agent-tools.md` |
| n8n-MCP tools | Workflow-authoring and n8n-management helpers such as node search, node validation, workflow validation, templates, credentials, and partial workflow updates | `../n8n-mcp-main/README.md` and `../n8n-skills-main/skills/n8n-mcp-tools-expert/` |

For monitoring incidents, prefer OpsRadar runtime tools. For workflow building, validation, node configuration, and MCP setup, consult n8n-MCP guidance.

---

## n8n-MCP Workflow

When n8n-MCP is available, follow this order:

1. Start with `tools_documentation()` for tool-specific best practices.
2. Search templates before building from scratch.
3. Discover nodes with `search_nodes({ query, includeExamples: true })`.
4. Read node configuration with `get_node({ nodeType, detail: "standard", includeExamples: true })`.
5. Use `get_node({ mode: "search_properties", propertyQuery })` when a field is unclear.
6. Use `get_node({ detail: "full" })` only for complex debugging; it is large.
7. Validate each node with `validate_node({ mode: "minimal" })`, then `validate_node({ mode: "full", profile: "runtime" })`.
8. Validate the whole workflow with `validate_workflow(workflow)`.
9. After deployment, use `n8n_validate_workflow({ id })` and inspect executions.

Core rule: never trust n8n node defaults. Explicitly configure parameters that control behavior, authentication, routing, data shape, retries, and error handling.

---

## Workflow Generation Route

For natural-language workflow generation, use `playbooks/generate-workflow.md` and this sequence:

1. Convert the user goal into a dominant workflow pattern.
2. Search templates and examples before inventing a graph.
3. Pick the smallest node set that satisfies the goal.
4. Configure nodes with explicit resource, operation, authentication mode, and data paths.
5. Add validation, error handling, and idempotency behavior where relevant.
6. Validate individual node configs, then the whole workflow.
7. Return importable workflow JSON plus credential requirements and deployment gates.

For workflow repair, start from the error or failed execution:

1. Identify the failing node and error type.
2. Load the matching node/config/expression/code skill.
3. Patch the smallest part of the workflow.
4. Re-run node and workflow validation.
5. Preserve unrelated node IDs, names, credentials, and layout where possible.

---

## Node Type Formats

n8n-MCP uses two node type formats:

| Use case | Format | Example |
|---|---|---|
| Search, docs, validation | short format | `nodes-base.slack`, `nodes-base.httpRequest`, `nodes-langchain.agent` |
| Workflow JSON / create/update | full format | `n8n-nodes-base.slack`, `n8n-nodes-base.httpRequest`, `@n8n/n8n-nodes-langchain.agent` |

If a node cannot be found, verify the prefix before changing the workflow.

---

## Skill Selection Map

Use exactly the matching sibling skill:

| Task | Load |
|---|---|
| JavaScript Code node logic, `$input`, `$json`, `$helpers`, return shape | `../n8n-skills-main/skills/n8n-code-javascript/SKILL.md` |
| Python Code node logic, `_input`, `_json`, standard-library limits | `../n8n-skills-main/skills/n8n-code-python/SKILL.md` |
| `{{ }}` expressions, `$json`, `$node`, webhook body access | `../n8n-skills-main/skills/n8n-expression-syntax/SKILL.md` |
| Node operations, required fields, display options, property dependencies | `../n8n-skills-main/skills/n8n-node-configuration/SKILL.md` |
| Validation errors, profiles, false positives, validation loop | `../n8n-skills-main/skills/n8n-validation-expert/SKILL.md` |
| Workflow architecture patterns: webhook, API, database, AI agent, scheduled | `../n8n-skills-main/skills/n8n-workflow-patterns/SKILL.md` |
| MCP tool choice, search/get/validate/update/deploy tool usage | `../n8n-skills-main/skills/n8n-mcp-tools-expert/SKILL.md` |

Load deeper sibling files only when that skill points to them and the task needs it.

---

## n8n Authoring Invariants

Always apply these when creating or repairing workflows:

- Prefer templates and real examples before building from scratch.
- Use JavaScript Code nodes for most custom code. Use Python only when its standard library is specifically useful.
- Code nodes must return arrays of items shaped like `[{ json: { ... } }]`.
- Webhook input data is usually under `.body`, not at the root.
- n8n expressions need `{{ }}` and exact quoted node names, for example `{{$node["Webhook"].json.body.email}}`.
- Resource plus operation determines required node fields.
- Property visibility depends on `displayOptions`; a field may be required only after another option is selected.
- Validate iteratively. Two or three validate/fix cycles is normal.
- Validate node configs before workflow validation.
- Validate deployed workflow again after n8n assigns IDs and versions.
- Add error handling for API, auth, rate limit, timeout, empty data, duplicate data, and pagination paths.

---

## n8n-workflows-main Source Map

`../n8n-workflows-main/` contains 2,061 real n8n workflow JSON files organized by service. Use them as templates before building from scratch.

| Need | Source |
|---|---|
| Service-specific workflow examples | `workflows/<ServiceName>/` (e.g., `workflows/Airtable/`, `workflows/Stripe/`, `workflows/Shopify/`) |
| Ready-to-import webhook/trigger templates | `templates/communication/` and `templates/data-processing/` |
| AI/LLM stack workflows | `ai-stack/workflows/` |
| Workflow search index | `docs/api/search-index.json` |
| Category index | `docs/api/categories.json`, `context/def_categories.json` |

**Usage pattern:** When generating a workflow, `ls workflows/<ServiceName>/` to see what examples exist, then load the closest match as a structural starting point. Strip production-specific IDs, credential IDs, and webhook URLs before modifying.

---

## n8n-MCP Source Map

Use these files in `../n8n-mcp-main/` when implementing or debugging tooling:

| Need | Source |
|---|---|
| MCP setup and high-level tool process | `README.md`, `docs/CODEX_SETUP.md` |
| MCP tool registry and docs | `src/mcp/tools.ts`, `src/mcp/tools-documentation.ts`, `src/mcp/tool-docs/` |
| n8n manager tools | `src/mcp/tools-n8n-manager.ts`, `src/mcp/handlers-n8n-manager.ts` |
| Workflow diff/partial update behavior | `src/mcp/handlers-workflow-diff.ts`, `src/services/workflow-diff-engine.ts` |
| n8n API client patterns | `src/services/n8n-api-client.ts`, `src/config/n8n-api.ts` |
| Node metadata and documentation | `src/database/node-repository.ts`, `src/services/node-documentation-service.ts`, `src/loaders/node-loader.ts` |
| Property dependencies and validation | `src/services/property-dependencies.ts`, `src/services/config-validator.ts`, `src/services/enhanced-config-validator.ts` |
| Workflow validation | `src/services/workflow-validator.ts`, `src/services/n8n-validation.ts`, `src/services/post-update-validator.ts` |
| Expression validation | `src/services/expression-validator.ts`, `src/services/universal-expression-validator.ts`, `src/services/expression-format-validator.ts` |
| Security/audit scanning | `src/services/workflow-security-scanner.ts`, `src/services/credential-scanner.ts`, `src/services/audit-report-builder.ts` |
| Templates and examples | `src/templates/`, `src/mcp/workflow-examples.ts`, `data/workflow-patterns.json` |
| Version and migration behavior | `src/services/node-version-service.ts`, `src/services/node-migration-service.ts`, `src/services/breaking-change-detector.ts` |

Prefer reading these source files over guessing behavior from generated output.

---

## Monitoring Runtime Rule

The monitoring agent may use n8n-MCP knowledge, but customer-impacting writes still go through the OpsRadar runtime safety layer.

Do not let workflow-authoring tools bypass:

- customer policy limits
- idempotency checks
- credential redaction
- SELECT-only database access
- incident and audit logging
- human approval for high-risk or revenue-impacting actions
