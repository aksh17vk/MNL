import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
import { getUserById, loginUser, registerUser } from "./auth.service.js";

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  const user = await registerUser(request.body);

  return reply.status(201).send(success({ user }, "Account created successfully"));
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  const result = await loginUser(request.body, (payload) =>
    request.server.jwt.sign(payload)
  );

  return reply.send(success(result, "Logged in successfully"));
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = await getUserById(currentUserId(request));

  return reply.send(success({ user }));
}
