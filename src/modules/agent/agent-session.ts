import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { logInfo } from "../../lib/logger";
import type { AiMessage } from "../../lib/ai-client";

export interface AgentSession {
  id: string;
  userId: string;
  title: string | null;
  model: string;
  status: "running" | "completed" | "failed" | "cancelled";
  turnCount: number;
  startedAt: Date;
  finishedAt: Date | null;
}

interface SessionRow extends RowDataPacket {
  id: string;
  user_id: string;
  title: string | null;
  model: string;
  status: string;
  turn_count: number;
  started_at: Date | string;
  finished_at: Date | string | null;
}

function mapSession(row: SessionRow): AgentSession {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    model: row.model,
    status: row.status as AgentSession["status"],
    turnCount: row.turn_count,
    startedAt: new Date(row.started_at),
    finishedAt: row.finished_at ? new Date(row.finished_at) : null
  };
}

export async function createSession(input: {
  userId: string;
  model: string;
  title?: string;
}): Promise<AgentSession> {
  const id = randomUUID();
  await dbQuery(
    getDb(),
    `INSERT INTO agent_sessions (id, user_id, model, title, status)
     VALUES (?, ?, ?, ?, 'running')`,
    [id, input.userId, input.model, input.title ?? null]
  );
  const session = await getSession(id);
  if (!session) throw new AppError(500, "SESSION_CREATE_FAILED", "Failed to create agent session.");
  logInfo("agent-session", "Session created", { session_id: id, user_id: input.userId });
  return session;
}

export async function getSession(id: string): Promise<AgentSession | null> {
  const [rows] = await dbQuery<SessionRow[]>(
    getDb(),
    `SELECT id, user_id, title, model, status, turn_count, started_at, finished_at
     FROM agent_sessions WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapSession(rows[0]) : null;
}

export async function listUserSessions(userId: string, limit = 20): Promise<AgentSession[]> {
  const safe = Math.min(Math.max(1, limit), 100);
  const [rows] = await dbQuery<SessionRow[]>(
    getDb(),
    `SELECT id, user_id, title, model, status, turn_count, started_at, finished_at
     FROM agent_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
    [userId, safe]
  );
  return rows.map(mapSession);
}

export async function updateSessionStatus(
  id: string,
  status: AgentSession["status"]
): Promise<void> {
  const finishedAt = ["completed", "failed", "cancelled"].includes(status)
    ? new Date().toISOString().replace("T", " ").slice(0, 19)
    : null;
  await dbQuery(
    getDb(),
    `UPDATE agent_sessions SET status = ?, finished_at = COALESCE(?, finished_at) WHERE id = ?`,
    [status, finishedAt, id]
  );
}

export async function incrementTurnCount(id: string): Promise<void> {
  await dbQuery(
    getDb(),
    `UPDATE agent_sessions SET turn_count = turn_count + 1 WHERE id = ?`,
    [id]
  );
}

export async function appendTurn(input: {
  sessionId: string;
  turnIndex: number;
  role: "user" | "assistant" | "tool";
  content: AiMessage["content"];
  toolName?: string;
  toolCallId?: string;
}): Promise<string> {
  const id = randomUUID();
  await dbQuery(
    getDb(),
    `INSERT INTO agent_turns (id, session_id, turn_index, role, content_json, tool_name, tool_call_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.sessionId,
      input.turnIndex,
      input.role,
      JSON.stringify(input.content),
      input.toolName ?? null,
      input.toolCallId ?? null
    ]
  );
  await incrementTurnCount(input.sessionId);
  return id;
}

export async function getSessionTurns(
  sessionId: string
): Promise<Array<{ id: string; role: string; content: unknown; toolName: string | null }>> {
  interface TurnRow extends RowDataPacket {
    id: string;
    role: string;
    content_json: string;
    tool_name: string | null;
    turn_index: number;
  }
  const [rows] = await dbQuery<TurnRow[]>(
    getDb(),
    `SELECT id, role, content_json, tool_name, turn_index
     FROM agent_turns WHERE session_id = ? ORDER BY turn_index ASC`,
    [sessionId]
  );
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    content: JSON.parse(r.content_json),
    toolName: r.tool_name
  }));
}
