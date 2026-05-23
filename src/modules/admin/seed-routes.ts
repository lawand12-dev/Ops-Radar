import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { AppError } from "../../lib/errors";
import { dbQuery, getDb } from "../../lib/db";
import { logInfo } from "../../lib/logger";
import { requireAdmin } from "../auth/auth-middleware";

const seedRoutes = new Hono();
seedRoutes.use("*", requireAdmin);

// POST /admin/seed
// Inserts sample company_brain_documents and ai_reports for the requesting admin user
// to demonstrate the system capabilities.
seedRoutes.post("/", async (c) => {
  // Get the first non-admin user or the admin user as the seed target
  type UserRow = RowDataPacket & { id: string; email: string };
  const [users] = await dbQuery<UserRow[]>(
    getDb(),
    `SELECT id, email FROM users ORDER BY created_at ASC LIMIT 5`
  );

  if (users.length === 0) {
    throw new AppError(400, "NO_USERS", "No users found to seed data for.");
  }

  let seededDocuments = 0;
  let seededReports = 0;

  const SAMPLE_DOCUMENTS = [
    {
      title: "Q4 Revenue Overview",
      source_kind: "document",
      content: "Total Q4 revenue reached $2.4M, representing a 12% increase YoY. SaaS ARR grew to $1.8M. Customer churn reduced to 3.2% from 4.8% last quarter. Top performing segment: Enterprise (62% of revenue). Pipeline for Q1 stands at $900K with 15 qualified opportunities."
    },
    {
      title: "Team Capacity Report",
      source_kind: "document",
      content: "Engineering team at 85% capacity. DevOps is at 110% (overloaded — 2 open headcount). Sales team closed 8 new accounts this month vs target of 6. Customer Success managing 45 active accounts with 3 at risk (Acme Corp, TechStart, BuildFast). Next sprint planning on Friday."
    },
    {
      title: "Client Risk Assessment - November",
      source_kind: "document",
      content: "HIGH RISK: Acme Corp ($180K ARR) — missed 3 quarterly reviews, no product usage for 14 days, renewal due in 45 days. MEDIUM RISK: TechStart ($45K ARR) — support tickets up 40%, requested downgrade. LOW RISK: BuildFast ($90K ARR) — healthy usage, expansion opportunity identified."
    },
    {
      title: "Operational Bottlenecks - Weekly",
      source_kind: "meeting",
      content: "Deployment pipeline averaging 47 minutes (target: 20 min). Root cause: integration test suite bloated with 340 flaky tests. Auth service experiencing P99 latency spikes at 3AM UTC. Payroll processing delayed by 2 days due to manual approval bottleneck — automation candidate. Recommend: assign 2 engineers to CI/CD optimization sprint."
    },
    {
      title: "Strategic Priorities - CEO Brief",
      source_kind: "document",
      content: "Priority 1: Close Series A by Q1 end ($5M target, 2 term sheets in negotiation). Priority 2: Launch EU market — GDPR compliance gate is the blocker. Priority 3: Reduce CAC from $1,800 to $1,200 through PLG motion. Priority 4: Automate payroll pipeline to reduce ops overhead by 15 hours/week. Key board metrics: NRR > 110%, CAC Payback < 18 months."
    }
  ];

  const SAMPLE_REPORTS = [
    {
      report_type: "executive_summary",
      title: "Weekly Executive Summary — Sample",
      content: "<h2>Executive Summary</h2><p>This week showed strong operational performance across most metrics. Revenue pipeline remains healthy at $900K for Q1.</p><h2>Key Metrics</h2><ul><li>ARR: $1.8M (+8% MoM)</li><li>Active Workflows: 127</li><li>System Uptime: 99.94%</li></ul><h2>Risks &amp; Issues</h2><ul><li>3 clients flagged as at-risk (see CRM)</li><li>DevOps team capacity at 110%</li></ul><h2>Recommendations</h2><ul><li>Schedule urgent review with Acme Corp CSM</li><li>Approve DevOps headcount request</li></ul>"
    },
    {
      report_type: "risk_analysis",
      title: "Risk Analysis Report — Sample",
      content: "<h2>Executive Summary</h2><p>Current risk posture: MEDIUM. Three client relationships require immediate attention.</p><h2>Key Metrics</h2><ul><li>Clients at risk: 3 ($315K ARR combined)</li><li>Operational risks: 2 (DevOps overload, CI/CD latency)</li></ul><h2>Risks &amp; Issues</h2><ul><li>Acme Corp renewal at risk — 45 days to act</li><li>Auth service latency spikes unresolved</li></ul><h2>Recommendations</h2><ul><li>Assign dedicated CSM to Acme Corp account</li><li>Investigate and resolve auth service P99 spikes</li></ul>"
    }
  ];

  for (const user of users.slice(0, 3)) {
    // Seed documents
    for (const doc of SAMPLE_DOCUMENTS) {
      const id = randomUUID();
      await dbQuery(getDb(), `
        INSERT IGNORE INTO company_brain_documents
          (id, user_id, title, source_kind, content_excerpt, content_chars, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, user.id, doc.title, doc.source_kind, doc.content.slice(0, 500), doc.content.length, null]
      );
      seededDocuments++;
    }

    // Seed reports
    for (const report of SAMPLE_REPORTS) {
      const id = randomUUID();
      await dbQuery(getDb(), `
        INSERT IGNORE INTO ai_reports
          (id, user_id, report_type, title, content, content_chars)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [id, user.id, report.report_type, report.title, report.content, report.content.length]
      );
      seededReports++;
    }
  }

  logInfo("seed", "Sample data seeded", { seededDocuments, seededReports, userCount: Math.min(users.length, 3) });

  return c.json({
    seeded_documents: seededDocuments,
    seeded_reports: seededReports,
    user_count: Math.min(users.length, 3),
    message: "Sample data seeded successfully."
  }, 201);
});

export default seedRoutes;
