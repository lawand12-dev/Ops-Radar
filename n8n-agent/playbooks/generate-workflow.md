# Playbook: Generate or Repair an n8n Workflow

**Type:** Procedure (workflow authoring, repair, and validation flow)  
**When to run:** A user asks to create, modify, repair, validate, or deploy an n8n workflow from natural language, a workflow JSON file, a failed execution, or an automation idea  
**Inputs:** user goal, constraints, target n8n version if known, available credentials if known, optional existing workflow JSON, optional execution/error data  
**Outputs:** validated n8n workflow JSON, credential requirements, validation report, deployment plan, and safety notes  
**Updated:** 2026-05-07

## Step 0 — Classify the Request

Classify the authoring task:

| Type | Meaning |
|---|---|
| `new-workflow` | Build a workflow from a user goal |
| `repair-workflow` | Fix broken workflow JSON or an execution failure |
| `extend-workflow` | Add nodes, branches, credentials, logging, or error handling |
| `validate-workflow` | Review workflow JSON and produce fixes |
| `deploy-workflow` | Create/update the workflow in n8n after validation |

If the request affects production, customer data, revenue workflows, credentials, or external writes, require explicit approval before deployment or activation.

## Step 1 — Load Authoring Context

Always load:

- `reference/tooling/n8n-tooling-map.md`
- `reference/patterns/n8n-workflow-patterns.md`
- `reference/n8n-nodes/n8n-nodes.md`
- `tools/safety-rules.md`

Then load only the matching sibling skill:

| Need | Load |
|---|---|
| JavaScript Code node | `../n8n-skills-main/skills/n8n-code-javascript/SKILL.md` |
| Python Code node | `../n8n-skills-main/skills/n8n-code-python/SKILL.md` |
| Expressions | `../n8n-skills-main/skills/n8n-expression-syntax/SKILL.md` |
| Node configuration | `../n8n-skills-main/skills/n8n-node-configuration/SKILL.md` |
| Validation | `../n8n-skills-main/skills/n8n-validation-expert/SKILL.md` |
| Workflow architecture | `../n8n-skills-main/skills/n8n-workflow-patterns/SKILL.md` |
| MCP tools | `../n8n-skills-main/skills/n8n-mcp-tools-expert/SKILL.md` |

Do not load the entire sibling repositories.

## Step 2 — Clarify Only Blocking Unknowns

Proceed with reasonable defaults unless one of these is unknown:

- trigger type is unclear and changes the architecture materially;
- target app/API is ambiguous;
- credential type affects available operations;
- the workflow would perform customer-visible writes;
- deployment/activation is requested but target n8n instance is unknown.

Otherwise state assumptions in the output.

## Step 3 — Select the Workflow Pattern

Choose one dominant pattern:

- webhook processing
- HTTP API integration
- database operation
- AI agent workflow
- scheduled task
- monitoring/error-handler workflow
- hybrid/multi-branch workflow

Map the request to a simple architecture before configuring nodes:

```text
Trigger -> Validate/Normalize -> Main Action -> Error Handling -> Response/Log
```

For complex workflows, split into subflows or use `Execute Workflow` instead of building one giant workflow.

## Step 4 — Prefer Templates and Real Examples

When n8n-MCP is available:

1. Call `tools_documentation()` if tool behavior is not already known.
2. Search templates first:
   - by task
   - by nodes
   - by keyword
   - by metadata/complexity
3. If a template is used, preserve attribution in the final notes.
4. If no template fits, use examples from `search_nodes(..., includeExamples: true)` and `get_node(..., includeExamples: true)`.

Without n8n-MCP, use local references under `reference/n8n-nodes/`, `reference/patterns/`, and the matching sibling skill.

## Step 5 — Discover and Configure Nodes

When n8n-MCP is available:

1. `search_nodes({ query, includeExamples: true })`
2. `get_node({ nodeType, detail: "standard", includeExamples: true })`
3. `get_node({ mode: "search_properties", propertyQuery })` for unclear auth/body/header/operation fields
4. `get_node({ detail: "full" })` only when standard detail is insufficient

