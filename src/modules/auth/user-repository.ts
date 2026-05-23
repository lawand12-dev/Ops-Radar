import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";

export type UserRow = RowDataPacket & {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  n8n_base_url: string | null;
  n8n_api_key_encrypted: string | null;
  anthropic_api_key_encrypted: string | null;
  composio_api_key_encrypted: string | null;
  can_use_rag_agent: number | boolean;
  is_admin: number | boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  n8n_base_url: string | null;
  n8n_api_key_encrypted: string | null;
  anthropic_api_key_encrypted: string | null;
  composio_api_key_encrypted: string | null;
  /**
   * Permission flag granted by the operator (no self-service). When true AND
   * the platform has env.RAG_AGENT_URL + env.RAG_AGENT_API_KEY configured, the
   * user's workflow generation is routed through the shared RAG agent instead
   * of the regular Anthropic + knowledge-base prompt path.
   */
  can_use_rag_agent: boolean;
  /** Admin flag. Bootstrapped from env.ADMIN_EMAIL on server start; can be
   *  promoted from the admin UI. Gates every /admin/* endpoint. */
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Public-safe view of a user — never carries the password hash or the
 * encrypted credential blobs. We surface `has_*` booleans so the UI can
 * render "credential set / not set" without ever needing the value back.
 */
export interface UserPublic {
  id: string;
  email: string;
  name: string;
  n8n_base_url: string | null;
  has_n8n_api_key: boolean;
  has_anthropic_api_key: boolean;
  has_composio_api_key: boolean;
  /** Operator-granted permission to route workflow generation through the
   *  shared RAG agent (effective only when the platform has env.RAG_AGENT_*
   *  configured). Surfaced so the frontend can render a "RAG active" badge
   *  and skip the prompt-tip UI for those users. */
  can_use_rag_agent: boolean;
  /** Admin flag — surfaced so the frontend can show/hide the Admin nav
   *  section. Backend never trusts this field on the wire; admin gating is
   *  re-checked from the DB row on every protected request. */
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    password_hash: row.password_hash,
    n8n_base_url: row.n8n_base_url,
    n8n_api_key_encrypted: row.n8n_api_key_encrypted,
    anthropic_api_key_encrypted: row.anthropic_api_key_encrypted,
    composio_api_key_encrypted: row.composio_api_key_encrypted ?? null,
    // MySQL TINYINT(1) round-trips as either number (1/0) or boolean depending
    // on the driver build, so coerce defensively.
    can_use_rag_agent: Boolean(row.can_use_rag_agent),
    is_admin: Boolean(row.is_admin),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

export function toUserPublic(user: UserRecord): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    n8n_base_url: user.n8n_base_url,
    has_n8n_api_key: Boolean(user.n8n_api_key_encrypted),
    has_anthropic_api_key: Boolean(user.anthropic_api_key_encrypted),
    has_composio_api_key: Boolean(user.composio_api_key_encrypted),
    can_use_rag_agent: user.can_use_rag_agent,
    is_admin: user.is_admin,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

export async function createUser(
  input: {
    email: string;
    name: string;
    passwordHash: string;
  },
  connection?: PoolConnection
): Promise<UserRecord> {
  const id = randomUUID();
  const runner = connection ?? getDb();

  await dbQuery(
    runner,
    `INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)`,
    [id, input.email, input.name, input.passwordHash]
  );

  const created = await getUserById(id, connection);
  if (!created) {
    throw new AppError(500, "USER_INSERT_FAILED", "User insert failed.");
  }
  return created;
}

export async function getUserById(id: string, connection?: PoolConnection): Promise<UserRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<UserRow[]>(
    runner,
    `SELECT id, email, name, password_hash, n8n_base_url, n8n_api_key_encrypted, anthropic_api_key_encrypted, composio_api_key_encrypted, can_use_rag_agent, is_admin, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapUserRow(row) : null;
}

export async function getUserByEmail(
  email: string,
  connection?: PoolConnection
): Promise<UserRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<UserRow[]>(
    runner,
    `SELECT id, email, name, password_hash, n8n_base_url, n8n_api_key_encrypted, anthropic_api_key_encrypted, composio_api_key_encrypted, can_use_rag_agent, is_admin, created_at, updated_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  const row = rows[0];
  return row ? mapUserRow(row) : null;
}

/**
 * Updates the per-user external credentials. Each field is independently
 * optional: passing `undefined` leaves the column untouched, passing `null`
 * clears it, passing a string updates it.
 */
export async function updateUserCredentials(
  id: string,
  input: {
    n8nBaseUrl?: string | null;
    n8nApiKeyEncrypted?: string | null;
    anthropicApiKeyEncrypted?: string | null;
    composioApiKeyEncrypted?: string | null;
  },
  connection?: PoolConnection
): Promise<UserRecord> {
  const runner = connection ?? getDb();

  const sets: string[] = [];
  const values: Array<string | null> = [];

  if (input.n8nBaseUrl !== undefined) {
    sets.push("n8n_base_url = ?");
    values.push(input.n8nBaseUrl);
  }
  if (input.n8nApiKeyEncrypted !== undefined) {
    sets.push("n8n_api_key_encrypted = ?");
    values.push(input.n8nApiKeyEncrypted);
  }
  if (input.anthropicApiKeyEncrypted !== undefined) {
    sets.push("anthropic_api_key_encrypted = ?");
    values.push(input.anthropicApiKeyEncrypted);
  }
  if (input.composioApiKeyEncrypted !== undefined) {
    sets.push("composio_api_key_encrypted = ?");
    values.push(input.composioApiKeyEncrypted);
  }

  if (sets.length > 0) {
    await dbQuery(
      runner,
      `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
      [...values, id]
    );
  }

  const refreshed = await getUserById(id, connection);
  if (!refreshed) {
    throw new AppError(404, "USER_NOT_FOUND", "User no longer exists.");
  }
  return refreshed;
}

/* ============================================================
   Admin-only helpers (un-scoped reads + flag/profile mutations)
   ============================================================ */

/**
 * List users for the admin console. Filters and pagination are intentionally
 * minimal — the admin UI does most filtering client-side over a 200-row page.
 */
export async function listUsersForAdmin(input: {
  limit?: number;
  offset?: number;
  query?: string;
} = {}): Promise<UserRecord[]> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const q = input.query?.trim();
  const wherePart = q ? "WHERE email LIKE ? OR name LIKE ?" : "";
  const args: Array<string | number> = q ? [`%${q}%`, `%${q}%`] : [];

  const [rows] = await dbQuery<UserRow[]>(
    db,
    `SELECT id, email, name, password_hash, n8n_base_url, n8n_api_key_encrypted, anthropic_api_key_encrypted, composio_api_key_encrypted, can_use_rag_agent, is_admin, created_at, updated_at
     FROM users
     ${wherePart}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map((row) => mapUserRow(row));
}

/**
 * Admin profile/permission update. Each field is independently optional.
 * Password change uses a separate helper because it needs the hashed value
 * and we never want it accidentally interleaved with profile fields.
 */
export async function adminUpdateUser(
  id: string,
  input: {
    name?: string;
    canUseRagAgent?: boolean;
    isAdmin?: boolean;
  }
): Promise<UserRecord> {
  const db = getDb();
  const sets: string[] = [];
  const values: Array<string | number> = [];

  if (input.name !== undefined) {
    const trimmed = String(input.name).trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      throw new AppError(400, "INVALID_NAME", "name must be 2-120 characters.");
    }
    sets.push("name = ?");
    values.push(trimmed);
  }
  if (input.canUseRagAgent !== undefined) {
    sets.push("can_use_rag_agent = ?");
    values.push(input.canUseRagAgent ? 1 : 0);
  }
  if (input.isAdmin !== undefined) {
    sets.push("is_admin = ?");
    values.push(input.isAdmin ? 1 : 0);
  }

  if (sets.length === 0) {
    const existing = await getUserById(id);
    if (!existing) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
    return existing;
  }

  await dbQuery(db, `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  const refreshed = await getUserById(id);
  if (!refreshed) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  return refreshed;
}

export async function adminUpdatePasswordHash(id: string, passwordHash: string): Promise<void> {
  const db = getDb();
  await dbQuery(db, `UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, id]);
}

export async function adminDeleteUser(id: string): Promise<boolean> {
  const db = getDb();
  const [r] = await dbQuery<import("mysql2/promise").ResultSetHeader>(
    db,
    `DELETE FROM users WHERE id = ?`,
    [id]
  );
  return Number(r.affectedRows ?? 0) > 0;
}

export async function countAdmins(): Promise<number> {
  const db = getDb();
  const [rows] = await dbQuery<Array<RowDataPacket & { total: number }>>(
    db,
    `SELECT COUNT(*) AS total FROM users WHERE is_admin = 1`
  );
  return Number(rows[0]?.total ?? 0);
}
