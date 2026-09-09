import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./database/prisma.js";
import { logger } from "./lib/logger.js";

async function start() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down`);

    try {
      await app.close();
      await disconnectDatabase();
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Error during shutdown");
      process.exit(1);
    }
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }

  try {
    await connectDatabase();
    app.log.info("Database connection established");

    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Docs available at http://localhost:${env.PORT}/docs`);
  } catch (error) {
    app.log.error(error, "Failed to start server");
    await disconnectDatabase();
    process.exit(1);
  }
}

start().catch((error: unknown) => {
  logger.error(error, "Fatal startup error");
  process.exit(1);
});
