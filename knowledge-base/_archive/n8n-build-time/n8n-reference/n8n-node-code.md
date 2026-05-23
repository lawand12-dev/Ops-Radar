# n8n Node: Code

**Category:** Tools
**Node Type:** `n8n-nodes-base.code`
**Source:** n8n GitHub source
**Updated:** 2026-04-30

## Overview

The Code node executes JavaScript or Python code within a workflow, providing full programmatic control over data transformation, aggregation, business logic, and anything a standard node cannot handle. It is the most-used node in n8n, appearing in 42% of all workflow templates.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Code node runs a script you write against the workflow's current items and must return an array of items in `[{json: {...}}]` format. It runs in a sandboxed Node.js (v18+) environment for JavaScript or a restricted CPython environment for Python. It has access to all input items from connected nodes, can read other nodes' outputs by name, and has access to environment variables. It does not have network access (use HTTP Request node instead), filesystem access, or the ability to import external npm packages — only built-in Node.js modules and a small set of n8n-provided globals are available.

The Code node is the right choice when: multi-step transformation logic is needed, data aggregation or reduction is required, conditional logic is too complex for the IF/Switch nodes, or you need to generate data that does not come from an upstream node.

## Authentication

**Authentication:** None — no credentials required.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `language` | options | Yes | Programming language: `javaScript` or `python`. Default `javaScript`. Use JavaScript for 95%+ of cases — Python has severe library restrictions. |
| `mode` | options | Yes | Execution mode: `runOnceForAllItems` (default, recommended) or `runOnceForEachItem`. Controls how input is presented to the script. |
| `jsCode` | string | Yes (JS) | The JavaScript code to execute. Must return `[{json: {...}}]`. |
| `pythonCode` | string | Yes (Python) | The Python code to execute. Must return a list of dicts with `json` key. |

---

## Execution Modes

### `runOnceForAllItems` (default — use 95% of the time)

The script runs once. All input items are available via `$input.all()` as an array. You process them in bulk and return the result array.

```javascript
// The script receives all items at once
const items = $input.all();  // Array of all items

// Transform and return
return items.map(item => ({
  json: {
    email: item.json.email,
    processed: true
  }
}));
```

Best for: aggregation, deduplication, sorting, filtering, joining data streams, generating derived data, anything that needs to see all items at once.

### `runOnceForEachItem`

The script runs once per item. The current item is accessed via `$input.item` or `$json`. Return a single item (or array to fan-out).

```javascript
// The script runs once for each item — $input.item is the current item
const name = $input.item.json.firstName + ' ' + $input.item.json.lastName;
return [{json: {fullName: name, ...($input.item.json)}}];
```

Best for: simple per-item field transformations where the logic is too complex for the Set node. Avoid for anything that needs to compare or combine items.

---

## Code Node: Data Access Patterns

### JavaScript — Core Access Methods

```javascript
// Get all input items (RECOMMENDED — use this 95% of the time)
const items = $input.all();

// Get first item only
const first = $input.first();

// Get item in runOnceForEachItem mode
const item = $input.item;

// Access another node's output by name (case-sensitive!)
const prevData = $node["HTTP Request"].json;
const allPrevItems = $node["HTTP Request"].all();

// Access environment variables
const apiKey = $env.MY_API_KEY;

// Access workflow metadata
const workflowId = $workflow.id;
const workflowName = $workflow.name;
```

### Webhook Data — The Critical `.body` Pattern

```javascript
// WEBHOOK DATA IS ALWAYS UNDER .body — NOT AT ROOT
const items = $input.all();

// Correct: access POST body fields via .body
const email = items[0].json.body.email;
const name = items[0].json.body.name;

// Wrong: accessing at root returns undefined
const email = items[0].json.email;        // undefined
const name = items[0].json.name;          // undefined

// Correct: query parameters are under .query
const page = items[0].json.query.page;

// Correct: request headers are under .headers
const token = items[0].json.headers["x-api-key"];
```

### Return Format — Non-Negotiable

Every execution path must return an array of objects with a `json` key:

```javascript
// Single item return
return [{json: {result: "processed", count: 42}}];

// Multiple items return (most common)
return items.map(item => ({json: item.json}));

// Map with transformation
return items.map(item => ({
  json: {
    id: item.json.id,
    email: item.json.body?.email || item.json.email,  // handle both webhook and direct
    processedAt: new Date().toISOString()
  }
}));

// Return empty (valid — downstream nodes receive no items)
return [];

// WRONG — missing array wrapper
return {json: {result: "ok"}};   // throws error

// WRONG — missing json key
return [{result: "ok"}];          // downstream $json is undefined
```

### Binary Data in Returns

```javascript
// Return both JSON and binary data
return [{
  json: {filename: "report.pdf"},
  binary: {
    data: {
      data: base64String,
      mimeType: "application/pdf",
      fileName: "report.pdf"
    }
  }
}];
```

---

## JavaScript Built-ins Available

The Code node runs in a sandboxed Node.js environment. Available:

- All standard JavaScript built-ins: `Array`, `Object`, `JSON`, `Math`, `Date`, `RegExp`, `Promise`, `Map`, `Set`, `URL`, `Buffer`, `console`
- `$input`, `$node`, `$workflow`, `$env`, `$execution`, `$now`, `$today`, `$jmespath`
- **Not available**: `require()`, `import`, `fetch()`, `http`, `fs`, `process` (blocked for security)
- **Not available**: npm packages — no lodash, axios, moment, etc.

For HTTP calls, use the HTTP Request node instead of `fetch()` in Code nodes.

---

## Python Mode

**Use Python only when**: you need Python-specific string processing (`re`), datetime parsing, or math operations unavailable in JS. For 95%+ of cases, JavaScript is faster to write and has fewer surprises.

**Python restrictions — critical**:
- No external libraries. `import requests` fails. `import pandas` fails. `import numpy` fails.
- No `pip install`. No `subprocess`. No filesystem access.
- Only standard library modules: `json`, `datetime`, `re`, `math`, `collections`, `itertools`, `functools`, `urllib.parse`

**Python data access**:
```python
# Get all items
items = _input.all()

# Get first item
first = _input.first()

# Access item data
email = items[0].json["body"]["email"]

# Webhook data still under .body
name = items[0].json.get("body", {}).get("name", "")

# Return format
return [{"json": {"result": "ok", "count": len(items)}}]
```

**Python note**: Variables use `_input`, `_node`, `_env` (underscore prefix) rather than `$` prefix.

---

## Common Patterns

### Aggregation (sum, count, group by)

```javascript
const items = $input.all();

// Count and sum
const total = items.reduce((sum, i) => sum + (i.json.amount || 0), 0);
const count = items.length;

// Group by field
const grouped = items.reduce((acc, i) => {
  const key = i.json.status;
  if (!acc[key]) acc[key] = [];
  acc[key].push(i.json);
  return acc;
}, {});

return [{json: {total, count, grouped}}];
```

### Filter + Deduplicate

```javascript
const items = $input.all();

// Filter
const active = items.filter(i => i.json.status === 'active');

// Deduplicate by email
const seen = new Set();
const unique = items.filter(i => {
  if (seen.has(i.json.email)) return false;
  seen.add(i.json.email);
  return true;
});

return unique.map(i => ({json: i.json}));
```

### Null-Safe Field Access

```javascript
const items = $input.all();

return items.map(item => {
  // Optional chaining prevents crashes on missing fields
  const email = item.json?.user?.email || item.json?.contact?.email || null;
  const amount = Number(item.json?.payment?.amount) || 0;

  return {
    json: {
      email,
      amount,
      valid: !!email && amount > 0
    }
  };
});
```

### Validate Input + Early Return

```javascript
const items = $input.all();

// Guard clause — return empty if no data
if (!items || items.length === 0) {
  return [];
}

// Validate required fields
const invalid = items.filter(i => !i.json.email || !i.json.name);
if (invalid.length > 0) {
  return [{json: {error: `${invalid.length} items missing required fields`, success: false}}];
}

return items.map(i => ({json: {...i.json, validated: true}}));
```

### Date Formatting

