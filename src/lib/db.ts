import mysql, { type Pool, type PoolConnection } from "mysql2/promise";
import { env } from "../config/env";

let pool: Pool | null = null;

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
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
