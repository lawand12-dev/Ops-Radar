import { createHash, randomUUID } from "node:crypto";
import { dbQuery, getDb } from "./db";
import { logError } from "./logger";

export interface AuditEntry {
  sessionId: string;
  userId: string;
  toolName: string;
  args: Record<string, unknown>;
  outcome: "success" | "error" | "denied";
  denialCode?: string;
  latencyMs?: number;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const argsHash = createHash("sha256")
    .update(JSON.stringify(entry.args))
    .digest("hex");

  try {
    await dbQuery(
      getDb(),
      `INSERT INTO agent_audit_log
         (id, session_id, user_id, tool_name, args_hash, outcome, denial_code, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        entry.sessionId,
        entry.userId,
        entry.toolName,
        argsHash,
        entry.outcome,
        entry.denialCode ?? null,
        entry.latencyMs ?? null
      ]
    );
  } catch (err) {
    logError("audit", "Failed to write audit log entry", {
      tool_name: entry.toolName,
      error: err instanceof Error ? err.message : String(err)
    });
  }
}
