# TikTok Marketing API

**Category:** Tools  
**Source:** TikTok for Business Marketing API documentation, TikTok Business Center documentation, TikTok Events API documentation  
**Updated:** 2026-04-30

## Overview
The TikTok Marketing API provides programmatic access to TikTok Ads Manager for campaign management, reporting, audience management, and server-side conversion tracking. Access is tiered (Basic vs Standard) based on spend thresholds and business verification, with rate limits scaling accordingly. The API uses advertiser-scoped authentication, meaning each advertiser account requires separate authorization.

## Related Notes
[[api-linkedin-marketing]], [[n8n-node-httprequest]], [[n8n-credential-management]], [[api-google-workspace]]

---

## Developer Access Tiers

### Basic Access vs Standard Access

| Feature | Basic Access | Standard Access |
|---|---|---|
| Eligibility | Any developer after app approval | Higher ad spend, business verification |
| QPS (queries per second) | 10 QPS per app | 20 QPS per app |
| Daily API calls | Lower limits | Higher limits |
| Reporting API | Limited date ranges | Extended date range |
| Audience management | Basic | Full (custom audiences, lookalikes) |
| Creative API | Limited | Full video upload support |
| Events API | Available | Available |

### App Approval Process
1. Register at ads.tiktok.com/marketing_api/apps
2. Create an app with business use case description
3. Submit for review — TikTok reviews within 3-5 business days
4. Upon approval, receive `App ID` and `App Secret`
5. **Sandbox environment** available during development: `sandbox-ads.tiktok.com`

---

## Authentication: OAuth 2.0

TikTok Marketing API uses a custom OAuth 2.0 flow with advertiser-level scoping.

### Authorization Flow
```
1. Redirect advertiser to:
GET https://ads.tiktok.com/marketing_api/auth
  ?app_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &state={CSRF_TOKEN}

2. Exchange auth_code for access_token:
POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
{
  "app_id": "YOUR_APP_ID",
  "secret": "YOUR_APP_SECRET",
  "auth_code": "CODE_FROM_REDIRECT"
}

3. Response:
{
  "code": 0,
  "data": {
    "access_token": "...",
    "advertiser_ids": ["123456789"],
    "expires_in": 86400
  }
}
```

### Token Management

| Field | Value |
|---|---|
| Access token lifetime | 24 hours (daily refresh required) |
| Refresh token lifetime | 365 days |
| Scope | Per advertiser account |

**Critical**: TikTok access tokens expire every 24 hours. Build token refresh into your workflow — use the refresh token to get new access tokens automatically.

```
POST https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/
{
  "app_id": "YOUR_APP_ID",
  "secret": "YOUR_APP_SECRET",
  "refresh_token": "YOUR_REFRESH_TOKEN"
}
```

---

## App ID vs Advertiser ID Scoping

| Identifier | Scope | Use |
|---|---|---|
| `app_id` | Your developer application | Authentication, rate limit bucketing |
| `advertiser_id` | Client's TikTok ad account | All campaign/reporting API calls |
| `bc_id` | Business Center ID | Multi-advertiser management |

All campaign API calls require `advertiser_id` as a parameter. When managing multiple clients, each client's `advertiser_id` must be listed on your app's authorized accounts.

---

## Campaign Management API

### Resource Hierarchy
```
Advertiser Account (advertiser_id)
  └── Campaign (campaign_id)
        └── Ad Group / AdGroup (adgroup_id)
              └── Ad (ad_id)
```

### Core Endpoints

```
# Base URL: https://business-api.tiktok.com/open_api/v1.3/

# Campaigns
GET  /campaign/get/              # List campaigns
POST /campaign/create/           # Create campaign
POST /campaign/update/           # Update campaign
POST /campaign/status/update/    # Enable/disable/delete

# Ad Groups (targeting, budget, schedule)
GET  /adgroup/get/
POST /adgroup/create/
POST /adgroup/update/

# Ads (creative assignment)
GET  /ad/get/
POST /ad/create/
POST /ad/update/
```

### Request/Response Pattern
All TikTok API calls use JSON body (even GET-equivalent list operations use POST in some cases), with `Access-Token` in the header:

```http
GET https://business-api.tiktok.com/open_api/v1.3/campaign/get/
  ?advertiser_id=123456789&page=1&page_size=100
Access-Token: YOUR_ACCESS_TOKEN
```

---

## Reporting API

### Synchronous vs Asynchronous Reports

For small datasets (<10,000 rows), use the synchronous endpoint:
```
POST /report/integrated/get/
{
  "advertiser_id": "123456789",
  "report_type": "BASIC",
  "dimensions": ["campaign_id", "stat_time_day"],
  "metrics": ["spend", "impressions", "clicks", "conversions"],
  "start_date": "2026-04-01",
  "end_date": "2026-04-30"
}
```

