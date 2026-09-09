import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { login, me, register } from "./auth.controller.js";
import {
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema
} from "./auth.schema.js";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Create a new account",
        body: registerBodySchema,
        response: {
          201: successSchema(registerResponseSchema),
          ...commonErrorResponses
        }
      }
    },
    register
  );

  app.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Exchange credentials for an access token",
        body: loginBodySchema,
        response: {
          200: successSchema(loginResponseSchema),
          ...commonErrorResponses
        }
      }
    },
    login
  );

  app.get(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "Return the authenticated user",
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema(registerResponseSchema),
          ...commonErrorResponses
        }
      }
    },
    me
  );
};
