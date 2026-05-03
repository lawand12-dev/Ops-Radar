# n8n Node: Klaviyo

**Category:** Tools
**Node Type:** `n8n-nodes-base.klaviyo` (community) or via HTTP Request
**Source:** Community node — NOT in n8n-io/n8n main repository
**Updated:** 2026-04-30

## Overview

Klaviyo is an email and SMS marketing platform. There is no official Klaviyo node in the core n8n repository. Integration is achieved via HTTP Request node against the Klaviyo REST API v2024, or via community-built nodes if available.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-node-httprequest]] · [[n8n-workflow-patterns]]

---

## Status

Klaviyo is **not in the n8n-io/n8n main repository** (confirmed by search as of 2026-04-30). It may exist as:
1. A community node (install via npm: search n8n community nodes for `klaviyo`)
2. Manual integration via the HTTP Request node

## Klaviyo API Integration via HTTP Request

### Authentication

**Auth Method:** Bearer token (Klaviyo Private API Key)
**Header**: `Authorization: Klaviyo-API-Key YOUR_PRIVATE_KEY`
**Revision header** (required): `revision: 2024-10-15`

Use HTTP Request node with `predefinedCredentialType: httpHeaderAuth`, or set headers manually.

### Key API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Get profiles | GET | `https://a.klaviyo.com/api/profiles/` |
| Create profile | POST | `https://a.klaviyo.com/api/profiles/` |
| Subscribe to list | POST | `https://a.klaviyo.com/api/lists/{list_id}/relationships/profiles/` |
| Create/update event | POST | `https://a.klaviyo.com/api/events/` |
| Get lists | GET | `https://a.klaviyo.com/api/lists/` |
| Get campaigns | GET | `https://a.klaviyo.com/api/campaigns/` |
| Get metrics | GET | `https://a.klaviyo.com/api/metrics/` |

### Required Headers (every request)

```
Authorization: Klaviyo-API-Key pk_XXXXXXXXXX
revision: 2024-10-15
Content-Type: application/json
Accept: application/json
```

## HTTP Request Node Pattern for Klaviyo

```javascript
// Add to List (Subscribe profile)
{
  "method": "POST",
  "url": "https://a.klaviyo.com/api/lists/{list_id}/relationships/profiles/",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {"name": "Authorization", "value": "Klaviyo-API-Key {{$credentials.apiKey}}"},
      {"name": "revision", "value": "2024-10-15"},
      {"name": "Content-Type", "value": "application/json"}
    ]
  },
  "sendBody": true,
  "body": {
    "contentType": "json",
    "content": {
      "data": [{"type": "profile", "id": "{{$json.profile_id}}"}]
    }
  }
}
```

## Common Errors

- **401 Unauthorized**: Wrong API key format. Must be `Klaviyo-API-Key pk_...` prefix.
- **403 Forbidden**: Private key used where public key required (or vice versa). Events require private key.
- **400 Bad Request / missing revision**: `revision` header is mandatory in Klaviyo API v2024 — omitting it returns 400.
- **404 Not Found**: List ID, campaign ID, or profile ID does not exist.
- **429 Rate Limit**: Klaviyo allows 75 requests/second. Add Wait nodes for bulk profile operations.

## Typical Workflow Pattern

```
Webhook (form submission)
  → HTTP Request (POST to Klaviyo /api/profiles/ to create profile)
  → HTTP Request (POST to Klaviyo /api/lists/{id}/relationships/profiles/ to subscribe)
  → HTTP Request (POST /api/events/ to track "Signed Up" event)
```

## Agency Use Cases

- **Email list building**: Form submission → create Klaviyo profile → add to list → trigger welcome flow
- **E-commerce sync**: Shopify order webhook → track purchase event in Klaviyo → trigger post-purchase sequence
- **Campaign metrics reporting**: Daily GET of campaign metrics → format → Slack/Google Sheets update
