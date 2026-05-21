# chatv2 Service API — User-Centric Multi-Tenant Refactor Spec

**Version:** 1.1  
**Status:** Implementation required (CTO)  
**Consumer:** OpsRadar (Next.js on Vercel)  
**Transport:** HTTPS, JSON  
**Auth:** `Authorization: Bearer <CHATV2_SERVICE_API_KEY>`

---

## Why This Refactor

The previous architecture used generated project IDs and a project-mapping table to route service API calls. This created:

- A lookup layer that added latency and complexity
- A separate registration step during customer onboarding
- A mapping table that could drift out of sync

**New architecture:** The customer's Supabase UUID (`user_uuid`) is the external tenant identifier everywhere. chatv2 stores it in the `users.uuid` column and looks up the internal numeric `users.id` on first query. No project IDs, no mapping tables.

---

## Authentication

Every request to `/service/*` must include:

```
Authorization: Bearer <CHATV2_SERVICE_API_KEY>
```

The service key is a shared secret between OpsRadar and chatv2. It is **not** a per-user key.

### Tenant Authorization

The service key authenticates the caller as OpsRadar. But the `:userUuid` path parameter must also be validated:

```typescript
// chatv2 controller pseudo-code
const user = await db.users.findOne({ uuid: params.userUuid })
if (!user) return 404

// Service key must be scoped to this deployment — no cross-tenant access
if (!isValidServiceKey(req.headers.authorization)) return 403
```

The service key authorizes OpsRadar to call on behalf of **any** of its customers. Per-customer key isolation is enforced by looking up the `users.uuid` and rejecting if not found.

---

## URL Structure

All service endpoints follow:

```
/service/projects/:userUuid/<resource>
```

`:userUuid` is the Supabase UUID of the customer. It maps to `users.uuid` in chatv2's MySQL.

> **Note:** The path prefix `/service/projects/` is kept for backward compatibility with existing OpsRadar consumers. The `:userUuid` was previously a generated project ID — it is now the Supabase user UUID directly. The URL shape is unchanged; only the semantics of the parameter change.

---

## Internal Architecture Requirements

### User Lookup Pattern

All controllers must resolve UUID → internal ID at the start of each request:

```typescript
// DO THIS
const user = await userRepository.findByUuid(params.userUuid)
if (!user) throw new NotFoundError('tenant not found')
const internalId = user.id  // numeric — use for all SQL joins

// NEVER DO THIS — UUIDs are slow for joins in MySQL
SELECT * FROM workflow_runs WHERE user_uuid = ?
```

### Repository Layer

```typescript
// userRepository
findByUuid(uuid: string): Promise<User | null>

// workflowRepository  
findByUserId(userId: number): Promise<Workflow[]>
getHealthByUserId(userId: number): Promise<WorkflowHealthRow[]>

// analyticsRepository
getOverviewByUserId(userId: number, periodDays: number): Promise<AnalyticsOverview>
getRunStatsByUserId(userId: number, periodDays: number): Promise<RunStats>
getCategoriesByUserId(userId: number): Promise<CategoryStat[]>
getRecentExecutionsByUserId(userId: number, limit: number): Promise<Execution[]>
```

---

## Endpoints

### 1. `GET /service/projects/:userUuid/workflows/health`

Returns all workflows belonging to the user with health status, execution history, and failure metrics.

**OpsRadar consumer:** `src/app/api/dashboard/workflow-health/route.ts`  
**Cached by OpsRadar:** 3 min fresh, 24 h stale (Upstash Redis)

#### Response — 200 OK

