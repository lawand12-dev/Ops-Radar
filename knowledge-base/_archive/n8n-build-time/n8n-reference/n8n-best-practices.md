# n8n Best Practices

**Category:** Patterns  
**Source:** n8n-skills skill suite + n8n-mcp telemetry + n8n production analysis  
**Updated:** 2026-04-30

## Overview

Production-tested best practices for building reliable n8n workflows: workflow construction discipline, node configuration, expression writing, code quality, security, and the MCP-assisted build process.

## Related Notes

[[research-16]] · [[n8n-workflow-patterns]] · [[n8n-common-failures]] · [[n8n-nodes]] · [[n8n-api]]

---

## 1. Build Process Discipline

### Templates First (2,709 Available)
Always search templates before building from scratch:
```javascript
search_templates({query: "webhook slack"})
search_templates({searchMode: "by_metadata", complexity: "simple", maxSetupMinutes: 15})
```
A solved problem is not worth rebuilding. Templates include attribution requirements — always share author name and n8n.io link.

### Iterate, Don't Build in One Shot
Average gap between workflow edits in production: **56 seconds**. This is normal — good workflow building is iterative.

**Wrong approach**: Design entire workflow mentally, then build all nodes at once  
**Right approach**: Add one node → validate → connect → validate → repeat

### Read Tool Documentation First
```javascript
tools_documentation()  // Overview of all n8n-mcp tools
tools_documentation({topic: "search_nodes", depth: "full"})
```
Call this at the start of any workflow session.

### Plan Architecture Before Building
1. Identify the pattern (webhook / HTTP API / database / AI / scheduled)
2. List required nodes
3. Map data flow: input → transform → output
4. Define error handling strategy
5. Show architecture to user for approval before building

---

## 2. Node Configuration

### Never Trust Defaults (Rule #1)
Default parameter values are the **#1 source of runtime failures**. Always set ALL parameters explicitly:

```json
// FAILS — relying on defaults
{"resource": "message", "operation": "post", "text": "Hello"}

// WORKS — all parameters explicit
{"resource": "message", "operation": "post",
 "select": "channel", "channelId": "C123", "text": "Hello"}
```

### Use Progressive Discovery
1. `get_node({detail: "standard"})` — covers 95% of config needs at ~1-2K tokens
2. `get_node({mode: "search_properties", propertyQuery: "..."})` — when stuck on specific field
3. `get_node({detail: "full"})` — only when standard is insufficient (3-8K tokens, expensive)

Never jump straight to `detail: "full"` — it wastes tokens and context window.

### Use `includeExamples: true` for Real Configs
```javascript
get_node({nodeType: "nodes-base.httpRequest", includeExamples: true})
```
Returns real configurations extracted from 2,646 workflow templates. More reliable than guessing.

### Respect Operation Context
When you change `operation`, check ALL required fields again:
- `resource: "message", operation: "post"` requires `channel` + `text`
- `resource: "message", operation: "update"` requires `messageId` + `text` (different!)

---

## 3. Validation Strategy

### Multi-Level Validation (Required)
```
Level 1: validate_node(mode: "minimal")  → quick required fields check (<100ms)
Level 2: validate_node(profile: "runtime") → pre-deployment standard
Level 3: validate_workflow(workflow)       → complete structure check
Level 4: n8n_validate_workflow({id})       → post-deployment verify
```

### Use the Right Profile
- Development: `runtime` (balanced — default)
- AI-generated configs: `ai-friendly` (fewer false positives)
- Production critical: `strict` (maximum safety)
- Quick iteration: `minimal` (fast, permissive)

Do not use `strict` during development — it produces too many warnings and slows iteration.

### Fix Errors Iteratively
Fix one error at a time, validate again. Do not try to fix all errors at once — subsequent errors often depend on earlier fixes. The validation loop (2-3 cycles, 23s + 58s each) is normal.

### Validate After Every Significant Change
Do not skip validation before activation. Even a single added node can break workflow connections or introduce expression errors.

---

## 4. Expression Best Practices

### Always Use `{{}}` Wrappers
```javascript
✅ {{$json.field}}
❌ $json.field      // literal text
```

### Webhook Data Is Under `.body`
```javascript
✅ {{$json.body.email}}
❌ {{$json.email}}   // always undefined after webhook
```

### Quote Node Names with Spaces
```javascript
✅ {{$node["HTTP Request"].json.data}}
❌ {{$node.HTTP Request.json.data}}    // parse error
```

### No Expressions in Code Nodes
Code nodes use JavaScript directly — no `{{}}` syntax:
```javascript
✅ const email = $input.first().json.body.email;
❌ const email = "{{$json.body.email}}";
```

### Conditional Expressions
```javascript
// Default values
{{$json.email || 'no-email@example.com'}}

// Ternary
{{$json.status === 'active' ? 'Active User' : 'Inactive User'}}
```

---

