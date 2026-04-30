import type { RowDataPacket } from "mysql2/promise";
import { getDb } from "../../lib/db";
import { countAllUnresolvedAlerts } from "../alerts/alert-repository";
import { getGlobalHealthBreakdown, getGlobalRunStats } from "../events/event-repository";

export async function getAnalyticsSnapshot() {
  const db = getDb();

  const [projectCountRows] = await db.query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total FROM projects`
  );
  const [workflowCountRows] = await db.query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total FROM workflows`
  );

  const [topWorkflowRows] = await db.query<
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
    `SELECT
      w.id AS workflow_id,
      w.project_id AS project_id,
      p.name AS project_name,
      (
        SELECT we.event_type
        FROM workflow_events we
        WHERE we.workflow_id = w.id
          AND we.event_type IN ('run_failed', 'run_succeeded')
        ORDER BY we.created_at DESC
        LIMIT 1
      ) AS last_event_type,
      (
        SELECT COUNT(*)
        FROM workflow_events we
        WHERE we.workflow_id = w.id
          AND we.event_type = 'run_failed'
      ) AS failed_runs,
      (
        SELECT COUNT(*)
        FROM workflow_events we
        WHERE we.workflow_id = w.id
          AND we.event_type IN ('run_failed', 'run_succeeded')
      ) AS total_runs,
      (
        SELECT COUNT(*)
        FROM alerts a
        WHERE a.workflow_id = w.id
          AND a.is_resolved = 0
      ) AS unresolved_alerts
    FROM workflows w
    INNER JOIN projects p ON p.id = w.project_id
    ORDER BY unresolved_alerts DESC, failed_runs DESC, total_runs DESC
    LIMIT 20`
  );

  const [runStats, unresolvedAlerts, healthBreakdown] = await Promise.all([
    getGlobalRunStats(),
    countAllUnresolvedAlerts(),
    getGlobalHealthBreakdown()
  ]);

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
      is_working: row.last_event_type !== "run_failed" && Number(row.unresolved_alerts) === 0,
      last_run_status:
        row.last_event_type === "run_failed"
          ? "failure"
          : row.last_event_type === "run_succeeded"
            ? "success"
            : "unknown",
      failed_runs: Number(row.failed_runs),
      total_runs: Number(row.total_runs),
      unresolved_alerts: Number(row.unresolved_alerts)
    }))
  };
}