Use short node type format for discovery and validation:

```text
nodes-base.slack
nodes-base.httpRequest
nodes-langchain.agent
```

Use full node type format in workflow JSON:

```text
n8n-nodes-base.slack
n8n-nodes-base.httpRequest
@n8n/n8n-nodes-langchain.agent
```

Never rely on defaults for behavior-critical fields. Explicitly configure:

- resource and operation
- authentication mode
- target IDs or lookup strategy
- HTTP method, URL, headers, body, pagination, and response handling
- retry/error behavior
- execution timeout and error workflow when needed
- item handling and branch behavior

## Step 6 — Expressions and Code Nodes

Use n8n expressions with `{{ }}`:

```text
{{$json.body.email}}
{{$node["Webhook"].json.body.email}}
```

Webhook payloads are usually under `.body`, not at the root.

Prefer JavaScript Code nodes for custom logic. Use Python only for standard-library-heavy transformations or when specifically requested.

Code node return shape must be:

```json
[
  {
    "json": {}
  }
]
```

For Code nodes, choose "Run Once for All Items" unless each item is genuinely independent.

## Step 7 — Add Operational Hardening

Every production-grade workflow should define:

- error path or explicit failure behavior;
- retry/backoff behavior for APIs;
- rate-limit handling for known constrained APIs;
- empty-input behavior;
- duplicate/idempotency behavior for external writes;
- credential requirements;
- logging/audit node or execution metadata for important state transitions;
- timeout expectations for long-running work.

For workflows that may later be auto-replayed by the monitoring agent, add an engineer-controlled `idempotent:true` tag only when replay is actually safe.

## Step 8 — Validate Iteratively

When n8n-MCP is available:

1. Validate each node:
   - `validate_node({ nodeType, config, mode: "minimal" })`
   - `validate_node({ nodeType, config, mode: "full", profile: "runtime" })`
2. Fix all errors.
3. Validate the complete workflow:
   - `validate_workflow(workflow)`
   - validate connections
   - validate expressions
4. Repeat until no blocking errors remain.

Two or three validation/fix cycles is normal.

Without n8n-MCP, perform a manual validation pass:

- all nodes have unique names;
- connections reference existing node names;
- node types use full workflow format;
- credential references are placeholders, not secrets;
- expressions use `{{ }}` and exact node names;
- Code nodes return valid n8n item arrays;
- branches have clear merge/response behavior.

## Step 9 — Deployment Gate

Before creating, updating, activating, or testing a workflow in a real n8n instance:

1. Confirm the target instance/customer.
2. Confirm production vs development.
3. Confirm credential bindings exist and do not expose secrets.
4. Confirm external side effects are acceptable.
5. Confirm activation is explicitly requested.

If any gate is missing, output the workflow JSON and deployment plan but do not deploy or activate.

## Step 10 — Output Package

Return:

```jsonc
{
  "workflow_name": "string",
  "task_type": "new-workflow|repair-workflow|extend-workflow|validate-workflow|deploy-workflow",
  "pattern": "string",
  "assumptions": [],
  "nodes": [],
  "connections": {},
  "credential_requirements": [],
  "validation": {
    "status": "not-run|passed|passed-with-warnings|failed",
    "errors": [],
    "warnings": []
  },
  "deployment": {
    "ready": false,
    "requires_approval": true,
    "activation_allowed": false
  },
  "operational_notes": []
}
```

If the user needs raw n8n import JSON, include a valid n8n workflow object with `nodes`, `connections`, `settings`, and `name`.

## Cross-references

`reference/tooling/n8n-tooling-map.md` · `reference/patterns/n8n-workflow-patterns.md` · `reference/n8n-nodes/n8n-nodes.md` · `tools/safety-rules.md` · `../n8n-skills-main/skills/n8n-mcp-tools-expert/SKILL.md` · `../n8n-skills-main/skills/n8n-node-configuration/SKILL.md` · `../n8n-skills-main/skills/n8n-validation-expert/SKILL.md`
