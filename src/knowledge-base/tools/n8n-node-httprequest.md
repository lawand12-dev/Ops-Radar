# n8n Node: HTTP Request

**Category:** Tools
**Node Type:** `n8n-nodes-base.httpRequest`
**Source:** n8n GitHub source
**Updated:** 2026-04-30

## Overview

The HTTP Request node makes outbound HTTP calls to any REST API or URL from within a workflow. It is the second most-used node in n8n (after Code), appearing in 45% of all workflow templates. It supports all HTTP methods, every major authentication scheme, multiple request body formats, pagination, binary file handling, and retry logic.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The HTTP Request node sends an HTTP request to a URL you specify and returns the parsed response as one or more output items. It handles JSON, form-data, URL-encoded, raw text, and binary body types. For paginated APIs, it can automatically loop through pages using cursor-based, offset-based, or next-URL-based pagination. Response data is available in subsequent nodes as `$json` (for JSON APIs) or as binary data (for files/images).

It is the primary escape hatch for any third-party service that does not have a dedicated n8n node — if an API has docs, you can integrate it with HTTP Request.

## Authentication

The node supports many credential types. The `authentication` parameter selects the mechanism; the credential reference selects the stored credential.

| Auth Type | `authentication` Value | Credential Type | Notes |
|-----------|----------------------|-----------------|-------|
| None | `none` | — | No auth headers sent |
| Basic Auth (username/password) | `genericCredentialType` | `httpBasicAuth` | Sends `Authorization: Basic <base64>` |
| Bearer Token | `genericCredentialType` | `httpBearerTokenAuth` | Sends `Authorization: Bearer <token>` |
| Header Auth (custom header) | `genericCredentialType` | `httpHeaderAuth` | Most flexible — any header name + value |
| Query String Auth | `genericCredentialType` | `httpQueryAuth` | Appends `?key=value` to URL |
| Digest Auth | `genericCredentialType` | `httpDigestAuth` | HTTP Digest authentication |
| OAuth1 | `genericCredentialType` | `oAuth1Api` | Legacy OAuth 1.0a (Twitter v1, etc.) |
| OAuth2 | `genericCredentialType` | `oAuth2Api` | Modern OAuth 2.0 with auto token refresh |
| Predefined credential | `predefinedCredentialType` | node-specific type | Use a credential already stored for a specific n8n service node (e.g. `slackApi`, `openAiApi`) |

For most modern REST APIs, use `httpHeaderAuth` with `name=Authorization` and `value=Bearer YOUR_TOKEN` stored as a credential.

**Predefined credential usage**: When you want to call a service that n8n already has a node for (e.g. Airtable, OpenAI) but need more control than the dedicated node offers, set `authentication=predefinedCredentialType` and `nodeCredentialType=airtableTokenApi` — it reuses the existing credential seamlessly.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | options | Yes | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. Default `GET`. |
| `url` | string | Yes | Full URL including protocol. Supports expressions: `{{$json.endpoint}}`. |
| `authentication` | options | No | Auth mechanism. Default `none`. See Authentication section above. |
| `sendQuery` | boolean | No | Set `true` to add query parameters. |
| `queryParameters.parameters` | array | No | Array of `{name, value}` pairs appended to URL as `?key=val&...` |
| `sendHeaders` | boolean | No | Set `true` to add custom request headers. |
| `headerParameters.parameters` | array | No | Array of `{name, value}` header pairs. |
| `sendBody` | boolean | No | Set `true` to send a request body. Required for POST/PUT/PATCH with data. |
| `body.contentType` | options | No | Body format when `sendBody=true`: `json`, `form-urlencoded`, `multipart-form-data`, `raw`, `binaryData`. |
| `body.body` | object/string | No | The body content. For `json`: object. For `raw`: string. |
| `options.response.fullResponse` | boolean | No | Set `true` to include status code, headers, and body in response instead of just the body. |
| `options.response.neverError` | boolean | No | Set `true` to suppress HTTP error exceptions (4xx/5xx) and return them as output instead of throwing. |
| `options.redirect.redirect` | options | No | Follow redirects: `follow` (default), `error` (throw on redirect), `manual` (return redirect). |
| `options.timeout` | number | No | Request timeout in milliseconds. Default: no timeout. |
| `options.proxy` | string | No | HTTP proxy URL. |
| `options.batching.batch` | options | No | Batch mode for processing multiple items. |
| `options.pagination` | object | No | Automatic pagination config. See Pagination section. |
| `retryOnFail` | boolean | No | Retry on failure. Set via node-level setting. |
| `maxTries` | number | No | Number of retry attempts when `retryOnFail=true`. Default 3. |
| `waitBetweenTries` | number | No | Milliseconds to wait between retries. Default 1000. |

