import mysql, { type FieldPacket, type Pool, type PoolConnection, type QueryResult } from "mysql2/promise";
import { env } from "../config/env";
import { AppError } from "./errors";

let pool: Pool | null = null;

type QueryRunner = Pick<Pool, "query"> | Pick<PoolConnection, "query">;

function compactSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().slice(0, 240);
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: string; name?: string };
  return maybeError.code === "DB_TIMEOUT" || maybeError.name === "AbortError";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: Record<string, unknown>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new AppError(504, "DB_TIMEOUT", "Database operation timed out.", {
          timeout_ms: timeoutMs,
          ...context
        })
      );
    }, timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => {
        if (timer) {
          clearTimeout(timer);
        }
      });
  });
}

export function getDb(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      connectTimeout: env.MYSQL_CONNECT_TIMEOUT_MS,
      connectionLimit: 10,
      namedPlaceholders: true
    });
  }

  return pool;
}

export async function withTransaction<T>(
  handler: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const db = getDb();
  const connection = await withTimeout(
    db.getConnection(),
    env.MYSQL_CONNECT_TIMEOUT_MS,
    { stage: "acquire_connection" }
  );

  try {
    await withTimeout(
      connection.beginTransaction(),
      env.MYSQL_QUERY_TIMEOUT_MS,
      { stage: "begin_transaction" }
    );
    const result = await withTimeout(
      handler(connection),
      env.MYSQL_TRANSACTION_TIMEOUT_MS,
      { stage: "transaction_handler" }
    );
    await withTimeout(
      connection.commit(),
      env.MYSQL_QUERY_TIMEOUT_MS,
      { stage: "commit" }
    );
    return result;
  } catch (error) {
    try {
      await withTimeout(
        connection.rollback(),
        env.MYSQL_QUERY_TIMEOUT_MS,
        { stage: "rollback" }
      );
    } catch {
      // Best effort rollback; destroy on timeout to avoid stuck pooled connection.
      if (isTimeoutError(error)) {
        connection.destroy();
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function dbQuery<T extends QueryResult = QueryResult>(
  runner: QueryRunner,
  sql: string,
  values?: unknown[]
): Promise<[T, FieldPacket[]]> {
  return withTimeout(
    runner.query<T>(sql, values),
    env.MYSQL_QUERY_TIMEOUT_MS,
    { stage: "query", sql: compactSql(sql) }
  );
}
