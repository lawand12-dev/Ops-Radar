import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { getDb } from "../lib/db";

async function runMigrations() {
  const migrationsDir = resolve(process.cwd(), "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  console.log(`[migrate] Found ${migrationFiles.length} migration file(s).`);

  const db = getDb();
  const connection = await db.getConnection();
  let inTransaction = false;
  let appliedCount = 0;
  let skippedCount = 0;

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const fileName of migrationFiles) {
      const [rows] = await connection.query<Array<RowDataPacket & { migration_name: string }>>(
        `SELECT migration_name FROM schema_migrations WHERE migration_name = ? LIMIT 1`,
        [fileName]
      );

      if (rows.length > 0) {
        skippedCount += 1;
        continue;
      }

      const migrationPath = resolve(migrationsDir, fileName);
      const sql = await readFile(migrationPath, "utf-8");
      // Strip SQL comments before splitting on ';' — a ';' inside a comment
      // would otherwise break the statement into invalid fragments.
      const stripped = sql
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)--[^\n]*/g, "$1");
      const statements = stripped
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

      await connection.beginTransaction();
      inTransaction = true;
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query(`INSERT INTO schema_migrations (migration_name) VALUES (?)`, [fileName]);
      await connection.commit();
      inTransaction = false;
      appliedCount += 1;
      console.log(`Migration completed: ${fileName}`);
    }

    if (appliedCount === 0) {
      console.log("[migrate] No pending migrations.");
    }
    console.log(`[migrate] Done. Applied=${appliedCount}, Skipped=${skippedCount}.`);
  } catch (error) {
    if (inTransaction) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