---

## Request Body Formats

When `sendBody=true`, the `body.contentType` controls how the body is sent:

**`json`** (most common — for REST APIs):
```json
{
  "sendBody": true,
  "body": {
    "contentType": "json",
    "body": {
      "email": "={{$json.body.email}}",
      "name": "={{$json.body.name}}"
    }
  }
}
```
Sets `Content-Type: application/json` and serialises the object.

**`form-urlencoded`** (for legacy form POST endpoints):
```json
{
  "sendBody": true,
  "body": {
    "contentType": "form-urlencoded",
    "body": {
      "parameters": [
        {"name": "grant_type", "value": "client_credentials"},
        {"name": "client_id", "value": "={{$env.CLIENT_ID}}"}
      ]
    }
  }
}
```

**`multipart-form-data`** (for file uploads):
```json
{
  "sendBody": true,
  "body": {
    "contentType": "multipart-form-data",
    "body": {
      "parameters": [
        {"name": "file", "value": "={{$binary.data}}", "parameterType": "formBinaryData"}
      ]
    }
  }
}
```

**`raw`** (for XML, plain text, or custom formats):
```json
{
  "sendBody": true,
  "body": {
    "contentType": "raw",
    "rawContentType": "application/xml",
    "body": "<request><id>123</id></request>"
  }
}
```

**`binaryData`** (to send a file as the entire body):
```json
{
  "sendBody": true,
  "body": {
    "contentType": "binaryData",
    "inputDataFieldName": "data"
  }
}
```

---

## Pagination Support

For APIs that paginate results, set `options.pagination` to automatically loop and concatenate pages:

**Cursor-based pagination** (e.g. Stripe, GitHub):
```json
{
  "options": {
    "pagination": {
      "paginate": true,
      "paginationMode": "updateAParameterInEachRequest",
      "nextPageUrl": "={{$response.body.next_cursor}}",
      "stopCondition": "={{$response.body.has_more === false}}"
    }
  }
}
```

**Offset-based pagination**:
```json
{
  "options": {
    "pagination": {
      "paginate": true,
      "paginationMode": "updateAParameterInEachRequest",
      "parameters": [
        {"name": "offset", "value": "={{$pageCount * 100}}"},
        {"name": "limit", "value": "100"}
      ],
      "stopCondition": "={{$response.body.data.length === 0}}"
    }
  }
}
```

**URL from response** (next URL in response body):
```json
{
  "options": {
    "pagination": {
      "paginate": true,
      "paginationMode": "responseContainsNextURL",
      "nextURL": "={{$response.body.next}}"
    }
  }
}
```

---

## Response Handling

**Default**: The response body is parsed as JSON and becomes `$json` in the next node. Array responses are split into individual items (one item per array element).

**Full response** (to access status code and headers):
Set `options.response.fullResponse=true`. Response becomes:
```json
{
  "statusCode": 200,
  "headers": {"content-type": "application/json"},
  "body": { "id": 1, "name": "..." }
}
```
Access with `{{$json.statusCode}}`, `{{$json.body.id}}`.

**Error handling** (`options.response.neverError=true`):
Without this, any 4xx/5xx response throws an exception and stops the workflow. With `neverError=true`, errors are returned as regular output items and you can route them through an IF node based on `{{$json.statusCode}}`.

**Binary responses** (files, images):
Set `options.response.responseFormat=file` to receive binary data rather than trying to parse as JSON. The binary data appears as a binary item accessible via `$binary.data`.

