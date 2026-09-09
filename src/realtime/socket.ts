import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketServer } from "socket.io";

import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { onDomainEvent } from "../lib/events.js";
import type { AuthTokenPayload } from "../types/auth.js";

/**
 * WebSocket fan-out.
 *
 * Clients connect with the same JWT they use for REST, then subscribe to a
 * project or a task. Every domain event is delivered only to the rooms it
 * belongs to, so nobody receives another user's work.
 */

const projectRoom = (id: string) => `project:${id}`;
const taskRoom = (id: string) => `task:${id}`;

async function socketPlugin(app: FastifyInstance) {
  const io = new SocketServer(app.server, {
    path: "/socket.io",
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true
    }
  });

  io.use((socket, next) => {
    const raw =
      socket.handshake.auth?.token ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (typeof raw !== "string" || raw.length === 0) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    try {
      const payload = app.jwt.verify<AuthTokenPayload>(raw);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    app.log.debug({ userId, socketId: socket.id }, "Socket connected");

    // Ownership is re-checked here — a token alone must not grant a room.
    socket.on("subscribe:project", async (projectId: unknown, ack?: unknown) => {
      const reply = typeof ack === "function" ? ack : () => undefined;

      if (typeof projectId !== "string") {
        reply({ ok: false, error: "INVALID_PROJECT_ID" });
        return;
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        select: { id: true }
      });

      if (!project) {
        reply({ ok: false, error: "PROJECT_NOT_FOUND" });
        return;
      }

      await socket.join(projectRoom(projectId));
      reply({ ok: true, room: projectRoom(projectId) });
    });

    socket.on("subscribe:task", async (taskId: unknown, ack?: unknown) => {
      const reply = typeof ack === "function" ? ack : () => undefined;

      if (typeof taskId !== "string") {
        reply({ ok: false, error: "INVALID_TASK_ID" });
        return;
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, project: { userId } },
        select: { id: true }
      });

      if (!task) {
        reply({ ok: false, error: "TASK_NOT_FOUND" });
        return;
      }

      await socket.join(taskRoom(taskId));
      reply({ ok: true, room: taskRoom(taskId) });
    });

    socket.on("unsubscribe:project", async (projectId: unknown) => {
      if (typeof projectId === "string") {
        await socket.leave(projectRoom(projectId));
      }
    });

    socket.on("unsubscribe:task", async (taskId: unknown) => {
      if (typeof taskId === "string") {
        await socket.leave(taskRoom(taskId));
      }
    });
  });

  const unsubscribe = onDomainEvent((event) => {
    const { projectId, taskId } = event.payload;
    const rooms: string[] = [];

    if (projectId) {
      rooms.push(projectRoom(projectId));
    }

    if (taskId) {
      rooms.push(taskRoom(taskId));
    }

    if (rooms.length === 0) {
      return;
    }

    // A socket in both rooms still receives the event once.
    io.to(rooms).emit(event.name, event);
  });

  app.decorate("io", io);

  app.addHook("onClose", async () => {
    unsubscribe();
    await io.close();
  });
}

export default fp(socketPlugin, { name: "realtime" });
