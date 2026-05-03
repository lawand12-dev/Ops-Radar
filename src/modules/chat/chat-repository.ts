import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import type { ChatMessageRecord, ChatRole } from "../../types/workflow";

type ChatSessionRow = RowDataPacket & {
  id: string;
  project_id: string;
  created_at: string | Date;
};

type ChatMessageRow = RowDataPacket & {
  id: number;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string | Date;
};

function mapMessageRow(row: ChatMessageRow): ChatMessageRecord {
  return {
    id: row.id,
    session_id: row.session_id,
    role: row.role,
    content: row.content,
    created_at: new Date(row.created_at)
  };
}

export async function createChatSession(
  projectId: string,
  connection?: PoolConnection
): Promise<ChatSessionRow> {
  const id = randomUUID();
  const runner = connection ?? getDb();

  await dbQuery(
    runner,
    `INSERT INTO chat_sessions (id, project_id)
     VALUES (?, ?)`,
    [id, projectId]
  );

  const [rows] = await dbQuery<ChatSessionRow[]>(
    runner,
    `SELECT id, project_id, created_at FROM chat_sessions WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(500, "CHAT_SESSION_INSERT_FAILED", "Chat session insert failed.");
  }

  return row;
}

export async function createChatMessage(
  input: {
    sessionId: string;
    role: ChatRole;
    content: string;
  },
  connection?: PoolConnection
): Promise<ChatMessageRow> {
  const runner = connection ?? getDb();
  await dbQuery(
    runner,
    `INSERT INTO chat_messages (session_id, role, content)
     VALUES (?, ?, ?)`,
    [input.sessionId, input.role, input.content]
  );

  const [rows] = await dbQuery<ChatMessageRow[]>(
    runner,
    `SELECT id, session_id, role, content, created_at
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [input.sessionId]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(500, "CHAT_MESSAGE_INSERT_FAILED", "Chat message insert failed.");
  }

  return row;
}

export async function listMessagesByProjectId(projectId: string): Promise<ChatMessageRecord[]> {
  const db = getDb();
  const [rows] = await dbQuery<ChatMessageRow[]>(
    db,
    `SELECT cm.id, cm.session_id, cm.role, cm.content, cm.created_at
     FROM chat_messages cm
     INNER JOIN chat_sessions cs ON cs.id = cm.session_id
     WHERE cs.project_id = ?
     ORDER BY cm.created_at ASC, cm.id ASC`,
    [projectId]
  );

  return rows.map((row) => mapMessageRow(row));
}
