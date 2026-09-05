# n8n Node: Google Analytics

**Category:** Tools
**Node Type:** `n8n-nodes-base.googleAnalytics`
**Version:** 2 (GA4)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Google/Analytics`
**Updated:** 2026-04-30

## Overview

Queries Google Analytics 4 (GA4) reporting data for website traffic, user behaviour, conversions, and custom events. Version 2 uses the GA4 Data API (not the deprecated Universal Analytics API).

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Connects to the Google Analytics Data API for GA4 properties. Runs report queries specifying dimensions (e.g. country, device, page path) and metrics (e.g. sessions, conversions, revenue), with optional date ranges, filters, and ordering. Returns tabular report data as n8n items.

**Important**: Version 1 used Universal Analytics (deprecated). Version 2 uses GA4 exclusively. Properties must be GA4 properties (property IDs starting with a number, not UA-XXXXXX).

## Authentication

**Credential Type:** `googleAnalyticsOAuth2Api`
**Auth Method:** OAuth2
**Required Scopes:**
- `https://www.googleapis.com/auth/analytics`
- `https://www.googleapis.com/auth/analytics.readonly`

Service Account authentication is also supported via the standard Google OAuth2 credential with service account key.

## Resources & Operations

| Resource | Operations |
|----------|-----------|
| Report | Run Report |
| User Activity | Search |

The primary operation runs a standard GA4 data report. User Activity search returns event-level data for individual users.

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propertyId` | string | Yes | GA4 Property ID (numeric, e.g. `123456789`) |
| `dateRanges` | array | Yes | Start and end dates (e.g. `startDate: "30daysAgo"`, `endDate: "today"`) |
| `dimensions` | array | No | Dimensions to group by (e.g. `country`, `deviceCategory`, `pagePath`) |
| `metrics` | array | Yes | Metrics to return (e.g. `sessions`, `conversions`, `totalRevenue`) |
| `dimensionFilter` | object | No | Filter expression on dimensions |
| `metricFilter` | object | No | Filter expression on metrics |
| `orderBys` | array | No | Sort results by dimension or metric |
| `limit` | number | No | Maximum rows to return |
| `returnAll` | boolean | No | Fetch all pages of results |

## Common Errors & Fixes

- **Property not found / 400 Bad Request**: The `propertyId` format is wrong. Use numeric ID only (not `properties/NNNNN` format — n8n adds the prefix automatically).
- **Dimension/metric does not exist**: GA4 dimensions and metrics have different names from Universal Analytics. Use the GA4 Dimensions & Metrics Explorer to verify names.
- **Quota exceeded (429)**: GA4 free tier allows 200,000 tokens per project per day. Reduce report scope or cache results.
- **Universal Analytics property ID**: UA-XXXXXXXX properties are deprecated and not supported by v2. Migrate to GA4 property.
- **No data returned**: Date range may precede GA4 property creation, or no events tracked in range.

## Typical Workflow Pattern

```
Schedule (Monday 9 AM)
  → Google Analytics (Run Report, last 7 days, sessions + conversions by source)
  → Code (format rows, compute conversion rate)
  → Gmail (send weekly traffic summary to client)
```

## Agency Use Cases

- **Monthly client report**: Pull sessions, conversions, revenue by channel → format → PDF generation → email
- **Anomaly detection**: Daily sessions fetch → compare to 7-day average → Slack alert if >30% drop
- **Campaign attribution**: Query by `sessionSource`/`sessionMedium` dimensions → attribute conversions to campaigns
