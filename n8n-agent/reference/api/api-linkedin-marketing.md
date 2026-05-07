# LinkedIn Marketing API

**Category:** Tools  
**Source:** LinkedIn Marketing Developer Platform documentation, LinkedIn Developer Portal, LinkedIn API versioning documentation  
**Updated:** 2026-04-30

## Overview
The LinkedIn Marketing API provides programmatic access to Campaign Manager advertising, organic content publishing, Lead Gen Forms, and the Conversions API. Access requires joining the LinkedIn Marketing Developer Program, with tiered access levels determining available endpoints and rate limits. The API shifted to versioned monthly endpoints in 2022 (format: `v202X`), replacing the unversioned legacy API.

## Related Notes
[[api-google-workspace]], [[api-tiktok-marketing]], [[n8n-node-httprequest]], [[n8n-credential-management]]

---

## Partner Program Tiers

### Standard Access vs Marketing API Partner

| Feature | Standard Access | Marketing API Partner |
|---|---|---|
| Application | Self-service via Developer Portal | Apply via LinkedIn partner program |
| Rate limits | 100 calls/day (some endpoints) | Higher limits, negotiated |
| Available endpoints | Core campaign management, insights | Full suite including advanced targeting, LGF |
| Support | Community/docs | Dedicated technical support |
| Verification required | Yes (app review) | Yes + LinkedIn business review |

**To get Marketing API access**: Create a LinkedIn App → Request Marketing Developer Platform access → Pass LinkedIn's app review (requires a live product demonstrating use case).

---

## Authentication: OAuth 2.0 Three-Legged Flow

LinkedIn uses standard OAuth 2.0 authorization code flow. There is no service account equivalent — all access is user-delegated via member tokens or organization page tokens.

### Flow
```
1. Redirect user to:
GET https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope={SCOPES}
  &state={CSRF_TOKEN}

2. Exchange code for tokens:
POST https://www.linkedin.com/oauth/v2/accessToken
  client_id, client_secret, code, redirect_uri, grant_type=authorization_code

3. Response:
{
  "access_token": "...",        // 60-day lifetime
  "expires_in": 5183944,
  "refresh_token": "...",       // 365-day lifetime (if r_liteprofile requested)
  "refresh_token_expires_in": 31536000
}
```

### Token Types

| Token | Use Case | Lifetime |
|---|---|---|
| Member (user) token | Accessing user's own pages, posting as member | 60 days |
| Organization access token | Posting as company page, managing org campaigns | 60 days |
| Client credentials (2-legged) | Limited: only for app-level data, no user data | 30 days |

**Token refresh**: LinkedIn supports refresh tokens but they must be re-requested when expired. Automate token refresh before the 60-day expiry.

---

## Key OAuth Scopes

| Scope | Purpose |
|---|---|
| `r_ads` | Read ad accounts, campaigns |
| `rw_ads` | Read/write campaigns, creatives, targeting |
| `r_ads_reporting` | Access campaign analytics/reporting |
| `r_organization_social` | Read company page posts |
| `w_organization_social` | Post as company page |
| `r_liteprofile` | Read member profile (enables refresh tokens) |
| `r_emailaddress` | Read member email |

---

## Versioned API Endpoints (v202X Format)

LinkedIn switched to monthly API versions in late 2022. Every API call must include a version header:

```http
GET https://api.linkedin.com/rest/adCampaigns
LinkedIn-Version: 202504
X-Restli-Protocol-Version: 2.0.0
Authorization: Bearer {access_token}
```

**Version lifecycle**: Each monthly version is supported for approximately 2 years. New features only land in current/recent versions. Breaking changes are isolated to version bumps.

---

## Campaign Manager API Structure

### Resource Hierarchy
```
Ad Account (sponsoredAccount URN)
  └── Campaign Group (adCampaignGroup)
        └── Campaign (adCampaign)
              └── Creative (adCreative)
                    └── Ad (sponsoredCreative)
```

### URN Format
LinkedIn uses URN (Uniform Resource Name) format for all resource identifiers:
```
urn:li:sponsoredAccount:123456789
urn:li:adCampaign:987654321
urn:li:organization:12345678
```

