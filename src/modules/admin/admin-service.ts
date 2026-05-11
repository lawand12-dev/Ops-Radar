import type { RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/crypto";
import {
  adminDeleteUser,
  adminUpdatePasswordHash,
  adminUpdateUser,
  countAdmins,
  createUser,
  getUserByEmail,
  getUserById,
  listUsersForAdmin,
  toUserPublic,
  type UserPublic,
  type UserRecord
} from "../auth/user-repository";

/* ============================================================
   Admin: users
   ============================================================ */

export async function adminListUsers(input?: {
  limit?: number;
  offset?: number;
  query?: string;
}): Promise<{ items: UserPublic[]; count: number }> {
  const records = await listUsersForAdmin(input ?? {});
  return {
    items: records.map((u) => toUserPublic(u)),
    count: records.length
  };
}

export async function adminGetUser(userId: string): Promise<UserPublic> {
  const user = await getUserById(userId);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  return toUserPublic(user);
}

/**
 * Returns a richer per-user view tying together what the admin actually wants
 * to see at a glance: user public profile, project count, AI-interaction
 * counters (success/error/total), recent prompts. We compute this server-side
 * so the admin frontend can render a single-page dashboard without 6 round
 * trips per row.
 */
export async function adminGetUserDetail(userId: string): Promise<{
  user: UserPublic;
  projects_count: number;
  ai_interactions: { total: number; success: number; error: number; tokens_total: number };
  recent_prompts: Array<{
    id: number;
    provider: string;
    model: string;
    status: string;
    user_prompt_excerpt: string;
    response_excerpt: string;
    tokens_used: number | null;
    latency_ms: number | null;
    created_at: Date;
  }>;
}> {
  const userRecord = await getUserById(userId);
  if (!userRecord) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  const db = getDb();

  const [projectRows] = await dbQuery<Array<RowDataPacket & { total: number }>>(
    db,
    `SELECT COUNT(*) AS total FROM projects WHERE user_id = ?`,
    [userId]
  );
  const [statRows] = await dbQuery<
    Array<
      RowDataPacket & {
        total: number;
        success: number;
        error_count: number;
        tokens_total: number | null;
      }
    >
  >(
    db,
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count,
       SUM(COALESCE(tokens_used, 0)) AS tokens_total
     FROM ai_interactions
     WHERE user_id = ?`,
    [userId]
  );
  const [recentRows] = await dbQuery<
    Array<
      RowDataPacket & {
        id: number;
        provider: string;
        model: string;
        status: string;
        user_prompt: string;
        response: string;
        tokens_used: number | null;
        latency_ms: number | null;
        created_at: Date | string;
      }
    >
  >(
    db,
    `SELECT id, provider, model, status, user_prompt, response, tokens_used, latency_ms, created_at
     FROM ai_interactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 25`,
    [userId]
  );

  return {
    user: toUserPublic(userRecord),
    projects_count: Number(projectRows[0]?.total ?? 0),
    ai_interactions: {
      total: Number(statRows[0]?.total ?? 0),
      success: Number(statRows[0]?.success ?? 0),
      error: Number(statRows[0]?.error_count ?? 0),
      tokens_total: Number(statRows[0]?.tokens_total ?? 0)
    },
    recent_prompts: recentRows.map((r) => ({
      id: Number(r.id),
      provider: r.provider,
      model: r.model,
      status: r.status,
      // Truncate at the boundary so the JSON response doesn't ship megabytes
      // when the user pasted a giant prompt; the prompt-detail endpoint
      // serves the full text on demand.
      user_prompt_excerpt: String(r.user_prompt || "").slice(0, 500),
      response_excerpt: String(r.response || "").slice(0, 500),
      tokens_used: r.tokens_used,
      latency_ms: r.latency_ms,
      created_at: new Date(r.created_at)
    }))
  };
}

/**
 * Admin-side user creation. Doesn't return a JWT (the new user logs in
 * separately) — admins shouldn't be able to mint sessions on behalf of users.
 */
export async function adminCreateUser(input: {
  email: unknown;
  name: unknown;
  password: unknown;
  can_use_rag_agent?: boolean;
  is_admin?: boolean;
}): Promise<UserPublic> {
  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.name || "").trim();
  const password = String(input.password || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, "INVALID_EMAIL", "email is not a valid address.");
  }
  if (name.length < 2 || name.length > 120) {
    throw new AppError(400, "INVALID_NAME", "name must be 2-120 characters.");
  }
  if (password.length < 8) {
    throw new AppError(400, "INVALID_PASSWORD", "password must be at least 8 characters.");
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with that email already exists.");
  }

  const passwordHash = await hashPassword(password);
  const created = await createUser({ email, name, passwordHash });
  // Apply optional flags in a single follow-up update. Safe because the
  // new row is brand new and no other writer can race us on it.
  if (input.can_use_rag_agent === true || input.is_admin === true) {
    const updated = await adminUpdateUser(created.id, {
      canUseRagAgent: input.can_use_rag_agent === true ? true : undefined,
      isAdmin: input.is_admin === true ? true : undefined
    });
    return toUserPublic(updated);
  }
  return toUserPublic(created);
}

/**
 * Update a user's profile/permissions. Has two safety rails:
 *  - prevents the only admin from demoting themselves (system lockout)
 *  - admin cannot change another user's password directly here; password
 *    resets are a separate endpoint so the access path is auditable.
 */
export async function adminPatchUser(
  callerUserId: string,
  targetUserId: string,
  input: {
    name?: string;
    can_use_rag_agent?: boolean;
    is_admin?: boolean;
  }
): Promise<UserPublic> {
  const target = await getUserById(targetUserId);
  if (!target) throw new AppError(404, "USER_NOT_FOUND", "User not found.");

  // Lockout guard: refuse to demote the last admin, otherwise the platform
  // becomes unmanageable until someone runs a manual SQL fix.
  if (input.is_admin === false && target.is_admin) {
    const total = await countAdmins();
    if (total <= 1) {
      throw new AppError(
        409,
        "LAST_ADMIN_LOCKOUT",
        "Cannot remove admin from the last remaining admin account."
      );
    }
    // Prevent self-demotion while we're here — even with multiple admins
    // it's an easy way to lock yourself out of the admin UI.
    if (callerUserId === targetUserId) {
      throw new AppError(409, "SELF_DEMOTE", "Use another admin to demote yourself.");
    }
  }

  const updated = await adminUpdateUser(targetUserId, {
    name: input.name,
    canUseRagAgent: input.can_use_rag_agent,
    isAdmin: input.is_admin
  });
  return toUserPublic(updated);
}

export async function adminResetUserPassword(
  callerUserId: string,
  targetUserId: string,
  newPassword: unknown
): Promise<{ ok: true }> {
  void callerUserId;
  const password = String(newPassword || "");
  if (password.length < 8 || password.length > 256) {
    throw new AppError(400, "INVALID_PASSWORD", "password must be 8-256 characters.");
  }
  const target = await getUserById(targetUserId);
  if (!target) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  const hash = await hashPassword(password);
  await adminUpdatePasswordHash(targetUserId, hash);
  return { ok: true };
}

export async function adminRemoveUser(
  callerUserId: string,
  targetUserId: string
): Promise<{ deleted: boolean }> {
  if (callerUserId === targetUserId) {
    throw new AppError(409, "SELF_DELETE", "You cannot delete your own account.");
  }
  const target = await getUserById(targetUserId);
  if (!target) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  if (target.is_admin) {
    const total = await countAdmins();
    if (total <= 1) {
      throw new AppError(
        409,
        "LAST_ADMIN_LOCKOUT",
        "Cannot delete the last remaining admin account."
      );
    }
  }
  const ok = await adminDeleteUser(targetUserId);
  return { deleted: ok };
}

/* ============================================================
   Admin: AI interactions (full prompt + response log)
   ============================================================ */

export async function adminListAIInteractions(input?: {
  limit?: number;
  offset?: number;
  userId?: string;
  status?: "success" | "error";
  provider?: string;
}): Promise<{
  items: Array<{
    id: number;
    user_id: string | null;
    provider: string;
    model: string;
    status: string;
    user_prompt_excerpt: string;
    response_excerpt: string;
    error_message: string | null;
    tokens_used: number | null;
    latency_ms: number | null;
    created_at: Date;
  }>;
  count: number;
}> {
  const db = getDb();
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 500);
  const offset = Math.max(input?.offset ?? 0, 0);

  const where: string[] = [];
  const args: Array<string | number> = [];
  if (input?.userId) {
    where.push("user_id = ?");
    args.push(input.userId);
  }
  if (input?.status) {
    where.push("status = ?");
    args.push(input.status);
  }
  if (input?.provider) {
    where.push("provider = ?");
    args.push(input.provider);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        id: number;
        user_id: string | null;
        provider: string;
        model: string;
        status: string;
        user_prompt: string;
        response: string;
        error_message: string | null;
        tokens_used: number | null;
        latency_ms: number | null;
        created_at: Date | string;
      }
    >
  >(
    db,
    `SELECT id, user_id, provider, model, status, user_prompt, response, error_message, tokens_used, latency_ms, created_at
     FROM ai_interactions
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      user_id: r.user_id,
      provider: r.provider,
      model: r.model,
      status: r.status,
      user_prompt_excerpt: String(r.user_prompt || "").slice(0, 500),
      response_excerpt: String(r.response || "").slice(0, 500),
      error_message: r.error_message,
      tokens_used: r.tokens_used,
      latency_ms: r.latency_ms,
      created_at: new Date(r.created_at)
    })),
    count: rows.length
  };
}

