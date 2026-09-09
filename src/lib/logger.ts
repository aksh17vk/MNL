import pino from "pino";

import { env, isProduction } from "../config/env.js";

export const logger = pino(
  {
    level: env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "passwordHash",
        "*.password",
        "*.passwordHash"
      ],
      censor: "[redacted]"
    }
  },
  isProduction
    ? undefined
    : pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname"
        }
      })
);
