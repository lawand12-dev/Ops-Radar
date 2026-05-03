# n8n Common Failures

**Category:** Failures  
**Source:** n8n-skills validation-expert skill + n8n-mcp telemetry + n8n community data  
**Updated:** 2026-04-30

## Overview

Catalogue of n8n workflow failure modes — configuration errors, runtime failures, validation loops, and API integration breakdowns — with root causes, prevention patterns, and fixes.

## Related Notes

[[research-18]] · [[research-12]] · [[n8n-nodes]] · [[n8n-api]] · [[n8n-best-practices]]

---

## Failure Category 1: Expression Errors (Most Common)

### 1a. Missing `{{}}` Braces
**Symptom**: Field shows literal text like `$json.email` instead of the value  
**Root cause**: Expression not wrapped in double curly braces  
**Fix**:
```javascript
❌ $json.email
✅ {{$json.email}}
```

### 1b. Webhook Data Access at Wrong Level (Top Mistake)
**Symptom**: `{{$json.email}}` returns `undefined` after webhook trigger  
**Root cause**: Webhook node wraps all incoming data under `.body`  
**Fix**:
```javascript
❌ {{$json.email}}         // undefined
✅ {{$json.body.email}}    // correct
```
**Affected fields**: POST body, JSON payload, form data — everything under `.body`

### 1c. Node Name Reference Wrong (Case-Sensitive)
**Symptom**: `Cannot read property of undefined` or expression returns blank  
**Root cause**: Node name in `$node["..."]` does not exactly match the node's name  
**Fix**:
```javascript
❌ {{$node["http request"].json}}  // lowercase fails
✅ {{$node["HTTP Request"].json}}  // must match exactly
```

### 1d. n8n Expressions Used Inside Code Nodes
**Symptom**: Code node receives literal string like `"{{$json.field}}"` instead of value  
**Root cause**: Code nodes use JavaScript, not n8n expression syntax  
**Fix**:
```javascript
❌ const email = "{{$json.email}}";   // in Code node
✅ const email = $json.email;          // direct JS access
✅ const email = $input.first().json.email;
```

---

## Failure Category 2: Node Configuration Errors

### 2a. Missing Required Fields (Defaults Trusted — #1 Runtime Failure)
**Symptom**: Workflow activates but errors immediately at runtime  
**Root cause**: Missing operation-specific required fields; relying on invisible defaults  
**Example**:
```json
// FAILS at runtime
{"resource": "message", "operation": "post", "text": "Hello"}

// WORKS — all parameters explicit
{"resource": "message", "operation": "post",
 "select": "channel", "channelId": "C123", "text": "Hello"}
```
**Prevention**: Always use `validate_node({profile: "runtime"})` before deployment; explicitly set ALL parameters.

### 2b. Wrong nodeType Format
**Symptom**: "Node not found" error from n8n-mcp tools  
**Root cause**: Using full prefix with search/validate tools, or short prefix in workflow JSON  
**Fix**:
```javascript
// Search/validate tools
get_node({nodeType: "nodes-base.slack"})          // ✅ short prefix
get_node({nodeType: "n8n-nodes-base.slack"})      // ❌ wrong

// Workflow JSON (n8n_create_workflow)
type: "n8n-nodes-base.slack"                       // ✅ full prefix
type: "nodes-base.slack"                           // ❌ wrong
```

### 2c. sendBody Missing for POST Requests
**Symptom**: HTTP Request node sends empty body on POST  
**Root cause**: `sendBody` property dependency not configured  
**Fix**:
```json
{
  "method": "POST",
  "url": "https://api.example.com",
  "sendBody": true,
  "body": {"contentType": "json", "content": {...}}
}
```

### 2d. IF Node Both Outputs on Same Branch
**Symptom**: IF node logic works backwards or both true/false paths trigger  
**Root cause**: `addConnection` without `branch` parameter  
**Fix**:
```json
{"type": "addConnection", "source": "If", "target": "True Handler",
 "sourcePort": "main", "targetPort": "main", "branch": "true"}
{"type": "addConnection", "source": "If", "target": "False Handler",
 "sourcePort": "main", "targetPort": "main", "branch": "false"}
```

### 2e. Code Node Missing Return or Wrong Format
**Symptom**: Next node receives no data, or workflow errors on Code node output  
**Root cause**: Code node doesn't return `[{json: {...}}]` format  
**Top 5 mistakes** (cover 62%+ of Code node failures):
```javascript
// #1: No return statement
const items = $input.all();
// forgot return!

// #2: Expression syntax in code
const val = "{{$json.field}}";  // evaluates as literal

// #3: Wrong wrapper
return {json: {result: "ok"}};  // missing array

// #4: No null check
const email = item.json.user.email;  // crashes if user is null

// #5: Webhook body at wrong level
const email = $json.email;  // should be $json.body.email
```
**All fixes**: Add return, use JS direct access, wrap in array, add `?.` optional chaining, use `.body`.

---

## Failure Category 3: Validation Errors

### 3a. Validation Loop Stuck
**Symptom**: Validation errors reappear after fixes; same error keeps showing  
**Root cause**: Fixing symptoms not root cause; operation context not updated when switching operations  
**Strategy**:
1. Read error message completely — it contains fix guidance
2. Use `get_node` to understand which fields the current operation requires
3. When switching operations (e.g., post → update), re-check ALL required fields
4. If genuinely stuck: start with minimal valid config and add fields incrementally