export async function adminGetAIInteraction(id: number): Promise<{
  id: number;
  user_id: string | null;
  provider: string;
  model: string;
  status: string;
  system_prompt: string;
  user_prompt: string;
  response: string;
  raw_response: unknown;
  error_message: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: Date;
}> {
  const db = getDb();
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        id: number;
        user_id: string | null;
        provider: string;
        model: string;
        status: string;
        system_prompt: string;
        user_prompt: string;
        response: string;
        raw_response: string | null;
        error_message: string | null;
        tokens_used: number | null;
        latency_ms: number | null;
        created_at: Date | string;
      }
    >
  >(
    db,
    `SELECT id, user_id, provider, model, status, system_prompt, user_prompt, response, raw_response, error_message, tokens_used, latency_ms, created_at
     FROM ai_interactions
     WHERE id = ?`,
    [id]
  );
  const r = rows[0];
  if (!r) throw new AppError(404, "INTERACTION_NOT_FOUND", "AI interaction not found.");

  // raw_response is stored as JSON-string. Parse defensively — older rows or
  // truncated entries may not be valid JSON.
  let raw: unknown = null;
  if (typeof r.raw_response === "string" && r.raw_response.length > 0) {
    try { raw = JSON.parse(r.raw_response); } catch { raw = r.raw_response; }
  }

  return {
    id: Number(r.id),
    user_id: r.user_id,
    provider: r.provider,
    model: r.model,
    status: r.status,
    system_prompt: r.system_prompt,
    user_prompt: r.user_prompt,
    response: r.response,
    raw_response: raw,
    error_message: r.error_message,
    tokens_used: r.tokens_used,
    latency_ms: r.latency_ms,
    created_at: new Date(r.created_at)
  };
}

