import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./database/prisma.js";

const app = buildApp();

async function start() {
  try {
    await connectDatabase();
    app.log.info("Database connection established");

    await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    app.log.info(`MNL backend running on http://localhost:${env.PORT}`);
  } catch (error) {
    app.log.error(error, "Failed to start server");
    await disconnectDatabase();
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  app.log.info(`Received ${signal}, shutting down`);

  try {
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    app.log.error(error, "Error during shutdown");
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

void start();
