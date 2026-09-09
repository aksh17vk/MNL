/**
 * Creates the test database if it is missing and applies all migrations to it.
 * Safe to run repeatedly; `pnpm test` calls it first.
 */
import { execFileSync } from "node:child_process";

import "dotenv/config";
import pg from "pg";

const url = new URL(
  process.env.TEST_DATABASE_URL ??
    "postgresql://mnl_user:mnl_password@localhost:5432/mnl_test_db?schema=public"
);

const database = url.pathname.replace(/^\//, "");

// Connect to the maintenance database — you cannot create a database from itself.
const adminUrl = new URL(url.toString());
adminUrl.pathname = "/postgres";

const client = new pg.Client({ connectionString: adminUrl.toString() });
await client.connect();

const { rowCount } = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [database]
);

if (rowCount === 0) {
  // Identifiers cannot be parameterised; the name comes from our own config.
  await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
  console.log(`Created database ${database}`);
} else {
  console.log(`Database ${database} already exists`);
}

await client.end();

execFileSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url.toString() }
});
