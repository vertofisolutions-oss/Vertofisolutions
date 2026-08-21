/**
 * Minimal forward-only migration runner. Applies every .sql file in
 * ../migrations in lexical order, tracked in a migrations table.
 * Production uses the same files via a CI job (docs/17).
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth._migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const done = await pool.query("SELECT 1 FROM auth._migrations WHERE name = $1", [file]);
    if (done.rowCount) {
      console.log(`skip   ${file}`);
      continue;
    }
    const sql = await readFile(join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO auth._migrations(name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`apply  ${file}`);
    } catch (e) {
      await pool.query("ROLLBACK");
      console.error(`FAILED ${file}`, e);
      process.exit(1);
    }
  }
  await pool.end();
  console.log("migrations complete");
}

void main();
