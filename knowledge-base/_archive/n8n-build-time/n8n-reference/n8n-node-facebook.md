# n8n Node: Facebook Graph API

**Category:** Tools
**Node Type:** `n8n-nodes-base.facebookGraphApi`
**Version:** 1
**Source:** n8n GitHub — `packages/nodes-base/nodes/Facebook`
**Updated:** 2026-04-30

## Overview

A direct proxy to the Facebook Graph API. Unlike resource-based nodes, it makes arbitrary Graph API calls — useful for reading ad metrics, posting to pages, managing Instagram content, or any endpoint not covered by dedicated n8n nodes.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Constructs and sends authenticated requests to `graph.facebook.com` (or `graph-video.facebook.com` for video uploads). You specify the Graph API version, the node path (object ID or path like `me/ads`, `act_XXXXX/campaigns`), the HTTP method, and any fields or parameters. The response is returned as raw JSON.

This node covers: Pages, Ads, Ad Accounts, Campaigns, Ad Sets, Ads, Instagram, and any other Graph API object.

## Authentication

**Credential Type:** `facebookGraphApi`
**Auth Method:** Access Token (long-lived page or system user token)

The credential stores the access token which is sent as `access_token` query parameter. Tokens expire unless you use a long-lived token or a System User token from Meta Business Manager (recommended for production).

Token types:
- **Page Access Token**: Required for posting to pages, reading page insights
- **User Access Token**: For reading user data (rarely used in automation)
- **System User Token**: Non-expiring, recommended for agency automation

## Key Parameters (from source)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hostUrl` | options | Yes | `graph.facebook.com` (default) or `graph-video.facebook.com` (video uploads) |
| `httpRequestMethod` | options | Yes | `GET`, `POST`, or `DELETE` |
| `graphApiVersion` | options | No | API version: `v16.0` through `v23.0` or Default. Use an explicit version in production. |
| `node` | string | Yes | The Graph API node path (e.g. `me`, `act_123456789`, `me/ads`, `{page-id}/posts`) |
| `edge` | string | No | Sub-resource edge (e.g. `insights`, `campaigns`, `adsets`) |
| `fields` | collection | No | Specific fields to return (comma-separated or structured) |
| `parameters` | collection | No | Additional query parameters (e.g. `date_preset`, `time_range`, `filtering`) |

## Common Errors & Fixes (from source — NodeApiError patterns)

- **Error 190 (OAuthException)**: Access token expired or invalid. Generate a new long-lived token or use System User token.
- **Error 100 (Invalid parameter)**: Wrong parameter name or value. Check Graph API reference for the exact field names.
- **Error 200 (Permission error)**: Token lacks the required permission scope. Re-generate token with required permissions (e.g. `ads_read`, `pages_read_engagement`, `pages_manage_posts`).
- **Error 4 / 17 (Rate limit)**: API rate limit hit. Graph API allows ~200 calls/hour per user token. Add Wait nodes between batch calls.
- **Versioning mismatch**: Using an older API version may return deprecated fields or miss new ones. Pin to a specific version (e.g. `v22.0`) rather than Default.
- **Video upload host**: Video files must use `graph-video.facebook.com` as host, not the default graph host — separate node call required.

## Typical Workflow Pattern

```
Schedule (daily)
  → Facebook Graph API (GET act_{account_id}/campaigns, fields=name,status,spend)
  → Code (parse campaign array, compute totals)
  → Google Sheets (update ad spend tracker)
```

## Agency Use Cases

- **Ad spend monitoring**: Daily GET of `act_XXXX/campaigns` with `spend` field → compare to budget → alert if overspending
- **Page post publishing**: POST to `{page-id}/feed` with message and link → scheduled content publishing
- **Lead ad form responses**: GET `{form-id}/leads` → push to CRM (HubSpot / Notion)
