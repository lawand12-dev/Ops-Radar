# n8n MCP API Reference

**Category:** Tools  
**Source:** n8n-mcp v2.14.2 MCP server  
**Updated:** 2026-04-30

## Overview

Complete reference for the n8n-MCP MCP server tools: discovery, validation, workflow management, templates, credentials, security auditing, and data tables.

## Related Notes

[[n8n-nodes]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]] · [[n8n-common-failures]]

---

## Tool Availability

**Always available** (no n8n instance needed):
- `search_nodes`, `get_node`
- `validate_node`, `validate_workflow`
- `search_templates`, `get_template`
- `tools_documentation`, `ai_agents_guide`

**Requires n8n API** (`N8N_API_URL` + `N8N_API_KEY`):
- All `n8n_*` prefixed tools (workflow management, execution, credentials, audit)

---

## Node Discovery Tools

### search_nodes
Find nodes by keyword. Returns both short and full nodeType formats.

```javascript
search_nodes({query: "slack"})
search_nodes({query: "AI agent langchain"})
search_nodes({query: "trigger"})
search_nodes({query: "slack", source: "community"})  // Community nodes only
search_nodes({query: "webhook", includeExamples: true})
```

Returns both formats:
- `"nodeType": "nodes-base.slack"` — use with search/validate tools
- `"workflowNodeType": "n8n-nodes-base.slack"` — use in workflow JSON

### get_node
Unified node information with multiple detail levels and modes.

**Detail levels** (mode="info", default):
| Level | Tokens | Use |
|-------|--------|-----|
| `minimal` | ~200 | Basic metadata only |
| `standard` | ~1-2K | Essential properties + operations (DEFAULT — use first) |
| `full` | ~3-8K | Complete schema (sparingly) |

**Modes**:
```javascript
get_node({nodeType: "nodes-base.slack"})                    // standard detail
get_node({nodeType: "nodes-base.slack", mode: "docs"})      // human-readable docs
get_node({nodeType: "nodes-base.httpRequest",
          mode: "search_properties", propertyQuery: "auth"}) // find specific props
get_node({nodeType: "nodes-base.webhook", mode: "versions"}) // version history
get_node({nodeType: "nodes-base.webhook", mode: "breaking"}) // breaking changes only
get_node({nodeType: "nodes-base.slack", includeExamples: true}) // real template configs
```

**Decision tree**:
1. Start → `get_node` (standard, default)
2. Looking for specific field → `search_properties` mode
3. Still need more → `detail: "full"`

---

## Validation Tools

### validate_node
Check node configuration before building.

```javascript
// Quick check — required fields only
validate_node({nodeType: "nodes-base.webhook", config: {}, mode: "minimal"})

// Full validation — recommended before deployment
validate_node({nodeType: "nodes-base.slack", config: {...}, profile: "runtime"})

// AI-generated configs — reduce false positives
validate_node({nodeType: "nodes-base.slack", config: {...}, profile: "ai-friendly"})
```

**Profiles**:
| Profile | Strictness | Use When |
|---------|-----------|---------|
| `minimal` | Very lenient | Quick checks during editing |
| `runtime` | Balanced (**recommended**) | Pre-deployment standard |
| `ai-friendly` | Balanced + fewer false positives | AI-generated configs |
| `strict` | Maximum | Production critical workflows |

**Validation loop** (normal, not a bug — avg 2-3 iterations):
```
configure → validate → read errors (23s) → fix (58s) → validate → ...
```

**Error types**:
- `missing_required` — add the field
- `invalid_value` — check allowed options via `get_node`
- `type_mismatch` — convert to correct type (number vs string)
- `invalid_expression` — add `{{}}` wrappers
- `invalid_reference` — fix node name (case-sensitive)

### validate_workflow
Validates entire workflow structure.

```javascript
validate_workflow({
  workflow: {nodes: [...], connections: {...}},
  options: {
    validateNodes: true,
    validateConnections: true,
    validateExpressions: true,
    profile: "runtime"
  }
})
```

---

## Workflow Management Tools

