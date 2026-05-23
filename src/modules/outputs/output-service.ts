import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { logInfo } from "../../lib/logger";

interface OutputRow extends RowDataPacket {
  id: string;
  session_id: string;
  created_by: string;
  visible_to_user: string;
  output_type: string;
  content_json: string;
  read_at: Date | string | null;
  created_at: Date | string;
}

export interface AgentOutput {
  id: string;
  sessionId: string;
  createdBy: string;
  visibleToUser: string;
  outputType: string;
  content: unknown;
  readAt: string | null;
  createdAt: string;
}

function mapOutput(row: OutputRow): AgentOutput {
  return {
    id: row.id,
    sessionId: row.session_id,
    createdBy: row.created_by,
    visibleToUser: row.visible_to_user,
    outputType: row.output_type,
    content: JSON.parse(row.content_json),
    readAt: row.read_at
      ? (row.read_at instanceof Date ? row.read_at.toISOString() : String(row.read_at))
      : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

export async function createOutput(input: {
  sessionId: string;
  createdBy: string;
  visibleToUser: string;
  outputType?: string;
  content: unknown;
}): Promise<AgentOutput> {
  const id = randomUUID();
  await dbQuery(
    getDb(),
    `INSERT INTO agent_outputs
       (id, session_id, created_by, visible_to_user, output_type, content_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.sessionId,
      input.createdBy,
      input.visibleToUser,
      input.outputType ?? "text",
      JSON.stringify(input.content)
    ]
  );
  const output = await getOutput(id, input.visibleToUser);
  if (!output) throw new AppError(500, "OUTPUT_CREATE_FAILED", "Failed to create output.");
  logInfo("outputs", "Output created", {
    id,
    created_by: input.createdBy,
    visible_to_user: input.visibleToUser
  });
  return output;
}

export async function getOutput(
  id: string,
  requestingUserId: string
): Promise<AgentOutput | null> {
  const [rows] = await dbQuery<OutputRow[]>(
    getDb(),
    `SELECT id, session_id, created_by, visible_to_user, output_type, content_json, read_at, created_at
     FROM agent_outputs WHERE id = ? AND visible_to_user = ? LIMIT 1`,
    [id, requestingUserId]
  );
  return rows[0] ? mapOutput(rows[0]) : null;
}

export async function listUserOutputs(
  userId: string,
  limit = 20
): Promise<AgentOutput[]> {
  const safe = Math.min(Math.max(1, limit), 100);
  const [rows] = await dbQuery<OutputRow[]>(
    getDb(),
    `SELECT id, session_id, created_by, visible_to_user, output_type, content_json, read_at, created_at
     FROM agent_outputs WHERE visible_to_user = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, safe]
  );
  return rows.map(mapOutput);
}

export async function markOutputRead(id: string, userId: string): Promise<void> {
  await dbQuery(
    getDb(),
    `UPDATE agent_outputs SET read_at = NOW()
     WHERE id = ? AND visible_to_user = ? AND read_at IS NULL`,
    [id, userId]
  );
}
