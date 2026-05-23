# n8n Node: Set

**Category:** Tools
**Node Type:** `n8n-nodes-base.set`
**Version:** 3.4 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Set`
**Updated:** 2026-04-30

## Overview

Adds, edits, or removes fields on each input item. The primary data transformation node in n8n — used to rename fields, build new objects, apply expressions, filter down to only the fields needed, or reshape data before it reaches the next node.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Operates on each item in the input and produces a new version of that item with modified fields. Can add new fields (static values or expressions), update existing fields, remove specific fields, or strip the item down to only the fields you explicitly set.

Unlike the Code node, Set works without writing code — fields are configured in the UI. Use Set for simple mapping and renaming tasks; use Code for complex transformations, loops, or logic.

## Authentication

None — no credentials required.

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | options | Yes | `manual` (UI-defined fields) or `jsonOutput` (raw JSON expression for the whole output) |
| `fields.values` | array | Yes (manual mode) | List of field definitions to set — each has a `name`, `type`, and `value` |
| `includeOtherFields` | boolean | No | If false, **only** the fields you define are in the output (strip mode). If true, all existing fields are passed through plus your additions. Default: `true` |
| `jsonOutput` | string | No (jsonOutput mode) | A JSON expression that defines the entire output object for each item |

### Field Definition Structure (manual mode)

Each entry in `fields.values`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | The output field name (can be dot-notation for nesting: `user.email`) |
| `type` | options | `stringValue`, `numberValue`, `booleanValue`, `arrayValue`, `objectValue`, `dateTime`, `jsonOutput` |
| `value` | any | The value — can be a static literal or an expression like `{{$json.first_name + " " + $json.last_name}}` |

## Common Errors & Fixes

- **Fields disappearing from output**: `includeOtherFields` is false (strip mode). All fields not explicitly set are removed. Enable it or explicitly re-add the fields you need.
- **Expression returns `undefined`**: The referenced field path doesn't exist on the item. Use `{{$json?.fieldName ?? 'default'}}` to provide a fallback.
- **Type mismatch downstream**: Set a field as `stringValue` but the next node expects a number. Use `numberValue` type or cast in the expression: `{{Number($json.amount)}}`.
- **Nested fields not working**: Dot-notation like `user.email` works for writing nested output, but reading from nested input also requires dot-notation in expressions: `{{$json.user?.email}}`.
- **jsonOutput mode escaping**: When using `jsonOutput` mode and building a JSON string manually, remember that the value must be a valid JavaScript expression returning an object, not a JSON literal string.
- **Overwriting all items to the same value**: A static value (no expression) will set every item to the same value. Wrap it in `{{}}` to use per-item expressions.

## Typical Workflow Pattern

```
Webhook (form submission — body has camelCase fields)
  → Set (rename fields for CRM API snake_case requirements)
      → first_name: {{$json.body.firstName}}
      → last_name: {{$json.body.lastName}}
      → email: {{$json.body.emailAddress}}
      → source: "website-form"   ← static value
      → includeOtherFields: false  ← strip all other fields
  → HTTP Request (POST to CRM API with clean payload)
```

## Agency Use Cases

- **Field renaming for API compatibility**: Form data uses camelCase, target API needs snake_case — Set maps one to the other
- **Payload construction**: Build the exact JSON shape an API expects from scattered fields across multiple prior nodes
- **Adding metadata**: Append `created_at`, `source`, `workflow_id` fields to every item before database insert
- **Data stripping for privacy**: Remove PII fields (`ip_address`, `raw_email`) before logging to analytics
- **Computed fields**: Set `full_name: {{$json.first + " " + $json.last}}` or `total_tax: {{$json.subtotal * 0.2}}`
