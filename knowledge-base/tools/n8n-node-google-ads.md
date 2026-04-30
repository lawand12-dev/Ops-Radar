# n8n Node: Google Ads

**Category:** Tools
**Node Type:** `n8n-nodes-base.googleAds`
**Version:** 1
**Source:** n8n GitHub — `packages/nodes-base/nodes/Google/Ads`
**Updated:** 2026-04-30

## Overview

Reads campaign data from the Google Ads API. Used to pull campaign metrics (impressions, clicks, cost, conversions) into n8n workflows for reporting, alerting, or data synchronisation.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Connects to the Google Ads API v20 (`googleads.googleapis.com`) and retrieves campaign data via a structured query language (GAQL). Returns campaign fields alongside metrics and budget data in a single flattened output. Cost values are returned in **micros** — divide by 1,000,000 to get the currency value (e.g. 50000000 micros = $50.00).

## Authentication

**Credential Type:** `googleAdsOAuth2Api`
**Auth Method:** OAuth2
**Required Scope:** `https://www.googleapis.com/auth/adwords`

Two account levels are supported:
- **Customer ID** (`clientCustomerId`): the account whose campaigns you want to read
- **Manager Account ID** (`managerCustomerId`): required when accessing via a Google Ads Manager (MCC) account; sent as the `login-customer-id` header

The developer token is stored in the credential and sent as the `developer-token` header on every request.

## Resources & Operations

| Resource | Operations |
|----------|-----------|
| Campaign | Get Many (getAll) |

Only one resource is currently supported. Operations retrieve all campaigns matching optional filter criteria.

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientCustomerId` | string | Yes | The Google Ads customer (account) ID whose campaigns to fetch (e.g. `123-456-7890`) |
| `managerCustomerId` | string | No | MCC manager account ID; required when using a manager credential |
| `additionalOptions.dateRange` | options | No | Filter by date range (e.g. `LAST_30_DAYS`, `THIS_MONTH`, `allTime`) |
| `additionalOptions.campaignStatus` | options | No | Filter by status: `ENABLED`, `PAUSED`, `REMOVED`, or `all` |
| `returnAll` | boolean | No | Return all pages of results vs. limited count |

## Returned Fields (per campaign)

From source — the GAQL query selects:
- `campaign.id`, `campaign.name`, `campaign.status`
- `campaign.optimization_score`
- `campaign.advertising_channel_type`, `campaign.advertising_channel_sub_type`
- `campaign_budget.amount_micros`, `campaign_budget.period`
- `metrics.impressions`, `metrics.interactions`, `metrics.interaction_rate`
- `metrics.average_cost`, `metrics.cost_micros`, `metrics.conversions`
- `metrics.cost_per_conversion`, `metrics.conversions_from_interactions_rate`
- `metrics.video_views`, `metrics.average_cpm`, `metrics.ctr`

## Common Errors & Fixes

- **401 Unauthorized**: OAuth2 token expired or missing `adwords` scope. Re-authenticate or regenerate credential.
- **403 Forbidden / developer token not approved**: Developer token not approved for production access. Test environment tokens only work in test accounts.
- **`login-customer-id` header required**: Credential is a manager (MCC) account but `managerCustomerId` not set.
- **Micros confusion**: Cost fields return integers in micros — e.g. `cost_micros: 50000000` = $50.00. Use a Set or Code node to divide by 1,000,000.
- **No results returned**: Campaign filters (status, date range) may exclude all campaigns. Try `campaignStatus: all` first.

## Typical Workflow Pattern

```
Schedule (daily 8 AM)
  → Google Ads (Get Many campaigns, LAST_30_DAYS)
  → Code (divide micros by 1e6, format report)
  → Google Sheets (append row) or Slack (post summary)
```

## Agency Use Cases

- **Weekly ad spend report**: Pull campaign metrics nightly → compute week-over-week changes → email to client
- **Paused campaign alert**: Get all campaigns → filter for ENABLED status → compare spend to budget threshold → Slack alert when overspending
- **Cross-platform comparison**: Fetch Google Ads data alongside Facebook data → merge → single performance dashboard