### n8n_create_workflow
Create a new workflow.

```javascript
n8n_create_workflow({
  name: "My Workflow",
  nodes: [{
    id: "node-1",
    name: "Webhook",
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: [250, 300],
    parameters: {path: "my-webhook", httpMethod: "POST"}
  }],
  connections: {
    "Webhook": {main: [[{node: "Processor", type: "main", index: 0}]]}
  }
})
```

### n8n_update_partial_workflow (MOST USED — 99.0% success, 38,287 uses)
Token-efficient workflow updates via diff operations. Saves 80-90% tokens vs full replacement.

```javascript
n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Add error handling for API failures",  // Improves AI responses
  operations: [
    {type: "addNode", node: {...}},
    {type: "addConnection",
     source: "Webhook", target: "Processor",
     sourcePort: "main", targetPort: "main"},
    // IF node routing (CRITICAL: use branch param)
    {type: "addConnection",
     source: "If", target: "Handler",
     sourcePort: "main", targetPort: "main", branch: "true"},
    {type: "patchNodeField",
     nodeName: "Code",
     fieldPath: "parameters.jsCode",
     patches: [{find: "const limit = 10;", replace: "const limit = 50;"}]},
    {type: "cleanStaleConnections"},
    {type: "activateWorkflow"}
  ]
})
```

**19 operation types** including: `addNode`, `removeNode`, `updateNode`, `addConnection`, `removeConnection`, `patchNodeField`, `cleanStaleConnections`, `activateWorkflow`, `deactivateWorkflow`, `transferWorkflow`.

**addConnection syntax** — four separate string params required:
```json
{
  "type": "addConnection",
  "source": "node-id-string",
  "target": "target-node-id-string",
  "sourcePort": "main",
  "targetPort": "main"
}
```

**CRITICAL — IF node multi-output**: Without `branch` param, both connections land on same output.

**patchNodeField errors**:
- "find string not found" → content changed or typo; use `regex: true` for flexible whitespace
- "ambiguous match" → use `replaceAll: true` or more specific string
- "invalid regex" → simplify pattern; nested quantifiers rejected as ReDoS risk

### n8n_autofix_workflow
Preview and apply automatic fixes.

```javascript
// Preview (default — no changes applied)
n8n_autofix_workflow({id: "workflow-id"})

// Apply only high-confidence fixes
n8n_autofix_workflow({
  id: "workflow-id",
  applyFixes: true,
  confidenceThreshold: "high"
})

// Target specific fix types
n8n_autofix_workflow({
  id: "workflow-id",
  fixTypes: ["expression-format", "typeversion-upgrade"],
  applyFixes: true
})
```

**Fix types**: `expression-format`, `typeversion-correction`, `error-output-config`, `node-type-correction`, `webhook-missing-path`, `typeversion-upgrade`, `version-migration`.

### n8n_validate_workflow (by ID)
```javascript
n8n_validate_workflow({id: "workflow-id"})
```

### Other Workflow Tools
```javascript
n8n_get_workflow({id: "wf-id", mode: "structure"})     // modes: full, details, structure, minimal
n8n_list_workflows({active: true, limit: 50})
n8n_delete_workflow({id: "wf-id"})                      // permanent — no undo
n8n_workflow_versions({id: "wf-id"})                    // version history + rollback
n8n_test_workflow({workflowId: "wf-id"})                // trigger test execution
n8n_executions({action: "list", workflowId: "wf-id"})  // monitor executions
n8n_health_check()                                       // API connectivity check
```

---

## Template Tools

### search_templates (2,709 templates available)

```javascript
// Keyword search (default)
search_templates({query: "slack notification", limit: 20})

// By node types
search_templates({searchMode: "by_nodes",
                  nodeTypes: ["n8n-nodes-base.slack", "n8n-nodes-base.httpRequest"]})

// By task type
search_templates({searchMode: "by_task", task: "webhook_processing"})

// By metadata — best for audience-specific needs
search_templates({searchMode: "by_metadata",
                  complexity: "simple",
                  maxSetupMinutes: 15,
                  targetAudience: "marketers"})
```

