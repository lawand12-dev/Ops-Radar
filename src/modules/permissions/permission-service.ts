import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import type { PermissionCheckResult, ToolName } from "./permission-types";

interface PermissionRow extends RowDataPacket {
  id: string;
  user_id: string;
  tool_name: string;
  granted_by: string;
  granted_at: Date | string;
}

interface UserFlagsRow extends RowDataPacket {
  is_admin: number;
  is_super_admin: number;
}

export async function checkToolPermission(
  userId: string,
  toolName: ToolName
): Promise<PermissionCheckResult> {
  // Load user flags
  const [flagRows] = await dbQuery<UserFlagsRow[]>(
    getDb(),
    `SELECT is_admin, is_super_admin FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  const flags = flagRows[0];
  if (!flags) {
    return { outcome: "denied", reason: "USER_NOT_FOUND" };
  }

  // Super-admins can use any tool
  if (Boolean(flags.is_super_admin)) {
    return { outcome: "granted", reason: "super_admin" };
  }

  // Regular admins can use any tool too (all agent routes require admin)
  if (Boolean(flags.is_admin)) {
    return { outcome: "granted", reason: "admin" };
  }

  // Otherwise check admin_permissions table for explicit grant
  const [permRows] = await dbQuery<PermissionRow[]>(
    getDb(),
    `SELECT id FROM admin_permissions WHERE user_id = ? AND tool_name = ? LIMIT 1`,
    [userId, toolName]
  );
  if (permRows.length > 0) {
    return { outcome: "granted", reason: "explicit_grant" };
  }

  logWarn("permissions", "Tool access denied", { user_id: userId, tool_name: toolName });
  return { outcome: "denied", reason: "NOT_PERMITTED" };
}

export async function grantToolPermission(
  grantedBy: string,
  targetUserId: string,
  toolName: ToolName
): Promise<void> {
  await dbQuery(
    getDb(),
    `INSERT IGNORE INTO admin_permissions (id, user_id, tool_name, granted_by)
     VALUES (?, ?, ?, ?)`,
    [randomUUID(), targetUserId, toolName, grantedBy]
  );
  logInfo("permissions", "Tool permission granted", {
    granted_by: grantedBy,
    user_id: targetUserId,
    tool_name: toolName
  });
}

export async function revokeToolPermission(
  targetUserId: string,
  toolName: ToolName
): Promise<void> {
  await dbQuery(
    getDb(),
    `DELETE FROM admin_permissions WHERE user_id = ? AND tool_name = ?`,
    [targetUserId, toolName]
  );
  logInfo("permissions", "Tool permission revoked", {
    user_id: targetUserId,
    tool_name: toolName
  });
}

export async function listUserPermissions(userId: string): Promise<string[]> {
  const [rows] = await dbQuery<PermissionRow[]>(
    getDb(),
    `SELECT tool_name FROM admin_permissions WHERE user_id = ? ORDER BY tool_name`,
    [userId]
  );
  return rows.map((r) => r.tool_name);
}

export async function setSuperAdmin(userId: string, value: boolean): Promise<void> {
  await dbQuery(
    getDb(),
    `UPDATE users SET is_super_admin = ? WHERE id = ?`,
    [value ? 1 : 0, userId]
  );
}
