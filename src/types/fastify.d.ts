import type { FastifyReply, FastifyRequest } from "fastify";
import type { Server as SocketServer } from "socket.io";

import type { AuthTokenPayload } from "./auth.js";

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler that rejects the request unless a valid bearer token is present. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Socket.IO server attached to the same HTTP server. */
    io: SocketServer;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}