```json
{
  "user_uuid": "6a7fca10-dacc-4cef-9304-bbd577e50efc",
  "retrieved_at": "2026-05-21T15:30:00.000Z",
  "workflows": [
    {
      "workflow_id": "wf_abc123",
      "name": "Invoice Reminder Automation",
      "status": "healthy",
      "is_active": true,
      "category": "billing",
      "webhook_url": "https://silver.n8n.cloud/webhook/abc123",
      "webhook_active": true,
      "last_execution": {
        "execution_id": "exec_xyz789",
        "status": "success",
        "started_at": "2026-05-21T14:00:00.000Z",
        "finished_at": "2026-05-21T14:00:12.000Z",
        "duration_ms": 12000,
        "error_message": null
      },
      "health_metrics": {
        "success_rate_7d": 98.5,
        "total_runs_7d": 67,
        "failed_runs_7d": 1,
        "avg_duration_ms": 11200,
        "uptime_pct": 99.2
      },
      "recent_executions": [
        {
          "execution_id": "exec_xyz789",
          "status": "success",
          "started_at": "2026-05-21T14:00:00.000Z",
          "duration_ms": 12000,
          "error_message": null
        },
        {
          "execution_id": "exec_xyz788",
          "status": "success",
          "started_at": "2026-05-21T12:00:00.000Z",
          "duration_ms": 9800,
          "error_message": null
        },
        {
          "execution_id": "exec_xyz780",
          "status": "failure",
          "started_at": "2026-05-20T09:00:00.000Z",
          "duration_ms": 3200,
          "error_message": "Connection timeout to HubSpot API"
        }
      ],
      "open_alerts": 0,
      "created_at": "2026-03-10T09:00:00.000Z",
      "updated_at": "2026-05-21T14:00:12.000Z"
    },
    {
      "workflow_id": "wf_def456",
      "name": "Client Report Generator",
      "status": "degraded",
      "is_active": true,
      "category": "reporting",
      "webhook_url": "https://silver.n8n.cloud/webhook/def456",
      "webhook_active": true,
      "last_execution": {
        "execution_id": "exec_aaa001",
        "status": "failure",
        "started_at": "2026-05-21T08:00:00.000Z",
        "finished_at": "2026-05-21T08:00:05.000Z",
        "duration_ms": 5000,
        "error_message": "Google Sheets API quota exceeded"
      },
      "health_metrics": {
        "success_rate_7d": 88.2,
        "total_runs_7d": 34,
        "failed_runs_7d": 4,
        "avg_duration_ms": 7300,
        "uptime_pct": 91.0
      },
      "recent_executions": [
        {
          "execution_id": "exec_aaa001",
          "status": "failure",
          "started_at": "2026-05-21T08:00:00.000Z",
          "duration_ms": 5000,
          "error_message": "Google Sheets API quota exceeded"
        }
      ],
      "open_alerts": 1,
      "created_at": "2026-03-15T11:00:00.000Z",
      "updated_at": "2026-05-21T08:00:05.000Z"
    }
  ],
  "summary": {
    "total": 5,
    "active": 4,
    "inactive": 1,
    "healthy": 3,
    "degraded": 1,
    "failing": 0,
    "unknown": 1,
    "open_alerts": 1
  }
}
```

#### Status values

| Value | Meaning |
|-------|---------|
| `healthy` | Success rate ≥ 95% over last 7 days |
| `degraded` | Success rate 80–94% over last 7 days |
| `failing` | Success rate < 80% or last 3 runs all failed |
| `unknown` | No runs in last 7 days or workflow never ran |

#### Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing or invalid service key |
| 403 | `FORBIDDEN` | Service key valid but not authorized for this UUID |
| 404 | `NOT_FOUND` | No user with this UUID — OpsRadar treats this as `not_enrolled` |
| 500 | `INTERNAL_ERROR` | Server error |

---

### 2. `GET /service/projects/:userUuid/analytics`

Returns a full tenant analytics overview. This is the primary data source for the OpsRadar automation ROI dashboard widget.

**OpsRadar consumer:** `src/app/api/dashboard/automation-roi/route.ts`  
**Cached by OpsRadar:** 3 min fresh, 24 h stale (Upstash Redis)

#### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period_days` | integer | `30` | Lookback window in days for run statistics |

#### Response — 200 OK

```json
{
  "user_uuid": "6a7fca10-dacc-4cef-9304-bbd577e50efc",
  "retrieved_at": "2026-05-21T15:30:00.000Z",
  "workspace": {
    "name": "Silver Agency",
    "n8n_base_url": "https://silver.n8n.cloud",
    "connected_since": "2026-03-10T09:00:00.000Z"
  },
  "period": {
    "from": "2026-04-21T00:00:00.000Z",
    "to": "2026-05-21T23:59:59.000Z",
    "days": 30
  },
  "overview": {
    "total_workflows": 5,
    "active_workflows": 4,
    "total_runs": 1847,
    "successful_runs": 1821,
    "failed_runs": 26,
    "success_rate": 98.6,
    "avg_duration_ms": 8400,
    "estimated_hours_saved": 154.0,
    "unresolved_alerts": 1,
    "healthy_workflows": 3,
    "unhealthy_workflows": 2
  },
  "run_statistics": {
    "runs_today": 47,
    "runs_this_week": 312,
    "runs_last_30_days": 1847,
    "peak_day": "2026-05-14",
    "peak_day_runs": 89,
    "daily_average": 61.6,
    "trend_pct_vs_prev_period": 12.4
  },
  "automation_categories": [
    {
      "category": "billing",
      "workflow_count": 2,
      "runs_30d": 623,
      "success_rate": 99.8
    },
    {
      "category": "reporting",
      "workflow_count": 1,
      "runs_30d": 189,
      "success_rate": 88.2
    },
    {
      "category": "lead-nurture",
      "workflow_count": 1,
      "runs_30d": 742,
      "success_rate": 99.1
    },
    {
      "category": "ops",
      "workflow_count": 1,
      "runs_30d": 293,
      "success_rate": 96.6
    }
  ],
  "top_workflows_by_runs": [
    {
      "workflow_id": "wf_lead001",
      "name": "Lead Nurture Sequence",
      "runs_30d": 742,
      "success_rate": 99.1,
      "status": "healthy",
      "category": "lead-nurture"
    },
    {
      "workflow_id": "wf_inv001",
      "name": "Invoice Reminder",
      "runs_30d": 623,
      "success_rate": 99.8,
      "status": "healthy",
      "category": "billing"
    }
  ],
  "recent_executions": [
    {
      "workflow_id": "wf_abc123",
      "workflow_name": "Invoice Reminder Automation",
      "execution_id": "exec_xyz789",
      "status": "success",
      "started_at": "2026-05-21T14:00:00.000Z",
      "duration_ms": 12000,
      "error_message": null
    },
    {
      "workflow_id": "wf_def456",
      "workflow_name": "Client Report Generator",
      "execution_id": "exec_aaa001",
      "status": "failure",
      "started_at": "2026-05-21T08:00:00.000Z",
      "duration_ms": 5000,
      "error_message": "Google Sheets API quota exceeded"
    }
  ],
  "alerts": {
    "open": 1,
    "resolved_30d": 3,
    "items": [
      {
        "alert_id": "alt_001",
        "workflow_id": "wf_def456",
        "workflow_name": "Client Report Generator",
        "severity": "warning",
        "message": "Success rate dropped below 95% threshold",
        "triggered_at": "2026-05-20T08:30:00.000Z"
      }
    ]
  }
}
```

