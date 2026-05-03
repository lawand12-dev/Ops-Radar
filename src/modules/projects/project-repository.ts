import { randomUUID } from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import type { ProjectRecord, ProjectStatus } from "../../types/workflow";

type ProjectRow = RowDataPacket &
  ProjectRecord & {
    created_at: string | Date;
    updated_at: string | Date;
  };

function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

export async function createProject(
  input: {
    name: string;
    description: string;
    status?: ProjectStatus;
  },
  connection?: PoolConnection
): Promise<ProjectRecord> {
  const id = randomUUID();
  const status = input.status ?? "draft";
  const runner = connection ?? getDb();

  await dbQuery(
    runner,
    `INSERT INTO projects (id, name, description, status)
     VALUES (?, ?, ?, ?)`,
    [id, input.name, input.description, status]
  );

  const project = await getProjectById(id, connection);
  if (!project) {
    throw new AppError(500, "PROJECT_INSERT_FAILED", "Project insert failed.");
  }

  return project;
}

export async function getProjectById(
  id: string,
  connection?: PoolConnection
): Promise<ProjectRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<ProjectRow[]>(
    runner,
    `SELECT id, name, description, status, created_at, updated_at
     FROM projects
     WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapProjectRow(row);
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(runner, `UPDATE projects SET status = ? WHERE id = ?`, [status, id]);
}

export async function listProjects(
  input: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<ProjectRecord[]> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const [rows] = await dbQuery<ProjectRow[]>(
    db,
    `SELECT id, name, description, status, created_at, updated_at
     FROM projects
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return rows.map((row) => mapProjectRow(row));
}

export async function deleteProjectById(id: string, connection?: PoolConnection): Promise<boolean> {
  const runner = connection ?? getDb();
  const [result] = await dbQuery<ResultSetHeader>(runner, `DELETE FROM projects WHERE id = ?`, [id]);
  return Number(result.affectedRows ?? 0) > 0;
}
