import { logInfo, logWarn, logError } from "../../lib/logger";
import { dbQuery, getDb } from "../../lib/db";
import { generateReport } from "./report-service";
import type { RowDataPacket } from "mysql2/promise";

// Generates reports for users who haven't received one in the configured window.
// Called from src/index.ts when REPORTS_ENABLED=true.

const REPORTS_SCHEDULE_HOURS = parseInt(process.env["REPORTS_SCHEDULE_HOURS"] ?? "24", 10);
const REPORTS_ENABLED = process.env["REPORTS_ENABLED"] === "true";

export function startReportCron(): void {
  if (!REPORTS_ENABLED) {
    logInfo("reports", "Report cron disabled (REPORTS_ENABLED not set)");
    return;
  }

  const intervalMs = Math.max(3600000, REPORTS_SCHEDULE_HOURS * 3600000);
  logInfo("reports", `Report cron started — interval ${REPORTS_SCHEDULE_HOURS}h`);

  // Run once immediately at startup (helps with dev testing)
  setImmediate(() =>
    runReportCycle().catch((err) =>
      logWarn("reports", "Initial report cycle failed", {
        error: err instanceof Error ? err.message : String(err)
      })
    )
  );

  setInterval(() => {
    runReportCycle().catch((err) =>
      logWarn("reports", "Report cycle failed", {
        error: err instanceof Error ? err.message : String(err)
      })
    );
  }, intervalMs);
}

async function runReportCycle(): Promise<void> {
  // Wrap the entire cycle so a missing users/ai_reports table never crashes the process.
  try {
    type UserRow = RowDataPacket & { id: string; email: string };

    const [users] = await dbQuery<UserRow[]>(
      getDb(),
      `SELECT u.id, u.email
         FROM users u
         LEFT JOIN ai_reports r ON r.user_id = u.id
           AND r.created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
        WHERE r.id IS NULL
          AND u.email IS NOT NULL
        LIMIT 50`,
      [REPORTS_SCHEDULE_HOURS]
    );

    if (users.length === 0) {
      logInfo("reports", "No users due for scheduled reports");
      return;
    }

    logInfo("reports", `Generating scheduled reports for ${users.length} users`);

    for (const user of users) {
      try {
        await generateReport({
          userId: user.id,
          userEmail: user.email,
          reportType: "executive_summary",
          sendEmail: Boolean(process.env["RESEND_API_KEY"])
        });
      } catch (err) {
        logWarn("reports", "Failed to generate report for user", {
          user_id: user.id,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  } catch (err) {
    logError("reports", "Report cycle database error", {
      error: err instanceof Error ? err.message : String(err)
    });
  }
}
