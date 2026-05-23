# n8n Node: HubSpot

**Category:** Tools
**Node Type:** `n8n-nodes-base.hubspot`
**Version:** 2.2 (current default)
**Source:** n8n GitHub — `packages/nodes-base/nodes/Hubspot`
**Updated:** 2026-04-30

## Overview

Reads and writes CRM data in HubSpot — contacts, companies, deals, tickets, engagements, contact lists, and forms. The primary CRM integration node for agency client management workflows.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]]

---

## What It Does

Connects to the HubSpot CRM API to create, read, update, and delete core CRM objects. Supports both v1/v2 CRM API endpoints and newer CRM v3 object APIs. Used to sync leads from form submissions, update deal stages, log activities, and pull contact/company data into automation workflows.

## Authentication

**Credential Types (choose one):**

| Type | Credential Name | Method | Best For |
|------|----------------|--------|---------|
| API Key | `hubspotApi` | API Key (deprecated by HubSpot) | Legacy integrations |
| Private App Token | `hubspotAppToken` | Bearer token | Recommended for new integrations |
| OAuth2 | `hubspotOAuth2Api` | OAuth2 flow | Multi-portal access |
| Developer API | `hubspotDeveloperApi` | Developer API key | App development |

**Recommended**: Private App token (HubSpot sunset API keys in November 2022). Create in HubSpot → Settings → Integrations → Private Apps.

OAuth2 scopes required depend on resources used:
- `crm.objects.contacts.read`, `crm.objects.contacts.write`
- `crm.objects.companies.read`, `crm.objects.companies.write`
- `crm.objects.deals.read`, `crm.objects.deals.write`

## Resources & Operations

| Resource | Operations |
|----------|-----------|
| Company | Create, Delete, Get, Get Many, Update |
| Contact | Create, Delete, Get, Get Many, Update |
| Contact List | Add, Get Many, Remove |
| Deal | Create, Delete, Get, Get Many, Update |
| Engagement | Create, Delete, Get, Get Many |
| Form | Get All Fields, Get Many |
| Ticket | Create, Delete, Get, Get Many, Update |

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | options | Yes | The CRM object type (contact, company, deal, etc.) |
| `operation` | options | Yes | The action to perform |
| `contactId` / `companyId` / `dealId` | string | Yes (get/update/delete) | HubSpot object ID |
| `email` | string | Yes (contact create) | Contact email address |
| `additionalFields` | collection | No | Extra CRM properties to set (firstName, lastName, phone, etc.) |
| `updateFields` | collection | No | Fields to update on existing records |
| `returnAll` | boolean | No | Fetch all pages (default: limited) |
| `filters` | collection | No | Filter criteria for getAll operations |

## Common Errors & Fixes

- **401 Unauthorized**: API key deprecated (HubSpot sunset API keys Nov 2022). Migrate to Private App token.
- **404 Not Found**: Object ID doesn't exist in the portal. Check that the ID belongs to the correct HubSpot portal.
- **429 Rate Limit**: Free/Starter HubSpot plans allow 100 API calls per 10 seconds. Add Wait nodes (0.1s delay) between bulk operations. Professional/Enterprise plans have higher limits.
- **Property not found**: Custom property name doesn't exist in the HubSpot portal. Verify property internal name (not display label) under Settings → Properties.
- **Wrong portal**: OAuth2 credential connected to different portal than expected. Each HubSpot portal has its own credential.
- **Contact already exists**: Create operation fails when email already exists. Use "upsert" pattern: Get contact first → IF exists → Update, else Create.

## Typical Workflow Pattern

```
Webhook (form submission)
  → HubSpot (Contact: Create or Update)
  → HubSpot (Deal: Create, linked to contact)
  → Slack (#sales channel: new lead alert)
```

## Agency Use Cases

- **Lead intake**: Typeform/form submission → create HubSpot contact → assign to sales rep → Slack notification
- **Deal pipeline automation**: New deal created in HubSpot trigger → send onboarding email → create Notion project page
- **Client reporting sync**: Pull all contacts with property `client_status=active` → enrich data → push to reporting dashboard