## 5. Code Node Best Practices

### Return Format Is Non-Negotiable
Every code path must return `[{json: {...}}]`:
```javascript
return [{json: {result: processedData}}];  // single
return items.map(item => ({json: item.json}));  // multiple
return [];  // valid empty result
```

### Choose "Run Once for All Items" Mode (95% of cases)
Only switch to "Run Once for Each Item" when items must be independently processed for business logic reasons.

### Validate Input Before Processing
```javascript
const items = $input.all();
if (!items || items.length === 0) return [];
if (!items[0].json) return [{json: {error: "Invalid input"}}];
```

### Use Optional Chaining for Null Safety
```javascript
const email = item.json?.user?.email || 'fallback@example.com';
```

### Prefer Functional Array Methods
```javascript
✅ const result = $input.all().filter(i => i.json.valid).map(i => ({json: i.json}));
❌ const result = []; for (const i of items) { if (i.json.valid) result.push(...); }
```

### When NOT to Use Code Node
| Task | Better Node |
|------|------------|
| Simple field mapping | `set` |
| Basic filtering | `filter` |
| Simple conditionals | `if` or `switch` |
| HTTP requests only | `httpRequest` |

Use Code node only when standard nodes cannot handle the logic.

---

## 6. Workflow Structure

### One Trigger Per Workflow
Multiple triggers cause unpredictable execution. Split into separate workflows if multiple entry points are needed.

### Use Descriptive Node Names
Node names appear in `$node["..."]` references and workflow diagrams. `HTTP Request` is worse than `Fetch Stripe Customer`. Be specific.

### Document Complex Workflows
Use the workflow notes field and `stickyNote` nodes for:
- Purpose of the workflow
- Non-obvious data flow decisions
- External system dependencies

### Add Error Handling to Production Workflows
```
Error Trigger (separate workflow)
  → Set (format: workflow name, error message, timestamp)
  → Slack #ops-alerts
  → Postgres error_log table
```
Or at node level: `continueOnFail: true` + `retryOnFail: true, maxTries: 3`.

Workflows with 3+ nodes and no error handling are flagged by `n8n_audit_instance`.

---

## 7. Security

### Use Credential System — Never Hardcode
```json
// ❌ WRONG — credential in parameter
{"apiKey": "sk-abc123..."}

// ✅ CORRECT — use n8n credential system
{"nodeCredentialType": "openAiApi"}
```
Hardcoded secrets are detected by `n8n_audit_instance({customChecks: ["hardcoded_secrets"]})`.

### Authenticate All Public Webhooks
Unauthenticated webhooks accept data from any source. Add:
- Header authentication (`x-webhook-secret`)
- IP allowlist for known senders
- Signature verification for Stripe/GitHub webhooks

### Regular Security Audits
```javascript
n8n_audit_instance()  // Full audit monthly
```
Checks: credentials exposure, unauthenticated webhooks, error handling gaps, data retention, hardcoded secrets.

### NEVER Edit Production Workflows Directly with AI
Always:
1. Make a copy of the workflow
2. Test in development environment
3. Validate changes before deploying
4. Export backup before significant changes

---

## 8. Workflow Lifecycle

### Activation
```javascript
n8n_update_partial_workflow({
  id: "workflow-id",
  operations: [{type: "activateWorkflow"}]
})
```
Do not forget to activate — workflows do not run until activated.

### Post-Deployment Monitoring
```javascript
n8n_executions({action: "list", workflowId: "wf-id"})
```
Monitor first 5 executions. Many runtime errors only appear with real data.

### Version Management
```javascript
n8n_workflow_versions({id: "wf-id"})  // view history
// Rollback available if n8n instance supports versioning
```

### Cleanup
- Remove disconnected nodes before deployment
- Use `cleanStaleConnections` operation after restructuring
- Delete unused workflows — they slow down list queries and create audit noise

---

## 9. MCP Tooling Efficiency

### Batch Operations
```javascript
// ✅ GOOD — all operations in one call
n8n_update_partial_workflow({
  id: "wf-123",
  operations: [
    {type: "updateNode", nodeId: "slack-1", changes: {...}},
    {type: "updateNode", nodeId: "http-1", changes: {...}},
    {type: "cleanStaleConnections"}
  ]
})

// ❌ BAD — separate calls for each operation
```

### Include `intent` Parameter
```javascript
n8n_update_partial_workflow({
  id: "wf-123",
  intent: "Add error handling for API failures",  // improves AI responses
  operations: [...]
})
```

### Use Dry Run for Bulk Data Changes
```javascript
n8n_manage_datatable({
  action: "updateRows",
  dryRun: true  // preview changes before applying
})
```

### Use `n8n_deploy_template` for Quick Starts
Deploy proven templates instead of building from scratch, then customize:
```javascript
n8n_deploy_template({
  templateId: 2947,
  autoFix: true,
  autoUpgradeVersions: true
})
```
