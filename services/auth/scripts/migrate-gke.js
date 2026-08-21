const { readdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('creating schema auth...');
    await pool.query('CREATE SCHEMA IF NOT EXISTS auth;');

    console.log('creating migrations table...');
    await pool.query('CREATE TABLE IF NOT EXISTS auth._migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());');

    const migrationsDir = '/repo/services/auth/migrations';
    const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const done = await pool.query('SELECT 1 FROM auth._migrations WHERE name = $1', [file]);
      if (done.rowCount > 0) {
        console.log('skip', file);
        continue;
      }

      console.log('applying migration', file);
      const sql = await readFile(join(migrationsDir, file), 'utf8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO auth._migrations(name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log('apply success', file);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error('FAILED running sql', file, err);
        process.exit(1);
      }
    }
    console.log('migrations complete');
  } catch (e) {
    console.error('setup failed', e);
  } finally {
    await pool.end();
  }
}

run();
