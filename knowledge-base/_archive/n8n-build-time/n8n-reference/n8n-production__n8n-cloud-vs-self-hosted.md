# n8n Cloud vs Self-Hosted

**Category:** Tools  
**Source:** n8n.io pricing page, n8n documentation (docs.n8n.io), n8n community forums, n8n GitHub releases  
**Updated:** 2026-04-30

## Overview
n8n is available as a managed cloud service (n8n.io) or as a self-hosted deployment. The right choice depends on execution volume, team size, data residency requirements, compliance needs, and available DevOps capacity. Cloud is faster to start but becomes expensive at scale; self-hosted offers full control at the cost of infrastructure management.

## Related Notes
[[n8n-queue-mode]], [[n8n-credential-management]], [[n8n-backup-recovery]], [[n8n-cost-management]], [[n8n-security-hardening]]

---

## n8n Cloud Pricing Tiers (2024–2025)

| Plan | Monthly Price | Workflow Executions | Active Workflows | Users |
|---|---|---|---|---|
| Starter | ~$24/mo | 2,500/mo | 5 active | 1 |
| Pro | ~$60/mo | 10,000/mo | 15 active | 5 |
| Enterprise | Custom | Unlimited | Unlimited | Custom |

**Notes:**
- "Executions" in cloud billing = each workflow run (not each node step — see [[n8n-cost-management]] for execution counting details).
- Overage charges apply on Starter/Pro when execution limits are exceeded.
- Annual billing typically offers ~20% discount.
- Enterprise includes SSO, audit logs, advanced permissions, SLA, and dedicated support.

### Cloud Limitations

| Constraint | Starter/Pro | Notes |
|---|---|---|
| Workflow execution timeout | 5 minutes (base) | Pro/Enterprise may have longer; webhooks can be async to work around |
| File upload size | 16 MB per execution | Binary data passed between nodes |
| Custom nodes | Not supported | Cloud runs n8n's node library only |
| Concurrent executions | Limited by plan | Cannot configure concurrency settings |
| Database access | None (managed) | No direct PostgreSQL access |
| Environment variables | Limited | Via n8n cloud UI settings, not full .env |
| IP whitelisting | Not available (Starter) | Enterprise supports static egress IPs |

---

## Self-Hosted Options

### Docker (Most Common)
```bash
# Quick start with SQLite (development only)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Production: use Docker Compose with PostgreSQL
# See n8n-queue-mode.md for full production stack
```

### Docker Compose (Recommended for Production)
```yaml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    environment:
      - N8N_ENCRYPTION_KEY=your-32-char-key
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=secure-password
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: postgres-password
```

### Kubernetes
- Use the official n8n Helm chart for Kubernetes deployments.
- Requires separate Redis deployment for queue mode (see [[n8n-queue-mode]]).
- Configure HPA (Horizontal Pod Autoscaler) for worker pods based on queue depth.

### Cloud PaaS Options

| Platform | Suitability | Notes |
|---|---|---|
| Railway | Good for small teams | One-click deploy, ~$5-15/mo at low volume |
| Render | Good for small-medium | Free tier available; PostgreSQL add-on needed |
| DigitalOcean App Platform | Medium | Managed PostgreSQL available |
| AWS ECS/Fargate | Enterprise | Full control; higher ops complexity |
| GCP Cloud Run | Caution | Stateless containers — use external DB; not ideal for queue mode |

---

## Decision Framework

### Choose n8n Cloud When:
- Team is non-technical or has no DevOps capacity
- Execution volume is under 10,000/month
- No data residency or compliance requirements
- Want to start in under 30 minutes
- Budget allows $60-200/month without infrastructure management

### Choose Self-Hosted When:
- Execution volume exceeds cloud plan limits regularly
- Data must not leave your infrastructure (GDPR, HIPAA, client requirements)
- Need custom nodes for proprietary integrations
- Require execution timeouts beyond 5 minutes (long-running workflows)
- Team has DevOps capacity to maintain the deployment
- Need concurrent execution configuration (queue mode)
- Budget optimization: self-hosting pays off above ~10,000-20,000 executions/month

---

## TCO Comparison at Scale

| Scenario | n8n Cloud Cost | Self-Hosted Cost (est.) |
|---|---|---|
| 2,500 executions/mo | $24/mo | $15-30/mo (small VPS) |
| 10,000 executions/mo | $60/mo | $20-50/mo |
| 50,000 executions/mo | Enterprise (custom) | $50-150/mo (with Redis, PostgreSQL) |
| 500,000 executions/mo | Enterprise (custom, likely $500+) | $200-500/mo (multi-worker) |

Self-hosted costs include: VPS/cloud instance + managed database + Redis + backup storage + ~2-4 hrs/month DevOps maintenance.

**Break-even point**: Most teams find self-hosting cheaper above ~20,000-30,000 executions/month, or when execution timeouts are a blocking constraint.

---

## Cloud vs Self-Hosted Feature Comparison

| Feature | Cloud | Self-Hosted |
|---|---|---|
| Custom nodes | No | Yes |
| Execution timeout control | No (5 min cap) | Yes (configurable) |
| Data residency | n8n servers (EU or US) | Your infrastructure |
| Queue mode | Yes (Enterprise) | Yes (configure yourself) |
| SSO / SAML | Enterprise only | Available via config |
| Audit logs | Enterprise only | Available via config |
| Credential encryption key | Managed by n8n | Controlled by you (N8N_ENCRYPTION_KEY) |
| Subworkflow limit | Plan-dependent | Configurable |
| Raw database access | No | Yes |
| Binary data (files) | 16 MB limit | Configurable (stream or buffer) |
| Automatic updates | Yes | Manual (your responsibility) |
| Uptime SLA | Enterprise | Self-managed |

---

## Self-Hosted Gotchas

**Credential encryption**: The `N8N_ENCRYPTION_KEY` must be set before first run and never changed — changing it renders all stored credentials unreadable. Back it up securely.

**Database**: SQLite is the default but is not suitable for production. Use PostgreSQL for any team or high-volume deployment. Migration from SQLite to PostgreSQL requires a tool or manual export/import.

**Updates**: Self-hosted instances require manual updates. Pin to a specific version tag in Docker to avoid unintended breaking changes:
```bash
image: n8nio/n8n:1.45.0  # pin to specific version
```

**Subworkflow limits**: Cloud Enterprise allows nested subworkflows; self-hosted allows unlimited nesting but deep chains can cause memory issues.

**Concurrent execution model**: By default, n8n processes executions sequentially on a single instance. Queue mode is required for true concurrency (see [[n8n-queue-mode]]).