### Core Campaign Endpoints
```
GET  /rest/adAccounts                    # List ad accounts
POST /rest/adCampaignGroups              # Create campaign group
GET  /rest/adCampaigns?search.account=urn:li:sponsoredAccount:{id}
POST /rest/adCampaigns                   # Create campaign
POST /rest/adCreatives                   # Create creative
GET  /rest/adAnalytics                   # Reporting (synchronous for small datasets)
```

---

## Rate Limits

### Standard Access Limits

| Endpoint Category | Limit |
|---|---|
| Most read endpoints | 100 calls/day per application |
| Analytics/reporting | 100 calls/day per application |
| Creative/campaign writes | Varies; generally 100 calls/day |
| Profile API | 500 calls/day |

**Note**: Rate limits are enforced per application (client_id), not per user. If you have 10 users using the same app, they share the same daily quota.

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1714521600
```

---

## Lead Gen Forms API

LinkedIn Lead Gen Forms capture leads directly within LinkedIn ads without leaving the platform.

```
# Get form submissions for an ad account
GET /rest/leadForms?q=owner&owner=urn:li:sponsoredAccount:{id}

# Get form responses
GET /rest/leadFormResponses?q=owner&owner=urn:li:sponsoredAccount:{id}

# Response includes submittedAt, formFields (name, email, company, etc.)
```

**Webhook alternative**: LinkedIn does not support real-time webhooks for Lead Gen Form submissions. You must poll the API, typically every 15-60 minutes for near-real-time lead routing.

---

## Conversions API (Server-Side Tracking)

The Conversions API is LinkedIn's server-side alternative to the Insight Tag pixel, supporting first-party data matching.

```
POST /rest/conversionEvents
LinkedIn-Version: 202504

{
  "elements": [{
    "conversion": "urn:li:conversionRule:123456",
    "conversionHappenedAt": 1714521600000,
    "user": {
      "userIds": [
        { "idType": "SHA256_EMAIL", "idValue": "hashed_email" }
      ]
    },
    "eventId": "unique-event-id-for-dedup"
  }]
}
```

Match rate improves significantly with multiple identifiers: SHA256-hashed email, LinkedIn member ID (from first-party cookie), and company details.

---

## Organic Content via ugcPosts API

```
POST /rest/ugcPosts
{
  "author": "urn:li:organization:12345678",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": { "text": "Post content here" },
      "shareMediaCategory": "NONE"
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

For articles and rich media posts, use the `shares` API with media uploads via the Assets API first.

---

## Audience Segmentation API

LinkedIn's targeting criteria are available for campaign creation:

```
GET /rest/adTargetingFacets?q=targetingFacet&targetingFacet=MEMBER_COMPANY_FOLLOWER_OF

# Key facet types:
# MEMBER_SKILLS, MEMBER_JOB_TITLE, MEMBER_INDUSTRIES
# MEMBER_SENIORITY, MEMBER_COMPANY_SIZE, MEMBER_GEOGRAPHY
# MATCHED_AUDIENCES (custom audience uploads)
```

**Matched Audiences**: Upload customer lists (hashed emails) via the Data Integration API for remarketing and lookalike campaigns.

---

## Common Errors

| Code | Error | Cause | Fix |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | Token expired or invalid | Refresh token; verify scopes |
| 403 | `NOT_MEMBER` | User doesn't have access to the resource | Verify ad account membership |
| 403 | `PERMISSION_DENIED` | Missing OAuth scope | Re-authorize with required scopes |
| 400 | `INVALID_QUERY_PARAMETER` | Malformed URN or filter | Validate URN format; check API version |
| 429 | `THROTTLE` | Rate limit exceeded | Implement backoff; cache responses |
| 422 | `VALIDATION_FAILED` | Invalid payload | Check field requirements for API version |

---

## Breaking Changes 2024–2025

- **Legacy unversioned API sunset (2024)**: Endpoints under `/v2/` without a `LinkedIn-Version` header are deprecated. All clients must use versioned endpoints with the `LinkedIn-Version` header.
- **Campaign Group status field changes**: In v202401+, campaign group `status` field values changed; `DRAFT` campaigns now require explicit activation.
- **adCreatives → imageAd/videoAd split**: Creative types are now explicit subtypes in recent API versions instead of a generic creative object.
- **Organic content API (ugcPosts) changes**: The legacy `/v2/shares` endpoint for organic posts is sunset in favor of `/rest/ugcPosts` in versioned API.
- **Profile API scope changes**: `r_basicprofile` removed; use `r_liteprofile` and `r_emailaddress` for basic profile data.
