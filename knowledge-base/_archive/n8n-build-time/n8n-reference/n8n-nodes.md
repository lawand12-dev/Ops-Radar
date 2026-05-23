# n8n Node Reference

**Category:** Tools  
**Source:** n8n-mcp v2.14.2 + n8n-skills  
**Updated:** 2026-04-30

## Overview

Comprehensive reference for n8n automation nodes: types, naming conventions, most-used nodes, AI-capable nodes, and nodeType format rules.

## Related Notes

[[research-19]] · [[research-16]] · [[n8n-api]] · [[n8n-workflow-patterns]]

---

## Node Universe

### Scale
- **1,396 total nodes** — 812 core + 584 community
- **265 AI-capable tool variants** detected with full documentation
- **63.6% operation coverage** for available actions
- **87% documentation coverage** from official n8n docs
- **2,646 pre-extracted configurations** from popular templates
- **2,709 workflow templates** with 100% metadata coverage

### Node Namespaces

Core nodes use **`n8n-nodes-base.`** prefix:
```
n8n-nodes-base.slack
n8n-nodes-base.httpRequest
n8n-nodes-base.webhook
```

LangChain/AI nodes use **`@n8n/n8n-nodes-langchain.`** prefix:
```
@n8n/n8n-nodes-langchain.agent
@n8n/n8n-nodes-langchain.lmChatOpenAi
@n8n/n8n-nodes-langchain.vectorStoreInMemory
```

Community nodes use their package-scoped names.

**CRITICAL**: Search/validate tools use short prefix (`nodes-base.*`), workflow JSON uses full prefix (`n8n-nodes-base.*`).

---

## Top 20 Most-Used Nodes

| Rank | nodeType | Purpose |
|------|----------|---------|
| 1 | `n8n-nodes-base.code` | JavaScript/Python scripting |
| 2 | `n8n-nodes-base.httpRequest` | HTTP API calls |
| 3 | `n8n-nodes-base.webhook` | Event-driven triggers |
| 4 | `n8n-nodes-base.set` | Data transformation/field mapping |
| 5 | `n8n-nodes-base.if` | Conditional routing (2 outputs: true/false) |
| 6 | `n8n-nodes-base.manualTrigger` | Manual workflow execution |
| 7 | `n8n-nodes-base.respondToWebhook` | Webhook response |
| 8 | `n8n-nodes-base.scheduleTrigger` | Cron/time-based triggers |
| 9 | `@n8n/n8n-nodes-langchain.agent` | AI agents with tool calling |
| 10 | `n8n-nodes-base.googleSheets` | Spreadsheet integration |
| 11 | `n8n-nodes-base.merge` | Combine data streams |
| 12 | `n8n-nodes-base.switch` | Multi-branch conditional routing |
| 13 | `n8n-nodes-base.telegram` | Telegram bot |
| 14 | `@n8n/n8n-nodes-langchain.lmChatOpenAi` | OpenAI chat model |
| 15 | `n8n-nodes-base.splitInBatches` | Batch processing |
| 16 | `n8n-nodes-base.openAi` | OpenAI legacy node |
| 17 | `n8n-nodes-base.gmail` | Email automation |
| 18 | `n8n-nodes-base.function` | Custom functions (legacy) |
| 19 | `n8n-nodes-base.stickyNote` | Workflow documentation |
| 20 | `n8n-nodes-base.executeWorkflowTrigger` | Sub-workflow trigger |

---

## Node Configuration Patterns

### Resource/Operation Nodes
Most service nodes (Slack, Google Sheets, Airtable) use resource + operation pattern:
```json
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",
  "text": "Hello!"
}
```
**Key rule**: Required fields depend entirely on `resource` + `operation` combination — fields change when operation changes.

### HTTP-Based Nodes
```json
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none",
  "sendBody": true,
  "body": {
    "contentType": "json",
    "content": {"name": "={{$json.name}}"}
  }
}
```
Dependencies: `sendBody` unlocks `body`; `authentication != "none"` requires credentials.

### Conditional Logic Nodes (IF/Switch)
```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{$json.status}}",
        "operation": "equals",
        "value2": "active"
      }
    ]
  }
}
```
Binary operators (equals, contains): need `value2`. Unary operators (isEmpty, isNotEmpty): need `singleValue: true` (auto-added by sanitization).

**IF node outputs**: Index 0 = TRUE, index 1 = FALSE. Use `branch: "true"` / `branch: "false"` in `addConnection` operations.

### AI Agent Connection Types

8 connection types for AI Agent workflows:

| Type | Purpose |
|------|---------|
| `ai_languageModel` | LLM (OpenAI, Claude, Gemini) |
| `ai_tool` | Tools the agent can call |
| `ai_memory` | Conversation memory |
| `ai_vectorStore` | Vector database |
| `ai_embedding` | Embedding models |
| `ai_document` | Document loaders |
| `ai_textSplitter` | Text splitting |
| `ai_outputParser` | Output parsing |

---

## n8n Expression Syntax in Node Fields

All dynamic values use double curly braces: `{{expression}}`

### Core Variables
```javascript
{{$json.fieldName}}                    // Current node output
{{$json.body.fieldName}}               // Webhook data (CRITICAL: under .body!)
{{$node["HTTP Request"].json.data}}    // Previous node reference
{{$now.toFormat('yyyy-MM-dd')}}        // Current timestamp
{{$env.API_KEY}}                       // Environment variable
```

### Critical Gotchas
- Webhook data is always under `.body` — not at root
- Node names in `$node["..."]` are case-sensitive and must be exact
- Expressions do NOT work inside Code nodes (use JavaScript directly)
- Webhook paths cannot be dynamic — static strings only

---

## Code Node Specifics

### Data Access (JavaScript)
```javascript
const items = $input.all();          // All items — use 95% of the time
const first = $input.first();        // Single item
const item = $input.item;            // Per-item mode only
const fromNode = $node["NodeName"].json;  // Other node output
```

### Return Format (REQUIRED)
```javascript
return [{json: {field: value}}];     // Single result
return items.map(i => ({json: i.json})); // Multiple results
```

### Webhook Data in Code Nodes
```javascript
const email = $json.body.email;      // ✅ Correct
const email = $json.email;           // ❌ Returns undefined
```

### Python Code Node Limitation
Python code nodes have NO external libraries. No `requests`, `pandas`, `numpy`. Use standard library only (`json`, `datetime`, `re`). Use JavaScript for 95% of use cases.

---

## Property Dependencies

Fields show/hide based on parent field values (`displayOptions` mechanism):

| Parent Field | Child Field | Condition |
|-------------|------------|-----------|
| `sendBody` | `body` | `sendBody = true` AND method is POST/PUT/PATCH |
| `resource` | operation-specific fields | varies by resource |
| `operation` | required parameters | varies by operation |
| `authentication` | credential fields | not "none" |

Use `get_node({mode: "search_properties", propertyQuery: "body"})` to discover dependencies when stuck.

---

## Auto-Sanitization (Runs on Every Save)

n8n-mcp automatically fixes operator structure on every workflow save:

- Binary operators (equals, contains, greaterThan…): removes `singleValue`
- Unary operators (isEmpty, isNotEmpty, true, false): adds `singleValue: true`
- IF/Switch v2.2+/v3.2+: adds complete `conditions.options` metadata

Cannot auto-fix: broken connections, branch count mismatches, paradoxical corrupt states.

---

## Node Version Management

Nodes have `typeVersion` fields. Outdated versions can be detected and upgraded via `n8n_autofix_workflow` with `fixTypes: ["typeversion-upgrade"]`. Breaking changes between versions are documented via `get_node({mode: "breaking"})`.