**Audience filters**: `"marketers"`, `"developers"`, `"analysts"`  
**Complexity filters**: `"simple"`, `"medium"`, `"complex"`

### get_template
```javascript
get_template({templateId: 2947, mode: "structure"})   // nodes+connections only
get_template({templateId: 2947, mode: "full"})         // complete JSON
```

### n8n_deploy_template
Deploy template directly to your n8n instance.

```javascript
n8n_deploy_template({
  templateId: 2947,
  name: "My Weather to Slack",
  autoFix: true,
  autoUpgradeVersions: true
})
```

**MANDATORY ATTRIBUTION**: When using a template, share author name, username, and n8n.io link.

---

## Data Table Tools

### n8n_manage_datatable
CRUD operations on n8n data tables.

```javascript
// Create table
n8n_manage_datatable({
  action: "createTable",
  name: "Contacts",
  columns: [
    {name: "email", type: "string"},
    {name: "score", type: "number"}
  ]
})

// Query with filter
n8n_manage_datatable({
  action: "getRows",
  tableId: "dt-123",
  filter: {filters: [{columnName: "status", condition: "eq", value: "active"}]},
  limit: 50
})

// Bulk update with dry run first
n8n_manage_datatable({
  action: "updateRows",
  tableId: "dt-123",
  filter: {filters: [{columnName: "score", condition: "lt", value: 5}]},
  data: {status: "inactive"},
  dryRun: true
})
```

**Filter conditions**: `eq`, `neq`, `like`, `ilike`, `gt`, `gte`, `lt`, `lte`

---

## Credential Management

### n8n_manage_credentials

```javascript
n8n_manage_credentials({action: "list"})
n8n_manage_credentials({action: "getSchema", credentialType: "httpHeaderAuth"})
n8n_manage_credentials({
  action: "create",
  name: "My Slack Token",
  type: "slackApi",
  data: {accessToken: "xoxb-..."}
})
n8n_manage_credentials({action: "delete", id: "123"})
```

Security: `get`, `create`, `update` responses strip the `data` field. Use `getSchema` before `create` to discover required fields.

---

## Security Audit

### n8n_audit_instance

```javascript
n8n_audit_instance()   // Full audit (built-in + custom scan)

n8n_audit_instance({
  categories: ["credentials", "nodes"],
  includeCustomScan: false
})

n8n_audit_instance({
  customChecks: ["hardcoded_secrets", "unauthenticated_webhooks"]
})
```

**Built-in categories**: `credentials`, `database`, `nodes`, `instance`, `filesystem`

**Custom checks**:
- `hardcoded_secrets` — Detects 50+ patterns (API keys, tokens, PII). Secrets masked in output.
- `unauthenticated_webhooks` — Flags webhook/form triggers without auth
- `error_handling` — Flags workflows with 3+ nodes and no error handling
- `data_retention` — Flags workflows saving all execution data

Output: markdown report with summary table and remediation playbook (auto-fixable / requires review / requires user action).

---

## Performance Reference

| Tool | Response Time |
|------|---------------|
| `search_nodes` | <20ms |
| `get_node` (standard) | <10ms |
| `get_node` (full) | <100ms |
| `validate_node` (minimal) | <50ms |
| `validate_node` (full) | <100ms |
| `validate_workflow` | 100-500ms |
| `n8n_update_partial_workflow` | 50-200ms |
| `n8n_audit_instance` | 500-5000ms |

---

## Standard Build Workflow

```
1. tools_documentation()           — read best practices first
2. search_templates(...)            — check 2,709 templates before building
3. search_nodes({query: "..."})     — find nodes
4. get_node({nodeType: "...",
             includeExamples: true}) — get config details
5. validate_node({..., profile: "runtime"}) — validate (iterate 2-3x)
6. n8n_create_workflow(...)         — build
7. n8n_validate_workflow({id})      — post-build check
8. n8n_update_partial_workflow(...)  — iterate (56s avg between edits)
9. activateWorkflow operation       — go live
```
