import { randomUUID } from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import type { ProjectRecord, ProjectStatus } from "../../types/workflow";

type ProjectRow = RowDataPacket & {
  id: string;
  user_id: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    name: row.name,
    description: row.description,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

const PROJECT_COLUMNS =
  "id, user_id, name, description, status, created_at, updated_at";

export async function createProject(
  input: {
    name: string;
    description: string;
    status?: ProjectStatus;
    userId?: string | null;
  },
  connection?: PoolConnection
): Promise<ProjectRecord> {
  const id = randomUUID();
  const status = input.status ?? "draft";
  const runner = connection ?? getDb();
  const userId = input.userId ?? null;

  await dbQuery(
    runner,
    `INSERT INTO projects (id, user_id, name, description, status)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, input.name, input.description, status]
  );

  const project = await getProjectById(id, connection);
  if (!project) {
    throw new AppError(500, "PROJECT_INSERT_FAILED", "Project insert failed.");
  }

  return project;
}

/**
 * Fetches a project by id with NO ownership check. Used by background tasks
 * (monitoring scheduler, event ingest) that don't run inside an auth context.
 * Authenticated read paths must use `getProjectByIdForUser` instead.
 */
export async function getProjectById(
  id: string,
  connection?: PoolConnection
): Promise<ProjectRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<ProjectRow[]>(
    runner,
    `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`,
    [id]
  );
  const row = rows[0];
  return row ? mapProjectRow(row) : null;
}

/**
 * Fetches a project only if it belongs to the given user. Returns null when
 * the project doesn't exist OR exists but is owned by someone else — the
 * caller cannot distinguish the two, which prevents id-enumeration leaks.
 */
export async function getProjectByIdForUser(
  id: string,
  userId: string,
  connection?: PoolConnection
): Promise<ProjectRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<ProjectRow[]>(
    runner,
    `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  const row = rows[0];
  return row ? mapProjectRow(row) : null;
}

/**
 * Fetches every project owned by a user, newest first. Used by the
 * /service/* layer to render a user-scoped automation list without going
 * through the per-project lookup path.
 */
export async function listProjectsByUserId(
  userId: string,
  connection?: PoolConnection
): Promise<ProjectRecord[]> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<ProjectRow[]>(
    runner,
    `SELECT ${PROJECT_COLUMNS}
     FROM projects
     WHERE user_id = ?
     ORDER BY updated_at DESC, created_at DESC`,
    [userId]
  );
  return rows.map((row) => mapProjectRow(row));
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(runner, `UPDATE projects SET status = ? WHERE id = ?`, [status, id]);
}

/**
 * Lists projects without ownership filter. Reserved for admin / background use.
 * Tenant-scoped reads should call `listProjectsForUser`.
 */
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
    `SELECT ${PROJECT_COLUMNS}
     FROM projects
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return rows.map((row) => mapProjectRow(row));
}

export async function listProjectsForUser(
  userId: string,
  input: { limit?: number; offset?: number } = {}
): Promise<ProjectRecord[]> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const [rows] = await dbQuery<ProjectRow[]>(
    db,
    `SELECT ${PROJECT_COLUMNS}
     FROM projects
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows.map((row) => mapProjectRow(row));
}

export async function deleteProjectById(id: string, connection?: PoolConnection): Promise<boolean> {
  const runner = connection ?? getDb();
  const [result] = await dbQuery<ResultSetHeader>(runner, `DELETE FROM projects WHERE id = ?`, [id]);
  return Number(result.affectedRows ?? 0) > 0;
}
