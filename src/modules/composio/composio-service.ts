import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { encryptSecret, decryptSecret } from "../../lib/crypto";
import { updateUserCredentials } from "../auth/user-repository";
import {
  composioListApps,
  composioListConnectedAccounts,
  composioInitiateConnection,
  composioListActions,
  composioExecuteAction,
  composioDeleteConnectedAccount,
  type ComposioApp,
  type ComposioConnectedAccount,
  type ComposioAction,
  type ComposioExecuteResult
} from "./composio-client";

// ---------------------------------------------------------------------------
// Credential management
// ---------------------------------------------------------------------------

export async function saveComposioApiKey(
  userId: string,
  apiKey: string
): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new AppError(400, "COMPOSIO_KEY_BLANK", "Composio API key must not be blank.");
  }
  const encrypted = encryptSecret(trimmed);
  await updateUserCredentials(userId, { composioApiKeyEncrypted: encrypted });
  logInfo("composio", "Composio API key saved", { user_id: userId });
}

export async function removeComposioApiKey(userId: string): Promise<void> {
  await updateUserCredentials(userId, { composioApiKeyEncrypted: null });
  logInfo("composio", "Composio API key removed", { user_id: userId });
}

function requireComposioKey(composioApiKey: string | null | undefined): string {
  const key = composioApiKey?.trim();
  if (!key) {
    throw new AppError(
      400,
      "COMPOSIO_NOT_CONFIGURED",
      "Composio API key not set. Go to Account → Integrations to add your key."
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------

export async function listComposioApps(composioApiKey: string | null): Promise<ComposioApp[]> {
  const key = requireComposioKey(composioApiKey);
  return composioListApps(key);
}

// ---------------------------------------------------------------------------
// Connected accounts
// ---------------------------------------------------------------------------

interface ConnectedAccountRow extends RowDataPacket {
  id: string;
  user_id: string;
  composio_account_id: string;
  app_name: string;
  status: string;
  meta: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LocalConnectedAccount {
  id: string;
  composio_account_id: string;
  app_name: string;
  status: string;
  created_at: string;
}

export async function getConnectedAccounts(userId: string): Promise<LocalConnectedAccount[]> {
  const [rows] = await dbQuery<ConnectedAccountRow[]>(
    getDb(),
    `SELECT id, composio_account_id, app_name, status, created_at
     FROM composio_connected_accounts
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    composio_account_id: r.composio_account_id,
    app_name: r.app_name,
    status: r.status,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
  }));
}

export async function syncConnectedAccounts(
  userId: string,
  composioApiKey: string | null
): Promise<ComposioConnectedAccount[]> {
  const key = requireComposioKey(composioApiKey);
  const remote = await composioListConnectedAccounts(key, userId);

  for (const acct of remote) {
    const existing = await dbQuery<ConnectedAccountRow[]>(
      getDb(),
      `SELECT id FROM composio_connected_accounts WHERE user_id = ? AND app_name = ?`,
      [userId, acct.appName]
    );
    const [rows] = existing;

    if (rows.length === 0) {
      await dbQuery(
        getDb(),
        `INSERT INTO composio_connected_accounts
           (id, user_id, composio_account_id, app_name, status)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), userId, acct.id, acct.appName, acct.status]
      );
    } else {
      await dbQuery(
        getDb(),
        `UPDATE composio_connected_accounts SET composio_account_id = ?, status = ? WHERE id = ?`,
        [acct.id, acct.status, rows[0]!.id]
      );
    }
  }

  return remote;
}

export async function initiateConnection(
  userId: string,
  composioApiKey: string | null,
  input: { appName: string; redirectUri?: string }
): Promise<{ redirectUrl: string; connectedAccountId: string }> {
  const key = requireComposioKey(composioApiKey);
  const result = await composioInitiateConnection(key, {
    appName: input.appName,
    entityId: userId,
    redirectUri: input.redirectUri
  });
  logInfo("composio", "Connection initiated", {
    user_id: userId,
    app_name: input.appName,
    connected_account_id: result.connectedAccountId
  });
  return result;
}