For large datasets (high-volume, long date ranges), use **async report generation**:
```
# 1. Create async task
POST /report/task/create/
→ Returns task_id

# 2. Poll for completion
GET /report/task/check/?task_id={TASK_ID}&advertiser_id={ID}
→ Returns status: PROCESSING | COMPLETED | FAILED

# 3. Download when complete
GET /report/task/download/?task_id={TASK_ID}&advertiser_id={ID}
→ Returns download URL (expires in 24 hours)
```

---

## Events API (Server-Side Conversion Tracking)

The Events API sends conversion events server-to-server, as an alternative to the TikTok Pixel (browser-side SDK).

```
POST https://business-api.tiktok.com/open_api/v1.3/event/track/
Access-Token: YOUR_ACCESS_TOKEN

{
  "pixel_code": "YOUR_PIXEL_CODE",
  "event": "Purchase",
  "timestamp": "2026-04-30T12:00:00+00:00",
  "context": {
    "user": {
      "email": "hashed_sha256_email",
      "phone_number": "hashed_sha256_phone"
    },
    "page": {
      "url": "https://example.com/thank-you"
    }
  },
  "properties": {
    "currency": "USD",
    "value": "99.99",
    "order_id": "ORDER-12345"
  }
}
```

**Event deduplication**: Include `event_id` to prevent double-counting when both pixel and Events API fire for the same conversion.

---

## Audience Management API

```
# Create custom audience from customer file
POST /dmp/custom_audience/file/create/
{
  "advertiser_id": "123456789",
  "calculate_type": "REACH",
  "file_paths": ["file_path_from_upload"],
  "type": "CUSTOMER_FILE",
  "retain_days": 180
}

# Create lookalike audience
POST /dmp/lookalike/create/
{
  "advertiser_id": "123456789",
  "source_audience_id": "SOURCE_AUDIENCE_ID",
  "lookalike_spec": {
    "type": "BALANCED",
    "locations": [{"id": "US", "level": "COUNTRY"}]
  }
}
```

---

## Creative API: Video Upload

```
# Step 1: Upload video file (up to 500MB, .mp4/.mov)
POST /file/video/ad/upload/
  multipart/form-data with video_file

# Response includes video_id for use in ad creation
# Video processing can take 1-5 minutes

# Step 2: Create ad with video_id
POST /ad/create/
{
  "adgroup_id": "...",
  "creatives": [{
    "video_id": "UPLOADED_VIDEO_ID",
    "ad_text": "Ad copy here",
    "call_to_action": "LEARN_MORE"
  }]
}
```

---

## Rate Limits

| Tier | QPS | Daily Limit |
|---|---|---|
| Basic | 10 QPS per app | Varies by endpoint (typically 1,000-10,000/day) |
| Standard | 20 QPS per app | Higher, negotiated |

Rate limits are per-application (app_id), shared across all advertiser accounts. Headers returned:
```
X-Ratelimit-Remaining: 95
X-Ratelimit-Reset: 1714521601
```

---

## Sandbox Environment

TikTok provides a sandbox for testing without real spend:
- Base URL: `https://sandbox-ads.tiktok.com/open_api/v1.3/`
- Separate app credentials required for sandbox
- Creates fake campaigns/reports; no real money moves
- Useful for testing campaign CRUD and auth flows

---

## Common Errors

| Code | Error | Cause | Fix |
|---|---|---|---|
| 40001 | `INVALID_PARAMETERS` / invalid token | Access token expired or invalid | Refresh token; re-authorize |
| 40002 | `NO_PERMISSION` | App not authorized for advertiser or endpoint | Check advertiser authorization; verify app tier |
| 40100 | `INVALID_APP_ID` | Wrong app_id | Verify app credentials |
| 40200 | `ADVERTISER_NOT_FOUND` | advertiser_id not linked to app | Re-authorize advertiser on app |
| 50000 | `INTERNAL_ERROR` / server error | TikTok-side error | Retry with exponential backoff |
| 40800 | `RATE_LIMIT_EXCEEDED` | QPS limit hit | Implement per-second rate limiting with queuing |

---

## Breaking Changes 2024–2025

- **API version migration to v1.3** (2024): All new development requires v1.3 endpoints. v1.2 deprecated with timeline for shutdown.
- **Access token lifetime change**: In 2024, access tokens were shortened to 24-hour lifetime (previously longer). Refresh token flows became mandatory.
- **Pixel + Events API deduplication enforcement**: TikTok began stricter deduplication — `event_id` is now strongly recommended to prevent double-counting.
- **Creative API breaking changes**: `image_mode` field deprecated; creative type now determined by asset type provided.
- **Report API async requirement**: For date ranges exceeding 30 days, sync reports now return errors — async task API is required.
- **Business Center API (bc_id)**: Multi-client management now encouraged through Business Center API rather than direct advertiser token management.
