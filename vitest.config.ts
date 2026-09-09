import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://mnl_user:mnl_password@localhost:5432/mnl_test_db?schema=public";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    // Integration tests share one database, so files must not run in parallel.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // Set before any module loads: dotenv does not override existing vars, so
    // these win over .env and point the suite at the test database.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      JWT_EXPIRES_IN: "1h",
      CORS_ORIGIN: "http://localhost:3000",
      LOG_LEVEL: "error"
    }
  }
});
