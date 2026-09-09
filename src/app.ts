import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyBaseLogger } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";

import { env, isTest } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./lib/logger.js";
import { success } from "./lib/response.js";
import authPlugin from "./middleware/auth.middleware.js";
import { registerErrorHandler } from "./middleware/error.middleware.js";
import { apiRoutes } from "./routes/index.js";

export async function buildApp() {
  // Widened so Fastify keeps its default instance types; the concrete pino
  // logger type would otherwise leak into every plugin signature.
  const baseLogger: FastifyBaseLogger = logger;

  const app = Fastify({
    loggerInstance: baseLogger,
    disableRequestLogging: isTest
  }).withTypeProvider<ZodTypeProvider>();

  // Zod drives both request validation and response serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true
  });

  await app.register(helmet, {
    contentSecurityPolicy: false // would block the Swagger UI assets
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "MNL API",
        description:
          "Multiagent Negotiation Layer — Phase 1 backend. Manages the engineering workflow; the agent layer comes later.",
        version: "1.0.0"
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    },
    transform: jsonSchemaTransform
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs"
  });

  await app.register(authPlugin);

  app.get(
    "/health",
    { schema: { tags: ["system"], summary: "Liveness and database check" } },
    async () => {
      let database = "up";

      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        database = "down";
      }

      return success(
        {
          status: "ok",
          service: "mnl-backend",
          environment: env.NODE_ENV,
          database
        },
        "Service is healthy"
      );
    }
  );

  await app.register(apiRoutes, { prefix: "/api/v1" });

  return app;
}

export type AppInstance = Awaited<ReturnType<typeof buildApp>>;