/* ============================================================
   Admin: cross-tenant projects + events + analytics
   ============================================================ */

export async function adminListAllProjects(input?: {
  limit?: number;
  offset?: number;
}): Promise<{
  items: Array<{
    id: string;
    user_id: string | null;
    user_email: string | null;
    name: string;
    description: string;
    status: string;
    n8n_workflow_id: string | null;
    workflow_status: string | null;
    created_at: Date;
  }>;
  count: number;
}> {
  const db = getDb();
  const limit = Math.min(Math.max(input?.limit ?? 200, 1), 1000);
  const offset = Math.max(input?.offset ?? 0, 0);
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        id: string;
        user_id: string | null;
        user_email: string | null;
        name: string;
        description: string;
        status: string;
        n8n_workflow_id: string | null;
        workflow_status: string | null;
        created_at: Date | string;
      }
    >
  >(
    db,
    `SELECT
       p.id,
       p.user_id,
       u.email AS user_email,
       p.name,
       p.description,
       p.status,
       w.n8n_workflow_id,
       w.status AS workflow_status,
       p.created_at
     FROM projects p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN (
       SELECT w1.* FROM workflows w1
       INNER JOIN (
         SELECT project_id, MAX(created_at) AS max_created
         FROM workflows GROUP BY project_id
       ) latest ON latest.project_id = w1.project_id AND latest.max_created = w1.created_at
     ) w ON w.project_id = p.id
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_email: r.user_email,
      name: r.name,
      description: r.description,
      status: r.status,
      n8n_workflow_id: r.n8n_workflow_id,
      workflow_status: r.workflow_status,
      created_at: new Date(r.created_at)
    })),
    count: rows.length
  };
}

export async function adminAnalyticsOverview(): Promise<{
  users_total: number;
  users_admin: number;
  users_with_rag: number;
  projects_total: number;
  workflows_total: number;
  ai_interactions_24h: number;
  ai_errors_24h: number;
  ai_tokens_24h: number;
}> {
  const db = getDb();
  const [u] = await dbQuery<
    Array<
      RowDataPacket & {
        users_total: number;
        users_admin: number;
        users_with_rag: number;
      }
    >
  >(
    db,
    `SELECT
       COUNT(*) AS users_total,
       SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) AS users_admin,
       SUM(CASE WHEN can_use_rag_agent = 1 THEN 1 ELSE 0 END) AS users_with_rag
     FROM users`
  );
  const [pw] = await dbQuery<
    Array<RowDataPacket & { projects_total: number; workflows_total: number }>
  >(
    db,
    `SELECT
       (SELECT COUNT(*) FROM projects) AS projects_total,
       (SELECT COUNT(*) FROM workflows) AS workflows_total`
  );
  const [ai] = await dbQuery<
    Array<
      RowDataPacket & {
        total: number;
        errors: number;
        tokens_total: number | null;
      }
    >
  >(
    db,
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
       SUM(COALESCE(tokens_used, 0)) AS tokens_total
     FROM ai_interactions
     WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL 1 DAY)`
  );

  return {
    users_total: Number(u[0]?.users_total ?? 0),
    users_admin: Number(u[0]?.users_admin ?? 0),
    users_with_rag: Number(u[0]?.users_with_rag ?? 0),
    projects_total: Number(pw[0]?.projects_total ?? 0),
    workflows_total: Number(pw[0]?.workflows_total ?? 0),
    ai_interactions_24h: Number(ai[0]?.total ?? 0),
    ai_errors_24h: Number(ai[0]?.errors ?? 0),
    ai_tokens_24h: Number(ai[0]?.tokens_total ?? 0)
  };
}

export type { UserPublic, UserRecord };
