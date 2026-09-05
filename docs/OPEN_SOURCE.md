# OpsRadar Open Source

## Purpose

OpsRadar is becoming an open-source operations intelligence tool for **client-service businesses**: agencies, consultancies, development studios, recruiting firms, accounting practices, and other teams that deliver work to clients.

The core answers a simple question:

> Where are we losing cash, capacity, or margin before the problem reaches month-end?

It evaluates project, time, and invoice data with transparent rules. AI may explain a finding or help draft a next step, but it must not be the only reason a risk exists.

## Open core

`src/lib/open-core/` is the dependency-free foundation. It defines a portable service-operations data model and evaluates four initial risk classes:

1. overdue receivables;
2. billable work not marked as invoiced;
3. project budget burn; and
4. estimated delivery margin below a stated threshold.

Rules report their evidence and assumptions so a user can verify or override them. OpsRadar is read-only by default: it identifies risk; it does not send messages, alter source data, or make financial decisions.

## Using the rule core

The core expects one currency and four related collections: clients, projects, time entries, and invoices. In the application, import it with the project alias:

```ts
import { evaluateOperations } from "<npm>/lib/open-core";

const report = evaluateOperations({
  asOf: "2026-08-23",
  currency: "USD",
  clients: [{ id: "client-1", name: "Northstar Consulting" }],
  projects: [
    {
      id: "project-1",
      clientId: "client-1",
      name: "Expansion engagement",
      contractedRevenue: 10_000,
      budgetHours: 100,
    },
  ],
  timeEntries: [
    {
      id: "entry-1",
      projectId: "project-1",
      date: "2026-08-01",
      hours: 85,
      internalCost: 6_800,
    },
  ],
  invoices: [],
});
```

`report.risks` contains a severity, a named rule, an entity, evidence, and a recommended review action. Invalid dates, future time entries, unmatched relationships, and malformed values are reported in `report.skippedRecords`; they are never silently treated as facts.

Run the open-core test suite with:

```bash
npm run test:open-core
```

## Scope boundaries

The product is broad across client-service businesses, not every business model. Ecommerce, inventory-heavy companies, restaurants, and product-led SaaS need different source data and different rules. Those should be separate extensions, not weak generic logic.

The existing dashboards, agent workflows, integrations, and multi-tenant hosted application remain reference implementation material while the open core is extracted and hardened.

## Roadmap

- [x] Publish a portable, explainable operations-rule core.
- [ ] Add validated CSV importers for time, project, and invoice exports.
- [ ] Ship anonymized sample data and a no-signup demo report.
- [ ] Add vertical rule packs for agencies, consultancies, recruiting, and accounting.
- [ ] Add a self-hosting guide that minimizes required external services.
- [ ] Add optional AI explanations with bring-your-own-key configuration.

## Public-release gate

Historical startup material has been removed from this working tree: YC, fundraising, go-to-market, competitor, research, positioning, session-export, and founder-image files are not part of the open-source product.

Before changing repository visibility, remove that material from **Git history**, scan for credentials, review remaining third-party assets and research licensing, and confirm the security-reporting channel is enabled. Until then, treat this repository as a private transition branch.