**Normal expectation**: 2-3 validation cycles is normal (23s thinking + 58s fixing per cycle)

### 3b. False Positives (Acceptable Warnings)
**Common false positives to safely ignore**:
- "Missing error handling" — acceptable for simple/testing workflows
- "No retry logic" — acceptable for idempotent ops or internal APIs
- "Missing rate limiting" — acceptable for low-volume or server-rate-limited APIs
- "Unbounded query" — acceptable for small known datasets

**Reduce false positives**: Use `profile: "ai-friendly"` instead of `strict` during development.

### 3c. Broken Connections After Node Changes
**Symptom**: `validate_workflow` reports "target node not found"  
**Root cause**: Node renamed or deleted while connections still reference old name  
**Fix**:
```javascript
n8n_update_partial_workflow({
  id: "workflow-id",
  operations: [{type: "cleanStaleConnections"}]
})
```

### 3d. patchNodeField Fails
**Error: "find string not found"** — content changed since you last read it; use `n8n_get_workflow` to inspect current value; use `regex: true` for flexible whitespace matching  
**Error: "ambiguous match"** — find string appears multiple times; use `replaceAll: true` or more specific string  
**Error: "invalid regex"** — nested quantifiers rejected; simplify pattern

---

## Failure Category 4: Runtime & API Failures

### 4a. Authentication Failures (401/403) — 90% of Production Problems
**Most common causes**:
1. Non-production OAuth apps (Google, GitHub): tokens expire every 7-14 days
2. Hardcoded credentials in parameters instead of credential system
3. Missing `Authorization` header format
4. Credential not refreshed after rotation

**Prevention**:
- Use n8n credential system (not parameter fields) for all secrets
- For OAuth: set app to Production status with verified domains + auto-refresh
- Add Error Trigger watching for 401/403 responses → alert to rotate
- Run `n8n_audit_instance({customChecks: ["hardcoded_secrets"]})` periodically

### 4b. Rate Limit Exhaustion
**Symptom**: HTTP 429 errors, intermittent failures on high-volume workflows  
**Prevention pattern**:
```
Split In Batches (100 items)
  → HTTP Request
  → Wait (1-10 seconds between batches)
  → loop
```
Add `retryOnFail: true, maxTries: 3, waitBetweenTries: 1000` on HTTP Request nodes.

### 4c. API Schema Changes Breaking Workflows
**Symptom**: Workflows that worked for months start returning null/undefined fields  
**Root cause**: Third-party API renamed or restructured response fields  
**Prevention**:
```javascript
// Defensive field access in Code nodes
const email = item.json?.user?.email || item.json?.contact?.email || null;

// IF Exists check before use
if (!item.json.user) return [{json: {error: "user field missing", raw: item.json}}];
```

### 4d. Webhook Path Conflicts or Missing UUID
**Symptom**: Webhook not triggering; "path already in use"  
**Fix**: `n8n_autofix_workflow({id: "wf-id", fixTypes: ["webhook-missing-path"], applyFixes: true})`

### 4e. Unauthenticated Webhooks (Security Risk)
**Risk**: Public webhook endpoints accept data from any source  
**Detection**: `n8n_audit_instance({customChecks: ["unauthenticated_webhooks"]})`  
**Fix**: Add header authentication (`x-webhook-secret`) or IP allowlist

---

## Failure Category 5: Workflow Structure Problems

### 5a. Circular Dependencies
**Symptom**: `validate_workflow` reports "Circular dependency detected"  
**Fix**: Restructure; use sub-workflows if loops are intentional

### 5b. Multiple Trigger Nodes
**Symptom**: Only one trigger executes; other triggers ignored  
**Fix**: Split into separate workflows, one trigger each

### 5c. Disconnected Nodes
**Symptom**: `validate_workflow` warns "Node not connected to workflow flow"  
**Fix**: Connect node to chain or remove it

### 5d. Outdated Node Versions (typeVersion mismatch)
**Symptom**: Node behaves unexpectedly; missing newer features or UI elements  
**Fix**:
```javascript
n8n_autofix_workflow({
  id: "wf-id",
  fixTypes: ["typeversion-upgrade"],
  applyFixes: true
})
// Check postUpdateGuidance for breaking changes
```

---

## Failure Prevention Checklist

**Before building**:
- [ ] Check templates first (`search_templates`) — avoid rebuilding solved problems
- [ ] Read `tools_documentation()` for current best practices

**During build**:
- [ ] Never use defaults for node parameters — explicitly set ALL fields
- [ ] Use `validate_node({profile: "runtime"})` after each node
- [ ] Access webhook data via `$json.body.field` not `$json.field`
- [ ] Use `branch: "true"/"false"` on IF connections
- [ ] Wrap Code node return in `[{json: {...}}]`

**Before deployment**:
- [ ] `validate_workflow` on complete structure
- [ ] Test with sample payload
- [ ] Add Error Trigger → alert workflow

**In production**:
- [ ] Run `n8n_audit_instance()` monthly
- [ ] Monitor executions after activation
- [ ] Set `n8n_executions({action: "list"})` to track failure rate
