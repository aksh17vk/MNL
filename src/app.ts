import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";

import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./lib/logger.js";

export function buildApp() {
  const app = Fastify({
    loggerInstance: logger
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true
  });

  app.register(helmet);

  app.get("/health", async () => {
    let database = "up";

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }

    return {
      success: true,
      data: {
        status: "ok",
        service: "mnl-backend",
        environment: env.NODE_ENV,
        database
      },
      message: "Service is healthy"
    };
  });

  return app;
}
