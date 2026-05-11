import type { RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { getRequestContext } from "../../lib/request-context";
import { getUserHealthBreakdown, getUserRunStats } from "../events/event-repository";

/**
 * Returns the dashboard analytics snapshot scoped to the authenticated user.
 *
 * Every query here filters on `projects.user_id` (directly or via JOIN) so a
 * tenant only sees their own projects, workflows, runs, and alerts. The
 * helpers `getUserRunStats` / `getUserHealthBreakdown` enforce the same scope
 * on event-level aggregates.
 */
export async function getAnalyticsSnapshot() {
  const ctx = getRequestContext();
  if (!ctx) {
    // /analytics is gated by requireAuth, so this only fires if someone wires
    // the route without the middleware. Better to fail loudly than to silently
    // return the global view.
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
  }
  const userId = ctx.userId;
  const db = getDb();

  const [projectCountRows] = await dbQuery<Array<RowDataPacket & { total: number }>>(
    db,
    `SELECT COUNT(*) AS total FROM projects WHERE user_id = ?`,
    [userId]
  );
  const [workflowCountRows] = await dbQuery<Array<RowDataPacket & { total: number }>>(
    db,
    `SELECT COUNT(*) AS total
     FROM workflows w
     INNER JOIN projects p ON p.id = w.project_id
     WHERE p.user_id = ?`,
    [userId]
  );

  const [topWorkflowRows] = await dbQuery<
    Array<
      RowDataPacket & {
        workflow_id: string;
        project_id: string;
        project_name: string;
        last_event_type: string | null;
        failed_runs: number;
        total_runs: number;
        unresolved_alerts: number;
      }
    >
  >(
    db,
    `SELECT
      w.id AS workflow_id,
      w.project_id AS project_id,
      p.name AS project_name,
      (
        SELECT we.event_type
        FROM workflow_events we
        WHERE we.workflow_id = w.id
          AND we.event_type IN (
            'run_failed','run_succeeded',
            'workflow_execution_failed','workflow_execution_success'
          )
        ORDER BY we.created_at DESC
        LIMIT 1
      ) AS last_event_type,
      (
        SELECT COUNT(*)
        FROM workflow_events we
        WHERE we.workflow_id = w.id
          AND we.event_type IN ('run_failed','workflow_execution_failed')
      ) AS failed_runs,
      (
        SELECT COUNT(*)
        FROM workflow_events we
        WHERE we.workflow_id = w.id
          AND we.event_type IN (
            'run_failed','run_succeeded',
            'workflow_execution_failed','workflow_execution_success'
          )
      ) AS total_runs,
      (
        SELECT COUNT(*)
        FROM workflow_alerts wa
        WHERE wa.workflow_id = w.id
          AND wa.status = 'open'
      ) AS unresolved_alerts
    FROM workflows w
    INNER JOIN projects p ON p.id = w.project_id
    WHERE p.user_id = ?
    ORDER BY unresolved_alerts DESC, failed_runs DESC, total_runs DESC
    LIMIT 20`,
    [userId]
  );

  const [runStats, healthBreakdown, unresolvedAlertRows] = await Promise.all([
    getUserRunStats(userId),
    getUserHealthBreakdown(userId),
    dbQuery<Array<RowDataPacket & { total: number }>>(
      db,
      `SELECT COUNT(*) AS total
       FROM workflow_alerts wa
       INNER JOIN workflows w ON w.id = wa.workflow_id
       INNER JOIN projects p ON p.id = w.project_id
       WHERE wa.status = 'open' AND p.user_id = ?`,
      [userId]
    )
  ]);

  const unresolvedAlerts = Number(unresolvedAlertRows[0][0]?.total ?? 0);

  return {
    overview: {
      total_projects: Number(projectCountRows[0]?.total ?? 0),
      total_workflows: Number(workflowCountRows[0]?.total ?? 0),
      total_runs: runStats.totalRuns,
      failed_runs: runStats.failedRuns,
      success_rate: Number(runStats.successRate.toFixed(2)),
      average_duration_ms: Math.round(runStats.averageDurationMs),
      unresolved_alerts: unresolvedAlerts,
      healthy_workflows: healthBreakdown.healthyWorkflows,
      unhealthy_workflows: healthBreakdown.unhealthyWorkflows
    },
    workflows_health: topWorkflowRows.map((row) => ({
      workflow_id: row.workflow_id,
      project_id: row.project_id,
      project_name: row.project_name,
      is_working:
        row.last_event_type !== "run_failed" &&
        row.last_event_type !== "workflow_execution_failed" &&
        Number(row.unresolved_alerts) === 0,
      last_run_status:
        row.last_event_type === "run_failed" || row.last_event_type === "workflow_execution_failed"
          ? "failure"
          : row.last_event_type === "run_succeeded" || row.last_event_type === "workflow_execution_success"
            ? "success"
            : "unknown",
      failed_runs: Number(row.failed_runs),
      total_runs: Number(row.total_runs),
      unresolved_alerts: Number(row.unresolved_alerts)
    }))
  };
}