```javascript
const items = $input.all();

return items.map(item => ({
  json: {
    ...item.json,
    // ISO string
    createdAt: new Date(item.json.timestamp).toISOString(),
    // Formatted
    displayDate: new Date(item.json.timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }
}));
```

---

## Common Errors & Fixes

- **No return statement**: Code executes but downstream nodes receive no data. Every code path must `return` an array. Add `return [];` as a fallback at minimum.
- **`return {json: {...}}` missing array**: Returns a plain object instead of `[{json: {...}}]`. Wrap in `[...]`. This is the #3 most common Code node failure.
- **`$json.email` is undefined after webhook**: Webhook body is under `.body`. Use `$json.body.email` or in code node: `item.json.body.email`.
- **`{{$json.field}}` in code node evaluates as literal string**: Code nodes use JavaScript directly — no n8n expression syntax. Use `$json.field` or `$input.first().json.field` without `{{}}`.
- **Cannot read property of null/undefined**: Missing optional chaining. Use `item.json?.user?.email` instead of `item.json.user.email`.
- **`require('axios')` fails**: External npm packages are blocked. Use the HTTP Request node for API calls.
- **`$node["Node Name"]` case error**: Node name references are case-sensitive and must match exactly. `$node["http request"]` fails if the node is named `HTTP Request`.
- **Python `import requests` fails**: External libraries are not available in Python mode. Use HTTP Request node upstream and access data via `_input.all()`.
- **Items not split properly**: If you return a nested array (e.g. `return [[{json: ...}]]`), n8n receives the outer array as a single item. Always return a flat `[{json: ...}]` array.
- **Async/await not working**: Code node does not support `async`/`await` or Promises. All operations must be synchronous. For async operations (API calls, DB queries), chain HTTP Request or database nodes upstream.

---

## Typical Workflow Pattern

```
Webhook (POST /leads)
  → HTTP Request (GET CRM data for enrichment)
  → Code (merge + transform)
  → IF (lead score > 50)
    → [True]  Postgres (INSERT hot lead)
              → Slack (alert sales team)
    → [False] Postgres (INSERT cold lead)
```

Code node in the above:
```javascript
const webhookItems = $input.all();
const crmData = $node["HTTP Request"].json;  // enrichment data

return webhookItems.map(item => {
  const lead = item.json.body;  // webhook body
  const enrichment = crmData?.contacts?.find(c => c.email === lead.email) || {};

  return {
    json: {
      email: lead.email,
      name: lead.name,
      company: enrichment.company || lead.company || 'Unknown',
      score: (enrichment.score || 0) + (lead.budget > 10000 ? 30 : 0),
      source: 'webhook',
      createdAt: new Date().toISOString()
    }
  };
});
```

---

## Important Gotchas

1. **No network calls inside Code**: `fetch()`, `XMLHttpRequest`, `require('http')` are all blocked. Chain an HTTP Request node before/after the Code node instead.
2. **No persistent state**: Variables declared in the Code node are gone after execution. For state across executions, write to a database node or n8n data table.
3. **Mode affects `$input` API**: In `runOnceForAllItems`, `$input.item` is undefined — use `$input.all()`. In `runOnceForEachItem`, `$input.all()` returns only the current item in an array. Do not mix these up.
4. **`$node["Name"]` requires the node to have run**: If the referenced node is on a different branch (not in the current execution path), `$node["Name"]` throws an error. Only reference nodes that are upstream in the same execution path.
5. **Empty return stops the chain**: `return []` is valid and tells downstream nodes there is no data — they will not execute. This can be intentional (skip processing) or a bug (forgot to return data). Add logging for empty returns in production workflows.
6. **Code node is not for HTTP or DB**: If you find yourself trying to implement HTTP requests or database queries in the Code node, stop and use the dedicated HTTP Request or database nodes. The Code node is for logic and transformation, not I/O.
7. **Python mode is significantly slower**: JavaScript Code nodes start in ~5ms. Python Code nodes spin up a Python interpreter, adding 200-500ms. Use JavaScript unless Python's specific capabilities are essential.
8. **Error messages are bare**: When a Code node throws an uncaught error, n8n shows the raw JS error. Add try/catch in production Code nodes and return structured error items: `return [{json: {error: e.message, stack: e.stack}}]`.
