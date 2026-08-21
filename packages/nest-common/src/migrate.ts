import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

/**
 * Forward-only migration runner shared by all services. Applies every .sql in
 * `migrationsDir` in lexical order, tracked in `<schema>._migrations`.
 * Production runs the same files via a CI job (docs/17).
 */
export async function runMigrations(schema: string, migrationsDir: string): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${schema}._migrations (
         name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const done = await pool.query(`SELECT 1 FROM ${schema}._migrations WHERE name = $1`, [file]);
      if (done.rowCount) {
        console.log(`skip   ${file}`);
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), "utf8");
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query(`INSERT INTO ${schema}._migrations(name) VALUES ($1)`, [file]);
        await pool.query("COMMIT");
        console.log(`apply  ${file}`);
      } catch (e) {
        await pool.query("ROLLBACK");
        console.error(`FAILED ${file}`, e);
        throw e;
      }
    }
    console.log(`[${schema}] migrations complete`);
  } finally {
    await pool.end();
  }
}
