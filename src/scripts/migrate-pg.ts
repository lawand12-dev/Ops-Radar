import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import { env } from "../config/env";

/**
 * Postgres migration runner.
 *
 * Why a separate runner (vs MySQL's src/scripts/migrate.ts)
 * --------------------------------------------------------
 * The MySQL runner splits on `;`. That is safe for DDL-only files but
 * BREAKS on Postgres `DO $$ ... $$;` blocks, dollar-quoted function
 * bodies, and any statement containing a literal `;`.
 *
 * Strategy here: send the ENTIRE file as a single "simple query" via
 * pg.Client.query(string). pg's simple-query protocol executes
 * statements sequentially; we wrap the whole file in BEGIN/COMMIT so a
 * mid-file failure rolls back atomically. Migrations that must run
 * outside a transaction (e.g. CREATE INDEX CONCURRENTLY) are not used
 * in Phase 2; add a `-- pragma: no-transaction` opt-out header later
 * if needed.
 *
 * The schema_migrations table mirrors the MySQL one for operator
 * familiarity. Filename ordering is alphabetical (zero-padded numeric
 * prefixes).
 */

async function run() {
  const url = env.POSTGRES_URL?.trim();
  if (!url) {
    console.error("[migrate-pg] POSTGRES_URL is not set. Aborting.");
    process.exit(2);
  }

  const dir = resolve(process.cwd(), "migrations-pg");
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  console.log(`[migrate-pg] Found ${files.length} migration file(s).`);

  const client = new Client({ connectionString: url });
  await client.connect();

  let applied = 0;
  let skipped = 0;

  try {
    // Bootstrap the tracker table. We do NOT wrap this in a transaction —
    // it must exist before subsequent transactions can write to it on
    // success. CREATE TABLE IF NOT EXISTS is idempotent.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id           bigserial PRIMARY KEY,
        migration    text NOT NULL UNIQUE,
        applied_at   timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const file of files) {
      const { rows } = await client.query<{ migration: string }>(
        "SELECT migration FROM schema_migrations WHERE migration = $1 LIMIT 1",
        [file]
      );
      if (rows.length > 0) {
        skipped += 1;
        continue;
      }

      const sql = await readFile(resolve(dir, file), "utf-8");

      // Single transaction per migration. If any statement inside fails,
      // ROLLBACK leaves the database untouched and we abort the runner —
      // the operator can fix the file and re-run safely.
      console.log(`[migrate-pg] Applying ${file} …`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (migration) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        applied += 1;
        console.log(`[migrate-pg] ✓ ${file}`);
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // best-effort
        }
        console.error(`[migrate-pg] ✗ ${file}: ${(err as Error).message}`);
        throw err;
      }
    }

    if (applied === 0) {
      console.log("[migrate-pg] No pending migrations.");
    }
    console.log(
      `[migrate-pg] Done. Applied=${applied}, Skipped=${skipped}.`
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("[migrate-pg] FAILED:", err);
  process.exit(1);
});