export async function disconnectApp(
  userId: string,
  composioApiKey: string | null,
  appName: string
): Promise<void> {
  const key = requireComposioKey(composioApiKey);

  const [rows] = await dbQuery<ConnectedAccountRow[]>(
    getDb(),
    `SELECT id, composio_account_id FROM composio_connected_accounts WHERE user_id = ? AND app_name = ?`,
    [userId, appName]
  );
  if (rows.length === 0) {
    throw new AppError(404, "COMPOSIO_ACCOUNT_NOT_FOUND", `No connected account for ${appName}.`);
  }
  const row = rows[0]!;

  try {
    await composioDeleteConnectedAccount(key, row.composio_account_id);
  } catch (err) {
    logWarn("composio", "Composio remote deletion failed; removing local record anyway", {
      app_name: appName,
      error: err instanceof Error ? err.message : String(err)
    });
  }

  await dbQuery(
    getDb(),
    `DELETE FROM composio_connected_accounts WHERE id = ?`,
    [row.id]
  );
  logInfo("composio", "App disconnected", { user_id: userId, app_name: appName });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function listActions(
  composioApiKey: string | null,
  options: { appNames?: string; useCase?: string; limit?: number } = {}
): Promise<ComposioAction[]> {
  const key = requireComposioKey(composioApiKey);
  return composioListActions(key, options);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export interface ExecuteActionInput {
  userId: string;
  composioApiKey: string | null;
  actionId: string;
  appName?: string;
  params: Record<string, unknown>;
}

export interface ExecuteActionResult extends ComposioExecuteResult {
  execution_id: string;
  latency_ms: number;
}

export async function executeAction(input: ExecuteActionInput): Promise<ExecuteActionResult> {
  const key = requireComposioKey(input.composioApiKey);
  const execId = randomUUID();
  const startedAt = Date.now();

  await dbQuery(
    getDb(),
    `INSERT INTO tool_executions
       (id, user_id, source, app_name, action_name, input_json, status)
     VALUES (?, ?, 'composio', ?, ?, ?, 'pending')`,
    [
      execId,
      input.userId,
      input.appName ?? null,
      input.actionId,
      JSON.stringify(input.params)
    ]
  );

  let result: ComposioExecuteResult;
  try {
    result = await composioExecuteAction(key, input.actionId, {
      entityId: input.userId,
      params: input.params
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const errMsg = err instanceof Error ? err.message : String(err);
    await dbQuery(
      getDb(),
      `UPDATE tool_executions
       SET status = 'error', error_message = ?, latency_ms = ?
       WHERE id = ?`,
      [errMsg.slice(0, 500), latencyMs, execId]
    );
    throw err;
  }

  const latencyMs = Date.now() - startedAt;
  const status = result.successful ? "success" : "error";

  await dbQuery(
    getDb(),
    `UPDATE tool_executions
     SET status = ?, output_json = ?, error_message = ?, latency_ms = ?
     WHERE id = ?`,
    [
      status,
      result.data !== null ? JSON.stringify(result.data) : null,
      result.error ?? null,
      latencyMs,
      execId
    ]
  );

  logInfo("composio", "Action executed", {
    user_id: input.userId,
    action_id: input.actionId,
    app_name: input.appName,
    status,
    latency_ms: latencyMs
  });

  return { ...result, execution_id: execId, latency_ms: latencyMs };
}

// ---------------------------------------------------------------------------
// Execution history
// ---------------------------------------------------------------------------

interface ExecutionRow extends RowDataPacket {
  id: string;
  app_name: string | null;
  action_name: string;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  created_at: Date | string;
}

export interface ExecutionSummary {
  id: string;
  app_name: string | null;
  action_name: string;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export async function listExecutions(
  userId: string,
  limit = 20
): Promise<ExecutionSummary[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const [rows] = await dbQuery<ExecutionRow[]>(
    getDb(),
    `SELECT id, app_name, action_name, status, error_message, latency_ms, created_at
     FROM tool_executions
     WHERE user_id = ? AND source = 'composio'
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, safeLimit]
  );
  return rows.map((r) => ({
    id: r.id,
    app_name: r.app_name,
    action_name: r.action_name,
    status: r.status,
    error_message: r.error_message,
    latency_ms: r.latency_ms,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
  }));
}