#### Backward-Compatibility Note for OpsRadar

OpsRadar's `automation-roi` route currently reads this shape from `overview`:

```
total_workflows, total_runs, failed_runs, success_rate,
average_duration_ms, unresolved_alerts, healthy_workflows, unhealthy_workflows
```

The new response includes all of these (renamed: `avg_duration_ms` instead of `average_duration_ms`). OpsRadar will update its type and mapping accordingly.

---

### 3. `POST /service/projects` — Provision Tenant *(new)*

Called by OpsRadar during customer onboarding. Creates a chatv2 user record keyed to the Supabase UUID.

**OpsRadar consumer:** `src/app/api/admin/onboard-customer/route.ts`

#### Request Body

```json
{
  "user_uuid": "6a7fca10-dacc-4cef-9304-bbd577e50efc",
  "email": "customer@agency.com",
  "n8n_base_url": "https://silver.n8n.cloud",
  "n8n_webhook_secret": "whsec_xxx",
  "n8n_api_key": "n8n_api_xxx"
}
```

#### Response — 201 Created

```json
{
  "user_uuid": "6a7fca10-dacc-4cef-9304-bbd577e50efc",
  "created_at": "2026-05-21T15:30:00.000Z"
}
```

#### Error: 409 Conflict — user already provisioned

```json
{
  "code": "ALREADY_EXISTS",
  "message": "user already provisioned"
}
```

---

### 4. `GET /service/projects/:userUuid` — Tenant Status *(new)*

Quick check: is this UUID provisioned in chatv2?

#### Response — 200 OK

```json
{
  "user_uuid": "6a7fca10-dacc-4cef-9304-bbd577e50efc",
  "provisioned": true,
  "n8n_connected": true,
  "n8n_base_url": "https://silver.n8n.cloud",
  "workflow_count": 5,
  "created_at": "2026-03-10T09:00:00.000Z"
}
```

#### Response — 404 Not Found

```json
{
  "code": "NOT_FOUND",
  "message": "tenant not found"
}
```

---

## OpsRadar Integration Changes Required

After CTO ships this refactor, OpsRadar needs these two updates:

### 1. Update `automation-roi/route.ts` type mapping

The `CtoAnalyticsResponse` type needs to be updated to match the new response shape:
- `average_duration_ms` → `avg_duration_ms`
- Add `run_statistics`, `automation_categories`, `recent_executions`, `alerts` for richer dashboard widgets

### 2. Update `onboard-customer/route.ts` to call `POST /service/projects`

After successfully creating the Supabase user, call chatv2 to provision the tenant:

```typescript
// After supabase.auth.admin.inviteUserByEmail() succeeds:
await chatV2Fetch('/projects', {
  method: 'POST',
  body: {
    user_uuid: userId,
    email,
    n8n_base_url: normalizedUrl,
    n8n_webhook_secret: n8nWebhookSecret,
    n8n_api_key: n8nApiKey,
  },
})
```

This eliminates the manual step where the CTO had to separately register the customer in chatv2.

---

## Migration Steps (for CTO)

1. Add `uuid VARCHAR(36) UNIQUE` column to `users` table if not present
2. Add index: `CREATE INDEX idx_users_uuid ON users(uuid)`
3. Build `findByUuid()` in userRepository
4. Refactor workflow-health controller: resolve UUID → `user.id` → query workflows by `user_id`
5. Refactor analytics controller: same UUID → id resolution, expand response shape
6. Add `POST /service/projects` endpoint
7. Add `GET /service/projects/:userUuid` endpoint
8. Remove all `projects` table references and project-mapping logic
9. Update API key validation middleware to use UUID-based lookup

---

## Environment Variables (OpsRadar side)

| Variable | Description |
|----------|-------------|
| `CHATV2_API_URL` | Base URL, e.g. `https://opstest.atta.codes` |
| `CHATV2_SERVICE_API_KEY` | Shared bearer token — never expose to browser |