---

## Common Errors & Fixes

- **`sendBody` missing on POST**: The node sends an empty body. Solution: explicitly set `sendBody=true` AND configure `body.contentType` and `body.body`. Do not rely on defaults.
- **401 Unauthorized**: Wrong auth credentials, expired OAuth token, or token sent in wrong header. For Bearer tokens, the header must be `Authorization: Bearer TOKEN` not just `TOKEN`.
- **403 Forbidden**: Correct credentials but insufficient permissions. Check API scopes or key permissions in the third-party dashboard.
- **404 Not Found**: URL is wrong or the resource does not exist. Use `options.response.fullResponse=true` to see the response body that often contains the API's error message.
- **CORS error**: CORS is a browser-side restriction; the HTTP Request node runs server-side and is never affected by CORS. If you see CORS errors, the request is being made from the browser, not n8n.
- **SSL certificate error**: For internal services with self-signed certs, set `options.sslCertificates=false` to skip verification (development only — never in production).
- **Response is a string, not an object**: The API returned `Content-Type: text/plain` or `application/xml`. Use `options.response.responseFormat=text` or handle parsing in a downstream Code node.
- **Array response not split into items**: n8n splits top-level JSON arrays into items automatically. If the array is nested (e.g. `{data: [...], meta: {...}}`), n8n returns one item. Use a Code node to split: `return $json.data.map(d => ({json: d}))`.
- **Rate limit 429**: Add `retryOnFail=true, maxTries=3, waitBetweenTries=5000`. For bulk calls, add a Split in Batches node upstream with a Wait node between batches.
- **Request timeout**: Set `options.timeout` explicitly. Default has no timeout — long-running APIs can stall the workflow.

---

## Typical Workflow Pattern

**Simple GET + transform:**
```
Manual Trigger
  → HTTP Request (GET https://api.example.com/contacts)
  → Code (filter + reshape items)
  → Google Sheets (append rows)
```

**Authenticated POST with error handling:**
```
Webhook (new order event)
  → HTTP Request (POST https://api.crm.com/contacts, headerAuth)
      options.response.neverError=true
  → IF ($json.statusCode === 201)
    → [True]  Set (extract: contactId=$json.body.id)
    → [False] Slack (alert: "CRM create failed: {{$json.body.message}}")
```

**Paginated API fetch:**
```
Schedule Trigger (daily)
  → HTTP Request (GET /invoices, pagination enabled, cursor-based)
  → Split In Batches (50 at a time)
  → Postgres (upsert records)
```

---

## Important Gotchas

1. **`sendBody` dependency chain**: Setting `sendBody=true` alone is not enough — you must also set `body.contentType` (e.g. `json`) AND provide `body.body`. Missing any of these sends an empty or malformed body.
2. **Field access in expressions**: When using `options.response.fullResponse=true`, the actual response data moves to `$json.body.field` not `$json.field`. Many developers forget to update downstream expressions after enabling full response.
3. **OAuth token refresh**: OAuth2 tokens auto-refresh only if the n8n OAuth app is in "Production" status with verified redirect domains. Development-status OAuth apps from Google/GitHub expire tokens every 7-14 days.
4. **Predefined credentials**: When using `authentication=predefinedCredentialType`, you must set both `authentication` and `nodeCredentialType` — setting only one silently fails.
5. **JSON body vs string**: The `body.body` field for `contentType=json` expects a JavaScript object, not a JSON string. Passing a string causes the API to receive a double-encoded string payload.
6. **Pagination stop condition**: Without a stop condition on pagination, n8n will loop indefinitely if the API never returns an empty page. Always set `stopCondition`.
7. **Binary files**: To send a file upload that was received by a Webhook or Read Binary node, use `contentType=multipart-form-data` with `parameterType=formBinaryData` and reference the binary field name. Using `json` type will not send the binary correctly.
8. **Dot-notation in query param names**: Some APIs use query params like `filter[status]` — these must be passed as literal strings in the `name` field, not as nested objects.
